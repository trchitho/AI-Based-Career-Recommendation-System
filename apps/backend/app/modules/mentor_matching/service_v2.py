"""
app/modules/mentor_matching/service_v2.py
==========================================
Service layer — toàn bộ business logic cho Mentor Matching.

Nguyên tắc:
  - Mỗi hàm public tối đa ~30 dòng, hàm private tối đa ~20 dòng
  - Không import trực tiếp từ SQLAlchemy query ở đây (dùng repository)
  - Không biết đến HTTP request/response (đó là Controller)
  - Raise AppError subclass khi có lỗi nghiệp vụ

Update guide:
  - Đổi thuật toán matching     → sửa _calculate_compatibility_score()
  - Thêm nguồn mentor mới       → thêm _find_mentors_from_new_source()
                                   và gọi trong find_compatible_mentors()
  - Đổi ngưỡng chấp nhận match  → sửa MINIMUM_COMPATIBILITY_THRESHOLD
  - Thêm trường mới vào output  → sửa _build_match_result()
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BusinessRuleError,
    DuplicateResourceError,
    PermissionDeniedError,
    ResourceNotFoundError,
)
from app.modules.auth.models import User
from .matching_algorithm import (
    calculate_career_match,
    calculate_overall_compatibility,
    calculate_personality_similarity,
    calculate_skill_match,
    generate_matching_reasons,
)
from .models import MenteeProfile, MentorProfile, MentorshipRequest
from .repository import (
    MenteeProfileRepository,
    MentorProfileRepository,
    MentorshipRequestRepository,
)
from .schemas import (
    MatchingResult,
    MenteeProfileCreate,
    MentorProfileCreate,
    MentorshipRequestCreate,
    MentorshipRequestOut,
    RequestResponseAction,
)

# Ngưỡng điểm tương thích tối thiểu để hiển thị mentor
MINIMUM_COMPATIBILITY_THRESHOLD = 0.10

# Số mentor tối đa trả về
MAX_MENTOR_RESULTS = 10


class MentorMatchingService:
    """
    Business logic layer cho tính năng Mentor Matching.

    Phụ thuộc:
      - MentorProfileRepository   (DB access)
      - MenteeProfileRepository   (DB access)
      - MentorshipRequestRepository (DB access)

    Update guide:
      - Thêm tính năng rating mentor → thêm method rate_mentor()
      - Thêm mentor recommendation bằng ML → inject MLService vào __init__
    """

    def __init__(self, db: Session) -> None:
        """
        @param db: SQLAlchemy Session, inject từ FastAPI Depends(get_db)
        """
        self._mentor_repo   = MentorProfileRepository(db)
        self._mentee_repo   = MenteeProfileRepository(db)
        self._request_repo  = MentorshipRequestRepository(db)
        self._db = db  # cần cho queries liên bảng phức tạp

    # ════════════════════════════════════════════════════════════
    #  Mentor Profile
    # ════════════════════════════════════════════════════════════

    def get_mentor_profile_or_raise(self, user_id: int) -> MentorProfile:
        """Lấy mentor profile, raise nếu không tồn tại.

        @param user_id: ID của user hiện tại
        @returns: MentorProfile instance
        @raises ResourceNotFoundError: Nếu user chưa đăng ký làm mentor
        """
        profile = self._mentor_repo.find_by_user_id(user_id)
        if not profile:
            raise ResourceNotFoundError("MentorProfile", user_id)
        return profile

    def get_mentor_profile_optional(self, user_id: int) -> Optional[MentorProfile]:
        """Lấy mentor profile, trả None nếu không tồn tại (không raise).

        @param user_id: ID của user
        @returns: MentorProfile hoặc None
        """
        return self._mentor_repo.find_by_user_id(user_id)

    def upsert_mentor_profile(
        self,
        user_id: int,
        data: MentorProfileCreate,
    ) -> MentorProfile:
        """Tạo mới hoặc cập nhật mentor profile.

        @param user_id: ID của user đang đăng ký / cập nhật
        @param data:    Validated data từ Pydantic schema
        @returns: MentorProfile đã lưu
        """
        # 1. Tìm profile hiện tại (nếu có)
        existing_profile = self._mentor_repo.find_by_user_id(user_id)

        if existing_profile:
            # 2a. Update: ghi đè các field
            return self._update_mentor_profile_fields(existing_profile, data)
        else:
            # 2b. Insert: tạo profile mới
            return self._create_mentor_profile(user_id, data)

    def _create_mentor_profile(
        self,
        user_id: int,
        data: MentorProfileCreate,
    ) -> MentorProfile:
        """[Private] Tạo MentorProfile mới từ data đã validate.

        @param user_id: ID owner
        @param data:    Validated input data
        @returns: MentorProfile đã lưu vào DB
        """
        new_profile = MentorProfile(user_id=user_id, **data.dict())
        return self._mentor_repo.save(new_profile)

    def _update_mentor_profile_fields(
        self,
        profile: MentorProfile,
        data: MentorProfileCreate,
    ) -> MentorProfile:
        """[Private] Ghi đè fields của profile hiện có.

        @param profile: MentorProfile cần update
        @param data:    Dữ liệu mới
        @returns: MentorProfile đã update và lưu
        """
        for field_name, new_value in data.dict().items():
            setattr(profile, field_name, new_value)
        profile.updated_at = datetime.utcnow()
        return self._mentor_repo.save(profile)

    # ════════════════════════════════════════════════════════════
    #  Mentee Profile
    # ════════════════════════════════════════════════════════════

    def get_mentee_profile_or_raise(self, user_id: int) -> MenteeProfile:
        """Lấy mentee profile, raise nếu chưa tạo.

        @param user_id: ID của user
        @returns: MenteeProfile instance
        @raises ResourceNotFoundError: Nếu user chưa có mentee profile
        """
        profile = self._mentee_repo.find_by_user_id(user_id)
        if not profile:
            raise ResourceNotFoundError("MenteeProfile", user_id)
        return profile

    def upsert_mentee_profile(
        self,
        user_id: int,
        data: MenteeProfileCreate,
    ) -> MenteeProfile:
        """Tạo mới hoặc cập nhật mentee profile.

        @param user_id: ID của user
        @param data:    Validated data từ Pydantic schema
        @returns: MenteeProfile đã lưu
        """
        existing = self._mentee_repo.find_by_user_id(user_id)
        if existing:
            for field_name, value in data.dict().items():
                setattr(existing, field_name, value)
            existing.updated_at = datetime.utcnow()
            return self._mentee_repo.save(existing)

        new_profile = MenteeProfile(user_id=user_id, **data.dict())
        return self._mentee_repo.save(new_profile)

    # ════════════════════════════════════════════════════════════
    #  Matching Algorithm
    # ════════════════════════════════════════════════════════════

    def find_compatible_mentors(self, mentee_user_id: int) -> List[MatchingResult]:
        """Điểm vào chính của matching: tìm mentor phù hợp với mentee.

        Thuật toán:
          - Source 1: MentorProfile đã đăng ký (skill 50% + career 30% + personality 20%)
          - Source 2: User đã hoàn thành roadmap (base score từ % hoàn thành)

        @param mentee_user_id: user_id của mentee (từ JWT token)
        @returns: Danh sách MatchingResult đã sort theo điểm, tối đa 10 kết quả
        @raises ResourceNotFoundError: Nếu mentee chưa tạo profile
        """
        # 1. Lấy mentee profile (raise nếu không có)
        mentee_profile = self.get_mentee_profile_or_raise(mentee_user_id)

        # 2. Thu thập kết quả từ cả 2 nguồn
        results_from_mentor_profiles = self._match_from_mentor_profiles(
            mentee_profile, exclude_user_id=mentee_user_id
        )
        results_from_roadmap = self._match_from_roadmap_completions(
            mentee_profile, exclude_user_ids={mentee_user_id}
        )

        # 3. Hợp nhất, loại trùng, sort giảm dần theo score
        all_results = results_from_mentor_profiles + results_from_roadmap
        deduplicated = self._deduplicate_by_user_id(all_results)
        sorted_results = sorted(
            deduplicated,
            key=lambda r: r.compatibility_score,
            reverse=True,
        )

        # 4. Cắt kết quả theo giới hạn MAX_MENTOR_RESULTS
        return sorted_results[:MAX_MENTOR_RESULTS]

    def _match_from_mentor_profiles(
        self,
        mentee: MenteeProfile,
        exclude_user_id: int,
    ) -> List[MatchingResult]:
        """[Private] Tính điểm matching với mentor có hồ sơ đăng ký.

        @param mentee:          MenteeProfile của người tìm mentor
        @param exclude_user_id: Loại bỏ chính mình khỏi kết quả
        @returns: Danh sách MatchingResult đã lọc theo ngưỡng điểm tối thiểu
        """
        active_mentors = self._mentor_repo.find_active_mentors()
        eligible_mentors = [m for m in active_mentors if m.user_id != exclude_user_id]

        results: List[MatchingResult] = []
        for mentor in eligible_mentors:
            result = self._score_mentor_against_mentee(mentee, mentor)
            if result and result.compatibility_score >= MINIMUM_COMPATIBILITY_THRESHOLD * 100:
                results.append(result)
        return results

    def _score_mentor_against_mentee(
        self,
        mentee: MenteeProfile,
        mentor: MentorProfile,
    ) -> Optional[MatchingResult]:
        """[Private] Tính điểm tương thích giữa 1 mentee và 1 mentor.

        Công thức: Skill 50% + Career 30% + Personality 20%

        @param mentee: MenteeProfile
        @param mentor: MentorProfile
        @returns: MatchingResult hoặc None nếu lỗi tính toán
        """
        # 1. Skill overlap (50%)
        skill_score, matched_skills = calculate_skill_match(
            desired_skills=mentee.desired_skills or [],
            mentor_expertise=mentor.expertise_areas or [],
        )

        # 2. Career match (30%)
        career_score = calculate_career_match(
            mentee_target=mentee.target_career or "",
            mentor_position=mentor.current_position or "",
            mentor_expertise=mentor.expertise_areas or [],
        )

        # 3. Personality cosine similarity (20%)
        has_personality_data = bool(
            (mentee.riasec_scores or mentor.riasec_scores)
            and (mentee.big_five_scores or mentor.big_five_scores)
        )
        personality_score = calculate_personality_similarity(
            mentee_riasec=mentee.riasec_scores or {},
            mentee_big5=mentee.big_five_scores or {},
            mentor_riasec=mentor.riasec_scores or {},
            mentor_big5=mentor.big_five_scores or {},
        )

        # 4. Tổng hợp điểm
        overall_score = calculate_overall_compatibility(
            skill_match=skill_score,
            career_match=career_score,
            personality_sim=personality_score,
            has_personality=has_personality_data,
        )

        # 5. Tạo lý do matching để hiển thị UI
        matching_reasons = generate_matching_reasons(
            matching_skills=matched_skills,
            career_match=career_score,
            personality_sim=personality_score,
            experience_years=mentor.experience_years or 0,
            has_personality_data=has_personality_data,
        )

        return MatchingResult(
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
            compatibility_score=round(overall_score * 100, 1),
            skill_match_score=round(skill_score * 100, 1),
            career_match_score=round(career_score * 100, 1),
            personality_score=round(personality_score * 100, 1),
            matching_skills=matched_skills,
            matching_reasons=matching_reasons,
            current_mentees_count=mentor.current_mentees_count or 0,
            max_mentees=mentor.max_mentees or 5,
        )

    def _match_from_roadmap_completions(
        self,
        mentee: MenteeProfile,
        exclude_user_ids: set,
    ) -> List[MatchingResult]:
        """[Private] Tìm mentor từ users đã hoàn thành roadmap (Source 2).

        @param mentee:           MenteeProfile để so sánh
        @param exclude_user_ids: Set user_id cần loại bỏ
        @returns: Danh sách MatchingResult từ nguồn roadmap
        """
        try:
            return self._query_roadmap_mentors(mentee, exclude_user_ids)
        except Exception as exc:
            # Log lỗi nhưng không làm hỏng cả matching pipeline
            import logging
            logging.getLogger(__name__).error(
                "[MentorMatching] Source 2 (roadmap) error: %s", exc
            )
            return []

    def _query_roadmap_mentors(
        self,
        mentee: MenteeProfile,
        exclude_user_ids: set,
    ) -> List[MatchingResult]:
        """[Private] Query DB để lấy users có roadmap progress.

        @param mentee:           MenteeProfile
        @param exclude_user_ids: User IDs cần bỏ qua
        @returns: MatchingResult list từ roadmap data
        """
        from app.modules.roadmap.models import RoadmapMilestone, UserProgress
        from app.modules.content.models import Career as CareerModel
        from app.modules.auth.models import User as UserModel

        # 1. Tìm careers phù hợp với target career của mentee
        target = (mentee.target_career or "").strip()
        roadmap_progress_list = self._get_relevant_progress(target)

        results: List[MatchingResult] = []
        seen_user_ids: set = set(exclude_user_ids)

        for progress in roadmap_progress_list:
            if progress.user_id in seen_user_ids:
                continue

            completed_orders = self._parse_completed_orders(progress.completed_milestones)
            if not completed_orders:
                continue

            mentor_user = self._db.query(UserModel).filter(
                UserModel.id == progress.user_id
            ).first()
            if not mentor_user:
                continue

            result = self._build_roadmap_match_result(
                progress=progress,
                mentor_user=mentor_user,
                mentee=mentee,
                completed_orders=completed_orders,
            )
            seen_user_ids.add(progress.user_id)
            results.append(result)

        return results

    def _get_relevant_progress(self, target_career: str):
        """[Private] Lấy UserProgress liên quan đến target career.

        @param target_career: Tên nghề mục tiêu của mentee
        @returns: List UserProgress records
        """
        from sqlalchemy import or_
        from app.modules.roadmap.models import UserProgress
        from app.modules.content.models import Career as CareerModel

        if not target_career:
            # Không có target → lấy tất cả progress
            return self._db.query(UserProgress).filter(
                UserProgress.completed_milestones.isnot(None)
            ).all()

        # Tìm career IDs theo tên
        matching_careers = self._db.query(CareerModel).filter(
            or_(
                CareerModel.title_en.ilike(f"%{target_career}%"),
                CareerModel.title_vi.ilike(f"%{target_career}%"),
                CareerModel.slug == target_career.lower().replace(" ", "-"),
            )
        ).all()

        if not matching_careers:
            return []

        career_ids = [c.id for c in matching_careers]
        return self._db.query(UserProgress).filter(
            UserProgress.career_id.in_(career_ids)
        ).all()

    @staticmethod
    def _parse_completed_orders(completed_milestones) -> List[int]:
        """[Static] Parse completed_milestones JSON thành list int.

        @param completed_milestones: Raw value từ DB (list hoặc None)
        @returns: List int các order_no đã hoàn thành
        """
        if not completed_milestones:
            return []
        orders = []
        for item in completed_milestones:
            try:
                orders.append(int(item))
            except (ValueError, TypeError):
                pass
        return orders

    def _build_roadmap_match_result(
        self,
        progress,
        mentor_user,
        mentee: MenteeProfile,
        completed_orders: List[int],
    ) -> MatchingResult:
        """[Private] Tạo MatchingResult từ roadmap progress data.

        @param progress:        UserProgress record
        @param mentor_user:     User record của người đã hoàn thành roadmap
        @param mentee:          MenteeProfile để tính skill overlap
        @param completed_orders: Danh sách order_no đã hoàn thành
        @returns: MatchingResult với base_score từ progress percentage
        """
        from app.modules.roadmap.models import RoadmapMilestone
        from app.modules.content.models import Career as CareerModel

        # 1. Lấy tên skills từ milestones đã hoàn thành
        milestone_skills = self._get_milestone_skills(
            roadmap_id=progress.roadmap_id,
            completed_orders=completed_orders,
        )

        # 2. Tên career label để hiển thị
        career_obj = self._db.query(CareerModel).filter(
            CareerModel.id == progress.career_id
        ).first()
        career_label = (
            (career_obj.title_en or career_obj.title_vi) if career_obj else ""
        )

        # 3. Tính điểm
        skill_score, matched_skills = calculate_skill_match(
            mentee.desired_skills or [], milestone_skills
        )
        career_score = calculate_career_match(
            mentee.target_career or career_label, career_label, milestone_skills
        )

        progress_pct = self._safe_parse_float(progress.progress_percentage)
        base_score = min(0.5 + progress_pct / 200, 0.95)
        algo_score = calculate_overall_compatibility(skill_score, career_score, 0.5, False)
        final_score = max(algo_score, base_score)

        n_completed = len(completed_orders)
        mentor_name = mentor_user.full_name or mentor_user.email.split("@")[0]

        return MatchingResult(
            mentor_id=0,
            user_id=progress.user_id,
            mentor_name=mentor_name,
            current_position=f"Đã hoàn thành {n_completed} bước lộ trình {career_label}",
            company="",
            bio="",
            expertise_areas=milestone_skills,
            experience_years=0,
            available_hours_per_week=2,
            preferred_communication=["chat"],
            compatibility_score=round(final_score * 100, 1),
            skill_match_score=round(skill_score * 100, 1),
            career_match_score=round(career_score * 100, 1),
            personality_score=50.0,
            matching_skills=matched_skills or milestone_skills[:3],
            matching_reasons=[
                f"Đã hoàn thành {n_completed} bước trong lộ trình {career_label}",
                "Có kinh nghiệm thực tế với nghề nghiệp này",
            ],
            current_mentees_count=0,
            max_mentees=5,
        )

    def _get_milestone_skills(
        self,
        roadmap_id: int,
        completed_orders: List[int],
    ) -> List[str]:
        """[Private] Lấy danh sách skill_name từ các milestone đã hoàn thành.

        @param roadmap_id:       ID của roadmap
        @param completed_orders: List order_no đã hoàn thành
        @returns: List tên skills
        """
        from app.modules.roadmap.models import RoadmapMilestone
        milestones = (
            self._db.query(RoadmapMilestone)
            .filter(
                RoadmapMilestone.roadmap_id == roadmap_id,
                RoadmapMilestone.order_no.in_(completed_orders),
            )
            .all()
        )
        return [m.skill_name for m in milestones if m.skill_name]

    @staticmethod
    def _safe_parse_float(value) -> float:
        """[Static] Parse giá trị thành float, trả 0.0 nếu lỗi.

        @param value: Giá trị cần parse (có thể là str, int, float, None)
        @returns: float
        """
        try:
            return float(value or 0)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def _deduplicate_by_user_id(results: List[MatchingResult]) -> List[MatchingResult]:
        """[Static] Loại bỏ kết quả trùng user_id, giữ score cao nhất.

        @param results: Danh sách MatchingResult có thể có trùng user_id
        @returns: Danh sách đã dedup, giữ entry có score cao nhất
        """
        best_by_user: dict[int, MatchingResult] = {}
        for result in results:
            existing = best_by_user.get(result.user_id)
            if not existing or result.compatibility_score > existing.compatibility_score:
                best_by_user[result.user_id] = result
        return list(best_by_user.values())

    # ════════════════════════════════════════════════════════════
    #  Mentorship Requests
    # ════════════════════════════════════════════════════════════

    def send_mentorship_request(
        self,
        mentee_user_id: int,
        data: MentorshipRequestCreate,
    ) -> MentorshipRequest:
        """Mentee gửi yêu cầu kết nối đến mentor.

        @param mentee_user_id: user_id của mentee (từ JWT)
        @param data:           Validated request data (mentor_id, message)
        @returns: MentorshipRequest đã lưu
        @raises ResourceNotFoundError: Nếu mentee chưa có profile
        @raises ResourceNotFoundError: Nếu mentor không tồn tại
        @raises DuplicateResourceError: Nếu đã có request pending đến mentor này
        """
        # 1. Lấy profile của mentee (raise nếu chưa tạo)
        mentee_profile = self.get_mentee_profile_or_raise(mentee_user_id)

        # 2. Kiểm tra mentor tồn tại
        mentor_profile = self._mentor_repo.find_by_id(data.mentor_id)
        if not mentor_profile:
            raise ResourceNotFoundError("MentorProfile", data.mentor_id)

        # 3. Ngăn gửi request trùng lặp
        existing_request = self._request_repo.find_pending_duplicate(
            mentee_profile_id=mentee_profile.id,
            mentor_profile_id=mentor_profile.id,
        )
        if existing_request:
            raise DuplicateResourceError("MentorshipRequest")

        # 4. Tính điểm compatibility để lưu vào request
        compatibility_score = self._calculate_quick_compatibility(
            mentee_profile, mentor_profile
        )

        # 5. Tạo và lưu request
        new_request = MentorshipRequest(
            mentee_id=mentee_profile.id,
            mentor_id=mentor_profile.id,
            compatibility_score=round(compatibility_score * 100, 1),
            matching_reasons=[],
            message=data.message or "",
            status="pending",
        )
        return self._request_repo.save(new_request)

    def _calculate_quick_compatibility(
        self,
        mentee: MenteeProfile,
        mentor: MentorProfile,
    ) -> float:
        """[Private] Tính nhanh điểm tương thích (không có personality).

        Dùng khi lưu request, không cần chính xác như full matching.

        @returns: Float 0.0–1.0
        """
        skill_score, _ = calculate_skill_match(
            mentee.desired_skills or [], mentor.expertise_areas or []
        )
        career_score = calculate_career_match(
            mentee.target_career or "",
            mentor.current_position or "",
            mentor.expertise_areas or [],
        )
        return calculate_overall_compatibility(skill_score, career_score, 0.5, False)

    def get_mentee_sent_requests(
        self,
        mentee_user_id: int,
    ) -> List[MentorshipRequestOut]:
        """Lấy danh sách requests mentee đã gửi.

        @param mentee_user_id: user_id của mentee
        @returns: Danh sách MentorshipRequestOut (kèm mentor info)
        """
        mentee_profile = self._mentee_repo.find_by_user_id(mentee_user_id)
        if not mentee_profile:
            return []

        requests = self._request_repo.find_by_mentee_profile_id(mentee_profile.id)
        return [self._enrich_request_with_mentor_info(r) for r in requests]

    def get_mentor_received_requests(
        self,
        mentor_user_id: int,
    ) -> List[MentorshipRequestOut]:
        """Lấy danh sách requests mentor nhận được.

        @param mentor_user_id: user_id của mentor
        @returns: Danh sách MentorshipRequestOut (kèm mentee info)
        """
        mentor_profile = self._mentor_repo.find_by_user_id(mentor_user_id)
        if not mentor_profile:
            return []

        requests = self._request_repo.find_by_mentor_profile_id(mentor_profile.id)
        return [self._enrich_request_with_mentee_info(r) for r in requests]

    def respond_to_request(
        self,
        mentor_user_id: int,
        data: RequestResponseAction,
    ) -> MentorshipRequest:
        """Mentor chấp nhận hoặc từ chối mentorship request.

        @param mentor_user_id: user_id của mentor (từ JWT)
        @param data:           action ("accepted"/"rejected") + optional message
        @returns: Request đã cập nhật status
        @raises ResourceNotFoundError: Nếu mentor chưa có profile
        @raises PermissionDeniedError: Nếu request không thuộc mentor này
        """
        # 1. Lấy mentor profile
        mentor_profile = self.get_mentor_profile_or_raise(mentor_user_id)

        # 2. Lấy request và verify quyền sở hữu
        request = self._request_repo.find_by_request_id_and_mentor(
            request_id=data.request_id,
            mentor_profile_id=mentor_profile.id,
        )
        if not request:
            raise PermissionDeniedError("respond to this request")

        # 3. Cập nhật status và message
        request.status = data.action
        request.response_message = data.response_message or ""
        request.responded_at = datetime.utcnow()

        # 4. Tăng mentee count nếu accepted
        if data.action == "accepted":
            self._mentor_repo.increment_mentee_count(mentor_profile)

        return self._request_repo.save(request)

    # ════════════════════════════════════════════════════════════
    #  Helpers — enrich output với data từ bảng liên quan
    # ════════════════════════════════════════════════════════════

    def _enrich_request_with_mentor_info(
        self, request: MentorshipRequest
    ) -> MentorshipRequestOut:
        """[Private] Thêm thông tin mentor vào request output.

        @param request: MentorshipRequest raw từ DB
        @returns: MentorshipRequestOut đã có mentor_name, position, company
        """
        mentor = self._mentor_repo.find_by_id(request.mentor_id)
        return MentorshipRequestOut(
            id=request.id,
            mentor_id=request.mentor_id,
            mentee_id=request.mentee_id,
            compatibility_score=request.compatibility_score or 0,
            status=request.status,
            message=request.message,
            response_message=request.response_message,
            requested_at=request.requested_at,
            responded_at=request.responded_at,
            mentor_name=mentor.full_name if mentor else None,
            mentor_position=mentor.current_position if mentor else None,
            mentor_company=mentor.company if mentor else None,
            mentor_user_id=mentor.user_id if mentor else None,
        )

    def _enrich_request_with_mentee_info(
        self, request: MentorshipRequest
    ) -> MentorshipRequestOut:
        """[Private] Thêm thông tin mentee vào request output.

        @param request: MentorshipRequest raw từ DB
        @returns: MentorshipRequestOut đã có mentee_name, mentee_user_id
        """
        mentee = self._mentee_repo.find_by_id(request.mentee_id)
        return MentorshipRequestOut(
            id=request.id,
            mentor_id=request.mentor_id,
            mentee_id=request.mentee_id,
            compatibility_score=request.compatibility_score or 0,
            status=request.status,
            message=request.message,
            response_message=request.response_message,
            requested_at=request.requested_at,
            responded_at=request.responded_at,
            mentee_name=mentee.full_name if mentee else None,
            mentee_user_id=mentee.user_id if mentee else None,
        )
