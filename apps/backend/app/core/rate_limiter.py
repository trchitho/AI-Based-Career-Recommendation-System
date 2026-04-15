"""
Rate limiting middleware for API protection
"""

import logging
import os
import time
import uuid
from collections import defaultdict, deque
from typing import Dict

import redis.asyncio as redis_async
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiter:
    """Redis-based rate limiter with fallback to in-memory"""

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = None
        self._available = True

        # In-memory fallback
        self._memory_store = defaultdict(lambda: deque())
        self._cleanup_interval = 60  # Clean up every 60 seconds
        self._last_cleanup = time.time()

    async def _get_redis(self):
        """Get Redis connection"""
        if not self._available:
            return None

        if self._redis is None:
            try:
                self._redis = redis_async.from_url(self.redis_url, decode_responses=True)
                await self._redis.ping()
                logger.info("✅ Rate limiter Redis connected")
            except Exception as e:
                logger.warning(f"⚠️ Rate limiter using memory fallback: {e}")
                self._available = False
                return None

        return self._redis

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get user ID from request state (if authenticated)
        if hasattr(request.state, "user_id"):
            return f"user:{request.state.user_id}"

        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"ip:{client_ip}"

    async def _check_redis_limit(self, key: str, limit: int, window: int) -> tuple[bool, Dict]:
        """Check rate limit using Redis sliding window"""
        redis_client = await self._get_redis()
        if not redis_client:
            return await self._check_memory_limit(key, limit, window)

        try:
            current_time = time.time()
            window_start = current_time - window

            # Use Redis sorted set for sliding window
            pipe = redis_client.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count current requests in the window
            pipe.zcard(key)

            # Fetch the oldest entry (score) to compute accurate reset_time on denial
            pipe.zrange(key, 0, 0, withscores=True)

            results = await pipe.execute()
            current_count = results[1]
            oldest_entries = results[2]

            # Match in-memory fallback semantics: only record allowed requests
            allowed = current_count < limit
            updated_count = current_count

            if allowed:
                # Use uuid4 for a truly unique member to avoid any collisions
                request_member = f"{current_time}:{uuid.uuid4()}"
                add_pipe = redis_client.pipeline()
                add_pipe.zadd(key, {request_member: current_time})
                add_pipe.expire(key, window + 1)
                await add_pipe.execute()
                updated_count = current_count + 1

            # Compute reset_time from the oldest entry for accuracy
            if not allowed and oldest_entries:
                oldest_time = oldest_entries[0][1]
                reset_time = oldest_time + window
                retry_after = max(0, reset_time - current_time)
            else:
                reset_time = current_time + window
                retry_after = None

            return allowed, {
                "allowed": allowed,
                "current_count": updated_count,
                "limit": limit,
                "window": window,
                "reset_time": reset_time,
                "retry_after": retry_after,
            }

        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return await self._check_memory_limit(key, limit, window)

    async def _check_memory_limit(self, key: str, limit: int, window: int) -> tuple[bool, Dict]:
        """Fallback in-memory rate limiting"""
        current_time = time.time()
        window_start = current_time - window

        # Clean up old entries periodically
        if current_time - self._last_cleanup > self._cleanup_interval:
            self._cleanup_memory_store(current_time)
            self._last_cleanup = current_time

        # Get request times for this key
        request_times = self._memory_store[key]

        # Remove old requests
        while request_times and request_times[0] < window_start:
            request_times.popleft()

        # Check limit
        current_count = len(request_times)
        allowed = current_count < limit

        # Add current request if allowed
        if allowed:
            request_times.append(current_time)

        # Compute reset_time from the oldest entry in the window for accuracy
        if not allowed and request_times:
            reset_time = request_times[0] + window
            retry_after = max(0, reset_time - current_time)
        else:
            reset_time = current_time + window
            retry_after = None

        return allowed, {
            "allowed": allowed,
            "current_count": current_count,
            "limit": limit,
            "window": window,
            "reset_time": reset_time,
            "retry_after": retry_after,
        }

    def _cleanup_memory_store(self, current_time: float):
        """Clean up old entries from memory store"""
        cutoff_time = current_time - 3600  # Keep 1 hour of data

        for key in list(self._memory_store.keys()):
            request_times = self._memory_store[key]
            while request_times and request_times[0] < cutoff_time:
                request_times.popleft()

            # Remove empty entries
            if not request_times:
                del self._memory_store[key]

    async def check_limit(self, request: Request, limit: int, window: int) -> tuple[bool, Dict]:
        """Check if request is within rate limit"""
        client_id = self._get_client_id(request)
        route = f"{request.method}:{request.url.path}"
        key = f"rate_limit:{route}:{client_id}"

        return await self._check_redis_limit(key, limit, window)


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""

    def __init__(self, app, default_limit: int = 100, default_window: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.default_window = default_window

        # Route-specific limits (requests per minute)
        self.route_limits = {
            "POST:/api/recommendations": (10, 60),  # 10 requests per minute
            "POST:/api/assessments": (5, 60),  # 5 assessments per minute
            "POST:/api/auth/login": (5, 300),  # 5 login attempts per 5 minutes
            "POST:/api/auth/register": (3, 300),  # 3 registrations per 5 minutes
            "GET:/bff/catalog/career": (30, 60),  # 30 career requests per minute
            "POST:/api/interview": (10, 60),  # 10 interview requests per minute
        }

    def _get_route_limit(self, method: str, path: str) -> tuple[int, int]:
        """Get rate limit for specific route"""
        route_key = f"{method}:{path}"

        # Check exact match first
        if route_key in self.route_limits:
            return self.route_limits[route_key]

        # Check pattern matches
        for pattern, (limit, window) in self.route_limits.items():
            if pattern.endswith("*") and route_key.startswith(pattern[:-1]):
                return limit, window

        return self.default_limit, self.default_window

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/health/detailed", "/metrics", "/docs", "/redoc"]:
            return await call_next(request)

        if request.url.path.startswith("/static/"):
            return await call_next(request)

        # Get rate limit for this route
        limit, window = self._get_route_limit(request.method, request.url.path)

        # Check rate limit
        try:
            allowed, info = await rate_limiter.check_limit(request, limit, window)

            if not allowed:
                # Rate limit exceeded
                logger.warning(
                    f"Rate limit exceeded: {request.method} {request.url.path} "
                    f"from {rate_limiter._get_client_id(request)} "
                    f"({info['current_count']}/{info['limit']} requests)"
                )

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info["limit"],
                        "window": info["window"],
                        "retry_after": info["retry_after"],
                    },
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(max(0, info["limit"] - info["current_count"])),
                        "X-RateLimit-Reset": str(int(info["reset_time"])),
                        "Retry-After": str(int(info["retry_after"])),
                    },
                )

            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(max(0, info["limit"] - info["current_count"]))
            response.headers["X-RateLimit-Reset"] = str(int(info["reset_time"]))

            return response

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Continue without rate limiting if there's an error
            return await call_next(request)


# Rate limiting decorator for specific endpoints
def rate_limit(limit: int, window: int = 60):
    """
    Decorator for rate limiting specific endpoints

    Args:
        limit: Number of requests allowed
        window: Time window in seconds
    """

    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            allowed, info = await rate_limiter.check_limit(request, limit, window)

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info["limit"],
                        "window": info["window"],
                        "retry_after": info["retry_after"],
                    },
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
