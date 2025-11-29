# apps/backend/app/modules/users/models.py
from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Date, Text, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}  # vì bảng nằm trong schema "core"

    id = Column(BigInteger, primary_key=True)
    email = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text)
    avatar_url = Column(Text)
    role = Column(Text, nullable=False, default="user")
    is_locked = Column(Boolean, nullable=False, default=False)
    is_email_verified = Column(Boolean, nullable=False, default=False, server_default=func.false())
    email_verified_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(TIMESTAMP(timezone=True))
    date_of_birth = Column(Date)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "is_locked": self.is_locked,
            "is_email_verified": getattr(self, "is_email_verified", False),
            "email_verified_at": self.email_verified_at.isoformat() if getattr(self, "email_verified_at", None) else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
        }
