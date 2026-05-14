"""
app/modules/mentor_matching/repository.py
=========================================
Repository layer — toàn bộ truy vấn DB cho Mentor Matching.

Nguyên tắc:
  - Mỗi method chỉ làm 1 việc: truy vấn DB
  - Không chứa business logic (logic đó ở service.py)
  - Không biết đến HTTP (đó là việc của routes.py / controller)

Update guide:
  - Thêm query mới         → thêm method vào class tương ứng
  - Đổi cách filter mentor → sửa MentorProfileRepository.find_active_mentors()
  - Thêm eager loading     → thêm .options(joinedload(...)) vào query
  - Phân trang requests     → sửa MentorshipRequestRepository.find_by_mentee_id()
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.base_repository import BaseRepository
from .models import MenteeProfile, MentorProfile, MentorshipRequest


# ════════════════════════════════════════════════════════════════
#  MentorProfile Repository
# ════════════════════════════════════════════════════════════════

class MentorProfileRepository(BaseRepository[MentorProfile]):
    """Truy vấn DB cho bảng mentor_profiles."""

    def __init__(self, db: Session) -> None:
        super().__init__(db, MentorProfile)

    def find_by_user_id(self, user_id: int) -> Optional[MentorProfile]:
        """Tìm mentor profile theo user_id (1 user = 1 profile).

        @param user_id: ID của user trong bảng core.users
        @returns: MentorProfile hoặc None nếu chưa đăng ký làm mentor
        """
        return (
            self._db.query(MentorProfile)
            .filter(MentorProfile.user_id == user_id)
            .first()
        )

    def find_active_mentors(self) -> List[MentorProfile]:
        """Lấy tất cả mentor đang active và còn chỗ nhận mentee.

        Điều kiện: is_active=True VÀ current_mentees_count < max_mentees

        @returns: Danh sách MentorProfile đang nhận mentee
        """
        return (
            self._db.query(MentorProfile)
            .filter(
                MentorProfile.is_active == True,                          # noqa: E712
                MentorProfile.current_mentees_count < MentorProfile.max_mentees,
            )
            .all()
        )

    def find_by_id_with_user_check(
        self,
        profile_id: int,
        user_id: int,
    ) -> Optional[MentorProfile]:
        """Tìm mentor profile và xác nhận thuộc về user.

        Dùng khi cần xác thực quyền sở hữu trước khi update.

        @param profile_id: ID của mentor profile
        @param user_id:    ID của user hiện tại (từ JWT)
        @returns: MentorProfile nếu tồn tại và thuộc user, None nếu không
        """
        return (
            self._db.query(MentorProfile)
            .filter(
                MentorProfile.id == profile_id,
                MentorProfile.user_id == user_id,
            )
            .first()
        )

    def increment_mentee_count(self, mentor_profile: MentorProfile) -> None:
        """Tăng số lượng mentee hiện tại lên 1.

        Gọi khi chấp nhận mentorship request.

        @param mentor_profile: MentorProfile instance cần cập nhật
        """
        mentor_profile.current_mentees_count = (
            (mentor_profile.current_mentees_count or 0) + 1
        )
        self.save(mentor_profile)


# ════════════════════════════════════════════════════════════════
#  MenteeProfile Repository
# ════════════════════════════════════════════════════════════════

class MenteeProfileRepository(BaseRepository[MenteeProfile]):
    """Truy vấn DB cho bảng mentee_profiles."""

    def __init__(self, db: Session) -> None:
        super().__init__(db, MenteeProfile)

    def find_by_user_id(self, user_id: int) -> Optional[MenteeProfile]:
        """Tìm mentee profile theo user_id.

        @param user_id: ID của user
        @returns: MenteeProfile hoặc None
        """
        return (
            self._db.query(MenteeProfile)
            .filter(MenteeProfile.user_id == user_id)
            .first()
        )


# ════════════════════════════════════════════════════════════════
#  MentorshipRequest Repository
# ════════════════════════════════════════════════════════════════

class MentorshipRequestRepository(BaseRepository[MentorshipRequest]):
    """Truy vấn DB cho bảng mentorship_requests."""

    def __init__(self, db: Session) -> None:
        super().__init__(db, MentorshipRequest)

    def find_pending_duplicate(
        self,
        mentee_profile_id: int,
        mentor_profile_id: int,
    ) -> Optional[MentorshipRequest]:
        """Kiểm tra request pending đã tồn tại giữa mentee và mentor.

        Dùng để ngăn gửi request trùng lặp.

        @param mentee_profile_id: ID của mentee_profiles row
        @param mentor_profile_id: ID của mentor_profiles row
        @returns: Request đang pending hoặc None nếu chưa có
        """
        return (
            self._db.query(MentorshipRequest)
            .filter(
                MentorshipRequest.mentee_id == mentee_profile_id,
                MentorshipRequest.mentor_id == mentor_profile_id,
                MentorshipRequest.status == "pending",
            )
            .first()
        )

    def find_by_mentee_profile_id(
        self,
        mentee_profile_id: int,
    ) -> List[MentorshipRequest]:
        """Lấy tất cả requests mentee đã gửi, sắp xếp mới nhất trước.

        @param mentee_profile_id: ID của mentee_profiles row
        @returns: Danh sách MentorshipRequest
        """
        return (
            self._db.query(MentorshipRequest)
            .filter(MentorshipRequest.mentee_id == mentee_profile_id)
            .order_by(MentorshipRequest.requested_at.desc())
            .all()
        )

    def find_by_mentor_profile_id(
        self,
        mentor_profile_id: int,
    ) -> List[MentorshipRequest]:
        """Lấy tất cả requests mentor nhận được, sắp xếp mới nhất trước.

        @param mentor_profile_id: ID của mentor_profiles row
        @returns: Danh sách MentorshipRequest
        """
        return (
            self._db.query(MentorshipRequest)
            .filter(MentorshipRequest.mentor_id == mentor_profile_id)
            .order_by(MentorshipRequest.requested_at.desc())
            .all()
        )

    def find_by_request_id_and_mentor(
        self,
        request_id: int,
        mentor_profile_id: int,
    ) -> Optional[MentorshipRequest]:
        """Lấy request theo ID và xác nhận thuộc về mentor.

        Dùng khi mentor respond (accept/reject) để bảo mật.

        @param request_id:        ID của mentorship request
        @param mentor_profile_id: ID của mentor (để xác thực quyền)
        @returns: MentorshipRequest hoặc None
        """
        return (
            self._db.query(MentorshipRequest)
            .filter(
                MentorshipRequest.id == request_id,
                MentorshipRequest.mentor_id == mentor_profile_id,
            )
            .first()
        )
