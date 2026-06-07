"""
Learning Path API — /api/learning-path
Tổng quan lộ trình học tập: đang học, gợi ý, và lộ trình cá nhân hóa từ CV.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User

router = APIRouter(tags=["learning-path"])


def _pick_skill_name(item) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return (
            item.get("name_vn")
            or item.get("onet_skill_vn")
            or item.get("name")
            or item.get("onet_skill")
            or item.get("skill_name")
            or item.get("name_en")
            or item.get("onet_skill_en")
            or ""
        )
    return ""


def _matched_or_cv_skills(matched_raw, cv_raw) -> List[str]:
    matched = [_pick_skill_name(s) for s in matched_raw] if isinstance(matched_raw, list) else []
    cv_skills = [_pick_skill_name(s) for s in cv_raw] if isinstance(cv_raw, list) else []
    return [s for s in (matched or cv_skills) if s]


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
    cv_filename: Optional[str] = None
    match_percentage: Optional[float] = None
    missing_skills_count: Optional[int] = None
    critical_count: Optional[int] = None
    important_count: Optional[int] = None
    matched_count: Optional[int] = None
    has_personalized_roadmap: bool = False
    personalized_roadmap_id: Optional[int] = None
    personalized_roadmap_progress: Optional[float] = None
    personalized_last_updated: Optional[str] = None
    personalized_completed_at: Optional[str] = None
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
            SELECT id FROM core.assessments 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC LIMIT 1
        )
        AND cr.career_id NOT IN (
            SELECT up2.career_id FROM core.user_progress up2
            WHERE up2.user_id = :user_id
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
    """Lấy các phân tích CV của user. Mỗi analysis có:
    - critical_count, important_count, matched_count (từ skill_gaps JSONB)
    - has_personalized_roadmap: đã tạo lộ trình cá nhân hóa chưa
    - personalized_roadmap_progress: % tiến độ học (nếu đã tạo)
    - personalized_last_updated: lần cuối tương tác với roadmap

    Sort priority:
    1. Lộ trình ĐANG HỌC (chưa hoàn thành 100%) → top, sort theo updated_at DESC
    2. Lộ trình ĐÃ HOÀN THÀNH 100% → giữa, sort theo completed_at DESC
    3. CV chưa tạo roadmap → cuối, sort theo created_at DESC
    """
    query = text("""
        SELECT 
            sga.id AS analysis_id,
            sga.career_id,
            COALESCE(c.title_vi, c.title_en, sga.career_id) AS career_title,
            c.onet_code,
            sga.cv_filename,
            sga.match_percentage,
            sga.missing_skills_count,
            sga.matched_skills_count,
            sga.cv_skills,
            sga.matched_skills,
            sga.skill_gaps,
            sga.learning_plan_cache,
            sga.created_at::text AS created_at,
            pr.id AS personalized_roadmap_id,
            pr.progress_percentage AS personalized_roadmap_progress,
            pr.updated_at::text AS personalized_last_updated,
            pr.completed_at::text AS personalized_completed_at
        FROM core.skill_gap_analyses sga
        LEFT JOIN core.careers c ON (c.slug = sga.career_id OR c.onet_code = sga.career_id)
        LEFT JOIN LATERAL (
            SELECT pr1.id, pr1.progress_percentage, pr1.updated_at, pr1.completed_at
            FROM core.personalized_roadmaps pr1
            WHERE pr1.analysis_id = sga.id 
              AND pr1.user_id = :user_id 
              AND pr1.status = 'ready'
            ORDER BY pr1.updated_at DESC LIMIT 1
        ) pr ON TRUE
        WHERE sga.user_id = :user_id
        ORDER BY 
            -- Tier 1: Đang học (có roadmap, chưa completed) → top
            CASE 
                WHEN pr.id IS NOT NULL AND pr.completed_at IS NULL THEN 0
                -- Tier 2: Đã hoàn thành 100%
                WHEN pr.id IS NOT NULL AND pr.completed_at IS NOT NULL THEN 1
                -- Tier 3: Chưa tạo roadmap
                ELSE 2
            END ASC,
            -- Trong tier 1: học gần nhất lên đầu
            pr.updated_at DESC NULLS LAST,
            -- Trong tier 2: hoàn thành gần nhất lên đầu
            pr.completed_at DESC NULLS LAST,
            -- Trong tier 3: phân tích mới nhất lên đầu
            sga.created_at DESC
        LIMIT 20
    """)

    rows = db.execute(query, {"user_id": current_user.id}).mappings().all()

    plans = []
    for row in rows:
        plan_data = row["learning_plan_cache"]
        if isinstance(plan_data, str):
            try:
                plan_data = json.loads(plan_data)
            except Exception:
                plan_data = None

        # Parse skill_gaps to count important/nice-to-have/matched
        skill_gaps = row["skill_gaps"]
        if isinstance(skill_gaps, str):
            try:
                skill_gaps = json.loads(skill_gaps)
            except Exception:
                skill_gaps = {}
        if not isinstance(skill_gaps, dict):
            skill_gaps = {}

        matched_raw = row["matched_skills"] or []
        cv_raw = row["cv_skills"] or []
        if isinstance(matched_raw, str):
            matched_raw = json.loads(matched_raw)
        if isinstance(cv_raw, str):
            cv_raw = json.loads(cv_raw)
        matched_count = len(_matched_or_cv_skills(matched_raw, cv_raw))
        critical_count = len(skill_gaps.get("critical") or []) + len(skill_gaps.get("important") or [])
        important_count = len(skill_gaps.get("nice_to_have") or [])

        plans.append(SkillGapPlanOut(
            analysis_id=row["analysis_id"],
            career_id=row["career_id"],
            career_title=row["career_title"],
            onet_code=row["onet_code"],
            cv_filename=row["cv_filename"],
            match_percentage=float(row["match_percentage"]) if row["match_percentage"] else None,
            missing_skills_count=int(row["missing_skills_count"]) if row["missing_skills_count"] else None,
            critical_count=critical_count,
            important_count=important_count,
            matched_count=matched_count,
            has_personalized_roadmap=bool(row["personalized_roadmap_id"]),
            personalized_roadmap_id=row["personalized_roadmap_id"],
            personalized_roadmap_progress=(float(row["personalized_roadmap_progress"]) if row["personalized_roadmap_progress"] is not None else None),
            personalized_last_updated=row["personalized_last_updated"],
            personalized_completed_at=row["personalized_completed_at"],
            learning_plan=plan_data,
            created_at=row["created_at"],
        ))

    return {"plans": plans}


# ═══════════════════════════════════════════════════════════════
# PERSONALIZED ROADMAP ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/personalized/config", summary="Lấy cấu hình cho form cá nhân hóa lộ trình")
def get_personalization_config(
    analysis_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Trả về dữ liệu cần thiết để hiển thị form cá nhân hóa:
    - Thông tin phân tích CV (skills thiếu, skills có)
    - Danh sách cấp bậc nghề nghiệp
    - Nguồn khóa học uy tín
    - Rules thời gian học
    - Options cá nhân hóa sâu (goal, experience, pattern, ...)
    """
    from .personalized_service import (
        get_career_levels_for_analysis,
        get_duration_rules,
        get_personalization_options,
        get_trusted_sources,
    )

    # Lấy thông tin phân tích CV
    analysis_query = text("""
        SELECT 
            sga.id, sga.career_id, sga.match_percentage,
            sga.cv_skills, sga.matched_skills, sga.skill_gaps, sga.missing_skills_count,
            sga.matched_skills_count,
            COALESCE(c.title_vi, c.title_en, sga.career_id) AS career_title
        FROM core.skill_gap_analyses sga
        LEFT JOIN core.careers c ON (c.slug = sga.career_id OR c.onet_code = sga.career_id)
        WHERE sga.id = :analysis_id AND sga.user_id = :user_id
    """)
    row = db.execute(analysis_query, {"analysis_id": analysis_id, "user_id": current_user.id}).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy phân tích CV này.")

    # Parse skills
    matched_raw = row["matched_skills"] or []
    skill_gaps_raw = row["skill_gaps"] or {}

    if isinstance(matched_raw, str):
        matched_raw = json.loads(matched_raw)
    if isinstance(skill_gaps_raw, str):
        skill_gaps_raw = json.loads(skill_gaps_raw)

    # Existing skills = matched skills (skills khớp với career, không phải toàn bộ CV)
    # Ưu tiên hiển thị tiếng Việt: name_vn → onet_skill_vn → name → onet_skill → skill_name
    def _pick_vn_name(item) -> str:
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            return (
                item.get("name_vn")
                or item.get("onet_skill_vn")
                or item.get("name")
                or item.get("onet_skill")
                or item.get("skill_name")
                or item.get("name_en")
                or item.get("onet_skill_en")
                or ""
            )
        return ""

    existing_skills = _matched_or_cv_skills(matched_raw, cv_skills_raw)

    # TÁCH RIÊNG nhóm Quan trọng & Nên có
    critical_skills = []
    important_skills = []
    if isinstance(skill_gaps_raw, dict):
        for s in skill_gaps_raw.get("critical", []):
            nm = _pick_vn_name(s)
            if nm:
                critical_skills.append(nm)
        for s in skill_gaps_raw.get("important", []):
            nm = _pick_vn_name(s)
            if nm:
                critical_skills.append(nm)
        for s in skill_gaps_raw.get("nice_to_have", []):
            nm = _pick_vn_name(s)
            if nm:
                important_skills.append(nm)

    critical_skills = [s for s in critical_skills if s]
    important_skills = [s for s in important_skills if s]
    existing_skills = [s for s in existing_skills if s]
    missing_skills = critical_skills + important_skills

    career_levels = get_career_levels_for_analysis(db, row["career_id"])
    options = get_personalization_options()

    return {
        "analysis_id": row["id"],
        "career_id": row["career_id"],
        "career_title": row["career_title"],
        "match_percentage": float(row["match_percentage"]) if row["match_percentage"] else None,
        "existing_skills": existing_skills,
        "missing_skills": missing_skills,
        "critical_skills": critical_skills,
        "important_skills": important_skills,
        "total_existing": len(existing_skills),
        "total_missing": len(missing_skills),
        "total_critical": len(critical_skills),
        "total_important": len(important_skills),
        "career_levels": career_levels,
        "trusted_sources": get_trusted_sources(),
        "duration_rules": get_duration_rules(),
        "personalization_options": options,
    }


