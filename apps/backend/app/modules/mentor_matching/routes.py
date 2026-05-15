"""
Mentor Matching API — /api/mentor-matching
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.modules.graph.neo4j_client import get_driver as _get_neo4j
from app.modules.graph.graph_queries import (
    find_mentors_by_skill_overlap,
    find_users_completed_similar_career,
)

from .models import Base, MentorProfile, MenteeProfile
from .schemas import (
    MentorProfileCreate, MentorProfileOut,
    MenteeProfileCreate, MenteeProfileOut,
    MatchingResult, MentorshipRequestCreate, MentorshipRequestOut,
    RequestResponseAction,
)
from .service import MentorMatchingService

router = APIRouter(prefix="/api/mentor-matching", tags=["mentor-matching"])

# ── Auto-create tables on startup ────────────────────────────────
# Tables are created in app startup (main.py), not here
print("[OK] Mentor Matching tables ready")


# ── Mentor endpoints ─────────────────────────────────────────────

@router.post("/mentor/profile", summary="Tạo/cập nhật profile Mentor")
def upsert_mentor_profile(
    data: MentorProfileCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    profile = svc.create_or_update_mentor_profile(current_user.id, data)
    return {"message": "Mentor profile saved", "profile_id": profile.id}


@router.get("/mentor/profile", response_model=MentorProfileOut, summary="Lấy profile Mentor của tôi")
def get_my_mentor_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    profile = svc.get_mentor_profile(current_user.id)
    if not profile:
        raise HTTPException(404, "Mentor profile not found")
    return profile


@router.get("/mentor/requests", response_model=List[MentorshipRequestOut], summary="Yêu cầu mentorship gửi đến tôi (Mentor)")
def get_incoming_requests(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    return svc.get_mentor_requests(current_user.id)


@router.post("/mentor/respond", summary="Mentor phản hồi yêu cầu")
def respond_request(
    data: RequestResponseAction,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    if data.action not in ("accepted", "rejected"):
        raise HTTPException(400, "action must be 'accepted' or 'rejected'")
    svc = MentorMatchingService(db)
    try:
        req = svc.respond_to_request(current_user.id, data)
        return {"message": f"Request {data.action}", "request_id": req.id}
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Mentee endpoints ─────────────────────────────────────────────

@router.post("/mentee/profile", summary="Tạo/cập nhật profile Mentee")
def upsert_mentee_profile(
    data: MenteeProfileCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    profile = svc.create_or_update_mentee_profile(current_user.id, data)
    return {"message": "Mentee profile saved", "profile_id": profile.id}


@router.get("/mentee/profile", response_model=MenteeProfileOut, summary="Lấy profile Mentee của tôi")
def get_my_mentee_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    profile = svc.get_mentee_profile(current_user.id)
    if not profile:
        raise HTTPException(404, "Mentee profile not found")
    return profile


@router.get("/mentee/find-mentors", response_model=List[MatchingResult], summary="Tìm Mentor phù hợp")
def find_mentors(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """
    Tim mentor phu hop — full 5-signal pipeline:
    1. Keyword Skill Match     (30%)
    2. vi-SBERT Semantic Skill (20%)
    3. Career Match            (20%)
    4. Personality Cosine      (15%) — RIASEC + Big5
    5. Neo4j GDS Graph         (15%) — Jaccard + Path Traversal + PageRank
    """
    neo4j_driver = _get_neo4j()
    svc = MentorMatchingService(db, neo4j_driver=neo4j_driver)
    return svc.find_mentors_for_mentee(current_user.id)


@router.post("/mentee/send-request", summary="Gửi yêu cầu mentorship")
def send_request(
    data: MentorshipRequestCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    try:
        req = svc.send_request(current_user.id, data)
        return {"message": "Yêu cầu đã được gửi", "request_id": req.id}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/mentee/my-requests", response_model=List[MentorshipRequestOut], summary="Yêu cầu tôi đã gửi")
def get_my_requests(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    return svc.get_mentee_requests(current_user.id)


# ── Auto-populate from existing profile ─────────────────────────

@router.post("/mentor/create-from-profile", summary="Tự động tạo Mentor Profile từ dữ liệu CV + assessment")
def create_mentor_from_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    try:
        profile = svc.create_mentor_profile_from_user_data(current_user.id)
        return {
            "message": "Mentor profile created from your existing data",
            "profile_id": profile.id,
            "full_name": profile.full_name,
            "current_position": profile.current_position,
            "expertise_areas": profile.expertise_areas or [],
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/mentee/create-from-profile", summary="Tự động tạo Mentee Profile từ dữ liệu assessment + skill gap")
def create_mentee_from_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    svc = MentorMatchingService(db)
    try:
        profile = svc.create_mentee_profile_from_user_data(current_user.id)
        return {
            "message": "Mentee profile created from your existing data",
            "profile_id": profile.id,
            "target_career": profile.target_career,
            "current_skills": profile.current_skills or [],
            "desired_skills": profile.desired_skills or [],
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Public listing ────────────────────────────────────────────────

@router.get("/mentors", response_model=List[MentorProfileOut], summary="Danh sách Mentor đang hoạt động")
def list_mentors(db: Session = Depends(get_db)):
    from .models import MentorProfile as MP
    rows = db.query(MP).filter(MP.is_active == True).all()
    print(f"[Mentor Matching] Found {len(rows)} active mentors in database")
    return rows


@router.get("/debug/mentee-profile", summary="Debug: Xem mentee profile của user hiện tại")
def debug_mentee_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Debug endpoint để xem mentee profile và lý do không tìm thấy mentor"""
    svc = MentorMatchingService(db)
    mentee = svc.get_mentee_profile(current_user.id)
    
    if not mentee:
        return {
            "error": "No mentee profile found",
            "message": "Mentee profile chưa được tạo. Hãy upload CV hoặc làm assessment.",
            "user_id": current_user.id
        }
    
    # Count active mentors
    from .models import MentorProfile as MP
    mentor_count = db.query(MP).filter(MP.is_active == True).count()
    
    return {
        "mentee_profile": {
            "user_id": mentee.user_id,
            "full_name": mentee.full_name,
            "target_career": mentee.target_career,
            "current_skills": mentee.current_skills or [],
            "desired_skills": mentee.desired_skills or [],
            "riasec_scores": mentee.riasec_scores or {},
            "big_five_scores": mentee.big_five_scores or {},
        },
        "mentor_count": mentor_count,
        "has_skills": bool(mentee.desired_skills or mentee.current_skills),
        "has_career": bool(mentee.target_career),
        "has_personality": bool(mentee.riasec_scores),
        "message": f"Found {mentor_count} active mentors in database"
    }


