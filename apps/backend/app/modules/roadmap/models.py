from sqlalchemy import TIMESTAMP, BigInteger, Column, Integer, Text, func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB

from ...core.db import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"
    __table_args__ = (
        CheckConstraint(
            "title_en IS NOT NULL OR title_vi IS NOT NULL",
            name="chk_roadmaps_has_title"
        ),
        {"schema": "core"}
    )

    id = Column(BigInteger, primary_key=True)
    career_id = Column(BigInteger, nullable=False)
    title_en = Column(Text, nullable=True, comment="English title")
    title_vi = Column(Text, nullable=True, comment="Vietnamese title")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    def get_title(self, language: str = "vn") -> str:
        """Get title in specified language with fallback"""
        if language.lower() == "en" and self.title_en:
            return self.title_en
        elif language.lower() == "vn" and self.title_vi:
            return self.title_vi
        # Fallback to available title
        return self.title_vi or self.title_en or f"Roadmap for Career {self.career_id}"

    def to_dict(self, language: str = "vn") -> dict:
        """Convert to dictionary with localized title"""
        return {
            "id": self.id,
            "career_id": self.career_id,
            "title": self.get_title(language),
            "title_en": self.title_en,
            "title_vi": self.title_vi,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


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
    level = Column(Integer, default=1)  # Level of milestone (1-6)


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
