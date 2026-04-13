"""
Database models for Skill Gap Analysis
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.core.db import Base


class SkillGapAnalysis(Base):
    """Model lưu kết quả phân tích skill gap"""
    __tablename__ = "skill_gap_analyses"
    __table_args__ = {'schema': 'core'}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('core.users.id'), nullable=False)
    career_id = Column(String(100), nullable=False)
    
    # CV information
    cv_filename = Column(String(255))
    cv_file_url = Column(String(1024))  # Cloudflare R2 public URL
    cv_text_preview = Column(Text)
    cv_name = Column(String(255))  # Họ tên
    cv_email = Column(String(255))  # Email
    cv_phone = Column(String(50))  # SĐT
    
    # Analysis results (stored as JSON)
    cv_skills = Column(JSON)  # List of skills found in CV
    job_skills = Column(JSON)  # List of required skills
    matched_skills = Column(JSON)  # Skills that match
    skill_gaps = Column(JSON)  # Missing skills categorized by importance
    extra_skills = Column(JSON)  # Additional skills not required
    
    # Metrics
    match_percentage = Column(Float)
    total_required_skills = Column(Integer)
    matched_skills_count = Column(Integer)
    missing_skills_count = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<SkillGapAnalysis(id={self.id}, user_id={self.user_id}, match={self.match_percentage}%)>"
