from __future__ import annotations
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from .models import Career
from ..roadmap.models import Roadmap, RoadmapMilestone, UserProgress
from ...core.jwt import require_user


def list_careers(session: Session, q: str | None, category_id: int | None, limit: int, offset: int):
    # Select only portable columns to avoid schema drift
    title_expr = func.coalesce(Career.title_vi, Career.title_en)
    desc_expr = func.coalesce(Career.short_desc_vn, Career.short_desc_en)
    stmt = select(
        Career.id,
        Career.slug,
        title_expr.label("title"),
        desc_expr.label("short_desc"),
        Career.onet_code,
        Career.created_at,
        Career.updated_at,
    )
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(title_expr.ilike(like), Career.slug.ilike(like)))
    stmt = stmt.order_by(Career.created_at.desc()).limit(limit).offset(offset)
    rows = session.execute(stmt).all()
    out: list[dict] = []
    for rid, slug, title, sdesc, onet, c_at, u_at in rows:
        if not title:
            title = (slug or "").replace("-", " ").title()
        out.append({
            "id": str(rid),
            "slug": slug,
            "title": title or "",
            "short_desc": sdesc or "",
            "description": (sdesc or ""),
            "onet_code": onet,
            "created_at": c_at.isoformat() if c_at else None,
            "updated_at": u_at.isoformat() if u_at else None,
        })
    return out


def get_career(session: Session, id_or_slug: str):
    # Be defensive about legacy columns: attempt rich select; on error, fall back to minimal
    def _select_rich(where_clause):
        cols = (
            Career.id,
            Career.slug,
            Career.title_vi,
            Career.title_en,
            Career.short_desc_vn,
            Career.short_desc_en,
            Career.created_at,
            Career.updated_at,
            Career.onet_code,
        )
        return session.execute(select(*cols).where(where_clause)).first()

    def _select_min(where_clause):
        cols = (Career.id, Career.slug)
        return session.execute(select(*cols).where(where_clause)).first()

    from sqlalchemy import and_  # noqa: F401
    where = (Career.id == int(id_or_slug)) if id_or_slug.isdigit() else (Career.slug == id_or_slug)

    row = None
    try:
        row = _select_rich(where)
        if row:
            (
                cid,
                slug,
                title_vi,
                title_en,
                short_desc_vn,
                short_desc_en,
                created_at,
                updated_at,
                onet_code,
            ) = row
            title = title_vi or title_en or ""
            sdesc = short_desc_vn or short_desc_en or ""
            return {
                "id": cid,
                "slug": slug,
                "title": title,
                "short_desc": sdesc,
                "description": sdesc,
                "onet_code": onet_code,
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None,
            }
    except Exception:
        # Fall back to minimal shape if some columns are missing
        try:
            row = _select_min(where)
            if row:
                cid, slug = row
                return {
                    "id": cid,
                    "slug": slug,
                    "title": slug,
                    "description": "",
                }
        except Exception:
            pass
    return None


def get_roadmap(session: Session, user_id: int, id_or_slug: str):
    # Resolve career by id or slug
    if id_or_slug.isdigit():
        c = session.get(Career, int(id_or_slug))
    else:
        c = session.execute(select(Career).where(Career.slug == id_or_slug)).scalar_one_or_none()
    if not c:
        return None
    career_id = int(c.id)
    roadmap = session.execute(select(Roadmap).where(Roadmap.career_id == career_id)).scalar_one_or_none()
    if not roadmap:
        ct = c.to_dict().get("title") or "Career"
        roadmap = Roadmap(career_id=career_id, title=f"{ct} Roadmap")
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
        "careerTitle": c.to_dict().get("title"),
        "milestones": milestones,
        "estimatedTotalDuration": "",
        "userProgress": user_progress,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


def complete_milestone(session: Session, user_id: int, id_or_slug: str, milestone_id: int):
    # Resolve career id
    if id_or_slug.isdigit():
        cid = int(id_or_slug)
    else:
        c = session.execute(select(Career).where(Career.slug == id_or_slug)).scalar_one_or_none()
        if not c:
            return None
        cid = int(c.id)
    roadmap = session.execute(select(Roadmap).where(Roadmap.career_id == cid)).scalar_one_or_none()
    if not roadmap:
        return None
    up = session.execute(
        select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.roadmap_id == roadmap.id)
    ).scalar_one_or_none()
    if not up:
        up = UserProgress(
            user_id=user_id,
            career_id=cid,
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
    comps[str(milestone_id)] = comps.get(str(milestone_id)) or datetime.utcnow().isoformat()
    up.milestone_completions = comps

    total = session.execute(select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap.id)).scalars().all()
    total_count = len(total) or 1
    up.progress_percentage = f"{round(len(completed) * 100 / total_count, 2)}"
    session.commit()
    return {"status": "ok", "completed": up.completed_milestones, "progress": up.progress_percentage}
