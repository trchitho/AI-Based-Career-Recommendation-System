"""
Simple in-memory TTL cache for AI-core endpoints.
Avoids Redis dependency; sufficient for single-instance deployments.
"""
from __future__ import annotations

import threading
import time
from typing import Any


class TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

    def __init__(self, default_ttl: int = 600, max_size: int = 5000) -> None:
        self._lock = threading.Lock()
        self._store: dict[str, tuple[float, Any]] = {}
        self._default_ttl = default_ttl
        self._max_size = max_size

    def get(self, key: str) -> Any | None:
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at < now:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl_s = ttl if ttl is not None else self._default_ttl
        expires_at = time.time() + ttl_s
        with self._lock:
            # Evict oldest entry if cache is full (simple FIFO)
            if len(self._store) >= self._max_size:
                # Remove first key (Python dicts are insertion-ordered)
                first_key = next(iter(self._store))
                self._store.pop(first_key, None)
            self._store[key] = (expires_at, value)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Singleton — 10 min default TTL for recs endpoint
recs_cache = TTLCache(default_ttl=600, max_size=2000)
