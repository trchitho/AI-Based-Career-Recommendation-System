# apps/backend/app/modules/auth/routes_tokens.py
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import TIMESTAMP, BigInteger, Column, Text, select
from sqlalchemy.orm import Session as ORMSession
from sqlalchemy.orm import registry

# NOTE: import model User ở top để tránh E402
from ..users.models import User

router = APIRouter(tags=["auth-tokens"])

# Declarative mapping tối giản để tránh circular import
mapper_registry = registry()


@mapper_registry.mapped
class AuthToken:
    __tablename__ = "auth_tokens"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    token = Column(Text, nullable=False, unique=True)
    ttype = Column(Text, nullable=False)  # "verify_email" | "reset_password" | ...
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, default=datetime.now(timezone.utc)
    )

    def is_expired(self) -> bool:
        return self.expires_at <= datetime.now(timezone.utc)


def _db(req: Request) -> ORMSession:
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="DB session not available")
    return db


def _issue_token(session: ORMSession, user_id: int, ttype: str, minutes: int = 30) -> str:
    now = datetime.now(timezone.utc)
    tok = AuthToken(
        user_id=user_id,
        token=secrets.token_urlsafe(48),
        ttype=ttype,
        expires_at=now + timedelta(minutes=minutes),
        used_at=None,
        created_at=now,
    )
    session.add(tok)
    session.commit()
    return tok.token


@router.post("/request-verify")
def request_verify(request: Request, payload: Dict[str, Any]):
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        # Tránh lộ thông tin tồn tại tài khoản
        return {"status": "ok"}

    token = _issue_token(session, u.id, "verify_email", minutes=60)
    # TODO: gửi email thật. Dev mode trả token để test nhanh
    return {"status": "ok", "dev_token": token}


@router.post("/verify")
def verify_email(request: Request, payload: Dict[str, Any]):
    session = _db(request)
    token = (payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")

    tok = session.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.ttype == "verify_email",
        )
    ).scalar_one_or_none()

    if not tok or tok.used_at is not None or tok.is_expired():
        raise HTTPException(status_code=400, detail="invalid or expired token")

    tok.used_at = datetime.now(timezone.utc)
    session.commit()
    return {"status": "verified"}


@router.post("/forgot")
def forgot_password(request: Request, payload: Dict[str, Any]):
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        return {"status": "ok"}

    token = _issue_token(session, u.id, "reset_password", minutes=30)
    return {"status": "ok", "dev_token": token}


@router.post("/reset")
def reset_password(request: Request, payload: Dict[str, Any]):
    session = _db(request)

    token = (payload.get("token") or "").strip()
    new_pw = (payload.get("new_password") or "").strip()
    if not token or not new_pw:
        raise HTTPException(status_code=400, detail="token and new_password required")

    tok = session.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.ttype == "reset_password",
        )
    ).scalar_one_or_none()

    if not tok or tok.used_at is not None or tok.is_expired():
        raise HTTPException(status_code=400, detail="invalid or expired token")

    u = session.get(User, tok.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")

    # Import tại đây để tránh circular import từ core.security
    from ...core.security import hash_password

    u.password_hash = hash_password(new_pw)
    tok.used_at = datetime.now(timezone.utc)
    session.commit()
    return {"status": "password_reset"}
