"""
JWT Auth Middleware — PB02 Session Management

Runs on every request:
1. Reads Bearer token from Authorization header
2. Verifies JWT signature + expiry
3. Checks revoked_access_tokens blacklist (supports TC02: old token → 401)
4. Loads User from DB and sets request.state.user / request.state.user_id

Non-authenticated requests pass through (request.state.user = None).
Protected routes use Depends(get_current_user) which raises 401 if no user.
"""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _extract_bearer(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def _is_blacklisted(db: Session, jti: str) -> bool:
    """Check if access token JTI is in the revocation blacklist."""
    try:
        row = db.execute(
            text("SELECT 1 FROM core.revoked_access_tokens WHERE jti = :jti LIMIT 1"),
            {"jti": jti},
        ).fetchone()
        return row is not None
    except Exception:
        # Table doesn't exist yet — not blacklisted
        return False


def ensure_blacklist_table(db: Session) -> None:
    """Create the revoked_access_tokens table if it doesn't exist."""
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS core.revoked_access_tokens (
                jti         TEXT PRIMARY KEY,
                user_id     BIGINT,
                revoked_at  TIMESTAMPTZ DEFAULT NOW(),
                expires_at  TIMESTAMPTZ
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_expires
            ON core.revoked_access_tokens (expires_at)
        """))
        db.commit()
    except Exception as e:
        logger.warning(f"[Auth] ensure_blacklist_table: {e}")
        db.rollback()


def revoke_access_token(db: Session, jti: str, user_id: int, expires_at: datetime | None) -> None:
    """Add a JTI to the blacklist on logout."""
    ensure_blacklist_table(db)
    try:
        db.execute(text("""
            INSERT INTO core.revoked_access_tokens (jti, user_id, expires_at)
            VALUES (:jti, :uid, :exp)
            ON CONFLICT (jti) DO NOTHING
        """), {"jti": jti, "uid": user_id, "exp": expires_at})
        db.commit()
    except Exception as e:
        logger.warning(f"[Auth] revoke_access_token failed: {e}")
        db.rollback()


def cleanup_expired_blacklist(db: Session) -> None:
    """Remove expired entries from the blacklist (call periodically)."""
    try:
        db.execute(text("""
            DELETE FROM core.revoked_access_tokens
            WHERE expires_at IS NOT NULL AND expires_at < NOW()
        """))
        db.commit()
    except Exception:
        db.rollback()


async def jwt_auth_middleware(request: Request, call_next):
    """
    FastAPI middleware that authenticates requests via JWT Bearer token.

    Sets on request.state:
      - user_id (int | None)
      - user    (User ORM object | None)

    Never raises — unauthenticated requests pass through with user=None.
    """
    request.state.user = None
    request.state.user_id = None

    token = _extract_bearer(request)
    if not token:
        return await call_next(request)

    # Decode JWT (lazy import to avoid circular dep)
    try:
        from app.core.jwt import decode_token
        payload = decode_token(token)
    except Exception:
        # Expired or invalid token — let route decide (401 if protected)
        return await call_next(request)

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not sub:
        return await call_next(request)

    # Check blacklist if jti present
    db: Session | None = getattr(request.state, "db", None)
    if db and jti and _is_blacklisted(db, jti):
        # Token is revoked — clear it so protected routes return 401
        return await call_next(request)

    # Load user from DB
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        return await call_next(request)

    if db:
        try:
            from app.modules.users.models import User
            from sqlalchemy import select
            user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
            if user and not getattr(user, "is_locked", False):
                request.state.user = user
                request.state.user_id = user_id
        except Exception as e:
            logger.debug(f"[Auth] Failed to load user {user_id}: {e}")

    return await call_next(request)
