# apps/backend/app/modules/users/router_auth.py
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User
from ...core.security import hash_password, verify_password
from ...core.jwt import create_access_token
import os

router = APIRouter()

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

# ---------- Routes ----------
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: Request, payload: RegisterPayload):
    session = _db(request)
    email = payload.email.strip().lower()
    password = payload.password
    full_name = payload.full_name

    # email đã tồn tại?
    exists = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    # (Đã được Pydantic validate min/max length, nhưng vẫn có thể kiểm tra bổ sung)
    if not (8 <= len(password) <= 256):
        raise HTTPException(status_code=400, detail="Password length must be 8..256")

    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role="user",
        is_locked=False,
    )
    session.add(u)
    session.commit()
    session.refresh(u)

    token = create_access_token({"sub": str(u.id), "role": u.role})
    return {"access_token": token, "user": u.to_dict()}

@router.post("/login")
def login(request: Request, payload: LoginPayload):
    session = _db(request)
    email = payload.email.strip().lower()
    password = payload.password

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u or not verify_password(password, u.password_hash):
        raise HTTPException(status_code=403, detail="Invalid credentials")

    token = create_access_token({"sub": str(u.id), "role": u.role})
    return {"access_token": token, "user": u.to_dict()}


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

    exists = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    if not (8 <= len(password) <= 256):
        raise HTTPException(status_code=400, detail="Password length must be 8..256")

    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role="admin",
        is_locked=False,
    )
    session.add(u)
    session.commit()
    session.refresh(u)

    token = create_access_token({"sub": str(u.id), "role": u.role})
    return {"access_token": token, "user": u.to_dict()}

# tiện test Postman
@router.post("/create-test-user")
def create_test_user(request: Request):
    session = _db(request)
    email = "admin@test.com"
    password = "admin123"

    u = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if u:
        return {"message": "Test user already exists", "email": email, "password": password}

    u = User(
        email=email,
        password_hash=hash_password(password),
        full_name="Admin Test",
        role="admin",
        is_locked=False,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return {"message": "Test user created", "email": email, "password": password}
