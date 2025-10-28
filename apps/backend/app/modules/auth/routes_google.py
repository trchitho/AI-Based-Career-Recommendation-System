# app/modules/auth/routes_tokens.py

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import TIMESTAMP, BigInteger, Column, Text, select
from sqlalchemy.orm import Session, registry

from ..users.models import User
from ...core.security import hash_password

router = APIRouter()

# Sử dụng registry để tránh vòng lặp import với declarative_base toàn cục
mapper_registry = registry()


@mapper_registry.mapped
class AuthToken:
    __tablename__ = "auth_tokens"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    token = Column(Text, nullable=False)
    ttype = Column(Text, nullable=False)  # "verify_email" | "reset_password" | ...
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used_at = Column(TIMESTAMP(timezone=True), nullable=True)


def _db(req: Request) -> Session:
    return req.state.db


def _issue_token(session: Session, user_id: int, ttype: str, minutes: int = 30) -> str:
    token_value = secrets.token_urlsafe(48)
    tok = AuthToken(
        user_id=user_id,
        token=token_value,
        ttype=ttype,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=minutes),
        used_at=None,
    )
    session.add(tok)
    session.commit()
    return token_value


@router.post("/request-verify")
def request_verify(request: Request, payload: dict) -> dict:
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        # Tránh lộ thông tin tồn tại tài khoản
        return {"status": "ok"}

    token = _issue_token(session, u.id, "verify_email", minutes=60)
    # TODO: gửi email; hiện tại trả về token cho môi trường dev
    return {"status": "ok", "dev_token": token}


@router.post("/verify")
def verify_email(request: Request, payload: dict) -> dict:
    session = _db(request)
    token = (payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")

    tok = session.execute(
        select(AuthToken).where(
            AuthToken.token == token, AuthToken.ttype == "verify_email"
        )
    ).scalar_one_or_none()

    if (
        not tok
        or tok.used_at is not None
        or tok.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="invalid or expired token")

    tok.used_at = datetime.now(timezone.utc)
    session.commit()
    return {"status": "verified"}


@router.post("/forgot")
def forgot_password(request: Request, payload: dict) -> dict:
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        # Không tiết lộ tài khoản không tồn tại
        return {"status": "ok"}

    token = _issue_token(session, u.id, "reset_password", minutes=30)
    # TODO: gửi email; tạm trả về cho dev
    return {"status": "ok", "dev_token": token}


@router.post("/reset")
def reset_password(request: Request, payload: dict) -> dict:
    session = _db(request)
    token = (payload.get("token") or "").strip()
    new_pw = payload.get("new_password")

    if not token or not new_pw:
        raise HTTPException(status_code=400, detail="token and new_password required")

    tok = session.execute(
        select(AuthToken).where(
            AuthToken.token == token, AuthToken.ttype == "reset_password"
        )
    ).scalar_one_or_none()

    if (
        not tok
        or tok.used_at is not None
        or tok.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="invalid or expired token")

    u = session.get(User, tok.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")

    u.password_hash = hash_password(new_pw)
    tok.used_at = datetime.now(timezone.utc)
    session.commit()
    return {"status": "password_reset"}
