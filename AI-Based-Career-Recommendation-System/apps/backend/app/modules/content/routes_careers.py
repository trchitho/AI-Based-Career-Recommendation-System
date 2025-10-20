from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from .models import Career
from ...core.jwt import require_user
from sqlalchemy import select
from ..roadmap.models import Roadmap, RoadmapMilestone, UserProgress

router = APIRouter()

def _db(request: Request) -> Session:
    return request.state.db

@router.get("")
def list_careers(
    request: Request,
    q: str | None = Query(None, description="search by title/slug"),
    category_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    session = _db(request)
    stmt = select(Career)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(Career.title.ilike(like), Career.slug.ilike(like)))
    if category_id:
        stmt = stmt.where(Career.category_id == category_id)
    stmt = stmt.order_by(Career.created_at.desc()).limit(limit).offset(offset)
    rows = session.execute(stmt).scalars().all()
    return [c.to_dict() for c in rows]

@router.get("/{id_or_slug}")
def get_career(request: Request, id_or_slug: str):
    session = _db(request)
    if id_or_slug.isdigit():
        obj = session.get(Career, int(id_or_slug))
    else:
        obj = session.execute(select(Career).where(Career.slug == id_or_slug)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Career not found")
    return obj.to_dict()


# ---- Roadmap (demo, không lưu DB) ----
@router.get("/{career_id}/roadmap")
def get_roadmap(request: Request, career_id: int):
    user_id = require_user(request)
    session = _db(request)
    c = session.get(Career, career_id)
    if not c:
        raise HTTPException(status_code=404, detail="Career not found")

    roadmap = session.execute(
        select(Roadmap).where(Roadmap.career_id == career_id)
    ).scalar_one_or_none()
    if not roadmap:
        # Auto-create a basic roadmap if missing
        roadmap = Roadmap(career_id=career_id, title=f"{c.title} Roadmap")
        session.add(roadmap)
        session.flush()
        demo_ms = [
            (1, "Fundamentals", "Nắm vững kiến thức nền tảng", "2 weeks",
             [{"title": "CS50 Lecture 1", "url": "https://cs50.harvard.edu/", "type": "course"}]),
            (2, "Tools & Workflow", "Làm quen công cụ và quy trình", "1 week",
             [{"title": "Git Handbook", "url": "https://guides.github.com/", "type": "article"}]),
            (3, "Project", "Thực hành dự án nhỏ", "2 weeks",
             [{"title": "Build a Todo App", "url": "https://example.com/todo", "type": "video"}]),
        ]
        for order_no, skill_name, desc, est, res in demo_ms:
            session.add(RoadmapMilestone(
                roadmap_id=roadmap.id,
                order_no=order_no,
                skill_name=skill_name,
                description=desc,
                estimated_duration=est,
                resources_json=res,
            ))
        session.commit()

    ms = session.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap.id).order_by(RoadmapMilestone.order_no.asc())
    ).scalars().all()
    milestones = [
        {
            "order": m.order_no or 0,
            "skillName": m.skill_name,
            "description": m.description,
            "estimatedDuration": m.estimated_duration,
            "resources": m.resources_json or [],
        }
        for m in ms
    ]

    up = session.execute(
        select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.roadmap_id == roadmap.id)
    ).scalar_one_or_none()

    user_progress = None
    if up:
        user_progress = {
            "id": str(up.id),
            "user_id": str(up.user_id),
            "career_id": str(up.career_id),
            "roadmap_id": str(up.roadmap_id),
            "completed_milestones": up.completed_milestones or [],
            "milestone_completions": up.milestone_completions or {},
            "current_milestone_id": str(up.current_milestone_id) if up.current_milestone_id else None,
            "progress_percentage": float(up.progress_percentage or 0),
            "started_at": up.started_at.isoformat() if up.started_at else None,
            "last_updated_at": up.last_updated_at.isoformat() if up.last_updated_at else None,
        }

    return {
        "id": str(roadmap.id),
        "careerId": str(career_id),
        "careerTitle": c.title,
        "milestones": milestones,
        "estimatedTotalDuration": "",
        "userProgress": user_progress,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.post("/{career_id}/roadmap/milestone/{milestone_id}/complete")
def complete_milestone(request: Request, career_id: int, milestone_id: int):
    user_id = require_user(request)
    session = _db(request)
    roadmap = session.execute(select(Roadmap).where(Roadmap.career_id == career_id)).scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    # upsert user_progress
    up = session.execute(
        select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.roadmap_id == roadmap.id)
    ).scalar_one_or_none()
    if not up:
        up = UserProgress(
            user_id=user_id,
            career_id=career_id,
            roadmap_id=roadmap.id,
            completed_milestones=[],
            milestone_completions={},
            progress_percentage="0",
        )
        session.add(up)
        session.flush()

    completed = set(up.completed_milestones or [])
    completed.add(str(milestone_id))
    up.completed_milestones = list(completed)
    comps = up.milestone_completions or {}
    comps[str(milestone_id)] = (comps.get(str(milestone_id)) or request.headers.get("Date") or "")
    up.milestone_completions = comps

    total = session.execute(select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap.id)).scalars().all()
    total_count = len(total) or 1
    up.progress_percentage = f"{round(len(completed) * 100 / total_count, 2)}"
    session.commit()
    return {"status": "ok", "completed": up.completed_milestones, "progress": up.progress_percentage}
