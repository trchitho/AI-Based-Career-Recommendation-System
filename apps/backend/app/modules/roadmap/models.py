from sqlalchemy import TIMESTAMP, BigInteger, Column, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from ...core.db import Base


class Roadmap(Base):
    """
    Roadmap - Lộ trình phát triển nghề nghiệp
    
    Relationship: 1 Roadmap có nhiều Milestones (One-to-Many)
    """
    __tablename__ = "roadmaps"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    career_id = Column(BigInteger, nullable=False)
    title = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationship: 1 Roadmap -> N Milestones
    milestones = relationship(
        "RoadmapMilestone",
        back_populates="roadmap",
        cascade="all, delete-orphan",  # Xóa roadmap → xóa tất cả milestones
        order_by="RoadmapMilestone.order_no"
    )


class RoadmapMilestone(Base):
    """
    RoadmapMilestone - Các bước/cột mốc trong lộ trình
    
    Relationship: Nhiều Milestones thuộc về 1 Roadmap (Many-to-One)
    """
    __tablename__ = "roadmap_milestones"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    roadmap_id = Column(
        BigInteger, 
        ForeignKey("core.roadmaps.id", ondelete="CASCADE"),
        nullable=False
    )
    order_no = Column(Integer)
    level = Column(Integer, default=1)  # Level 1-6 for payment restriction
    skill_name = Column(Text)
    description = Column(Text)
    estimated_duration = Column(Text)
    resources_json = Column(JSONB)

    # Relationship: N Milestones -> 1 Roadmap
    roadmap = relationship("Roadmap", back_populates="milestones")


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
