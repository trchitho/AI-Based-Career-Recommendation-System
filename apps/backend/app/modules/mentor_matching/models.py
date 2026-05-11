from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float,
    ForeignKey, Integer, String, Text
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from app.core.db import Base


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("core.users.id"), unique=True, nullable=False)

    # Professional info
    full_name = Column(String(200), nullable=False)
    current_position = Column(String(200))
    company = Column(String(200))
    bio = Column(Text)
    expertise_areas = Column(ARRAY(String))          # ["Python", "Machine Learning"]
    experience_years = Column(Integer, default=0)
    available_hours_per_week = Column(Integer, default=2)
    preferred_communication = Column(ARRAY(String))  # ["video", "chat"]
    max_mentees = Column(Integer, default=5)
    current_mentees_count = Column(Integer, default=0)

    # Personality (optional)
    riasec_scores = Column(JSONB, default=dict)   # {"R": 3.5, "I": 4.0, ...}
    big_five_scores = Column(JSONB, default=dict) # {"openness": 4.1, ...}

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MenteeProfile(Base):
    __tablename__ = "mentee_profiles"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("core.users.id"), unique=True, nullable=False)

    full_name = Column(String(200), nullable=False)
    target_career = Column(String(300))
    current_skills = Column(ARRAY(String))
    desired_skills = Column(ARRAY(String))
    learning_style = Column(String(50), default="flexible")  # structured/flexible/project-based
    preferred_mentor_experience = Column(String(20), default="senior")  # junior/senior/executive

    # Personality (from assessment)
    riasec_scores = Column(JSONB, default=dict)
    big_five_scores = Column(JSONB, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    mentee_id = Column(Integer, ForeignKey("core.mentee_profiles.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("core.mentor_profiles.id"), nullable=False)

    compatibility_score = Column(Float, default=0.0)
    matching_reasons = Column(JSONB, default=list)
    status = Column(String(20), default="pending")  # pending/accepted/rejected
    message = Column(Text)
    response_message = Column(Text)

    requested_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
