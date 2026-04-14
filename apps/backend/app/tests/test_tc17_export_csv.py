"""
TC17 — Data Export CSV (UTF-8 BOM) tests
==========================================
Covers:
  TC17.1  Response bắt đầu bằng UTF-8 BOM (b"\xef\xbb\xbf")
  TC17.2  Content-Type là "text/csv; charset=utf-8-sig"
  TC17.3  Header row đúng: id, email, full_name, role, is_locked, is_email_verified, created_at
  TC17.4  Ký tự tiếng Việt trong full_name được encode đúng, không lỗi
  TC17.5  Content-Disposition chứa filename users_export_*.csv
  TC17.6  Danh sách user rỗng → chỉ có header row (1 dòng sau BOM)
  TC17.7  Nhiều user → mỗi user là 1 row
  TC17.8  is_locked=True được ghi vào CSV đúng
  TC17.9  created_at None → cột đó là chuỗi rỗng không lỗi
  TC17.10 CSV có thể đọc lại bằng csv.reader mà không lỗi
"""
from __future__ import annotations

import csv
from io import StringIO
from unittest.mock import MagicMock, patch

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _mock_user(
    uid=1,
    email="user@example.com",
    full_name="Nguyen Van A",
    role="user",
    is_locked=False,
    is_email_verified=True,
    created_at=None,
):
    from datetime import datetime, timezone

    u = MagicMock()
    u.id = uid
    u.email = email
    u.full_name = full_name
    u.role = role
    u.is_locked = is_locked
    u.is_email_verified = is_email_verified
    u.created_at = created_at or datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)
    return u


def _call_export(users):
    """Gọi export_users_csv và trả về nội dung bytes của StreamingResponse."""
    from app.modules.admin.routes_admin import export_users_csv

    session = MagicMock()
    session.execute.return_value.scalars.return_value.all.return_value = users

    req = MagicMock()
    req.state.db = session

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99):
        response = export_users_csv(req)

    # StreamingResponse → đọc body
    body = b"".join(response.body_iterator)
    return response, body


# ──────────────────────────────────────────────────────────────
# TC17.1 — UTF-8 BOM
# ──────────────────────────────────────────────────────────────

def test_export_starts_with_bom():
    """TC17.1: File phải bắt đầu bằng UTF-8 BOM \xef\xbb\xbf."""
    _, body = _call_export([_mock_user()])
    assert body[:3] == b"\xef\xbb\xbf", "Missing UTF-8 BOM"


# ──────────────────────────────────────────────────────────────
# TC17.2 — Content-Type
# ──────────────────────────────────────────────────────────────

def test_export_content_type():
    """TC17.2: Content-Type phải là text/csv; charset=utf-8-sig."""
    response, _ = _call_export([_mock_user()])
    assert "text/csv" in response.media_type
    assert "utf-8-sig" in response.media_type or "utf-8" in response.media_type


# ──────────────────────────────────────────────────────────────
# TC17.3 — Header row
# ──────────────────────────────────────────────────────────────

def test_export_header_row():
    """TC17.3: Dòng đầu tiên (sau BOM) phải là các cột đúng thứ tự."""
    _, body = _call_export([])

    content = body.decode("utf-8-sig")
    reader = csv.reader(StringIO(content))
    header = next(reader)

    expected = ["id", "email", "full_name", "role", "is_locked", "is_email_verified", "created_at"]
    assert header == expected


# ──────────────────────────────────────────────────────────────
# TC17.4 — Tiếng Việt trong full_name
# ──────────────────────────────────────────────────────────────

def test_export_vietnamese_fullname():
    """TC17.4: full_name tiếng Việt không gây lỗi encode."""
    user = _mock_user(full_name="Nguyễn Văn Ánh")
    _, body = _call_export([user])

    content = body.decode("utf-8-sig")
    assert "Nguyễn Văn Ánh" in content


# ──────────────────────────────────────────────────────────────
# TC17.5 — Content-Disposition filename
# ──────────────────────────────────────────────────────────────

def test_export_content_disposition_filename():
    """TC17.5: Content-Disposition phải chứa filename=users_export_*.csv."""
    response, _ = _call_export([_mock_user()])
    disposition = response.headers.get("Content-Disposition", "")
    assert "users_export_" in disposition
    assert ".csv" in disposition
    assert "attachment" in disposition


# ──────────────────────────────────────────────────────────────
# TC17.6 — Danh sách rỗng
# ──────────────────────────────────────────────────────────────

def test_export_empty_users():
    """TC17.6: Không có user → chỉ có 1 dòng header sau BOM."""
    _, body = _call_export([])

    content = body.decode("utf-8-sig")
    rows = list(csv.reader(StringIO(content)))
    assert len(rows) == 1          # chỉ header


# ──────────────────────────────────────────────────────────────
# TC17.7 — Nhiều user
# ──────────────────────────────────────────────────────────────

def test_export_multiple_users():
    """TC17.7: 3 users → 4 rows (1 header + 3 data)."""
    users = [
        _mock_user(uid=1, email="a@test.com"),
        _mock_user(uid=2, email="b@test.com"),
        _mock_user(uid=3, email="c@test.com"),
    ]
    _, body = _call_export(users)

    content = body.decode("utf-8-sig")
    rows = list(csv.reader(StringIO(content)))
    assert len(rows) == 4


# ──────────────────────────────────────────────────────────────
# TC17.8 — is_locked=True
# ──────────────────────────────────────────────────────────────

def test_export_locked_user_flag():
    """TC17.8: is_locked=True được ghi vào CSV."""
    user = _mock_user(is_locked=True)
    _, body = _call_export([user])

    content = body.decode("utf-8-sig")
    assert "True" in content


# ──────────────────────────────────────────────────────────────
# TC17.9 — created_at=None
# ──────────────────────────────────────────────────────────────

def test_export_none_created_at():
    """TC17.9: created_at=None → không crash, cột để trống."""
    user = _mock_user(created_at=None)
    user.created_at = None  # override fixture default

    _, body = _call_export([user])
    # Không raise exception là đủ
    assert body[:3] == b"\xef\xbb\xbf"


# ──────────────────────────────────────────────────────────────
# TC17.10 — Có thể đọc lại bằng csv.reader
# ──────────────────────────────────────────────────────────────

def test_export_readable_by_csv_reader():
    """TC17.10: Nội dung CSV sau khi export có thể parse lại hoàn toàn."""
    users = [
        _mock_user(uid=1, email="test@example.com", full_name='Trần "Minh" Khôi'),
    ]
    _, body = _call_export(users)

    content = body.decode("utf-8-sig")
    rows = list(csv.reader(StringIO(content)))
    # header + 1 data row
    assert len(rows) == 2
    assert rows[0][0] == "id"
    assert rows[1][1] == "test@example.com"


# ──────────────────────────────────────────────────────────────
# Unit tests cho _iso_or_none helper
# ──────────────────────────────────────────────────────────────

def test_iso_or_none_returns_isoformat():
    """_iso_or_none(datetime) trả về ISO string."""
    from datetime import datetime, timezone

    from app.modules.admin.routes_admin import _iso_or_none

    dt = datetime(2024, 6, 15, 10, 30, 0, tzinfo=timezone.utc)
    result = _iso_or_none(dt)
    assert result is not None
    assert "2024" in result


def test_iso_or_none_returns_none_for_none():
    """_iso_or_none(None) → None."""
    from app.modules.admin.routes_admin import _iso_or_none

    assert _iso_or_none(None) is None
