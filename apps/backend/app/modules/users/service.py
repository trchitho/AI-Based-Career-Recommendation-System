import datetime as dt

from flask_jwt_extended import create_access_token

from app.core.security import hash_password, verify_password
from .models import User
from .repository import UserRepository


class UserService:
    @staticmethod
    def register(email, password, full_name=None):
        if UserRepository.get_by_email(email):
            raise ValueError("Email already registered")
        user = User(email=email, password_hash=hash_password(password), full_name=full_name)
        UserRepository.add(user)
        token = create_access_token(identity=user.id, additional_claims={"role": user.role})
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
        token = create_access_token(identity=user.id, additional_claims={"role": user.role})
        return token, user
