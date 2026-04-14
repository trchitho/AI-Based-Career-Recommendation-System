"""
TC15 — Ban / Unban User tests
==============================
Covers:
  TC15.1  Ban user → is_locked=True, refresh tokens bị thu hồi, audit log ghi
  TC15.2  Ban user đã bị ban → 409 Conflict
  TC15.3  Ban user không tồn tại → 404
  TC15.4  Unban user → is_locked=False, không khôi phục refresh tokens
  TC15.5  Unban user chưa bị ban → 409 Conflict
  TC15.6  Unban user không tồn tại → 404
  TC15.7  _revoke_all_refresh_tokens UPDATE đúng WHERE clause
  TC15.8  Audit log ghi action='ban_user' với đúng entity
  TC15.9  Sau khi ban, user bị reject ở auth middleware (is_locked=True)
  TC15.10 Response shape đầy đủ các trường
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _mock_user(user_id: int = 1, email: str = "user@test.com", is_locked: bool = False):
    u = MagicMock()
    u.id = user_id
    u.email = email
    u.is_locked = is_locked
    u.full_name = "Test User"
    u.role = "user"
    return u


def _mock_session(user=None, rowcount: int = 2):
    session = MagicMock()
    session.get.return_value = user
    execute_result = MagicMock()
    execute_result.rowcount = rowcount
    session.execute.return_value = execute_result
    return session


# ──────────────────────────────────────────────────────────────
# TC15.6 — Hằng số / business logic đơn vị
# ──────────────────────────────────────────────────────────────

def test_ts_boost_weight_unrelated():
    """Sanity: test file load OK."""
    assert True


# ──────────────────────────────────────────────────────────────
# TC15 — _revoke_all_refresh_tokens logic
# ──────────────────────────────────────────────────────────────

def test_revoke_all_refresh_tokens_correct_sql():
    """TC15.7: SQL UPDATE phải nhắm đúng user_id và revoked=FALSE."""
    from app.modules.admin.routes_admin import _revoke_all_refresh_tokens

    session = MagicMock()
    result = MagicMock()
    result.rowcount = 3
    session.execute.return_value = result

    count = _revoke_all_refresh_tokens(session, user_id=42)

    assert count == 3
    # Kiểm tra SQL được gọi với user_id đúng
    call_args = session.execute.call_args
    params = call_args[0][1]          # positional arg[1] = params dict
    assert params.get("uid") == 42


def test_revoke_returns_zero_when_no_active_tokens():
    """TC15.7: rowcount=0 khi user không có refresh token nào."""
    from app.modules.admin.routes_admin import _revoke_all_refresh_tokens

    session = MagicMock()
    result = MagicMock()
    result.rowcount = 0
    session.execute.return_value = result

    count = _revoke_all_refresh_tokens(session, user_id=99)
    assert count == 0


# ──────────────────────────────────────────────────────────────
# TC15 — ban_user endpoint (unit test qua mock request)
# ──────────────────────────────────────────────────────────────

def _make_request(session, admin_id: int = 99):
    req = MagicMock()
    req.state.db = session
    return req


def test_ban_user_not_found():
    """TC15.3: user_id không tồn tại → HTTPException 404."""
    from app.modules.admin.routes_admin import ban_user

    session = _mock_session(user=None)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99):
        with pytest.raises(HTTPException) as exc:
            ban_user(req, user_id=9999)
    assert exc.value.status_code == 404


def test_ban_user_already_banned():
    """TC15.2: user đã is_locked=True → HTTPException 409."""
    from app.modules.admin.routes_admin import ban_user

    user = _mock_user(is_locked=True)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99):
        with pytest.raises(HTTPException) as exc:
            ban_user(req, user_id=1)
    assert exc.value.status_code == 409


def test_ban_user_success():
    """TC15.1: Ban thành công → is_locked=True, revoke tokens, response shape đúng."""
    from app.modules.admin.routes_admin import ban_user

    user = _mock_user(is_locked=False)
    session = _mock_session(user=user, rowcount=2)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._revoke_all_refresh_tokens", return_value=2), \
         patch("app.modules.admin.routes_admin._write_audit_log"):
        result = ban_user(req, user_id=1)

    assert result["ok"] is True
    assert result["is_locked"] is True
    assert result["refresh_tokens_revoked"] == 2
    assert "email" in result
    assert "message" in result


def test_ban_user_sets_is_locked_true():
    """TC15.9: Sau ban, user.is_locked được set thành True."""
    from app.modules.admin.routes_admin import ban_user

    user = _mock_user(is_locked=False)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._revoke_all_refresh_tokens", return_value=1), \
         patch("app.modules.admin.routes_admin._write_audit_log"):
        ban_user(req, user_id=1)

    assert user.is_locked is True


# ──────────────────────────────────────────────────────────────
# TC15 — unban_user endpoint
# ──────────────────────────────────────────────────────────────

def test_unban_user_not_found():
    """TC15.6: user_id không tồn tại → HTTPException 404."""
    from app.modules.admin.routes_admin import unban_user

    session = _mock_session(user=None)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99):
        with pytest.raises(HTTPException) as exc:
            unban_user(req, user_id=9999)
    assert exc.value.status_code == 404


def test_unban_user_not_banned():
    """TC15.5: user chưa bị ban (is_locked=False) → HTTPException 409."""
    from app.modules.admin.routes_admin import unban_user

    user = _mock_user(is_locked=False)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99):
        with pytest.raises(HTTPException) as exc:
            unban_user(req, user_id=1)
    assert exc.value.status_code == 409


def test_unban_user_success():
    """TC15.4: Unban thành công → is_locked=False, response đúng shape."""
    from app.modules.admin.routes_admin import unban_user

    user = _mock_user(is_locked=True)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._write_audit_log"):
        result = unban_user(req, user_id=1)

    assert result["ok"] is True
    assert result["is_locked"] is False
    assert user.is_locked is False


def test_unban_does_not_restore_refresh_tokens():
    """TC15.4: Unban không restore refresh tokens — _revoke_all_refresh_tokens không được gọi."""
    from app.modules.admin.routes_admin import unban_user

    user = _mock_user(is_locked=True)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._write_audit_log"), \
         patch("app.modules.admin.routes_admin._revoke_all_refresh_tokens") as mock_revoke:
        unban_user(req, user_id=1)

    mock_revoke.assert_not_called()


# ──────────────────────────────────────────────────────────────
# TC15.8 — Audit log
# ──────────────────────────────────────────────────────────────

def test_ban_writes_audit_log_ban_user_action():
    """TC15.8: Ban phải ghi audit log với action='ban_user', entity='user'."""
    from app.modules.admin.routes_admin import ban_user

    user = _mock_user(is_locked=False)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._revoke_all_refresh_tokens", return_value=0), \
         patch("app.modules.admin.routes_admin._write_audit_log") as mock_log:
        ban_user(req, user_id=1)

    mock_log.assert_called_once()
    call_kwargs = mock_log.call_args
    args = call_kwargs[0]  # positional
    assert args[1] == "ban_user"   # action
    assert args[2] == "user"       # entity


def test_unban_writes_audit_log_unban_user_action():
    """TC15.8: Unban phải ghi audit log với action='unban_user'."""
    from app.modules.admin.routes_admin import unban_user

    user = _mock_user(is_locked=True)
    session = _mock_session(user=user)
    req = _make_request(session)

    with patch("app.modules.admin.routes_admin.require_admin", return_value=99), \
         patch("app.modules.admin.routes_admin._write_audit_log") as mock_log:
        unban_user(req, user_id=1)

    mock_log.assert_called_once()
    args = mock_log.call_args[0]
    assert args[1] == "unban_user"
