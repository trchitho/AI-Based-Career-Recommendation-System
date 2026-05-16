from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import BigInteger, Column, Text, select
from sqlalchemy.orm import Session, registry

from ...core.jwt import require_user

mapper_registry = registry()


@mapper_registry.mapped
class UserGoal:
    __tablename__ = "user_goals"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger)
    goal_text = Column(Text)


router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/goals")
def list_goals(request: Request):
    uid = require_user(request)
    session = _db(request)
    rows = session.execute(select(UserGoal).where(UserGoal.user_id == uid)).scalars().all()
    return [{"id": str(g.id), "goal_text": g.goal_text} for g in rows]


@router.get("")
def get_profile(request: Request):
    """Get user profile information"""
    try:
        uid = require_user(request)
    except:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    session = _db(request)
    
    try:
        # Get user basic info
        from ..auth.models import User
        user = session.get(User, uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get goals only (removed skills and journey)
        goals = []
        try:
            goals = session.execute(select(UserGoal).where(UserGoal.user_id == uid)).scalars().all()
        except Exception as e:
            print(f"Warning: Could not fetch goals: {e}")
            goals = []
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "date_of_birth": user.date_of_birth.isoformat() if getattr(user, "date_of_birth", None) else None,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "goals": [{"id": str(g.id), "goal_text": g.goal_text} for g in goals]
        }
        
    except Exception as e:
        # If there's a transaction error, rollback and try again with basic info only
        session.rollback()
        print(f"Database error, returning basic profile: {e}")
        
        # Get user basic info only
        from ..auth.models import User
        user = session.get(User, uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "date_of_birth": user.date_of_birth.isoformat() if getattr(user, "date_of_birth", None) else None,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "goals": []
        }


@router.post("/goals")
def add_goal(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    text = (payload.get("goal_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="goal_text required")
    g = UserGoal(user_id=uid, goal_text=text)
    session.add(g)
    session.commit()
    session.refresh(g)
    return {"id": str(g.id), "goal_text": g.goal_text}


@router.delete("/goals/{goal_id}")
def delete_goal(request: Request, goal_id: int):
    uid = require_user(request)
    session = _db(request)
    g = session.get(UserGoal, goal_id)
    if not g or g.user_id != uid:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(g)
    session.commit()
    return {"status": "ok"}
