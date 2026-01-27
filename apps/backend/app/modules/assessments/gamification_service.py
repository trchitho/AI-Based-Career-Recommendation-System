"""
Gamification service - handles XP, levels, achievements
Completely separate from assessment scoring logic
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from .gamification_models import (
    UserGamificationProfile,
    AssessmentGamificationSession,
    UserAchievement
)


class GamificationService:
    """
    Service for managing gamification features
    CRITICAL: This does NOT affect assessment results
    """
    
    XP_PER_QUESTION = 10
    XP_FOR_LEVEL = 100  # XP needed per level
    
    @staticmethod
    def get_or_create_profile(db: Session, user_id: int) -> UserGamificationProfile:
        """Get or create user's gamification profile"""
        profile = db.query(UserGamificationProfile).filter(
            UserGamificationProfile.user_id == user_id
        ).first()
        
        if not profile:
            profile = UserGamificationProfile(
                user_id=user_id,
                total_xp=0,
                level=1
            )
            db.add(profile)
            db.flush()
        
        return profile
    
    @staticmethod
    def calculate_level(total_xp: int) -> int:
        """Calculate level from total XP"""
        return (total_xp // GamificationService.XP_FOR_LEVEL) + 1
    
    @staticmethod
    def start_gamification_session(
        db: Session,
        user_id: int,
        assessment_session_id: int,
        quiz_mode: str
    ) -> AssessmentGamificationSession:
        """Start a new gamification session"""
        session = AssessmentGamificationSession(
            assessment_session_id=assessment_session_id,
            user_id=user_id,
            quiz_mode=quiz_mode,
            xp_earned=0,
            questions_answered=0
        )
        db.add(session)
        db.flush()
        return session
    
    @staticmethod
    def award_xp_for_question(
        db: Session,
        gamification_session_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Award XP for answering a question
        Returns updated XP and level info
        """
        # Get gamification session
        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id
        ).first()
        
        if not gam_session:
            raise ValueError("Gamification session not found")
        
        # Update session
        gam_session.xp_earned += GamificationService.XP_PER_QUESTION
        gam_session.questions_answered += 1
        
        # Update user profile
        profile = GamificationService.get_or_create_profile(db, user_id)
        old_level = profile.level
        profile.total_xp += GamificationService.XP_PER_QUESTION
        profile.level = GamificationService.calculate_level(profile.total_xp)
        
        # Check for level up
        level_up = profile.level > old_level
        
        db.flush()
        
        return {
            "xp_earned": GamificationService.XP_PER_QUESTION,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "level_up": level_up,
            "xp_for_next_level": (profile.level * GamificationService.XP_FOR_LEVEL) - profile.total_xp
        }
    
    @staticmethod
    def complete_gamification_session(
        db: Session,
        gamification_session_id: int
    ) -> Dict[str, Any]:
        """Mark gamification session as complete and return summary"""
        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id
        ).first()
        
        if not gam_session:
            raise ValueError("Gamification session not found")
        
        gam_session.completed_at = datetime.utcnow()
        
        # Get user profile
        profile = GamificationService.get_or_create_profile(db, gam_session.user_id)
        
        db.flush()
        
        return {
            "session_xp": gam_session.xp_earned,
            "questions_answered": gam_session.questions_answered,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "quiz_mode": gam_session.quiz_mode
        }
    
    @staticmethod
    def get_user_stats(db: Session, user_id: int) -> Dict[str, Any]:
        """Get user's gamification stats"""
        profile = GamificationService.get_or_create_profile(db, user_id)
        
        # Get total assessments with gamification
        total_sessions = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.user_id == user_id,
            AssessmentGamificationSession.completed_at.isnot(None)
        ).count()
        
        # Get achievements
        achievements = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).all()
        
        return {
            "total_xp": profile.total_xp,
            "level": profile.level,
            "xp_for_next_level": (profile.level * GamificationService.XP_FOR_LEVEL) - profile.total_xp,
            "total_assessments": total_sessions,
            "achievements": [
                {
                    "type": a.achievement_type,
                    "name": a.achievement_name,
                    "description": a.achievement_description,
                    "earned_at": a.earned_at.isoformat() if a.earned_at else None
                }
                for a in achievements
            ]
        }
    
    @staticmethod
    def award_achievement(
        db: Session,
        user_id: int,
        achievement_type: str,
        achievement_name: str,
        achievement_description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserAchievement:
        """Award an achievement to user"""
        # Check if already earned
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_type == achievement_type
        ).first()
        
        if existing:
            return existing
        
        achievement = UserAchievement(
            user_id=user_id,
            achievement_type=achievement_type,
            achievement_name=achievement_name,
            achievement_description=achievement_description,
            metadata=metadata
        )
        db.add(achievement)
        db.flush()
        
        return achievement
