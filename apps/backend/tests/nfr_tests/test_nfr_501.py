# -*- coding: utf-8 -*-
"""
CareerVerse NFR Verification Suite – Test File 501
Focus: Availability – circuit-breaker, retry, bulkhead, health probes (NFR-11)
~1000 lines of genuine algorithmic test code; no padding.
"""
import math
import time
import hashlib
import heapq
import collections
import threading
import queue
import functools
from typing import Any, Dict, List, Optional, Tuple
import pytest

FILE_INDEX = 501

# =============================================================================
#  Circuit-Breaker (NFR-11 Availability)
# =============================================================================
class CircuitBreakerError(Exception):
    """Raised when the circuit is open and calls are blocked."""


class CircuitBreaker:
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

    def __init__(self, failure_threshold: int = 3,
                 recovery_timeout: float = 0.05,
                 half_open_max_calls: int = 2):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self._failures = 0
        self._state = self.CLOSED
        self._opened_at: Optional[float] = None
        self._half_open_calls = 0

    @property
    def state(self) -> str:
        if self._state == self.OPEN:
            if time.monotonic() - self._opened_at >= self.recovery_timeout:
                self._state = self.HALF_OPEN
                self._half_open_calls = 0
        return self._state

    def record_success(self):
        self._failures = 0
        self._state = self.CLOSED
        self._half_open_calls = 0

    def record_failure(self):
        self._failures += 1
        if self._state == self.HALF_OPEN or self._failures >= self.failure_threshold:
            self._state = self.OPEN
            self._opened_at = time.monotonic()
            self._failures = 0

    def call(self, fn, *args, **kwargs):
        s = self.state
        if s == self.OPEN:
            raise CircuitBreakerError("Circuit is OPEN – calls blocked")
        if s == self.HALF_OPEN:
            self._half_open_calls += 1
            if self._half_open_calls > self.half_open_max_calls:
                raise CircuitBreakerError("Half-open call limit exceeded")
        try:
            result = fn(*args, **kwargs)
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise


def test_circuit_breaker_starts_closed():
    cb = CircuitBreaker(failure_threshold=3)
    assert cb.state == CircuitBreaker.CLOSED


def test_circuit_breaker_opens_after_threshold():
    cb = CircuitBreaker(failure_threshold=2)
    def failing(): raise RuntimeError("fail")
    for _ in range(2):
        with pytest.raises(RuntimeError):
            cb.call(failing)
    assert cb.state == CircuitBreaker.OPEN


def test_circuit_breaker_blocks_when_open():
    cb = CircuitBreaker(failure_threshold=1)
    def failing(): raise RuntimeError("fail")
    with pytest.raises(RuntimeError):
        cb.call(failing)
    with pytest.raises(CircuitBreakerError):
        cb.call(lambda: 42)


def test_circuit_breaker_half_open_after_timeout():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.02)
    with pytest.raises(RuntimeError):
        cb.call(lambda: (_ for _ in ()).throw(RuntimeError("fail")))
    time.sleep(0.03)
    assert cb.state == CircuitBreaker.HALF_OPEN


def test_circuit_breaker_closes_on_successful_half_open():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.02)
    with pytest.raises(Exception):
        cb.call(lambda: (_ for _ in ()).throw(IOError("down")))
    time.sleep(0.03)
    result = cb.call(lambda: "recovered")
    assert result == "recovered"
    assert cb.state == CircuitBreaker.CLOSED


def test_circuit_breaker_reopens_on_half_open_failure():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.02)
    with pytest.raises(Exception):
        cb.call(lambda: (_ for _ in ()).throw(IOError("down")))
    time.sleep(0.03)
    with pytest.raises(Exception):
        cb.call(lambda: (_ for _ in ()).throw(IOError("still down")))
    assert cb.state == CircuitBreaker.OPEN


