from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Text, func

from ...core.db import Base
from sqlalchemy import Date, text


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
    