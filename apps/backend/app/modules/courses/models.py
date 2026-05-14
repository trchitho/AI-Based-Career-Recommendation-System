from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.sql import func
from app.core.db import Base


class CourseCatalog(Base):
    __tablename__ = "course_catalog"
    __table_args__ = {"schema": "core"}

    id           = Column(Integer, primary_key=True, index=True)
    external_id  = Column(String(255), unique=True, nullable=False)   # udemy/coursera id
    title        = Column(String(500), nullable=False)
    description  = Column(Text)
    url          = Column(String(1000))
    platform     = Column(String(50))   # "udemy" | "coursera" | "edx" | "youtube" | "static"
    instructor   = Column(String(255))
    rating       = Column(Float, default=0.0)
    num_reviews  = Column(Integer, default=0)
    price        = Column(Float, default=0.0)
    is_free      = Column(Boolean, default=False)
    level        = Column(String(50))   # beginner / intermediate / advanced
    duration_hrs = Column(Float)
    thumbnail    = Column(String(1000))
    language     = Column(String(20), default="en")
    tags         = Column(ARRAY(String), default=list)
    embedding    = Column(ARRAY(Float))       # SBERT 384-dim vector
    is_embedded  = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())


class CourseSkillMap(Base):
    """Pre-computed mapping: Course ↔ Skill với score"""
    __tablename__ = "course_skill_map"
    __table_args__ = (
        Index("ix_csm_skill_score", "skill_name", "similarity_score"),
        {"schema": "core"},
    )

    id               = Column(Integer, primary_key=True, index=True)
    course_id        = Column(Integer, nullable=False)   # FK to course_catalog.id
    skill_name       = Column(String(255), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class SkillGapCourseRecommendationCache(Base):
    """Cached Gemini course discovery result for one skill-gap input."""
    __tablename__ = "skill_gap_course_recommendations"
    __table_args__ = (
        Index("ix_sg_course_cache_analysis", "analysis_id"),
        Index("ix_sg_course_cache_key", "cache_key", unique=True),
        {"schema": "core"},
    )

    id              = Column(Integer, primary_key=True, index=True)
    analysis_id     = Column(Integer, nullable=True, index=True)
    cache_key       = Column(String(64), unique=True, nullable=False)
    career_name     = Column(String(255))
    model_name      = Column(String(120))
    source          = Column(String(50), nullable=False)
    status          = Column(String(30), nullable=False, default="ready")
    skill_groups    = Column(JSONB, nullable=False, default=dict)
    owned_skills    = Column(JSONB, nullable=False, default=list)
    recommendations = Column(JSONB, nullable=False, default=list)
    error_message   = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
