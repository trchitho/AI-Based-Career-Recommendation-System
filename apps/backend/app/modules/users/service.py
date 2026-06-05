"""
Legacy Flask-based UserService — NOT WIRED into the FastAPI app.

Project hiện tại dùng FastAPI; auth flow đi qua `app/modules/auth/`
và `app/core/security.py` + JWT (PyJWT). File này giữ lại như tham
chiếu lịch sử nhưng không được import từ bất cứ đâu.

Để bỏ phụ thuộc cứng vào `flask_jwt_extended` (gây phình
requirements.txt), import được lazy-loaded — chỉ raise khi caller
thực sự gọi method.
"""

import datetime as dt

from app.core.security import hash_password, verify_password

from .models import User
from .repository import UserRepository


def _create_access_token(identity, additional_claims=None):
    """Lazy import để tránh hard-require flask_jwt_extended ở module level."""
    try:
        from flask_jwt_extended import create_access_token
    except ImportError as e:
        raise ImportError(
            "UserService is legacy Flask code. Install flask-jwt-extended "
            "or use app/modules/auth/ instead."
        ) from e
    return create_access_token(identity=identity, additional_claims=additional_claims or {})


class UserService:
    @staticmethod
    def register(email, password, full_name=None):
        if UserRepository.get_by_email(email):
            raise ValueError("Email already registered")
        user = User(email=email, password_hash=hash_password(password), full_name=full_name)
        UserRepository.add(user)
        token = _create_access_token(identity=user.id, additional_claims={"role": user.role})
        return token, user

    @staticmethod
    def login(email, password):
        user = UserRepository.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        if user.is_locked:
            raise ValueError("Account locked")
        user.last_login = dt.datetime.now(dt.timezone.utc)
        UserRepository.update()
        token = _create_access_token(identity=user.id, additional_claims={"role": user.role})
        return token, user
