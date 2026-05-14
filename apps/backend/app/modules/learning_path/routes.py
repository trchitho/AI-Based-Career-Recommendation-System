"""
Learning Path API — /api/learning-path
Tổng quan lộ trình học tập: đang học, gợi ý, và lộ trình cá nhân hóa từ CV.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User

router = APIRouter(tags=["learning-path"])


# ═══════════════════════════════════════════════════════════════
#  Schemas
# ═══════════════════════════════════════════════════════════════

class MyRoadmapOut(BaseModel):
    roadmap_id: int
    career_id: int
    career_title: str
    career_slug: Optional[str] = None
    onet_code: Optional[str] = None
    roadmap_title: Optional[str] = None
    progress_percentage: float
    completed_count: int
    total_milestones: int
    last_updated: Optional[str] = None


class SuggestedRoadmapOut(BaseModel):
    career_id: int
    career_title: str
    career_slug: Optional[str] = None
    onet_code: Optional[str] = None
    score: float
    roadmap_id: Optional[int] = None
    roadmap_title: Optional[str] = None
    total_milestones: int


class SkillGapPlanOut(BaseModel):
    analysis_id: int
    career_id: Optional[str] = None
    career_title: Optional[str] = None
    onet_code: Optional[str] = None
    match_percentage: Optional[float] = None
    missing_skills_count: Optional[int] = None
    learning_plan: Optional[dict] = None
    created_at: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
#  Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/my-roadmaps", summary="Lộ trình đang học của tôi")
def get_my_roadmaps(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Lấy danh sách roadmaps user đã bắt đầu học + tiến độ."""
    query = text("""
        SELECT 
            r.id AS roadmap_id,
            r.career_id,
            COALESCE(c.title_vi, c.title_en, '') AS career_title,
            c.slug AS career_slug,
            c.onet_code,
            COALESCE(r.title_vn, r.title_en, '') AS roadmap_title,
            COALESCE(up.progress_percentage, 0) AS progress_percentage,
            COALESCE(jsonb_array_length(up.completed_milestones), 0) AS completed_count,
            (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) AS total_milestones,
            up.last_updated_at::text AS last_updated
        FROM core.user_progress up
        JOIN core.roadmaps r ON r.id = up.roadmap_id
        JOIN core.careers c ON c.id = r.career_id
        WHERE up.user_id = :user_id
        ORDER BY up.last_updated_at DESC
    """)

    rows = db.execute(query, {"user_id": current_user.id}).mappings().all()

    roadmaps = []
    for row in rows:
        roadmaps.append(MyRoadmapOut(
            roadmap_id=row["roadmap_id"],
            career_id=row["career_id"],
            career_title=row["career_title"],
            career_slug=row["career_slug"],
            onet_code=row["onet_code"],
            roadmap_title=row["roadmap_title"],
            progress_percentage=float(row["progress_percentage"] or 0),
            completed_count=int(row["completed_count"] or 0),
            total_milestones=int(row["total_milestones"] or 0),
            last_updated=row["last_updated"],
        ))

    return {"roadmaps": roadmaps}


@router.get("/suggested-roadmaps", summary="Lộ trình gợi ý từ kết quả đánh giá")
def get_suggested_roadmaps(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Lấy nghề gợi ý từ assessment mà user chưa bắt đầu học."""
    query = text("""
        SELECT 
            cr.career_id,
            cr.score,
            COALESCE(c.title_vi, c.title_en, '') AS career_title,
            c.slug AS career_slug,
            c.onet_code,
            r.id AS roadmap_id,
            COALESCE(r.title_vn, r.title_en, '') AS roadmap_title,
            (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) AS total_milestones
        FROM core.career_recommendations cr
        JOIN core.careers c ON c.id = cr.career_id
        LEFT JOIN core.roadmaps r ON r.career_id = c.id
        WHERE cr.assessment_id = (
            SELECT id FROM core.assessment_sessions 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC LIMIT 1
        )
        AND cr.career_id NOT IN (
            SELECT career_id FROM core.user_progress WHERE user_id = :user_id
        )
        ORDER BY cr.rank ASC
        LIMIT 5
    """)

    rows = db.execute(query, {"user_id": current_user.id}).mappings().all()

    roadmaps = []
    for row in rows:
        roadmaps.append(SuggestedRoadmapOut(
            career_id=row["career_id"],
            career_title=row["career_title"],
            career_slug=row["career_slug"],
            onet_code=row["onet_code"],
            score=float(row["score"] or 0),
            roadmap_id=row["roadmap_id"],
            roadmap_title=row["roadmap_title"],
            total_milestones=int(row["total_milestones"] or 0),
        ))

    return {"roadmaps": roadmaps}


@router.get("/skill-gap-plans", summary="Lộ trình học cá nhân hóa từ phân tích CV")
def get_skill_gap_plans(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Lấy các lộ trình học cá nhân hóa từ kết quả phân tích CV (learning_plan_cache)."""
    query = text("""
        SELECT 
            sga.id AS analysis_id,
            sga.career_id,
            COALESCE(
                c1.title_vi, c1.title_en,
                c2.title_vi, c2.title_en,
                sga.career_id
            ) AS career_title,
            COALESCE(c1.onet_code, c2.onet_code) AS onet_code,
            sga.match_percentage,
            sga.missing_skills_count,
            sga.learning_plan_cache,
            sga.created_at::text AS created_at
        FROM core.skill_gap_analyses sga
        LEFT JOIN core.careers c1 ON c1.onet_code = REPLACE(sga.career_id, '-00', '.00')
        LEFT JOIN core.careers c2 ON c2.slug = sga.career_id
        WHERE sga.user_id = :user_id
          AND sga.learning_plan_cache IS NOT NULL
        ORDER BY sga.created_at DESC
        LIMIT 3
    """)

    rows = db.execute(query, {"user_id": current_user.id}).mappings().all()

    plans = []
    for row in rows:
        plan_data = row["learning_plan_cache"]
        # Handle case where it's stored as string
        if isinstance(plan_data, str):
            import json
            try:
                plan_data = json.loads(plan_data)
            except Exception:
                plan_data = None

        plans.append(SkillGapPlanOut(
            analysis_id=row["analysis_id"],
            career_id=row["career_id"],
            career_title=row["career_title"],
            onet_code=row["onet_code"],
            match_percentage=float(row["match_percentage"]) if row["match_percentage"] else None,
            missing_skills_count=int(row["missing_skills_count"]) if row["missing_skills_count"] else None,
            learning_plan=plan_data,
            created_at=row["created_at"],
        ))

    return {"plans": plans}
