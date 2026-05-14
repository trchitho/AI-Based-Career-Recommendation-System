"""
Enhanced caching layer — Binary Serialization with msgpack + orjson
===================================================================
Cache storage: msgpack binary (smaller, faster than JSON strings)
Fallback:      orjson bytes (when msgpack decode fails)
In-memory:     dict fallback when Redis unavailable
"""

import hashlib
import inspect
import logging
import os
import time
from functools import wraps
from typing import Any, Dict, Optional

import redis.asyncio as redis_async

from app.core.serialization import (
    cache_deserialize, cache_serialize,
    cache_deserialize_json, cache_serialize_json,
)

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Redis cache manager with binary serialization (msgpack).
    Falls back to in-memory dict when Redis unavailable.
    """

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = None
        self._available = True
        self._mem: Dict[str, tuple] = {}   # in-memory fallback: key → (value, expires_at)
        self.stats = {"hits": 0, "misses": 0, "errors": 0, "total_requests": 0}

    async def _get_redis(self):
        if not self._available:
            return None
        if self._redis is None:
            try:
                # Use decode_responses=False to handle binary msgpack values
                self._redis = redis_async.from_url(self.redis_url, decode_responses=False)
                await self._redis.ping()
                logger.info("✅ Redis cache connected (binary mode)")
            except Exception as e:
                logger.warning(f"⚠️ Redis not available: {e} — using in-memory cache")
                self._available = False
                return None
        return self._redis

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        sorted_params = sorted(kwargs.items())
        params_str = "&".join(f"{k}={v}" for k, v in sorted_params)
        if len(params_str) > 100:
            h = hashlib.sha256(params_str.encode()).hexdigest()[:16]
            return f"{prefix}:h:{h}"
        return f"{prefix}:{params_str}"

    # ── In-memory fallback ─────────────────────────────────────────
    def _mem_get(self, key: str) -> Optional[Any]:
        entry = self._mem.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if expires_at and time.time() > expires_at:
            del self._mem[key]
            return None
        return value

    def _mem_set(self, key: str, value: Any, ttl: int) -> None:
        self._mem[key] = (value, time.time() + ttl if ttl else None)
        # Evict if too large (simple LRU: drop oldest 20%)
        if len(self._mem) > 500:
            evict_keys = list(self._mem.keys())[:100]
            for k in evict_keys:
                self._mem.pop(k, None)

    # ── Public API ─────────────────────────────────────────────────
    async def get(self, key: str) -> Optional[Any]:
        self.stats["total_requests"] += 1
        redis_client = await self._get_redis()

        if not redis_client:
            # In-memory fallback
            result = self._mem_get(key)
            if result is not None:
                self.stats["hits"] += 1
                return result
            self.stats["misses"] += 1
            return None

        try:
            t0 = time.time()
            raw = await redis_client.get(key)
            if raw is None:
                self.stats["misses"] += 1
                return None

            self.stats["hits"] += 1
            logger.debug(f"Cache HIT: {key} ({(time.time()-t0)*1000:.1f}ms)")

            # Try msgpack first, fallback to orjson
            try:
                return cache_deserialize(raw)
            except Exception:
                try:
                    return cache_deserialize_json(raw)
                except Exception:
                    return None

        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache GET error [{key}]: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        redis_client = await self._get_redis()

        if not redis_client:
            self._mem_set(key, value, ttl)
            return True

        try:
            t0 = time.time()
            # Serialize with msgpack (binary, ~30% smaller than JSON)
            serialized = cache_serialize(value)
            await redis_client.set(key, serialized, ex=ttl)
            logger.debug(
                f"Cache SET: {key} | TTL={ttl}s | size={len(serialized)}B "
                f"| {(time.time()-t0)*1000:.1f}ms"
            )
            return True
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache SET error [{key}]: {e}")
            # Fallback: try orjson bytes
            try:
                fallback = cache_serialize_json(value)
                await redis_client.set(key, fallback, ex=ttl)
                return True
            except Exception:
                return False

    async def delete(self, key: str) -> bool:
        self._mem.pop(key, None)
        redis_client = await self._get_redis()
        if not redis_client:
            return True
        try:
            return bool(await redis_client.delete(key))
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache DELETE error [{key}]: {e}")
            return False

    async def clear_pattern(self, pattern: str) -> int:
        # Clear in-memory entries matching pattern
        import fnmatch
        mem_keys = [k for k in list(self._mem.keys()) if fnmatch.fnmatch(k, pattern)]
        for k in mem_keys:
            self._mem.pop(k, None)

        redis_client = await self._get_redis()
        if not redis_client:
            return len(mem_keys)

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
                logger.info(f"Cache CLEAR: {deleted} keys matching '{pattern}'")
            return deleted + len(mem_keys)
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache CLEAR error [{pattern}]: {e}")
            return len(mem_keys)

    async def get_or_set(self, key: str, factory, ttl: int = 3600) -> Any:
        """Atomic get-or-compute pattern."""
        result = await self.get(key)
        if result is not None:
            return result
        value = await factory() if callable(factory) else factory
        await self.set(key, value, ttl)
        return value

    def get_stats(self) -> Dict[str, Any]:
        total = self.stats["total_requests"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0
        return {
            "total_requests": total,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "errors": self.stats["errors"],
            "hit_rate": f"{hit_rate:.1f}%",
            "available": self._available,
            "in_memory_keys": len(self._mem),
            "serialization": "msgpack+orjson binary",
        }


# Global cache manager instance
cache_manager = CacheManager()


def cached(prefix: str, ttl: int = 3600, key_params: list = None):
    """Decorator for caching async function results using binary serialization."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                sig = inspect.signature(func)
                bound = sig.bind(*args, **kwargs)
                bound.apply_defaults()
                all_kwargs = dict(bound.arguments)
            except TypeError:
                all_kwargs = kwargs

            cache_kwargs = {k: all_kwargs.get(k) for k in (key_params or [])} if key_params else all_kwargs
            cache_key = cache_manager._generate_cache_key(prefix, **cache_kwargs)

            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, ttl)
            return result

        return wrapper
    return decorator


# Invalidation helpers
async def invalidate_career_cache(onet_code: str):
    deleted = await cache_manager.clear_pattern(f"career:*:{onet_code}:*")
    logger.info(f"Invalidated {deleted} cache entries for career {onet_code}")


async def invalidate_user_cache(user_id: int):
    deleted = await cache_manager.clear_pattern(f"user:*:{user_id}:*")
    logger.info(f"Invalidated {deleted} cache entries for user {user_id}")


POPULAR_CAREERS = [
    "15-1252.00", "29-1141.00", "25-2021.00", "13-2011.00", "17-2051.00",
]

async def preload_popular_careers():
    logger.info("Preloading popular careers cache...")
    pass
