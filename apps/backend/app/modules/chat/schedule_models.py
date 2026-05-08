from sqlalchemy import BigInteger, Column, Integer, String, Text
from sqlalchemy import TIMESTAMP, func
from app.core.db import Base


class MentorSession(Base):
    __tablename__ = "mentor_sessions"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    mentor_id = Column(BigInteger, nullable=False)    # user_id of mentor
    mentee_id = Column(BigInteger, nullable=False)    # user_id of mentee
    scheduled_at = Column(TIMESTAMP(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    topic = Column(String(300))
    notes = Column(Text)
    # pending / confirmed / cancelled / completed
    status = Column(String(20), default="pending")
    mentor_note = Column(Text)                        # response from mentor
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
