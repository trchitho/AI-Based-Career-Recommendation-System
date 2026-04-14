"""
TC16 — AI Monitor / Gemini Error Tracker tests
================================================
Covers:
  TC16.1  DeadlineExceeded → được ghi vào tracker với status_code=504
  TC16.2  ResourceExhausted → được ghi với status_code=429
  TC16.3  Generic Exception → được ghi với status_code=500
  TC16.4  _GeminiErrorTracker.recent() trả về newest-first, tối đa limit
  TC16.5  _GeminiErrorTracker.count_by_status() đếm đúng theo status_code
  TC16.6  Ring buffer không vượt quá maxlen=200
  TC16.7  GET /admin/ai-errors merge 2 nguồn: audit_logs + live_tracker
  TC16.8  Response chứa total_errors, error_504_count
  TC16.9  gemini_error_tracker là singleton module-level
  TC16.10 record() lưu đúng các trường: stream, error_type, status_code, detail, created_at
"""
from __future__ import annotations

from collections import deque
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import pytest


# ──────────────────────────────────────────────────────────────
# TC16.9 — Singleton kiểm tra
# ──────────────────────────────────────────────────────────────

def test_gemini_error_tracker_is_singleton():
    """TC16.9: gemini_error_tracker là cùng một object ở mọi import."""
    from app.core.gemini_manager import gemini_error_tracker as t1
    from app.core.gemini_manager import gemini_error_tracker as t2
    assert t1 is t2


# ──────────────────────────────────────────────────────────────
# TC16.10 — record() lưu đúng các trường
# ──────────────────────────────────────────────────────────────

def test_tracker_record_fields():
    """TC16.10: Mỗi entry phải có stream, error_type, status_code, detail, created_at."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=10)
    tracker.record(
        stream="assessment",
        error_type="DeadlineExceeded",
        status_code=504,
        detail="Timeout after 30s",
    )

    entry = tracker.recent(1)[0]
    assert entry["stream"] == "assessment"
    assert entry["error_type"] == "DeadlineExceeded"
    assert entry["status_code"] == 504
    assert entry["detail"] == "Timeout after 30s"
    assert "created_at" in entry


# ──────────────────────────────────────────────────────────────
# TC16.1 — DeadlineExceeded → status_code=504
# ──────────────────────────────────────────────────────────────

def test_tracker_records_504_for_deadline_exceeded():
    """TC16.1: Ghi error 504 → count_by_status(504) tăng."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=10)
    tracker.record("chatbot", "DeadlineExceeded", 504, "timeout")
    assert tracker.count_by_status(504) == 1


# ──────────────────────────────────────────────────────────────
# TC16.2 — ResourceExhausted → status_code=429
# ──────────────────────────────────────────────────────────────

def test_tracker_records_429_for_resource_exhausted():
    """TC16.2: Ghi error 429 → count_by_status(429) = 1."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=10)
    tracker.record("cv_analysis", "ResourceExhausted", 429, "quota exceeded")
    assert tracker.count_by_status(429) == 1


# ──────────────────────────────────────────────────────────────
# TC16.3 — Generic Exception → status_code=500
# ──────────────────────────────────────────────────────────────

def test_tracker_records_500_for_generic_error():
    """TC16.3: Ghi error 500 → count_by_status(500) tăng."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=10)
    tracker.record("chatbot", "ValueError", 500, "unexpected error")
    assert tracker.count_by_status(500) == 1


# ──────────────────────────────────────────────────────────────
# TC16.5 — count_by_status phân biệt đúng
# ──────────────────────────────────────────────────────────────

def test_tracker_count_by_status_correct():
    """TC16.5: count_by_status chỉ đếm đúng status_code tương ứng."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=20)
    tracker.record("s1", "DeadlineExceeded", 504, "t1")
    tracker.record("s2", "DeadlineExceeded", 504, "t2")
    tracker.record("s3", "ResourceExhausted", 429, "q1")
    tracker.record("s4", "ValueError", 500, "e1")

    assert tracker.count_by_status(504) == 2
    assert tracker.count_by_status(429) == 1
    assert tracker.count_by_status(500) == 1
    assert tracker.count_by_status(503) == 0


# ──────────────────────────────────────────────────────────────
# TC16.4 — recent() newest-first, tôn trọng limit
# ──────────────────────────────────────────────────────────────

def test_tracker_recent_newest_first():
    """TC16.4: recent() trả về entry mới nhất ở index 0 (appendleft)."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=10)
    tracker.record("s1", "Err", 500, "first")
    tracker.record("s2", "Err", 500, "second")

    recent = tracker.recent(2)
    # "second" được appendleft → index 0
    assert recent[0]["detail"] == "second"
    assert recent[1]["detail"] == "first"


