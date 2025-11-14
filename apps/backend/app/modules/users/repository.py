from app.modules.users.models import User
from .core.db import db

class UserRepository:
    @staticmethod
    def get_by_email(email: str):
        return db.session.execute(db.select(User).where(User.email == email)).scalar_one_or_none()

    @staticmethod
    def get_by_id(user_id: int):
        return db.session.get(User, user_id)

    @staticmethod
    def add(user: User):
        db.session.add(user)
        db.session.commit()

    @staticmethod
    def update():
        db.session.commit()

    @staticmethod
    def delete(user: User):
        db.session.delete(user)
        db.session.commit()
