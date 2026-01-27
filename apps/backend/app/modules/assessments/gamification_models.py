"""
Gamification models - separate from assessment data
Stores XP, levels, achievements without affecting assessment results
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func

# Import Base from the correct location
try:
    from app.core.database import Base
except ImportError:
    from app.core.db import Base


class UserGamificationProfile(Base):
    """
    User's gamification profile - separate from assessment data
    """
    __tablename__ = "user_gamification_profiles"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False, unique=True)
    
    # Gamification stats
    total_xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AssessmentGamificationSession(Base):
    """
    Gamification data for each assessment session
    Stored separately from assessment results
    """
    __tablename__ = "assessment_gamification_sessions"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    assessment_session_id = Column(Integer, ForeignKey("core.assessment_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    
    # Quiz mode used
    quiz_mode = Column(String(50), nullable=False)  # 'standard', 'game', 'legacy'
    
    # Gamification stats for this session
    xp_earned = Column(Integer, default=0, nullable=False)
    questions_answered = Column(Integer, default=0, nullable=False)
    
    # Session metadata
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional gamification data (badges, achievements, etc.)
    extra_data = Column(JSON, nullable=True)


class UserAchievement(Base):
    """
    User achievements - purely for gamification
    """
    __tablename__ = "user_achievements"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    
    achievement_type = Column(String(100), nullable=False)  # 'first_assessment', 'level_5', etc.
    achievement_name = Column(String(200), nullable=False)
    achievement_description = Column(String(500), nullable=True)
    
    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Achievement metadata
    metadata = Column(JSON, nullable=True)