@router.get("/career-mentors", response_model=List[MatchingResult], summary="Tìm Mentor theo nghề nghiệp cụ thể")
def find_mentors_for_career(
    career_title: str,
    limit: int = 3,
    career_slug: str = None,
    db: Session = Depends(get_db),
):
    """
    Trả về top mentors phù hợp với career_title từ 2 nguồn:
    1. MentorProfile (đã đăng ký làm mentor)
    2. UserProgress (đã hoàn thành roadmap của career này)
    """
    from .matching_algorithm import (
        calculate_career_match, calculate_skill_match,
        calculate_overall_compatibility, generate_matching_reasons,
    )
    from .models import MentorProfile as MP
    from app.modules.roadmap.models import UserProgress, RoadmapMilestone
    from app.modules.content.models import Career
    from app.modules.auth.models import User as UserModel
    from sqlalchemy import or_

    career_keywords = [w for w in career_title.replace("-", " ").split() if len(w) > 2]
    results = []
    seen_user_ids: set = set()

    # ── Source 1: registered MentorProfiles ──────────────────────
    mentors = db.query(MP).filter(
        MP.is_active == True,
        MP.current_mentees_count < MP.max_mentees,
    ).all()

    for mentor in mentors:
        skill_score, matching_skills = calculate_skill_match(
            career_keywords, mentor.expertise_areas or [],
        )
        career_score = calculate_career_match(
            career_title, mentor.current_position or "", mentor.expertise_areas or [],
        )
        overall = calculate_overall_compatibility(skill_score, career_score, 0.5, False)
        if overall < 0.05:
            continue
        reasons = generate_matching_reasons(
            matching_skills, career_score, 0.5, mentor.experience_years or 0, False
        )
        seen_user_ids.add(mentor.user_id)
        results.append(MatchingResult(
            mentor_id=mentor.id,
            user_id=mentor.user_id,
            mentor_name=mentor.full_name,
            current_position=mentor.current_position or "",
            company=mentor.company or "",
            bio=mentor.bio or "",
            expertise_areas=mentor.expertise_areas or [],
            experience_years=mentor.experience_years or 0,
            available_hours_per_week=mentor.available_hours_per_week or 0,
            preferred_communication=mentor.preferred_communication or [],
            compatibility_score=round(overall * 100, 1),
            skill_match_score=round(skill_score * 100, 1),
            career_match_score=round(career_score * 100, 1),
            personality_score=50.0,
            matching_skills=matching_skills,
            matching_reasons=reasons,
            current_mentees_count=mentor.current_mentees_count or 0,
            max_mentees=mentor.max_mentees or 5,
        ))

    # ── Source 2: users who completed this career's roadmap ──────
    try:
        # Find career by slug (direct, reliable) or by title (fallback)
        career_objs = []
        if career_slug:
            career_objs = db.query(Career).filter(Career.slug == career_slug).all()
        if not career_objs:
            career_objs = db.query(Career).filter(
                or_(
                    Career.title_en.ilike(f"%{career_title}%"),
                    Career.title_vi.ilike(f"%{career_title}%"),
                    Career.slug == career_title.lower().replace(" ", "-").replace(",", ""),
                )
            ).all()
        career_ids = [c.id for c in career_objs]
        print(f"[career-mentors] title={career_title!r} slug={career_slug!r} → career_ids={career_ids}")

        if career_ids:
            progresses = (
                db.query(UserProgress)
                .filter(UserProgress.career_id.in_(career_ids))
                .all()
            )
            print(f"[career-mentors] found {len(progresses)} UserProgress rows")

            for prog in progresses:
                if prog.user_id in seen_user_ids:
                    continue

                completed = prog.completed_milestones or []
                if not completed:
                    continue

                # completed_milestones stores order numbers as strings ("1", "2", ...)
                completed_orders = []
                for m in completed:
                    try:
                        completed_orders.append(int(m))
                    except (ValueError, TypeError):
                        pass

                milestone_skills: List[str] = []
                if completed_orders:
                    milestones = db.query(RoadmapMilestone).filter(
                        RoadmapMilestone.roadmap_id == prog.roadmap_id,
                        RoadmapMilestone.order_no.in_(completed_orders),
                    ).all()
                    milestone_skills = [ms.skill_name for ms in milestones if ms.skill_name]

                user = db.query(UserModel).filter(UserModel.id == prog.user_id).first()
                if not user:
                    continue

                n_completed = len(completed_orders)
                try:
                    progress_pct = float(prog.progress_percentage or 0)
                except (ValueError, TypeError):
                    progress_pct = 0.0
                score = min(0.5 + (progress_pct / 200), 0.95)

                seen_user_ids.add(prog.user_id)
                results.append(MatchingResult(
                    mentor_id=0,
                    user_id=prog.user_id,
                    mentor_name=user.full_name or user.email.split("@")[0],
                    current_position=f"Đã hoàn thành {n_completed} bước lộ trình {career_title}",
                    company="",
                    bio="",
                    expertise_areas=milestone_skills,
                    experience_years=0,
                    available_hours_per_week=2,
                    preferred_communication=["chat"],
                    compatibility_score=round(score * 100, 1),
                    skill_match_score=round(score * 100, 1),
                    career_match_score=90.0,
                    personality_score=50.0,
                    matching_skills=milestone_skills[:3],
                    matching_reasons=[
                        f"Đã hoàn thành {n_completed} bước trong lộ trình {career_title}",
                        "Có kinh nghiệm thực tế với nghề nghiệp này",
                    ],
                    current_mentees_count=0,
                    max_mentees=5,
                ))
    except Exception as _src2_err:
        print(f"[career-mentors] Source2 error: {_src2_err}")

    results.sort(key=lambda x: x.compatibility_score, reverse=True)
    return results[:limit]


# ── Graph sync endpoint ───────────────────────────────────────────

@router.post("/graph/sync-personality", summary="Dong bo RIASEC + Big5 len Neo4j Mentor/Mentee nodes")
def sync_personality_to_graph(db: Session = Depends(get_db)):
    """Dong bo diem RIASEC va Big5 tu PostgreSQL len Mentor/Mentee nodes trong Neo4j."""
    neo4j_driver = _get_neo4j()
    if not neo4j_driver:
        raise HTTPException(503, "Neo4j not available")
    from .graph_gds import sync_personality_to_graph as _sync
    result = _sync(neo4j_driver, db)
    return {"status": "ok", **result}
