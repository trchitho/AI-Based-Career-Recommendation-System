import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import TIMESTAMP, BigInteger, Column, Text, select, update
from sqlalchemy.orm import Session
from sqlalchemy.orm import registry

# Lightweight model for auth_tokens to avoid circular imports
mapper_registry = registry()


@mapper_registry.mapped
class AuthToken:
    __tablename__ = "auth_tokens"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger)
    token = Column(Text)
    ttype = Column(Text)
    expires_at = Column(TIMESTAMP(timezone=True))
    used_at = Column(TIMESTAMP(timezone=True))


def issue_token(session: Session, user_id: int, ttype: str, minutes: int = 30) -> str:
    tok = AuthToken(
        user_id=user_id,
        token=secrets.token_urlsafe(48),
        ttype=ttype,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=minutes),
        used_at=None,
    )
    session.add(tok)
    session.commit()
    return tok.token


def mark_all_tokens_used(session: Session, user_id: int, ttype: str) -> None:
    """Best-effort cleanup to avoid multiple active tokens of the same type."""
    session.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user_id, AuthToken.ttype == ttype, AuthToken.used_at.is_(None))
        .values(used_at=datetime.now(timezone.utc))
    )
    session.commit()


def get_valid_token(session: Session, token: str, ttype: str) -> Optional[AuthToken]:
    stmt = select(AuthToken).where(AuthToken.token == token, AuthToken.ttype == ttype)
    tok = session.execute(stmt).scalar_one_or_none()
    if (
        not tok
        or tok.used_at is not None
        or tok.expires_at is None
        or tok.expires_at < datetime.now(timezone.utc)
    ):
        return None
    return tok
