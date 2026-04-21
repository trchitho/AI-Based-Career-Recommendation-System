from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from .models import MenteeProfile, MentorProfile, MentorshipRequest
from .schemas import (
    MatchingResult, MenteeProfileCreate, MentorProfileCreate,
    MentorshipRequestCreate, MentorshipRequestOut, RequestResponseAction,
)
from .matching_algorithm import (
    calculate_career_match, calculate_overall_compatibility,
    calculate_personality_similarity, calculate_skill_match,
    generate_matching_reasons,
)

MATCH_THRESHOLD = 0.10  # minimum overall score to include in results


def _extract_skill_names(skills_json) -> List[str]:
    """Normalize cv_skills / skill_gaps JSON to a flat list of strings."""
    if not skills_json:
        return []
    result = []
    if isinstance(skills_json, list):
        for item in skills_json:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                name = item.get("name") or item.get("skill") or item.get("title") or ""
                if name:
                    result.append(str(name))
    elif isinstance(skills_json, dict):
        # e.g. {"critical": [...], "important": [...]}
        for v in skills_json.values():
            result.extend(_extract_skill_names(v))
    return [s.strip() for s in result if s.strip()][:20]


def _extract_career_title(career_recommendations) -> str:
    """Get top career title from assessment career_recommendations JSON."""
    if not career_recommendations:
        return ""
    if isinstance(career_recommendations, list) and len(career_recommendations) > 0:
        top = career_recommendations[0]
        if isinstance(top, dict):
            return (top.get("title_en") or top.get("title_vi") or
                    top.get("career_title") or top.get("title") or "")
        if isinstance(top, str):
            return top
    return ""


