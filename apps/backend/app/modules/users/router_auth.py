# apps/backend/app/modules/users/router_auth.py
import logging
import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from ...core.db import engine
from ...core.email_verifier import is_deliverable_email
from ...core.jwt import create_access_token, refresh_expiry_dt
from ...core.security import hash_password, verify_password
from ..auth.models import RefreshToken
from ..auth.verification import DEFAULT_VERIFY_MINUTES, send_verification_email
from .models import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Session factory for background tasks
_SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ---------- Schemas ----------
class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    full_name: str | None = None


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class AdminRegisterPayload(RegisterPayload):
    admin_signup_secret: str = Field(min_length=6)


# ---------- Helpers ----------
def _db(req: Request) -> Session:
    return req.state.db


def _verification_response(u: User, info: dict, message: str) -> dict:
    resp = {
        "status": "verification_required",
        "message": message,
        "user": u.to_dict(),
        "verify_url": info.get("verify_url"),
    }
    return resp


def _generic_register_response() -> dict:
    """Return a generic response to prevent user enumeration attacks."""
    return {
        "status": "ok",
        "message": "A verification email will be sent if needed.",
    }


def _send_verification_email_background(user_id: int, email: str, minutes: int) -> None:
    """Send verification email in background task with its own database session.

    Note: We always commit the verification token even if email sending fails.
    This allows the user to retry verification without creating duplicate tokens.
    The race condition where a user is deleted between scheduling and execution
    is handled by the None check.
    """
    session = _SessionLocal()
    try:
        user = session.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user is None:
            logger.warning("User %d not found for verification email", user_id)
            return
        info = send_verification_email(session, user, minutes=minutes)
        # Commit token even if email fails - allows retry without duplicate tokens
        session.commit()
        if not info.get("sent"):
            logger.error("Failed to send verification email for user %s: %s", email, info.get("error"))
    except Exception:
        session.rollback()
        logger.exception("Exception while sending verification email for user %s", email)
    finally:
        session.close()


# ---------- Routes ----------
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: Request, payload: RegisterPayload, background_tasks: BackgroundTasks):
    session = _db(request)
    email = payload.email.strip().lower()
    password = payload.password
    full_name = payload.full_name

    ok, reason = is_deliverable_email(email)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Email is not deliverable: {reason}", "error_code": "EMAIL_NOT_DELIVERABLE"},
        )

    exists = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        if getattr(exists, "is_email_verified", False):
            raise HTTPException(
                status_code=400,
                detail={"message": "Email already registered", "error_code": "EMAIL_ALREADY_REGISTERED"},
            )
        info = send_verification_email(session, exists, minutes=DEFAULT_VERIFY_MINUTES)
        if not info.get("sent"):
            raise HTTPException(
                status_code=500,
                detail=f"Unable to send verification email at this time. Please try again later or contact support. ({info.get('error')})",
            )
        return _verification_response(
            exists, info, "Email already registered but not verified. A new verification email was sent."
        )

    if not (8 <= len(password) <= 256):
        raise HTTPException(status_code=400, detail="Password length must be 8..256")

    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role="user",
        is_locked=False,
        is_email_verified=False,
        email_verified_at=None,
    )
    session.add(u)
    session.commit()
    session.refresh(u)

    info = send_verification_email(session, u, minutes=DEFAULT_VERIFY_MINUTES)
    if not info.get("sent"):
        raise HTTPException(
            status_code=500,
            detail=f"Unable to send verification email at this time. Please try again later or contact support. ({info.get('error')})",
        )
    return _verification_response(u, info, "Verification email sent. Please confirm to activate your account.")


