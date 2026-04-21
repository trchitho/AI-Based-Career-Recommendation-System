from sqlalchemy import BigInteger, Boolean, Column, String, Text
from sqlalchemy import TIMESTAMP, func
from app.core.db import Base


def make_room_id(uid1: int, uid2: int) -> str:
    a, b = sorted([uid1, uid2])
    return f"{a}_{b}"


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    room_id = Column(String(50), nullable=False, index=True)
    sender_id = Column(BigInteger, nullable=False)
    receiver_id = Column(BigInteger, nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