def test_tracker_recent_respects_limit():
    """TC16.4: recent(limit) không trả về nhiều hơn limit entries."""
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=50)
    for i in range(20):
        tracker.record("s", "Err", 500, f"detail_{i}")

    assert len(tracker.recent(5)) == 5
    assert len(tracker.recent(100)) == 20   # chỉ có 20 entries


# ──────────────────────────────────────────────────────────────
# TC16.6 — Ring buffer giới hạn maxlen
# ──────────────────────────────────────────────────────────────

def test_tracker_ring_buffer_max_size():
    """TC16.6: Thêm nhiều hơn maxlen entries → buffer không vượt quá maxlen."""
    from app.core.gemini_manager import _GeminiErrorTracker

    maxlen = 5
    tracker = _GeminiErrorTracker(maxlen=maxlen)
    for i in range(10):
        tracker.record("s", "Err", 500, f"detail_{i}")

    assert len(tracker.recent(100)) == maxlen


# ──────────────────────────────────────────────────────────────
# TC16.7 — GET /admin/ai-errors merge 2 sources
# ──────────────────────────────────────────────────────────────

def _fake_audit_log_row(action: str, status_code: int):
    import json
    row = MagicMock()
    row.__getitem__ = lambda self, i: [
        action,
        json.dumps({"status_code": status_code, "error_type": "DeadlineExceeded",
                    "stream": "chatbot", "detail": "test"}),
        datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
    ][i]
    row.__iter__ = lambda self: iter([
        action,
        json.dumps({"status_code": status_code, "error_type": "DeadlineExceeded",
                    "stream": "chatbot", "detail": "test"}),
        datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
    ])
    return row


def test_get_ai_errors_merges_sources():
    """TC16.7: /admin/ai-errors merge audit_logs (persistent) + live_tracker."""
    from app.modules.admin.routes_admin import get_ai_errors
    from app.core.gemini_manager import _GeminiErrorTracker

    # Fake live tracker có 1 entry
    fake_tracker = _GeminiErrorTracker(maxlen=10)
    fake_tracker.record("assessment", "DeadlineExceeded", 504, "live error")

    # Fake DB query trả về 1 row (persistent)
    session = MagicMock()
    import json
    db_row = (
        "gemini_error_504",
        json.dumps({"status_code": 504, "error_type": "DeadlineExceeded",
                    "stream": "chatbot", "detail": "db error"}),
        datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
    )
    session.execute.return_value.fetchall.return_value = [db_row]

    req = MagicMock()
    req.state.db = session

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin.gemini_error_tracker", fake_tracker):
        result = get_ai_errors(req, days=7, limit=50)

    assert result["total_errors"] >= 1
    assert "errors" in result
    assert "total_errors" in result
    assert "error_504_count" in result


# ──────────────────────────────────────────────────────────────
# TC16.8 — Response shape
# ──────────────────────────────────────────────────────────────

def test_get_ai_errors_response_shape():
    """TC16.8: Response phải có total_errors, error_504_count, errors, days."""
    from app.modules.admin.routes_admin import get_ai_errors
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=5)

    session = MagicMock()
    session.execute.return_value.fetchall.return_value = []

    req = MagicMock()
    req.state.db = session

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin.gemini_error_tracker", tracker):
        result = get_ai_errors(req, days=7, limit=50)

    required_keys = {"total_errors", "error_504_count", "errors", "days"}
    assert required_keys.issubset(result.keys())


def test_error_504_count_only_counts_504():
    """TC16.8: error_504_count chỉ đếm các lỗi có status_code=504."""
    from app.modules.admin.routes_admin import get_ai_errors
    from app.core.gemini_manager import _GeminiErrorTracker

    tracker = _GeminiErrorTracker(maxlen=20)
    tracker.record("s1", "DeadlineExceeded", 504, "t1")
    tracker.record("s2", "DeadlineExceeded", 504, "t2")
    tracker.record("s3", "ResourceExhausted", 429, "q1")

    session = MagicMock()
    session.execute.return_value.fetchall.return_value = []

    req = MagicMock()
    req.state.db = session

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin.gemini_error_tracker", tracker):
        result = get_ai_errors(req, days=7, limit=50)

    assert result["error_504_count"] == 2
    assert result["total_errors"] == 3
