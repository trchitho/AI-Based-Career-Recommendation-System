from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session

from .models import User
from ...core.jwt import require_user, require_admin  # hàm decode JWT → trả user_id
from sqlalchemy import select
from ..assessments.models import Assessment

router = APIRouter()

def _db(req: Request) -> Session:
    return req.state.db

@router.get("/me")
def get_me(request: Request):
    session = _db(request)
    user_id = require_user(request)  # đọc từ Authorization: Bearer <token>
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u.to_dict()

@router.patch("/me")
def update_me(request: Request, payload: dict):
    session = _db(request)
    user_id = require_user(request)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    for field in ("full_name", "avatar_url"):
        if field in payload:
            setattr(u, field, payload[field])
    session.commit()
    session.refresh(u)
    return u.to_dict()


# --- Additional endpoints to support FE screens ---
@router.get("/{user_id}/history")
def get_history(request: Request, user_id: int):
    session = _db(request)
    rows = session.execute(
        select(Assessment).where(Assessment.user_id == user_id).order_by(Assessment.created_at.desc())
    ).scalars().all()
    return [
        {
            "id": str(a.id),
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "type": a.a_type,
            "scores": a.scores,
        }
        for a in rows
    ]


@router.get("/{user_id}/progress")
def get_progress(request: Request, user_id: int):
    # Return demo progress data used by dashboard
    return [
        {
            "roadmap_id": "roadmap-frontend",
            "title": "Frontend Developer Roadmap",
            "completed_milestones": ["html-css-basics", "react-hooks"],
        },
        {
            "roadmap_id": "roadmap-data",
            "title": "Data Analyst Roadmap",
            "completed_milestones": ["python-basics"],
        },
    ]


@router.get("/progress")
def get_progress_current(request: Request):
    # Convenience endpoint (used by profile page best-effort)
    user_id = require_user(request)
    return get_progress(request, user_id)


@router.patch("/{user_id}/role")
def update_role(request: Request, user_id: int, payload: dict):
    # Only admin can change roles
    _ = require_admin(request)
    session = _db(request)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    role = (payload.get("role") or "").strip().lower()
    if role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    u.role = role
    session.commit()
    session.refresh(u)
    return u.to_dict()