@router.post("/login")
def login(request: Request, payload: LoginPayload):
    session = _db(request)
    email = payload.email.strip().lower()
    password = payload.password

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Email not found")

    if not verify_password(password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if getattr(u, "is_locked", False):
        raise HTTPException(status_code=403, detail="Account is locked")

    if not getattr(u, "is_email_verified", False):
        info = send_verification_email(session, u, minutes=DEFAULT_VERIFY_MINUTES)
        if not info.get("sent"):
            raise HTTPException(
                status_code=500,
                detail=f"Unable to send verification email at this time. Please try again later or contact support. ({info.get('error')})",
            )
        detail = {
            "message": "Email not verified. Please check your inbox to continue.",
            "verification_required": True,
            "verify_url": info.get("verify_url"),
        }
        raise HTTPException(status_code=403, detail=detail)

    try:
        u.last_login = datetime.now(timezone.utc)
        session.commit()
    except Exception:
        session.rollback()

    token = create_access_token({"sub": str(u.id), "role": u.role})
    rt = RefreshToken(
        user_id=u.id,
        token=secrets.token_urlsafe(48),
        expires_at=refresh_expiry_dt(),
        revoked=False,
    )
    session.add(rt)
    session.commit()

    return {
        "access_token": token,
        "refresh_token": rt.token,
        "user": u.to_dict(),
    }


@router.post("/register-admin", status_code=status.HTTP_201_CREATED)
def register_admin(request: Request, payload: AdminRegisterPayload):
    session: Session = _db(request)
    secret_expected = os.getenv("ADMIN_SIGNUP_SECRET")
    if not secret_expected:
        raise HTTPException(status_code=500, detail="ADMIN_SIGNUP_SECRET not configured")
    if payload.admin_signup_secret != secret_expected:
        raise HTTPException(status_code=403, detail="Invalid admin signup secret")

    email = payload.email.strip().lower()
    password = payload.password
    full_name = payload.full_name

    ok, reason = is_deliverable_email(email)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Email is not deliverable: {reason}", "error_code": "EMAIL_NOT_DELIVERABLE"},
        )

    exists = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=400,
            detail={"message": "Email already registered", "error_code": "EMAIL_ALREADY_REGISTERED"},
        )
    if not (8 <= len(password) <= 256):
        raise HTTPException(status_code=400, detail="Password length must be 8..256")

    now = datetime.now(timezone.utc)
    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role="admin",
        is_locked=False,
        is_email_verified=True,
        email_verified_at=now,
    )
    session.add(u)
    session.commit()
    session.refresh(u)

    token = create_access_token({"sub": str(u.id), "role": u.role})
    rt = RefreshToken(user_id=u.id, token=secrets.token_urlsafe(48), expires_at=refresh_expiry_dt(), revoked=False)
    session.add(rt)
    session.commit()
    return {"access_token": token, "refresh_token": rt.token, "user": u.to_dict()}


@router.post("/refresh")
def refresh_token(request: Request, payload: dict):
    session: Session = _db(request)
    token_str = (payload.get("refresh_token") or payload.get("refreshToken") or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="refresh_token is required")
    rt = session.query(RefreshToken).filter(RefreshToken.token == token_str).first()
    if not rt or rt.revoked:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    now = datetime.now(timezone.utc)
    if rt.expires_at and rt.expires_at < now:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    new_access = create_access_token({"sub": str(rt.user_id), "role": "user"})
    return {"access_token": new_access}


@router.post("/logout")
def logout(request: Request, payload: dict):
    session: Session = _db(request)
    token_str = (payload.get("refresh_token") or payload.get("refreshToken") or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="refresh_token is required")
    rt = session.query(RefreshToken).filter(RefreshToken.token == token_str).first()
    if rt:
        rt.revoked = True
        session.commit()
    return {"status": "ok"}


@router.post("/create-test-user")
def create_test_user(request: Request):
    session = _db(request)
    email = "admin@test.com"
    password = "admin123"

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if u:
        return {"message": "Test user already exists", "email": email, "password": password}

    now = datetime.now(timezone.utc)
    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name="Admin Test",
        role="admin",
        is_locked=False,
        is_email_verified=True,
        email_verified_at=now,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return {"message": "Test user created", "email": email, "password": password}
