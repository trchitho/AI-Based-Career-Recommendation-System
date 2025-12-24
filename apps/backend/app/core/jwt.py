# apps/backend/app/core/jwt.py
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import HTTPException, Request

try:
    import jwt  # PyJWT
except ImportError:
    raise RuntimeError("Missing dependency: install with `pip install PyJWT`")

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRES_MIN = int(os.getenv("JWT_ACCESS_EXPIRES_MIN", "60"))
JWT_REFRESH_EXPIRES_DAYS = int(os.getenv("JWT_REFRESH_EXPIRES_DAYS", "30"))


def create_access_token(payload: Dict[str, Any], expires_minutes: int | None = None) -> str:
    # payload ví dụ: {"sub": "123", "role": "admin"}
    exp_min = expires_minutes if expires_minutes is not None else JWT_ACCESS_EXPIRES_MIN
    to_encode = {**payload, "exp": int(time.time()) + exp_min * 60}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


def refresh_expiry_dt() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRES_DAYS)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _get_bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return auth.split(" ", 1)[1].strip()


def require_user(request: Request) -> int:
    token = _get_bearer_token(request)
    data = decode_token(token)
    sub = data.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing sub")
    try:
        return int(sub)
    except ValueError:
        # nếu bạn dùng UUID, có thể trả về str thay vì ép int
        raise HTTPException(status_code=401, detail="Invalid subject in token")


def require_admin(request: Request) -> int:
    token = _get_bearer_token(request)
    data = decode_token(token)
    role = data.get("role")
    sub = data.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing sub")
    # Cho phép cả admin và superadmin
    if role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        return int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid subject in token")


def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency để lấy thông tin user hiện tại từ JWT token
    Trả về dict với user_id, role, etc.
    """
    token = _get_bearer_token(request)
    data = decode_token(token)
    
    sub = data.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing sub")
    
    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid subject in token")
    
    return {
        "user_id": user_id,
        "role": data.get("role", "user"),
        "email": data.get("email"),
        **data
    }
