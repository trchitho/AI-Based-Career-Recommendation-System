from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session as ORMSession

from ..users.models import User
from ...core.email_utils import send_email
from ...core.email_verifier import is_deliverable_email
from .token_utils import AuthToken, get_valid_token, issue_token
from .verification import DEFAULT_VERIFY_MINUTES, send_verification_email

router = APIRouter()


def _db(req: Request) -> ORMSession:
    return req.state.db


def _reset_url(token: str) -> str:
    # Prefer dedicated reset URL if provided, otherwise reuse FRONTEND_BASE_URL
    import os

    tmpl = os.getenv("FRONTEND_RESET_URL")
    if tmpl:
        if "{token}" in tmpl:
            return tmpl.format(token=token)
        base = tmpl.rstrip("/")
        sep = "&" if "?" in base else "?"
        return f"{base}{sep}token={token}"
    base = os.getenv("FRONTEND_BASE_URL") or "http://localhost:3000"
    return f"{base.rstrip('/')}/reset?token={token}"


@router.post("/request-verify")
def request_verify(request: Request, payload: dict):
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    ok, reason = is_deliverable_email(email)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Email is not deliverable: {reason}", "error_code": "EMAIL_NOT_DELIVERABLE"},
        )

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u or getattr(u, "is_email_verified", False):
        # Silent success for both cases to prevent user enumeration
        return {"status": "ok"}

    # Only send email if user exists and is not verified
    info = send_verification_email(session, u, minutes=DEFAULT_VERIFY_MINUTES)
    if not info.get("sent") and not info.get("dev_mode"):
        raise HTTPException(
            status_code=500,
            detail=f"Unable to send verification email at this time. Please try again later or contact support. ({info.get('error')})",
        )
    return {
        "status": "ok",
        "verify_url": info.get("verify_url"),
        "dev_token": info.get("token") if info.get("dev_mode") else None,
        "dev_mode": info.get("dev_mode", False),
    }


@router.post("/verify")
def verify_email(request: Request, payload: dict):
    session = _db(request)
    token = (payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")

    tok = get_valid_token(session, token, "verify_email")
    if not tok:
        raise HTTPException(status_code=400, detail="invalid or expired token")

    u = session.get(User, tok.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")

    tok.used_at = datetime.now(timezone.utc)
    try:
        u.is_email_verified = True
        u.email_verified_at = datetime.now(timezone.utc)
    except Exception:
        # Field missing in schema; keep best-effort token update
        pass
    session.commit()
    return {"status": "verified", "email": getattr(u, "email", None)}


@router.post("/forgot")
def forgot_password(request: Request, payload: dict):
    session = _db(request)
    email = (payload.get("email") or "").strip().lower()

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        # không lộ thông tin user tồn tại hay không
        return {"status": "ok"}

    token = issue_token(session, u.id, "reset_password", minutes=30)
    reset_url = _reset_url(token)

    body = (
        f"Hi {u.full_name or 'there'},\n\n"
        "We received a request to reset your password. If this was you, please use the link below:\n\n"
        f"Reset link: {reset_url}\n"
        f"Reset code: {token}\n\n"
        "If you did not request this, you can ignore this email."
    )
    sent, err, _ = send_email(u.email, "Reset your password", body)
    if not sent:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to send reset email at this time. Please try again later or contact support. ({err})",
        )
    return {"status": "ok"}


@router.post("/reset")
def reset_password(request: Request, payload: dict):
    session = _db(request)
    token = (payload.get("token") or "").strip()
    new_pw = payload.get("new_password")

    if not token or not new_pw:
        raise HTTPException(status_code=400, detail="token and new_password required")

    tok = session.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.ttype == "reset_password",
        )
    ).scalar_one_or_none()

    if not tok or tok.used_at is not None or tok.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="invalid or expired token")

    u = session.get(User, tok.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")

    from ...core.security import hash_password

    u.password_hash = hash_password(new_pw)
    tok.used_at = datetime.now(timezone.utc)
    session.commit()
    return {"status": "password_reset"}