class MentorMatchingService:
    def __init__(self, db: Session):
        self.db = db

    # ── Mentor Profile ────────────────────────────────────────────

    def get_mentor_profile(self, user_id: int) -> Optional[MentorProfile]:
        return self.db.query(MentorProfile).filter(MentorProfile.user_id == user_id).first()

    def create_or_update_mentor_profile(self, user_id: int, data: MentorProfileCreate) -> MentorProfile:
        profile = self.get_mentor_profile(user_id)
        payload = data.dict()

        if profile:
            for k, v in payload.items():
                setattr(profile, k, v)
            profile.updated_at = datetime.utcnow()
        else:
            profile = MentorProfile(user_id=user_id, **payload)
            self.db.add(profile)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_active_mentors(self) -> List[MentorProfile]:
        return (
            self.db.query(MentorProfile)
            .filter(
                MentorProfile.is_active == True,
                MentorProfile.current_mentees_count < MentorProfile.max_mentees,
            )
            .all()
        )

    # ── Mentee Profile ────────────────────────────────────────────

    def get_mentee_profile(self, user_id: int) -> Optional[MenteeProfile]:
        return self.db.query(MenteeProfile).filter(MenteeProfile.user_id == user_id).first()

    def create_or_update_mentee_profile(self, user_id: int, data: MenteeProfileCreate) -> MenteeProfile:
        profile = self.get_mentee_profile(user_id)
        payload = data.dict()

        if profile:
            for k, v in payload.items():
                setattr(profile, k, v)
            profile.updated_at = datetime.utcnow()
        else:
            profile = MenteeProfile(user_id=user_id, **payload)
            self.db.add(profile)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    # ── Matching ──────────────────────────────────────────────────

    def find_mentors_for_mentee(self, user_id: int) -> List[MatchingResult]:
        mentee = self.get_mentee_profile(user_id)
        if not mentee:
            return []

        mentors = self.get_active_mentors()
        # Exclude self in case user is also a mentor
        mentors = [m for m in mentors if m.user_id != user_id]

        results = []
        for mentor in mentors:
            skill_score, matching_skills = calculate_skill_match(
                mentee.desired_skills or [],
                mentor.expertise_areas or [],
            )
            career_score = calculate_career_match(
                mentee.target_career or "",
                mentor.current_position or "",
                mentor.expertise_areas or [],
            )
            has_personality = bool(
                (mentee.riasec_scores or mentor.riasec_scores)
                and (mentee.big_five_scores or mentor.big_five_scores)
            )
            personality_score = calculate_personality_similarity(
                mentee.riasec_scores or {},
                mentee.big_five_scores or {},
                mentor.riasec_scores or {},
                mentor.big_five_scores or {},
            )
            overall = calculate_overall_compatibility(
                skill_score, career_score, personality_score, has_personality
            )

            if overall < MATCH_THRESHOLD:
                continue

            reasons = generate_matching_reasons(
                matching_skills,
                career_score,
                personality_score,
                mentor.experience_years or 0,
                has_personality,
            )

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
                personality_score=round(personality_score * 100, 1),
                matching_skills=matching_skills,
                matching_reasons=reasons,
                current_mentees_count=mentor.current_mentees_count or 0,
                max_mentees=mentor.max_mentees or 5,
            ))

        # ── Source 2: users who completed a career roadmap ──────────
        seen_user_ids = {mentor.user_id for mentor in mentors} | {user_id}
        seen_user_ids.update(r.user_id for r in results)
        try:
            from app.modules.roadmap.models import UserProgress, RoadmapMilestone
            from app.modules.content.models import Career as CareerModel
            from app.modules.auth.models import User as UserModel
            from sqlalchemy import or_

            target = (mentee.target_career or "").strip()

            # If mentee has a target career, search matching careers; else use all
            if target:
                career_objs = self.db.query(CareerModel).filter(
                    or_(
                        CareerModel.title_en.ilike(f"%{target}%"),
                        CareerModel.title_vi.ilike(f"%{target}%"),
                        CareerModel.slug == target.lower().replace(" ", "-").replace(",", ""),
                    )
                ).all()
                career_ids = [c.id for c in career_objs]
                progresses = (
                    self.db.query(UserProgress)
                    .filter(UserProgress.career_id.in_(career_ids))
                    .all()
                ) if career_ids else []
            else:
                # No target career — show all users who completed any roadmap
                progresses = (
                    self.db.query(UserProgress)
                    .filter(UserProgress.completed_milestones != None)  # noqa: E711
                    .all()
                )

            for prog in progresses:
                if prog.user_id in seen_user_ids:
                    continue
                completed = prog.completed_milestones or []
                if not completed:
                    continue
                completed_orders = []
                for m in completed:
                    try:
                        completed_orders.append(int(m))
                    except (ValueError, TypeError):
                        pass
                if not completed_orders:
                    continue

                milestone_skills: List[str] = []
                milestones = self.db.query(RoadmapMilestone).filter(
                    RoadmapMilestone.roadmap_id == prog.roadmap_id,
                    RoadmapMilestone.order_no.in_(completed_orders),
                ).all()
                milestone_skills = [ms.skill_name for ms in milestones if ms.skill_name]

                user = self.db.query(UserModel).filter(UserModel.id == prog.user_id).first()
                if not user:
                    continue

                # Get career title for display
                career_obj = self.db.query(CareerModel).filter(CareerModel.id == prog.career_id).first()
                career_label = (career_obj.title_en or career_obj.title_vi or "") if career_obj else ""

                skill_score, matching_skills = calculate_skill_match(
                    mentee.desired_skills or [], milestone_skills
                )
                career_score = calculate_career_match(
                    target or career_label, career_label, milestone_skills
                )
                try:
                    progress_pct = float(prog.progress_percentage or 0)
                except (ValueError, TypeError):
                    progress_pct = 0.0
                base_score = min(0.5 + progress_pct / 200, 0.95)
                overall = calculate_overall_compatibility(skill_score, career_score, 0.5, False)
                score = max(overall, base_score)

                n_completed = len(completed_orders)
                seen_user_ids.add(prog.user_id)
                results.append(MatchingResult(
                    mentor_id=0,
                    user_id=prog.user_id,
                    mentor_name=user.full_name or user.email.split("@")[0],
                    current_position=f"Đã hoàn thành {n_completed} bước lộ trình {career_label}",
                    company="",
                    bio="",
                    expertise_areas=milestone_skills,
                    experience_years=0,
                    available_hours_per_week=2,
                    preferred_communication=["chat"],
                    compatibility_score=round(score * 100, 1),
                    skill_match_score=round(skill_score * 100, 1),
                    career_match_score=round(career_score * 100, 1),
                    personality_score=50.0,
                    matching_skills=matching_skills or milestone_skills[:3],
                    matching_reasons=[
                        f"Đã hoàn thành {n_completed} bước trong lộ trình {career_label}",
                        "Có kinh nghiệm thực tế với nghề nghiệp này",
                    ],
                    current_mentees_count=0,
                    max_mentees=5,
                ))
        except Exception as _e:
            print(f"[find_mentors] Source2 error: {_e}")

        results.sort(key=lambda x: x.compatibility_score, reverse=True)
        return results[:10]

    # ── Requests ──────────────────────────────────────────────────

    def send_request(self, user_id: int, data: MentorshipRequestCreate) -> MentorshipRequest:
        mentee = self.get_mentee_profile(user_id)
        if not mentee:
            raise ValueError("Mentee profile not found. Please set up your profile first.")

        mentor = self.db.query(MentorProfile).filter(MentorProfile.id == data.mentor_id).first()
        if not mentor:
            raise ValueError("Mentor not found.")

        # Check duplicate pending request
        existing = (
            self.db.query(MentorshipRequest)
            .filter(
                MentorshipRequest.mentee_id == mentee.id,
                MentorshipRequest.mentor_id == data.mentor_id,
                MentorshipRequest.status == "pending",
            )
            .first()
        )
        if existing:
            raise ValueError("Bạn đã gửi yêu cầu đến mentor này rồi.")

        # Calculate compatibility for reference
        skill_score, _ = calculate_skill_match(
            mentee.desired_skills or [], mentor.expertise_areas or []
        )
        career_score = calculate_career_match(
            mentee.target_career or "", mentor.current_position or "", mentor.expertise_areas or []
        )
        overall = calculate_overall_compatibility(skill_score, career_score, 0.5, False)

        req = MentorshipRequest(
            mentee_id=mentee.id,
            mentor_id=data.mentor_id,
            compatibility_score=round(overall * 100, 1),
            matching_reasons=[],
            message=data.message or "",
            status="pending",
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req

    def get_mentee_requests(self, user_id: int) -> List[MentorshipRequestOut]:
        mentee = self.get_mentee_profile(user_id)
        if not mentee:
            return []

        rows = (
            self.db.query(MentorshipRequest)
            .filter(MentorshipRequest.mentee_id == mentee.id)
            .order_by(MentorshipRequest.requested_at.desc())
            .all()
        )

        results = []
        for r in rows:
            mentor = self.db.query(MentorProfile).filter(MentorProfile.id == r.mentor_id).first()
            results.append(MentorshipRequestOut(
                id=r.id,
                mentor_id=r.mentor_id,
                mentee_id=r.mentee_id,
                compatibility_score=r.compatibility_score or 0,
                status=r.status,
                message=r.message,
                response_message=r.response_message,
                requested_at=r.requested_at,
                responded_at=r.responded_at,
                mentor_name=mentor.full_name if mentor else None,
                mentor_position=mentor.current_position if mentor else None,
                mentor_company=mentor.company if mentor else None,
            ))
        return results

    def get_mentor_requests(self, user_id: int) -> List[MentorshipRequestOut]:
        mentor = self.get_mentor_profile(user_id)
        if not mentor:
            return []

        rows = (
            self.db.query(MentorshipRequest)
            .filter(MentorshipRequest.mentor_id == mentor.id)
            .order_by(MentorshipRequest.requested_at.desc())
            .all()
        )

        results = []
        for r in rows:
            mentee = self.db.query(MenteeProfile).filter(MenteeProfile.id == r.mentee_id).first()
            results.append(MentorshipRequestOut(
                id=r.id,
                mentor_id=r.mentor_id,
                mentee_id=r.mentee_id,
                compatibility_score=r.compatibility_score or 0,
                status=r.status,
                message=r.message,
                response_message=r.response_message,
                requested_at=r.requested_at,
                responded_at=r.responded_at,
                mentee_name=mentee.full_name if mentee else None,
            ))
        return results

    def respond_to_request(self, user_id: int, data: RequestResponseAction) -> MentorshipRequest:
        mentor = self.get_mentor_profile(user_id)
        if not mentor:
            raise ValueError("Mentor profile not found.")

        req = (
            self.db.query(MentorshipRequest)
            .filter(
                MentorshipRequest.id == data.request_id,
                MentorshipRequest.mentor_id == mentor.id,
            )
            .first()
        )
        if not req:
            raise ValueError("Request not found.")

        req.status = data.action  # "accepted" or "rejected"
        req.response_message = data.response_message or ""
        req.responded_at = datetime.utcnow()

        if data.action == "accepted":
            mentor.current_mentees_count = (mentor.current_mentees_count or 0) + 1

        self.db.commit()
        self.db.refresh(req)
        return req

    # ── Auto-populate from existing user profile data ─────────────

    def create_mentor_profile_from_user_data(self, user_id: int) -> MentorProfile:
        """Auto-creates/enriches MentorProfile from cv_skills + assessment careers."""
        from app.modules.auth.models import User as UserModel
        from app.modules.assessments.models import Assessment
        from app.modules.skill_gap.models import SkillGapAnalysis

        user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        sg = (
            self.db.query(SkillGapAnalysis)
            .filter(SkillGapAnalysis.user_id == user_id)
            .order_by(SkillGapAnalysis.created_at.desc())
            .first()
        )
        expertise_areas = _extract_skill_names(sg.cv_skills) if sg else []
        career_from_sg = sg.career_id.replace("-", " ").title() if sg and sg.career_id else ""

        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.user_id == user_id)
            .order_by(Assessment.created_at.desc())
            .first()
        )
        riasec_scores, big5_scores, career_from_assessment = {}, {}, ""
        if assessment:
            riasec_scores = assessment.processed_riasec_scores or {}
            big5_scores = assessment.processed_big_five_scores or {}
            career_from_assessment = _extract_career_title(assessment.career_recommendations)

        # Also pull skills from completed roadmap milestones
        try:
            from app.modules.roadmap.models import UserProgress, RoadmapMilestone
            progresses = (
                self.db.query(UserProgress)
                .filter(UserProgress.user_id == user_id)
                .all()
            )
            for prog in progresses:
                completed = prog.completed_milestones or []
                completed_orders = []
                for m in completed:
                    try:
                        completed_orders.append(int(m))
                    except (ValueError, TypeError):
                        pass
                if completed_orders:
                    milestones = (
                        self.db.query(RoadmapMilestone)
                        .filter(
                            RoadmapMilestone.roadmap_id == prog.roadmap_id,
                            RoadmapMilestone.order_no.in_(completed_orders),
                        )
                        .all()
                    )
                    for ms in milestones:
                        if ms.skill_name and ms.skill_name not in expertise_areas:
                            expertise_areas.append(ms.skill_name)
        except Exception:
            pass

        current_position = career_from_sg or career_from_assessment

        profile = self.get_mentor_profile(user_id)
        if profile:
            if not profile.expertise_areas:
                profile.expertise_areas = expertise_areas
            if not profile.current_position:
                profile.current_position = current_position
            if not profile.riasec_scores:
                profile.riasec_scores = riasec_scores
            if not profile.big_five_scores:
                profile.big_five_scores = big5_scores
            profile.updated_at = datetime.utcnow()
        else:
            profile = MentorProfile(
                user_id=user_id,
                full_name=user.full_name or user.email.split("@")[0],
                current_position=current_position,
                company="",
                bio="",
                expertise_areas=expertise_areas,
                experience_years=0,
                available_hours_per_week=2,
                preferred_communication=["video", "chat"],
                max_mentees=5,
                riasec_scores=riasec_scores,
                big_five_scores=big5_scores,
                is_active=True,
            )
            self.db.add(profile)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def create_mentee_profile_from_user_data(self, user_id: int) -> MenteeProfile:
        """Auto-creates/enriches MenteeProfile from assessment + skill_gap data."""
        from app.modules.auth.models import User as UserModel
        from app.modules.assessments.models import Assessment
        from app.modules.skill_gap.models import SkillGapAnalysis

        user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.user_id == user_id)
            .order_by(Assessment.created_at.desc())
            .first()
        )
        riasec_scores, big5_scores, target_career = {}, {}, ""
        if assessment:
            riasec_scores = assessment.processed_riasec_scores or {}
            big5_scores = assessment.processed_big_five_scores or {}
            target_career = _extract_career_title(assessment.career_recommendations)

        sg = (
            self.db.query(SkillGapAnalysis)
            .filter(SkillGapAnalysis.user_id == user_id)
            .order_by(SkillGapAnalysis.created_at.desc())
            .first()
        )
        current_skills = _extract_skill_names(sg.cv_skills) if sg else []
        desired_skills = _extract_skill_names(sg.skill_gaps) if sg else []
        if not target_career and sg and sg.career_id:
            target_career = sg.career_id.replace("-", " ").title()

        profile = self.get_mentee_profile(user_id)
        if profile:
            if not profile.target_career:
                profile.target_career = target_career
            if not profile.current_skills:
                profile.current_skills = current_skills
            if not profile.desired_skills:
                profile.desired_skills = desired_skills
            if not profile.riasec_scores:
                profile.riasec_scores = riasec_scores
            if not profile.big_five_scores:
                profile.big_five_scores = big5_scores
            profile.updated_at = datetime.utcnow()
        else:
            profile = MenteeProfile(
                user_id=user_id,
                full_name=user.full_name or user.email.split("@")[0],
                target_career=target_career,
                current_skills=current_skills,
                desired_skills=desired_skills,
                learning_style="flexible",
                preferred_mentor_experience="senior",
                riasec_scores=riasec_scores,
                big_five_scores=big5_scores,
            )
            self.db.add(profile)

        self.db.commit()
        self.db.refresh(profile)
        return profile
