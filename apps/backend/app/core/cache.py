"""
Enhanced caching layer with Redis
"""

import hashlib
import inspect
import json
import logging
import os
import time
from functools import wraps
from typing import Any, Dict, Optional

import redis.asyncio as redis_async

logger = logging.getLogger(__name__)


class CacheManager:
    """Enhanced Redis cache manager with performance monitoring"""

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = None
        self._available = True
        self.stats = {"hits": 0, "misses": 0, "errors": 0, "total_requests": 0}

    async def _get_redis(self):
        """Get Redis connection with error handling"""
        if not self._available:
            return None

        if self._redis is None:
            try:
                self._redis = redis_async.from_url(self.redis_url, decode_responses=True)
                await self._redis.ping()
                logger.info("✅ Redis cache connected")
            except Exception as e:
                logger.warning(f"⚠️ Redis not available: {e}")
                self._available = False
                return None

        return self._redis

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate consistent cache key from parameters"""
        # Sort kwargs for consistent key generation
        sorted_params = sorted(kwargs.items())
        params_str = "&".join(f"{k}={v}" for k, v in sorted_params)

        # Create hash for long parameter strings
        if len(params_str) > 100:
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            return f"{prefix}:hash:{params_hash}"

        return f"{prefix}:{params_str}"

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache with stats tracking"""
        self.stats["total_requests"] += 1

        redis_client = await self._get_redis()
        if not redis_client:
            self.stats["misses"] += 1
            return None

        try:
            start_time = time.time()
            cached_data = await redis_client.get(key)
            response_time = time.time() - start_time

            if cached_data:
                self.stats["hits"] += 1
                logger.debug(f"Cache HIT: {key} ({response_time:.3f}s)")
                return json.loads(cached_data)
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache MISS: {key}")
                return None

        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache GET error for {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        redis_client = await self._get_redis()
        if not redis_client:
            return False

        try:
            start_time = time.time()
            serialized = json.dumps(value, ensure_ascii=False, default=str)
            await redis_client.set(key, serialized, ex=ttl)
            response_time = time.time() - start_time

            logger.debug(f"Cache SET: {key} (TTL: {ttl}s, {response_time:.3f}s)")
            return True

        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache SET error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        redis_client = await self._get_redis()
        if not redis_client:
            return False

        try:
            result = await redis_client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return bool(result)
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache DELETE error for {key}: {e}")
            return False

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        redis_client = await self._get_redis()
        if not redis_client:
            return 0

        try:
            deleted = 0
            batch = []

            async for key in redis_client.scan_iter(match=pattern):
                batch.append(key)
                if len(batch) >= 100:
                    deleted += await redis_client.delete(*batch)
                    batch = []

            if batch:
                deleted += await redis_client.delete(*batch)

            if deleted:
                logger.info(f"Cache CLEAR: {deleted} keys matching {pattern}")
            return deleted
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache CLEAR error for pattern {pattern}: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total = self.stats["total_requests"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0

        return {
            "total_requests": total,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "errors": self.stats["errors"],
            "hit_rate": round(hit_rate, 2),
            "available": self._available,
        }


# Global cache manager instance
cache_manager = CacheManager()


def cached(prefix: str, ttl: int = 3600, key_params: list = None):
    """
    Decorator for caching function results

    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds
        key_params: List of parameter names to include in cache key
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Bind all arguments (positional and keyword) to parameter names
            try:
                sig = inspect.signature(func)
                bound = sig.bind(*args, **kwargs)
                bound.apply_defaults()
                all_kwargs = dict(bound.arguments)
            except TypeError:
                all_kwargs = kwargs

            # Generate cache key from specified parameters
            if key_params:
                cache_kwargs = {k: all_kwargs.get(k) for k in key_params if k in all_kwargs}
            else:
                cache_kwargs = all_kwargs

            cache_key = cache_manager._generate_cache_key(prefix, **cache_kwargs)

            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, ttl)

            return result

        return wrapper

    return decorator


# Cache invalidation helpers
async def invalidate_career_cache(onet_code: str):
    """Invalidate all cached data for a specific career"""
    pattern = f"career:*:{onet_code}:*"
    deleted = await cache_manager.clear_pattern(pattern)
    logger.info(f"Invalidated {deleted} cache entries for career {onet_code}")


async def invalidate_user_cache(user_id: int):
    """Invalidate all cached data for a specific user"""
    pattern = f"user:*:{user_id}:*"
    deleted = await cache_manager.clear_pattern(pattern)
    logger.info(f"Invalidated {deleted} cache entries for user {user_id}")


# Preloading for popular careers
POPULAR_CAREERS = [
    "15-1252.00",  # Software Developer
    "29-1141.00",  # Registered Nurse
    "25-2021.00",  # Elementary School Teacher
    "13-2011.00",  # Accountant
    "17-2051.00",  # Civil Engineer
]


async def preload_popular_careers():
    """Preload cache for popular careers in both languages"""
    logger.info("Preloading popular careers cache...")

    # This would be called from the BFF Career API
    # Implementation depends on having access to the _fetch_sections function
    pass