@router.post("/personalized/generate", summary="Tạo lộ trình cá nhân hóa bằng AI")
def generate_personalized(
    payload: dict,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Tạo lộ trình cá nhân hóa dựa trên input từ form.
    
    Payload:
    - analysis_id: int
    - level_slug: str
    - duration_months: int (1-12)
    - daily_hours: float
    - study_time: str | null ("HH:MM")
    - preferred_sources: list[str] (min 3)
    - budget_type: "free" | "paid" | "mixed" | "budget"
    - max_budget: float | null
    - learning_style: "video" | "reading" | "practice" | "mixed"
    - preferred_language: "vi" | "en"
    - email_reminder: bool
    """
    from .personalized_service import (
        generate_personalized_roadmap,
        get_career_levels_for_analysis,
        validate_personalization_input,
    )

    analysis_id = payload.get("analysis_id")
    if not analysis_id:
        raise HTTPException(status_code=400, detail="Thiếu analysis_id.")

    # Lấy thông tin phân tích
    analysis_query = text("""
        SELECT 
            sga.id, sga.career_id, sga.matched_skills, sga.skill_gaps,
            COALESCE(c.title_vi, c.title_en, sga.career_id) AS career_title
        FROM core.skill_gap_analyses sga
        LEFT JOIN core.careers c ON (c.slug = sga.career_id OR c.onet_code = sga.career_id)
        WHERE sga.id = :analysis_id AND sga.user_id = :user_id
    """)
    row = db.execute(analysis_query, {"analysis_id": analysis_id, "user_id": current_user.id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy phân tích CV.")

    # Parse skills - existing = matched (không phải toàn bộ CV)
    matched_raw = row["matched_skills"] or []
    skill_gaps_raw = row["skill_gaps"] or {}
    if isinstance(matched_raw, str):
        matched_raw = json.loads(matched_raw)
    if isinstance(skill_gaps_raw, str):
        skill_gaps_raw = json.loads(skill_gaps_raw)

    # Helper: ưu tiên tên VN
    def _pick_vn_name(item) -> str:
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            return (
                item.get("name_vn")
                or item.get("onet_skill_vn")
                or item.get("name")
                or item.get("onet_skill")
                or item.get("skill_name")
                or item.get("name_en")
                or item.get("onet_skill_en")
                or ""
            )
        return ""

    existing_skills = []
    if isinstance(matched_raw, list):
        for s in matched_raw:
            nm = _pick_vn_name(s)
            if nm:
                existing_skills.append(nm)

    # TÁCH RIÊNG nhóm Quan trọng & Nên có - đây là điểm cá nhân hóa quan trọng
    critical_skills: List[str] = []
    important_skills: List[str] = []
    if isinstance(skill_gaps_raw, dict):
        for s in skill_gaps_raw.get("critical", []):
            nm = _pick_vn_name(s)
            if nm:
                critical_skills.append(nm)
        for s in skill_gaps_raw.get("important", []):
            nm = _pick_vn_name(s)
            if nm:
                critical_skills.append(nm)
        for s in skill_gaps_raw.get("nice_to_have", []):
            nm = _pick_vn_name(s)
            if nm:
                important_skills.append(nm)

    # Filter out empty strings
    critical_skills = [s for s in critical_skills if s]
    important_skills = [s for s in important_skills if s]
    existing_skills = [s for s in existing_skills if s]
    missing_skills = critical_skills + important_skills

    # Extract params (mở rộng)
    duration_months = int(payload.get("duration_months", 3))
    daily_hours = float(payload.get("daily_hours", 2))
    preferred_sources = payload.get("preferred_sources", [])
    budget_type = (payload.get("budget_type") or "mixed").strip().lower()
    max_budget = payload.get("max_budget")
    learning_style = (payload.get("learning_style") or "mixed").strip().lower()
    preferred_language = (payload.get("preferred_language") or "vi").strip().lower()
    level_slug = (payload.get("level_slug") or "").strip()
    study_time = (payload.get("study_time") or "").strip() or None
    email_reminder = bool(payload.get("email_reminder", False))

    # New params (cá nhân hóa sâu hơn)
    weekly_pattern = (payload.get("weekly_pattern") or "").strip().lower() or None
    project_intensity = (payload.get("project_intensity") or "").strip().lower() or None
    prior_experience = (payload.get("prior_experience") or "").strip().lower() or None
    learning_goal = (payload.get("learning_goal") or "").strip().lower() or None
    target_company_type = (payload.get("target_company_type") or "").strip().lower() or None
    ai_difficulty_level = (payload.get("ai_difficulty_level") or "").strip().lower() or None
    certification_priority = bool(payload.get("certification_priority", False))
    current_position = (payload.get("current_position") or "").strip() or None
    target_salary_range = (payload.get("target_salary_range") or "").strip() or None
    user_notes = (payload.get("user_notes") or "").strip() or None

    # Sanitize max_budget
    max_budget_float: Optional[float] = None
    if max_budget is not None and str(max_budget).strip() != "":
        try:
            max_budget_float = float(max_budget)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Ngân sách phải là số.")

    # Validate study_time format (HH:MM)
    if study_time:
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", study_time):
            raise HTTPException(status_code=400, detail="Giờ học phải có định dạng HH:MM (ví dụ: 20:00).")

    # Validate (mở rộng)
    error = validate_personalization_input(
        duration_months=duration_months,
        daily_hours=daily_hours,
        preferred_sources=preferred_sources,
        missing_skills_count=len(missing_skills),
        budget_type=budget_type,
        learning_style=learning_style,
        preferred_language=preferred_language,
        max_budget=max_budget_float,
        weekly_pattern=weekly_pattern,
        project_intensity=project_intensity,
        prior_experience=prior_experience,
        learning_goal=learning_goal,
        target_company_type=target_company_type,
        ai_difficulty_level=ai_difficulty_level,
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    if not level_slug:
        raise HTTPException(status_code=400, detail="Vui lòng chọn cấp bậc nghề nghiệp.")

    if not missing_skills:
        raise HTTPException(
            status_code=400,
            detail="Phân tích CV này không có kỹ năng nào cần bổ sung. Không thể tạo lộ trình học tập.",
        )

    # Validate user_notes length
    if user_notes and len(user_notes) > 1000:
        raise HTTPException(status_code=400, detail="Ghi chú không được vượt quá 1000 ký tự.")

    # Validate target_salary_range length
    if target_salary_range and len(target_salary_range) > 100:
        raise HTTPException(status_code=400, detail="Khoảng lương không được vượt quá 100 ký tự.")

    if current_position and len(current_position) > 200:
        raise HTTPException(status_code=400, detail="Vị trí hiện tại không được vượt quá 200 ký tự.")

    # Get level name & validate
    level_name = level_slug
    levels = get_career_levels_for_analysis(db, row["career_id"])
    valid_level = False
    for lv in levels:
        if lv["slug"] == level_slug:
            level_name = lv["name"] or level_slug
            valid_level = True
            break
    if not valid_level and levels:
        raise HTTPException(status_code=400, detail="Cấp bậc đã chọn không hợp lệ với nghề này.")

    # Generate (truyền đầy đủ params)
    result = generate_personalized_roadmap(
        db=db,
        user_id=current_user.id,
        analysis_id=analysis_id,
        career_id=row["career_id"],
        career_title=row["career_title"] or row["career_id"],
        level_slug=level_slug,
        level_name=level_name,
        critical_skills=critical_skills,
        important_skills=important_skills,
        existing_skills=existing_skills,
        duration_months=duration_months,
        daily_hours=daily_hours,
        study_time=study_time,
        weekly_pattern=weekly_pattern,
        preferred_sources=preferred_sources,
        budget_type=budget_type,
        max_budget=max_budget_float,
        learning_style=learning_style,
        project_intensity=project_intensity,
        preferred_language=preferred_language,
        prior_experience=prior_experience,
        learning_goal=learning_goal,
        target_company_type=target_company_type,
        ai_difficulty_level=ai_difficulty_level,
        certification_priority=certification_priority,
        current_position=current_position,
        target_salary_range=target_salary_range,
        user_notes=user_notes,
        email_reminder=email_reminder,
    )

    return result


@router.get("/personalized/my-roadmaps", summary="Lấy danh sách lộ trình cá nhân hóa đã tạo")
def get_my_personalized_roadmaps(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Trả về danh sách lộ trình cá nhân hóa của user."""
    query = text("""
        SELECT 
            id, career_id, career_title, level_name, duration_months,
            daily_hours, status, total_missing, total_existing,
            budget_type, preferred_sources, learning_style,
            created_at::text AS created_at,
            roadmap_data IS NOT NULL AS has_data
        FROM core.personalized_roadmaps
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT 10
    """)
    rows = db.execute(query, {"user_id": current_user.id}).mappings().all()

    return {
        "roadmaps": [
            {
                "id": row["id"],
                "career_id": row["career_id"],
                "career_title": row["career_title"],
                "level_name": row["level_name"],
                "duration_months": row["duration_months"],
                "daily_hours": float(row["daily_hours"]),
                "status": row["status"],
                "total_missing": row["total_missing"],
                "total_existing": row["total_existing"],
                "budget_type": row["budget_type"],
                "preferred_sources": row["preferred_sources"],
                "learning_style": row["learning_style"],
                "created_at": row["created_at"],
                "has_data": row["has_data"],
            }
            for row in rows
        ]
    }


@router.get("/personalized/{roadmap_id}", summary="Lấy chi tiết lộ trình cá nhân hóa")
def get_personalized_roadmap_detail(
    roadmap_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Trả về chi tiết đầy đủ của một lộ trình cá nhân hóa."""
    query = text("""
        SELECT *
        FROM core.personalized_roadmaps
        WHERE id = :roadmap_id AND user_id = :user_id
    """)
    row = db.execute(query, {"roadmap_id": roadmap_id, "user_id": current_user.id}).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy lộ trình này.")

    return {
        "id": row["id"],
        "career_id": row["career_id"],
        "career_title": row["career_title"],
        "level_slug": row["level_slug"],
        "level_name": row["level_name"],
        "duration_months": row["duration_months"],
        "daily_hours": float(row["daily_hours"]),
        "study_time": row["study_time"],
        "weekly_pattern": row["weekly_pattern"],
        "ai_difficulty_level": row["ai_difficulty_level"],
        "budget_type": row["budget_type"],
        "max_budget": float(row["max_budget"]) if row["max_budget"] else None,
        "preferred_sources": row["preferred_sources"],
        "preferred_language": row["preferred_language"],
        "learning_style": row["learning_style"],
        "project_intensity": row["project_intensity"],
        "certification_priority": row["certification_priority"],
        "prior_experience": row["prior_experience"],
        "learning_goal": row["learning_goal"],
        "current_position": row["current_position"],
        "target_company_type": row["target_company_type"],
        "target_salary_range": row["target_salary_range"],
        "user_notes": row["user_notes"],
        "missing_skills": row["missing_skills"] or [],
        "existing_skills": row["existing_skills"] or [],
        "critical_skills": row["critical_skills"] or [],
        "important_skills": row["important_skills"] or [],
        "total_missing": row["total_missing"] or 0,
        "total_existing": row["total_existing"] or 0,
        "roadmap_data": row["roadmap_data"],
        "status": row["status"],
        "generation_error": row["generation_error"],
        "email_reminder_enabled": row["email_reminder_enabled"],
        "email_reminder_time": row["email_reminder_time"],
        "completed_course_ids": row["completed_course_ids"] or [],
        "completed_phase_ids": row["completed_phase_ids"] or [],
        "progress_percentage": float(row["progress_percentage"] or 0),
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
    }


@router.post("/personalized/{roadmap_id}/toggle-course", summary="Đánh dấu hoàn thành/chưa hoàn thành 1 khóa học")
def toggle_course_completion(
    roadmap_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Toggle trạng thái hoàn thành khóa học.
    Payload: { "course_id": "course-1-abc", "completed": true|false }
    Trả về: completed_course_ids mới và progress_percentage mới
    """
    from .models import PersonalizedRoadmap

    course_id = (payload.get("course_id") or "").strip()
    completed = bool(payload.get("completed", False))
    if not course_id:
        raise HTTPException(status_code=400, detail="Thiếu course_id.")

    roadmap = db.query(PersonalizedRoadmap).filter(
        PersonalizedRoadmap.id == roadmap_id,
        PersonalizedRoadmap.user_id == current_user.id,
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Không tìm thấy lộ trình.")

    if roadmap.status != "ready":
        raise HTTPException(status_code=400, detail="Lộ trình chưa sẵn sàng để đánh dấu tiến độ.")

    # Validate course_id thực sự tồn tại trong roadmap_data (tránh client gửi linh tinh)
    rdata = roadmap.roadmap_data or {}
    phases = rdata.get("phases") or []
    valid_course_ids = set()
    total_courses = 0
    for pi, ph in enumerate(phases):
        if not isinstance(ph, dict):
            continue
        cs = ph.get("courses") or []
        for ci, c in enumerate(cs):
            if isinstance(c, dict):
                cid = c.get("course_id") or f"course-{ph.get('phase', pi + 1)}-{ci}"
                valid_course_ids.add(cid)
                total_courses += 1

    if course_id not in valid_course_ids:
        raise HTTPException(status_code=400, detail="course_id không tồn tại trong lộ trình này.")

    completed_list = list(roadmap.completed_course_ids or [])
    if completed:
        if course_id not in completed_list:
            completed_list.append(course_id)
    else:
        completed_list = [c for c in completed_list if c != course_id]

    progress = round(len(completed_list) / total_courses * 100, 1) if total_courses > 0 else 0.0

    # Auto-mark phase complete khi tất cả khóa học của phase đã xong
    completed_phase_ids = list(roadmap.completed_phase_ids or [])
    for pi, ph in enumerate(phases):
        if not isinstance(ph, dict):
            continue
        phase_id = ph.get("phase_id") or f"phase-{ph.get('phase', pi + 1)}"
        cs = ph.get("courses") or []
        if not cs:
            continue
        all_done = all(
            (c.get("course_id") or f"course-{ph.get('phase', pi + 1)}-{i}") in completed_list
            for i, c in enumerate(cs)
        )
        if all_done and phase_id not in completed_phase_ids:
            completed_phase_ids.append(phase_id)
        elif not all_done and phase_id in completed_phase_ids:
            completed_phase_ids = [p for p in completed_phase_ids if p != phase_id]

    # Set completed_at khi 100%
    if progress >= 100 and roadmap.completed_at is None:
        roadmap.completed_at = datetime.now(timezone.utc)
    elif progress < 100 and roadmap.completed_at is not None:
        roadmap.completed_at = None

    roadmap.completed_course_ids = completed_list
    roadmap.completed_phase_ids = completed_phase_ids
    roadmap.progress_percentage = progress
    db.commit()

    return {
        "success": True,
        "completed_course_ids": completed_list,
        "completed_phase_ids": completed_phase_ids,
        "progress_percentage": progress,
        "total_courses": total_courses,
        "completed_count": len(completed_list),
        "is_finished": progress >= 100,
    }
