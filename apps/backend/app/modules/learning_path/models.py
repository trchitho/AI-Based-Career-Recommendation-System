"""
Models for Personalized Learning Roadmap.
Table: core.personalized_roadmaps
"""

from sqlalchemy import BigInteger, Boolean, Column, Float, Integer, Text, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from ...core.db import Base


class PersonalizedRoadmap(Base):
    """Lộ trình học tập cá nhân hóa được tạo bởi AI Gemini."""
    __tablename__ = "personalized_roadmaps"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    analysis_id = Column(BigInteger, nullable=True)
    career_id = Column(Text, nullable=False)
    career_title = Column(Text, nullable=True)

    # Cấu hình thời gian & độ khó
    level_slug = Column(Text, nullable=False)
    level_name = Column(Text, nullable=True)
    duration_months = Column(Integer, nullable=False)
    daily_hours = Column(Float, nullable=False)
    study_time = Column(Text, nullable=True)
    weekly_pattern = Column(Text, nullable=True)  # daily/weekdays/weekends/flexible
    ai_difficulty_level = Column(Text, nullable=True)  # gentle/standard/intensive/extreme

    # Nguồn & ngân sách
    budget_type = Column(Text, nullable=False, default="mixed")
    max_budget = Column(Float, nullable=True)
    preferred_sources = Column(ARRAY(Text), nullable=False)
    preferred_language = Column(Text, nullable=False, default="vi")

    # Phong cách học
    learning_style = Column(Text, nullable=True)
    project_intensity = Column(Text, nullable=True)  # minimal/balanced/project_heavy
    certification_priority = Column(Boolean, nullable=False, default=False)
    prerequisite_skills_check = Column(Boolean, nullable=False, default=True)

    # Bối cảnh user
    prior_experience = Column(Text, nullable=True)  # none/beginner/intermediate/advanced
    learning_goal = Column(Text, nullable=True)  # career_switch/...
    current_position = Column(Text, nullable=True)
    target_company_type = Column(Text, nullable=True)
    target_salary_range = Column(Text, nullable=True)
    user_notes = Column(Text, nullable=True)

    # Skills
    missing_skills = Column(JSONB, nullable=False, default=[])
    existing_skills = Column(JSONB, nullable=False, default=[])
    critical_skills = Column(JSONB, nullable=False, default=[])
    important_skills = Column(JSONB, nullable=False, default=[])
    total_missing = Column(Integer, nullable=False, default=0)
    total_existing = Column(Integer, nullable=False, default=0)

    # Course completion tracking
    completed_course_ids = Column(JSONB, nullable=False, default=[])
    completed_phase_ids = Column(JSONB, nullable=False, default=[])
    progress_percentage = Column(Float, nullable=False, default=0)

    # Kết quả AI
    roadmap_data = Column(JSONB, nullable=True)
    status = Column(Text, nullable=False, default="pending")
    generation_error = Column(Text, nullable=True)

    # Email reminder
    email_reminder_enabled = Column(Boolean, nullable=False, default=False)
    email_reminder_time = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
