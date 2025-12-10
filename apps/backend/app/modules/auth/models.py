from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Text, func, Date, text
from sqlalchemy.orm import relationship

from ...core.db import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    token = Column(Text, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    avatar_url = Column(Text, nullable=True)
    role = Column(Text, server_default=text("'Reader'"))
    is_locked = Column(Boolean, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_login = Column(TIMESTAMP(timezone=True), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    is_blocked = Column(Boolean, nullable=False, server_default=text("false"))
    is_email_verified = Column(Boolean, server_default=text("false"))
    email_verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    riasec_top_dim = Column(Text, nullable=True)
    big5_profile = Column(Text, nullable=True)
    
    # Relationships
    cvs = relationship("CV", back_populates="user")
    
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
    