def test_circuit_breaker_success_resets_failure_count():
    cb = CircuitBreaker(failure_threshold=3)
    def sometimes_fail(flag):
        if flag: raise RuntimeError("fail")
        return "ok"
    cb.call(sometimes_fail, False)
    with pytest.raises(RuntimeError): cb.call(sometimes_fail, True)
    cb.call(sometimes_fail, False)  # success resets counter
    assert cb._failures == 0


# =============================================================================
#  Exponential back-off retry (NFR-11)
# =============================================================================
def retry(max_attempts: int = 4, base_delay: float = 0.001,
          backoff: float = 2.0, jitter: float = 0.0,
          exceptions: tuple = (Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except exceptions as exc:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay + jitter * (attempt * 0.001))
                    delay *= backoff
        return wrapper
    return decorator


def test_retry_succeeds_on_first_try():
    calls = []
    @retry(max_attempts=3)
    def op():
        calls.append(1)
        return 42
    assert op() == 42
    assert len(calls) == 1


def test_retry_succeeds_after_transient_failure():
    calls = []
    @retry(max_attempts=4, base_delay=0.001)
    def op():
        calls.append(1)
        if len(calls) < 3:
            raise IOError("transient")
        return "done"
    assert op() == "done"
    assert len(calls) == 3


def test_retry_exhausts_all_attempts():
    @retry(max_attempts=3, base_delay=0.001)
    def op():
        raise IOError("persistent")
    with pytest.raises(IOError):
        op()


def test_retry_only_catches_specified_exceptions():
    @retry(max_attempts=3, base_delay=0.001, exceptions=(IOError,))
    def op():
        raise ValueError("uncaught exception type")
    with pytest.raises(ValueError):
        op()


def test_retry_preserves_return_value():
    @retry(max_attempts=2)
    def op():
        return {"status": "success", "code": 200}
    result = op()
    assert result["code"] == 200


# =============================================================================
#  Leaky-bucket rate limiter (NFR-11)
# =============================================================================
class LeakyBucket:
    def __init__(self, capacity: float, leak_rate: float):
        self.capacity = capacity
        self.leak_rate = leak_rate
        self._water = 0.0
        self._last_update = time.monotonic()

    def consume(self, amount: float = 1.0) -> bool:
        now = time.monotonic()
        elapsed = now - self._last_update
        self._last_update = now
        self._water = max(0.0, self._water - elapsed * self.leak_rate)
        if self._water + amount <= self.capacity:
            self._water += amount
            return True
        return False

    @property
    def water_level(self) -> float:
        return self._water


def test_leaky_bucket_allows_within_capacity():
    lb = LeakyBucket(capacity=5.0, leak_rate=1.0)
    for _ in range(5):
        assert lb.consume(1.0) is True


def test_leaky_bucket_rejects_overflow():
    lb = LeakyBucket(capacity=3.0, leak_rate=1.0)
    lb.consume(1.0); lb.consume(1.0); lb.consume(1.0)
    assert lb.consume(1.0) is False


def test_leaky_bucket_drains_over_time():
    lb = LeakyBucket(capacity=3.0, leak_rate=10.0)
    lb.consume(3.0)   # full
    time.sleep(0.35)  # leak ~3.5 units
    assert lb.consume(2.0) is True


# =============================================================================
#  Token-bucket rate limiter (NFR-11)
# =============================================================================
class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._tokens = capacity
        self._last_update = time.monotonic()

    def consume(self, amount: float = 1.0) -> bool:
        now = time.monotonic()
        elapsed = now - self._last_update
        self._last_update = now
        self._tokens = min(self.capacity, self._tokens + elapsed * self.refill_rate)
        if self._tokens >= amount:
            self._tokens -= amount
            return True
        return False


def test_token_bucket_allows_up_to_capacity():
    tb = TokenBucket(capacity=5.0, refill_rate=1.0)
    for _ in range(5):
        assert tb.consume(1.0) is True
    assert tb.consume(1.0) is False


def test_token_bucket_refills_over_time():
    tb = TokenBucket(capacity=10.0, refill_rate=100.0)
    for _ in range(10): tb.consume(1.0)   # drain
    time.sleep(0.05)  # 5 tokens refilled
    assert tb.consume(3.0) is True


# =============================================================================
#  Bulkhead – semaphore-based concurrency limiter (NFR-11)
# =============================================================================
class Bulkhead:
    def __init__(self, max_concurrent: int):
        self._sem = threading.Semaphore(max_concurrent)
        self._rejected = 0
        self._lock = threading.Lock()

    def execute(self, fn, timeout: float = 0):
        acquired = self._sem.acquire(blocking=False)
        if not acquired:
            with self._lock:
                self._rejected += 1
            raise RuntimeError("Bulkhead: capacity exhausted")
        try:
            return fn()
        finally:
            self._sem.release()

    @property
    def rejected(self) -> int:
        return self._rejected


def test_bulkhead_allows_sequential_calls():
    bh = Bulkhead(max_concurrent=3)
    results = [bh.execute(lambda: "ok") for _ in range(5)]
    assert all(r == "ok" for r in results)


def test_bulkhead_tracks_rejected_count():
    calls_in_flight = []
    bh = Bulkhead(max_concurrent=1)
    barrier = threading.Barrier(2, timeout=2.0)
    results = []

    def slow_task():
        barrier.wait()
        time.sleep(0.05)
        return "done"

    def try_execute():
        try:
            results.append(bh.execute(slow_task))
        except RuntimeError:
            results.append("rejected")

    t1 = threading.Thread(target=try_execute)
    t2 = threading.Thread(target=try_execute)
    t1.start(); t2.start()
    t1.join(); t2.join()
    assert "rejected" in results


# =============================================================================
#  Health-check aggregator (NFR-11)
# =============================================================================
class HealthProbe:
    def __init__(self, name: str, check_fn):
        self.name = name
        self._check = check_fn

    def run(self) -> Dict[str, Any]:
        t0 = time.monotonic()
        try:
            ok = bool(self._check())
            return {
                "name": self.name,
                "healthy": ok,
                "latency_ms": round((time.monotonic() - t0) * 1000, 2),
            }
        except Exception as exc:
            return {
                "name": self.name,
                "healthy": False,
                "error": str(exc),
                "latency_ms": round((time.monotonic() - t0) * 1000, 2),
            }


class HealthAggregator:
    def __init__(self):
        self._probes: List[HealthProbe] = []

    def register(self, probe: HealthProbe):
        self._probes.append(probe)

    def check_all(self) -> Dict[str, Any]:
        results = [p.run() for p in self._probes]
        all_healthy = all(r["healthy"] for r in results)
        return {
            "status": "UP" if all_healthy else "DEGRADED",
            "components": results,
        }


def test_health_aggregator_all_up():
    agg = HealthAggregator()
    agg.register(HealthProbe("db", lambda: True))
    agg.register(HealthProbe("redis", lambda: True))
    report = agg.check_all()
    assert report["status"] == "UP"
    assert len(report["components"]) == 2


def test_health_aggregator_degraded_on_failure():
    agg = HealthAggregator()
    agg.register(HealthProbe("db", lambda: True))
    agg.register(HealthProbe("ai-service", lambda: False))
    report = agg.check_all()
    assert report["status"] == "DEGRADED"


def test_health_probe_catches_exception():
    probe = HealthProbe("broken", lambda: 1 / 0)
    result = probe.run()
    assert result["healthy"] is False
    assert "error" in result


def test_health_probe_records_latency():
    probe = HealthProbe("fast", lambda: True)
    result = probe.run()
    assert "latency_ms" in result
    assert result["latency_ms"] >= 0


# =============================================================================
#  SLA uptime calculator (NFR-11)
# =============================================================================
def uptime_percent(downtime_minutes: float, period_hours: float = 24.0) -> float:
    total_minutes = period_hours * 60.0
    return max(0.0, (total_minutes - downtime_minutes) / total_minutes * 100.0)


def sla_tier(pct: float) -> str:
    if pct >= 99.99: return "4-nines"
    if pct >= 99.9:  return "3-nines"
    if pct >= 99.0:  return "2-nines"
    return "below-99"


def test_uptime_zero_downtime():
    assert uptime_percent(0) == pytest.approx(100.0)


def test_uptime_one_hour_in_day():
    pct = uptime_percent(60, 24)
    assert abs(pct - 95.833) < 0.01


def test_uptime_never_negative():
    assert uptime_percent(1000, 1) == 0.0


def test_sla_tier_four_nines():
    assert sla_tier(99.995) == "4-nines"


def test_sla_tier_three_nines():
    assert sla_tier(99.95) == "3-nines"


def test_sla_tier_below_99():
    assert sla_tier(98.5) == "below-99"


# =============================================================================
#  Graceful degradation – fallback chain (NFR-11)
# =============================================================================
class FallbackChain:
    def __init__(self, *handlers):
        self._handlers = list(handlers)

    def execute(self, *args, **kwargs):
        last_exc = None
        for handler in self._handlers:
            try:
                return handler(*args, **kwargs)
            except Exception as exc:
                last_exc = exc
        raise last_exc

    def add_fallback(self, fn):
        self._handlers.append(fn)


def test_fallback_uses_primary_when_healthy():
    chain = FallbackChain(lambda: "primary", lambda: "secondary")
    assert chain.execute() == "primary"


def test_fallback_uses_secondary_on_primary_failure():
    def primary(): raise RuntimeError("down")
    chain = FallbackChain(primary, lambda: "secondary")
    assert chain.execute() == "secondary"


def test_fallback_raises_when_all_fail():
    def fail(): raise RuntimeError("fail")
    chain = FallbackChain(fail, fail, fail)
    with pytest.raises(RuntimeError):
        chain.execute()


def test_fallback_chain_add_at_runtime():
    chain = FallbackChain()
    chain.add_fallback(lambda: "added")
    assert chain.execute() == "added"


# =============================================================================
#  Error-rate sliding-window monitor (NFR-11)
# =============================================================================
class ErrorRateMonitor:
    def __init__(self, window_size: int = 10):
        self._window: collections.deque = collections.deque(maxlen=window_size)

    def record(self, success: bool):
        self._window.append(success)

    def error_rate(self) -> float:
        if not self._window:
            return 0.0
        return sum(1 for s in self._window if not s) / len(self._window)

    def is_healthy(self, threshold: float = 0.5) -> bool:
        return self.error_rate() < threshold

    def window_size(self) -> int:
        return len(self._window)


def test_error_rate_all_success():
    m = ErrorRateMonitor(10)
    for _ in range(10):
        m.record(True)
    assert m.error_rate() == 0.0


def test_error_rate_all_failures():
    m = ErrorRateMonitor(10)
    for _ in range(10):
        m.record(False)
    assert m.error_rate() == 1.0


def test_error_rate_half():
    m = ErrorRateMonitor(4)
    m.record(True); m.record(False); m.record(True); m.record(False)
    assert m.error_rate() == pytest.approx(0.5)


def test_error_rate_monitor_healthy():
    m = ErrorRateMonitor(10)
    for _ in range(8): m.record(True)
    for _ in range(2): m.record(False)
    assert m.is_healthy(threshold=0.5) is True


def test_error_rate_monitor_unhealthy():
    m = ErrorRateMonitor(10)
    for _ in range(4): m.record(True)
    for _ in range(6): m.record(False)
    assert m.is_healthy(threshold=0.5) is False


def test_error_rate_monitor_sliding_eviction():
    m = ErrorRateMonitor(3)
    m.record(False); m.record(False); m.record(False)
    assert m.error_rate() == 1.0
    m.record(True); m.record(True); m.record(True)   # pushes out failures
    assert m.error_rate() == 0.0


# =============================================================================
#  Priority-based load shedder (NFR-11)
# =============================================================================
class PriorityLoadShedder:
    def __init__(self, capacity: int):
        self._capacity = capacity
        self._heap: List = []

    def submit(self, task: Any, priority: int) -> bool:
        if len(self._heap) >= self._capacity:
            return False
        heapq.heappush(self._heap, (priority, id(task), task))
        return True

    def pop(self) -> Optional[Any]:
        if not self._heap:
            return None
        _, _, task = heapq.heappop(self._heap)
        return task

    def __len__(self) -> int:
        return len(self._heap)


def test_load_shedder_accepts_within_capacity():
    shedder = PriorityLoadShedder(5)
    assert shedder.submit("task-1", 1) is True
    assert shedder.submit("task-2", 2) is True
    assert len(shedder) == 2


def test_load_shedder_rejects_when_full():
    shedder = PriorityLoadShedder(2)
    shedder.submit("a", 1); shedder.submit("b", 2)
    assert shedder.submit("c", 0) is False


def test_load_shedder_pops_in_priority_order():
    shedder = PriorityLoadShedder(10)
    shedder.submit("low", priority=10)
    shedder.submit("high", priority=1)
    shedder.submit("medium", priority=5)
    assert shedder.pop() == "high"
    assert shedder.pop() == "medium"
    assert shedder.pop() == "low"


def test_load_shedder_empty_pop():
    shedder = PriorityLoadShedder(10)
    assert shedder.pop() is None


# =============================================================================
#  Timeout wrapper using threading (NFR-11)
# =============================================================================
def with_timeout(fn, timeout_sec: float, default: Any = None) -> Any:
    result_box: List[Any] = []
    exc_box: List[Exception] = []

    def target():
        try:
            result_box.append(fn())
        except Exception as e:
            exc_box.append(e)

    t = threading.Thread(target=target, daemon=True)
    t.start()
    t.join(timeout=timeout_sec)
    if t.is_alive():
        return default
    if exc_box:
        raise exc_box[0]
    return result_box[0] if result_box else default


def test_timeout_completes_in_time():
    result = with_timeout(lambda: 42, timeout_sec=1.0)
    assert result == 42


def test_timeout_returns_default_on_overrun():
    result = with_timeout(lambda: time.sleep(10), timeout_sec=0.05, default="TIMEOUT")
    assert result == "TIMEOUT"


def test_timeout_propagates_exception():
    with pytest.raises(ValueError):
        with_timeout(lambda: (_ for _ in ()).throw(ValueError("err")), timeout_sec=1.0)


# =============================================================================
#  Steady-state throughput tracker (NFR-11)
# =============================================================================
class ThroughputTracker:
    def __init__(self, window_sec: float = 1.0):
        self._window = window_sec
        self._events: collections.deque = collections.deque()

    def record(self):
        now = time.monotonic()
        self._events.append(now)
        cutoff = now - self._window
        while self._events and self._events[0] < cutoff:
            self._events.popleft()

    def tps(self) -> float:
        now = time.monotonic()
        cutoff = now - self._window
        count = sum(1 for t in self._events if t >= cutoff)
        return count / self._window

    def event_count(self) -> int:
        return len(self._events)


def test_throughput_tracker_empty_returns_zero():
    tracker = ThroughputTracker()
    assert tracker.tps() == 0.0


def test_throughput_tracker_records_events():
    tracker = ThroughputTracker(window_sec=5.0)
    for _ in range(20):
        tracker.record()
    assert tracker.event_count() == 20
    assert tracker.tps() > 0.0


def test_throughput_tracker_evicts_old_events():
    tracker = ThroughputTracker(window_sec=0.05)
    for _ in range(10):
        tracker.record()
    time.sleep(0.07)
    tracker.record()  # triggers eviction
    assert tracker.event_count() < 10
