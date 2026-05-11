"""
Gamification API routes
Separate from assessment routes to maintain clear separation
"""

import base64
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .gamification_service import GamificationService

router = APIRouter(prefix="/gamification", tags=["gamification"])


def _db(req: Request) -> Session:
    """Get database session from request state"""
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database session not available",
        )
    return db


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    """Decode JWT payload without signature verification."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("invalid jwt format")

        payload_b64 = parts[1]
        padding = "=" * (-len(payload_b64) % 4)
        payload_b64 += padding

        raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("jwt payload not object")
        return data
    except Exception as e:
        raise ValueError(f"cannot decode jwt: {e!r}") from e


def _current_user_id(req: Request) -> int:
    """Get current user ID from request state, headers, or JWT payload."""
    uid = getattr(req.state, "user_id", None)

    if uid is None:
        user_obj = getattr(req.state, "user", None)
        if user_obj is not None:
            uid = getattr(user_obj, "id", None) or getattr(user_obj, "user_id", None)

    if uid is None:
        hdr = req.headers.get("X-User-Id")
        if hdr:
            try:
                uid = int(hdr)
            except ValueError:
                uid = None

    if uid is None:
        auth = req.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[len("Bearer ") :].strip()
            if token:
                try:
                    payload = _decode_jwt_payload(token)
                    uid = payload.get("user_id") or payload.get("sub") or payload.get("id")
                except ValueError:
                    uid = None

    if uid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthenticated user",
        )
    
    try:
        return int(uid)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user id",
        )


# Pydantic models
class StartGamificationSessionRequest(BaseModel):
    assessment_session_id: int
    quiz_mode: str  # 'standard', 'game', 'legacy'


class AwardXPRequest(BaseModel):
    gamification_session_id: int


class CompleteSessionRequest(BaseModel):
    gamification_session_id: int


# Routes
@router.post("/start-session")
def start_gamification_session(
    body: StartGamificationSessionRequest,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Start a new gamification session — idempotent.
    If an incomplete session already exists for (assessment_session_id, user_id, quiz_mode),
    return that session instead of creating a duplicate.
    """
    try:
        from .gamification_models import AssessmentGamificationSession

        # Check for existing incomplete session first (idempotent)
        existing = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.assessment_session_id == body.assessment_session_id,
            AssessmentGamificationSession.user_id == user_id,
            AssessmentGamificationSession.quiz_mode == body.quiz_mode,
            AssessmentGamificationSession.completed_at.is_(None),
        ).order_by(AssessmentGamificationSession.id.desc()).first()

        if existing:
            # Return existing session — no duplicate created
            return {
                "gamification_session_id": existing.id,
                "quiz_mode": existing.quiz_mode,
                "xp_earned": existing.xp_earned,
                "reused": True,
            }

        # No existing session — create new one
        session = GamificationService.start_gamification_session(
            db=db,
            user_id=user_id,
            assessment_session_id=body.assessment_session_id,
            quiz_mode=body.quiz_mode,
        )
        db.commit()

        return {
            "gamification_session_id": session.id,
            "quiz_mode": session.quiz_mode,
            "xp_earned": session.xp_earned,
            "reused": False,
        }
    except Exception as e:
        db.rollback()
        print(f"[gamification] start_session error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start gamification session",
        )


@router.post("/award-xp")
def award_xp(
    body: AwardXPRequest,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Award XP for answering a question
    Called after each question is answered in game mode
    """
    try:
        result = GamificationService.award_xp_for_question(
            db=db,
            gamification_session_id=body.gamification_session_id,
            user_id=user_id
        )
        db.commit()
        
        return result
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        print(f"[gamification] award_xp error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to award XP"
        )


@router.post("/complete-session")
def complete_session(
    body: CompleteSessionRequest,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Complete a gamification session
    Called when assessment is submitted
    """
    try:
        result = GamificationService.complete_gamification_session(
            db=db,
            gamification_session_id=body.gamification_session_id
        )
        db.commit()

        return result
    except ValueError as e:
        db.rollback()
        error_message = str(e)
        if "already completed" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_message
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_message
        )
    except Exception as e:
        db.rollback()
        print(f"[gamification] complete_session error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete session"
        )


@router.get("/stats")
def get_user_stats(
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Get user's gamification stats
    Returns XP, level, achievements, etc.
    """
    try:
        stats = GamificationService.get_user_stats(db=db, user_id=user_id)
        return stats
    except Exception as e:
        print(f"[gamification] get_stats error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user stats"
        )


@router.get("/profile")
def get_gamification_profile(
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Get user's gamification profile
    """
    try:
        profile = GamificationService.get_or_create_profile(db=db, user_id=user_id)
        db.commit()
        
        return {
            "user_id": profile.user_id,
            "total_xp": profile.total_xp,
            "level": profile.level,
            "xp_for_next_level": (profile.level * GamificationService.XP_FOR_LEVEL) - profile.total_xp,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
        }
    except Exception as e:
        db.rollback()
        print(f"[gamification] get_profile error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get gamification profile"
        )


class SaveProgressRequest(BaseModel):
    gamification_session_id: int
    extra_data: dict


@router.post("/save-progress")
def save_game_progress(
    body: SaveProgressRequest,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Save game progress to database
    Stores current game state in extra_data field
    """
    try:
        result = GamificationService.save_game_progress(
            db=db,
            gamification_session_id=body.gamification_session_id,
            user_id=user_id,
            extra_data=body.extra_data
        )
        db.commit()
        return result
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        print(f"[gamification] save_progress error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save game progress"
        )


@router.get("/load-progress/{gamification_session_id}")
def load_game_progress(
    gamification_session_id: int,
    db: Session = Depends(_db),
    user_id: int = Depends(_current_user_id),
):
    """
    Load game progress from database
    Returns saved game state from extra_data field
    """
    try:
        progress = GamificationService.load_game_progress(
            db=db,
            gamification_session_id=gamification_session_id,
            user_id=user_id
        )
        return progress or {}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"[gamification] load_progress error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load game progress"
        )
