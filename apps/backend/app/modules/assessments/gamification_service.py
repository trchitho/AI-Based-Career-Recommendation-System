"""
Gamification service - handles XP, levels, achievements
Completely separate from assessment scoring logic
"""
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from .gamification_models import AssessmentGamificationSession, UserAchievement, UserGamificationProfile


class GamificationService:
    """
    Service for managing gamification features
    CRITICAL: This does NOT affect assessment results
    """

    XP_PER_QUESTION = 10
    XP_FOR_LEVEL = 100  # XP needed per level

    @staticmethod
    def get_or_create_profile(db: Session, user_id: int) -> UserGamificationProfile:
        """
        Get or create user's gamification profile.
        Uses INSERT ... ON CONFLICT DO NOTHING to be race-condition safe.
        """
        # Try INSERT first (handles concurrent requests safely)
        stmt = pg_insert(UserGamificationProfile).values(
            user_id=user_id,
            total_xp=0,
            level=1,
        ).on_conflict_do_nothing(index_elements=["user_id"])
        db.execute(stmt)
        db.flush()

        # Always fetch after upsert
        profile = db.query(UserGamificationProfile).filter(
            UserGamificationProfile.user_id == user_id
        ).first()

        if not profile:
            # Extremely unlikely — fallback
            raise RuntimeError(f"Failed to get or create gamification profile for user {user_id}")

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
        quiz_mode: str,
    ) -> AssessmentGamificationSession:
        """Start a new gamification session"""
        session = AssessmentGamificationSession(
            assessment_session_id=assessment_session_id,
            user_id=user_id,
            quiz_mode=quiz_mode,
            xp_earned=0,
            questions_answered=0,
        )
        db.add(session)
        db.flush()
        return session

    @staticmethod
    def award_xp_for_question(
        db: Session,
        gamification_session_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        """
        Award XP for answering a question.
        Returns updated XP and level info.
        """
        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id,
            AssessmentGamificationSession.user_id == user_id,
            AssessmentGamificationSession.completed_at.is_(None),
        ).first()

        if not gam_session:
            raise ValueError("Gamification session not found")

        # Update session counters
        gam_session.xp_earned += GamificationService.XP_PER_QUESTION
        gam_session.questions_answered += 1

        # Update user profile
        profile = GamificationService.get_or_create_profile(db, user_id)
        old_level = profile.level
        profile.total_xp += GamificationService.XP_PER_QUESTION
        profile.level = GamificationService.calculate_level(profile.total_xp)

        level_up = profile.level > old_level

        db.flush()

        return {
            "xp_earned": GamificationService.XP_PER_QUESTION,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "level_up": level_up,
            "xp_for_next_level": (profile.level * GamificationService.XP_FOR_LEVEL) - profile.total_xp,
        }

    @staticmethod
    def complete_gamification_session(
        db: Session,
        gamification_session_id: int,
    ) -> Dict[str, Any]:
        """Mark gamification session as complete and return summary"""
        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id
        ).first()

        if not gam_session:
            raise ValueError("Gamification session not found")

        if gam_session.completed_at is not None:
            raise ValueError("Session already completed")

        gam_session.completed_at = datetime.utcnow()

        profile = GamificationService.get_or_create_profile(db, gam_session.user_id)

        db.flush()

        return {
            "session_xp": gam_session.xp_earned,
            "questions_answered": gam_session.questions_answered,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "quiz_mode": gam_session.quiz_mode,
        }

    @staticmethod
    def get_user_stats(db: Session, user_id: int) -> Dict[str, Any]:
        """Get user's gamification stats"""
        profile = GamificationService.get_or_create_profile(db, user_id)

        total_sessions = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.user_id == user_id,
            AssessmentGamificationSession.completed_at.isnot(None),
        ).count()

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
                    "earned_at": a.earned_at.isoformat() if a.earned_at else None,
                }
                for a in achievements
            ],
        }

    @staticmethod
    def award_achievement(
        db: Session,
        user_id: int,
        achievement_type: str,
        achievement_name: str,
        achievement_description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UserAchievement:
        """Award an achievement to user (idempotent — won't duplicate)"""
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_type == achievement_type,
        ).first()

        if existing:
            return existing

        achievement = UserAchievement(
            user_id=user_id,
            achievement_type=achievement_type,
            achievement_name=achievement_name,
            achievement_description=achievement_description,
            achievement_metadata=metadata,
        )
        db.add(achievement)
        db.flush()

        return achievement

    @staticmethod
    def save_game_progress(
        db: Session,
        gamification_session_id: int,
        user_id: int,
        extra_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Save game progress to extra_data JSONB field"""
        from sqlalchemy.orm.attributes import flag_modified

        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id,
            AssessmentGamificationSession.user_id == user_id,
        ).first()

        if not gam_session:
            raise ValueError("Gamification session not found")

        # Assign a new dict copy so SQLAlchemy detects the change on JSONB
        gam_session.extra_data = dict(extra_data)
        # Explicitly mark the JSONB column as modified (required for mutable JSON)
        flag_modified(gam_session, "extra_data")
        db.flush()

        return {
            "success": True,
            "gamification_session_id": gamification_session_id,
            "saved_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def load_game_progress(
        db: Session,
        gamification_session_id: int,
        user_id: int,
    ) -> Optional[Dict[str, Any]]:
        """Load game progress from extra_data JSONB field"""
        gam_session = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == gamification_session_id,
            AssessmentGamificationSession.user_id == user_id,
        ).first()

        if not gam_session:
            raise ValueError("Gamification session not found")

        return gam_session.extra_data
