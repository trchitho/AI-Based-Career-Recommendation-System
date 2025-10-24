from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import text

from app.core.db import get_engine
from app.core.security import create_jwt, verify_jwt, hash_password, verify_password
from .schemas import SignupRequest, SigninRequest, TokenResponse, UserPublic


router = APIRouter(prefix="/auth", tags=["auth"])


def _secret() -> str:
    s = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    if not s:
        raise RuntimeError("JWT_SECRET/SECRET_KEY is not configured in environment")
    return s


def _get_schema_prefix() -> str:
    return os.getenv("DB_SCHEMA", "core")


def _get_user_by_email(email: str) -> Optional[dict]:
    schema = _get_schema_prefix()
    sql = text(
        f"SELECT id, email, password_hash, full_name, avatar_url, role FROM {schema}.users WHERE email = :email LIMIT 1"
    )
    with get_engine().connect() as conn:
        row = conn.execute(sql, {"email": email}).mappings().first()
        return dict(row) if row else None


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest):
    schema = _get_schema_prefix()
    existing = _get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    pw_hash = hash_password(payload.password)
    insert_sql = text(
        f"""
        INSERT INTO {schema}.users (email, password_hash, full_name, role, is_blocked, created_at)
        VALUES (:email, :password_hash, :full_name, :role, false, NOW())
        RETURNING id, email, full_name, role
        """
    )
    try:
        with get_engine().begin() as conn:
            row = (
                conn.execute(
                    insert_sql,
                    {
                        "email": payload.email,
                        "password_hash": pw_hash,
                        "full_name": payload.full_name,
                        "role": "user",
                    },
                )
                .mappings()
                .first()
            )
    except Exception:
        # Fallback nếu DB chưa có cột role
        fallback_sql = text(
            f"""
            INSERT INTO {schema}.users (email, password_hash, full_name, is_blocked, created_at)
            VALUES (:email, :password_hash, :full_name, false, NOW())
            RETURNING id, email, full_name
            """
        )
        with get_engine().begin() as conn:
            row = (
                conn.execute(
                    fallback_sql,
                    {
                        "email": payload.email,
                        "password_hash": pw_hash,
                        "full_name": payload.full_name,
                    },
                )
                .mappings()
                .first()
            )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create user")

    token = create_jwt({"sub": str(row["id"])}, _secret(), expires_in=3600 * 24 * 7)
    return TokenResponse(
        token=token,
        user_id=row["id"],
        email=row["email"],
        full_name=row.get("full_name"),
        role=row.get("role"),
    )


@router.post("/signin", response_model=TokenResponse)
def signin(payload: SigninRequest):
    user = _get_user_by_email(payload.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt({"sub": str(user["id"])}, _secret(), expires_in=3600 * 24 * 7)
    schema = _get_schema_prefix()
    with get_engine().begin() as conn:
        conn.execute(
            text(f"UPDATE {schema}.users SET last_login = NOW() WHERE id = :id"),
            {"id": user["id"]},
        )
    return TokenResponse(
        token=token,
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        role=user.get("role"),
    )


def _auth_user(authorization: Optional[str] = Header(None)) -> UserPublic:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    payload = verify_jwt(token, _secret())
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    uid = int(payload["sub"])  # type: ignore
    schema = _get_schema_prefix()
    sql = text(
        f"SELECT id, email, full_name, avatar_url, role FROM {schema}.users WHERE id = :id LIMIT 1"
    )
    with get_engine().connect() as conn:
        row = conn.execute(sql, {"id": uid}).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**row)


@router.get("/me", response_model=UserPublic)
def me(user: UserPublic = Depends(_auth_user)):
    return user


@router.get("/google/start")
def google_start():
    from urllib.parse import urlencode

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return {"auth_url": url}


@router.get("/google/callback", response_model=TokenResponse)
def google_callback(code: Optional[str] = None):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    import json
    from urllib.parse import urlencode
    from urllib.request import Request, urlopen

    token_req = Request(
        url="https://oauth2.googleapis.com/token",
        data=urlencode(
            {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        ).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urlopen(token_req) as resp:
        token_payload = json.loads(resp.read().decode())

    id_token = token_payload.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No id_token returned from Google")

    import base64

    def _pad(s: str) -> str:
        return s + "=" * (-len(s) % 4)

    try:
        _h, payload_b64, _s = id_token.split(".")
        payload = json.loads(base64.urlsafe_b64decode(_pad(payload_b64)).decode())
        email = payload.get("email")
        name = payload.get("name")
        if not email:
            raise ValueError("No email in id_token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id_token")

    schema = _get_schema_prefix()
    user = _get_user_by_email(email)
    if not user:
        with get_engine().begin() as conn:
            row = (
                (
                    conn.execute(
                        text(
                            f"""
                        INSERT INTO {schema}.users (email, password_hash, full_name, role, is_blocked, created_at)
                        VALUES (:email, '', :full_name, :role, false, NOW())
                        RETURNING id, email, full_name, role
                        """
                        ),
                        {"email": email, "full_name": name, "role": "user"},
                    )
                )
                .mappings()
                .first()
            )
            user_id = row["id"]
            role = row.get("role")
    else:
        user_id = user["id"]
        role = user.get("role")

    token = create_jwt({"sub": str(user_id)}, _secret(), expires_in=3600 * 24 * 7)
    return TokenResponse(
        token=token, user_id=user_id, email=email, full_name=name, role=role
    )
