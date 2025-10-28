from __future__ import annotations
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from .models import Career
from ..roadmap.models import Roadmap, RoadmapMilestone, UserProgress


def list_careers(
    session: Session, q: str | None, category_id: int | None, limit: int, offset: int
):
    stmt = select(Career)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(Career.title.ilike(like), Career.slug.ilike(like)))
    if category_id:
        stmt = stmt.where(Career.category_id == category_id)
    stmt = stmt.order_by(Career.created_at.desc()).limit(limit).offset(offset)
    rows = session.execute(stmt).scalars().all()
    return [c.to_dict() for c in rows]


def get_career(session: Session, id_or_slug: str):
    if id_or_slug.isdigit():
        obj = session.get(Career, int(id_or_slug))
    else:
        obj = session.execute(
            select(Career).where(Career.slug == id_or_slug)
        ).scalar_one_or_none()
    return obj.to_dict() if obj else None


def get_roadmap(session: Session, user_id: int, career_id: int):
    c = session.get(Career, career_id)
    if not c:
        return None
    roadmap = session.execute(
        select(Roadmap).where(Roadmap.career_id == career_id)
    ).scalar_one_or_none()
    if not roadmap:
        roadmap = Roadmap(career_id=career_id, title=f"{c.title} Roadmap")
        session.add(roadmap)
        session.flush()
        demo_ms = [
            (
                1,
                "Fundamentals",
                "Nắm vững kiến thức nền tảng",
                "2 weeks",
                [
                    {
                        "title": "CS50 Lecture 1",
                        "url": "https://cs50.harvard.edu/",
                        "type": "course",
                    }
                ],
            ),
            (
                2,
                "Tools & Workflow",
                "Làm quen công cụ và quy trình",
                "1 week",
                [
                    {
                        "title": "Git Handbook",
                        "url": "https://guides.github.com/",
                        "type": "article",
                    }
                ],
            ),
            (
                3,
                "Project",
                "Thực hành dự án nhỏ",
                "2 weeks",
                [
                    {
                        "title": "Build a Todo App",
                        "url": "https://example.com/todo",
                        "type": "video",
                    }
                ],
            ),
        ]
        for order_no, skill_name, desc, est, res in demo_ms:
            session.add(
                RoadmapMilestone(
                    roadmap_id=roadmap.id,
                    order_no=order_no,
                    skill_name=skill_name,
                    description=desc,
                    estimated_duration=est,
                    resources_json=res,
                )
            )
        session.commit()

    ms = (
        session.execute(
            select(RoadmapMilestone)
            .where(RoadmapMilestone.roadmap_id == roadmap.id)
            .order_by(RoadmapMilestone.order_no.asc())
        )
        .scalars()
        .all()
    )
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
        select(UserProgress).where(
            UserProgress.user_id == user_id, UserProgress.roadmap_id == roadmap.id
        )
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
            "current_milestone_id": (
                str(up.current_milestone_id) if up.current_milestone_id else None
            ),
            "progress_percentage": float(up.progress_percentage or 0),
            "started_at": up.started_at.isoformat() if up.started_at else None,
            "last_updated_at": (
                up.last_updated_at.isoformat() if up.last_updated_at else None
            ),
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


def complete_milestone(
    session: Session, user_id: int, career_id: int, milestone_id: int
):
    roadmap = session.execute(
        select(Roadmap).where(Roadmap.career_id == career_id)
    ).scalar_one_or_none()
    if not roadmap:
        return None
    up = session.execute(
        select(UserProgress).where(
            UserProgress.user_id == user_id, UserProgress.roadmap_id == roadmap.id
        )
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
    from datetime import datetime

    comps[str(milestone_id)] = (
        comps.get(str(milestone_id)) or datetime.utcnow().isoformat()
    )
    up.milestone_completions = comps

    total = (
        session.execute(
            select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap.id)
        )
        .scalars()
        .all()
    )
    total_count = len(total) or 1
    up.progress_percentage = f"{round(len(completed) * 100 / total_count, 2)}"
    session.commit()
    return {
        "status": "ok",
        "completed": up.completed_milestones,
        "progress": up.progress_percentage,
    }
