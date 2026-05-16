"""
In-memory metrics collector for AI-core.
Tracks key operational metrics like cold-start ratio, cache hit rate, etc.
Lightweight — không cần Prometheus dependency.
"""
from __future__ import annotations

import threading
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any


class MetricsCollector:
    """Thread-safe in-memory counter."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counters: dict[str, int] = defaultdict(int)
        self._gauges: dict[str, float] = {}
        self._started_at = datetime.now(timezone.utc)

    def inc(self, name: str, delta: int = 1) -> None:
        with self._lock:
            self._counters[name] += delta

    def set_gauge(self, name: str, value: float) -> None:
        with self._lock:
            self._gauges[name] = value

    def get(self, name: str) -> int:
        with self._lock:
            return self._counters.get(name, 0)

    def snapshot(self) -> dict[str, Any]:
        """Return current state for /debug/metrics endpoint."""
        with self._lock:
            counters = dict(self._counters)
            gauges = dict(self._gauges)

        # Compute derived metrics
        total_recs = counters.get("recs_total", 0)
        cold_start = counters.get("recs_cold_start", 0)
        cache_hit = counters.get("cache_hit", 0)
        cache_miss = counters.get("cache_miss", 0)

        derived = {
            "cold_start_ratio": (cold_start / total_recs) if total_recs > 0 else 0.0,
            "cache_hit_ratio": (cache_hit / (cache_hit + cache_miss)) if (cache_hit + cache_miss) > 0 else 0.0,
            "uptime_seconds": (datetime.now(timezone.utc) - self._started_at).total_seconds(),
        }

        return {
            "counters": counters,
            "gauges": gauges,
            "derived": derived,
            "started_at": self._started_at.isoformat(),
        }


# Singleton
metrics = MetricsCollector()
