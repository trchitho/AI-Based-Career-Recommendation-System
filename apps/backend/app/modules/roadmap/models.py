from sqlalchemy import Column, BigInteger, Text, Integer, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from ...core.db import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    career_id = Column(BigInteger, nullable=False)
    title = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class RoadmapMilestone(Base):
    __tablename__ = "roadmap_milestones"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    roadmap_id = Column(BigInteger, nullable=False)
    order_no = Column(Integer)
    skill_name = Column(Text)
    description = Column(Text)
    estimated_duration = Column(Text)
    resources_json = Column(JSONB)


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    career_id = Column(BigInteger, nullable=False)
    roadmap_id = Column(BigInteger, nullable=False)
    completed_milestones = Column(JSONB)
    milestone_completions = Column(JSONB)
    current_milestone_id = Column(BigInteger)
    progress_percentage = Column(Text)  # allow numeric string for simplicity
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
