from sqlalchemy import Column, BigInteger, Integer, Text, Float, DateTime
from sqlalchemy.sql import func
from ...core.db import Base  # giống các model khác

class CareerEvent(Base):
    __tablename__ = "career_events"
    __table_args__ = {"schema": "analytics"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, nullable=True)
    session_id = Column(Text, nullable=True)
    job_id = Column(Text, nullable=False)   # O*NET code
    event_type = Column(Text, nullable=False)
    rank_pos = Column(Integer, nullable=True)
    score_shown = Column(Float, nullable=True)
    source = Column(Text, nullable=False, default="neumf")
    ref = Column(Text, nullable=True)
    dwell_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
