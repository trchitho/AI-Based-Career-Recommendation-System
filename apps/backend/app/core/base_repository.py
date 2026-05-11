"""
app/core/base_repository.py
===========================
Generic Repository base class — xử lý CRUD cơ bản cho mọi SQLAlchemy model.

Tại sao cần Base Repository?
- Loại bỏ code CRUD lặp lại ở mỗi module (DRY principle)
- Service layer chỉ gọi repository methods, không biết đến SQLAlchemy
- Dễ mock khi viết unit test

Cách dùng:
    class MentorProfileRepository(BaseRepository[MentorProfile]):
        def __init__(self, db: Session):
            super().__init__(db, MentorProfile)

        def find_by_user_id(self, user_id: int) -> Optional[MentorProfile]:
            # Thêm query đặc thù ở đây
            ...

Update guide:
  - Thêm method CRUD mới → thêm vào class này (tất cả repo đều được hưởng)
  - Thêm soft-delete      → override delete() trong subclass
  - Thêm pagination       → thêm method find_paginated()
"""
from __future__ import annotations

from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy.orm import Session

from app.core.db import Base

# T = kiểu SQLAlchemy model (MentorProfile, MentorSession, ...)
T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic CRUD repository cho mọi SQLAlchemy model."""

    def __init__(self, db: Session, model_class: Type[T]) -> None:
        """
        @param db:          SQLAlchemy Session (inject từ FastAPI Depends)
        @param model_class: SQLAlchemy model class, vd MentorProfile
        """
        self._db = db
        self._model = model_class

    # ── Read ──────────────────────────────────────────────────────

    def find_by_id(self, record_id: int) -> Optional[T]:
        """Tìm record theo primary key.

        @param record_id: Giá trị primary key
        @returns: Model instance hoặc None nếu không tìm thấy
        """
        return self._db.query(self._model).filter(
            self._model.id == record_id
        ).first()

    def find_all(self, limit: int = 100, offset: int = 0) -> List[T]:
        """Lấy danh sách tất cả records với phân trang đơn giản.

        @param limit:  Số bản ghi tối đa trả về (default 100)
        @param offset: Số bản ghi bỏ qua (default 0)
        @returns: Danh sách model instances
        """
        return (
            self._db.query(self._model)
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count(self) -> int:
        """Đếm tổng số records trong bảng.

        @returns: Số nguyên tổng số records
        """
        return self._db.query(self._model).count()

    # ── Write ─────────────────────────────────────────────────────

    def save(self, entity: T) -> T:
        """Lưu entity mới hoặc cập nhật entity hiện có vào DB.

        @param entity: Model instance cần lưu (new hoặc đã tồn tại)
        @returns: Entity đã được refresh từ DB (có id, timestamps...)
        """
        # 1. Add vào session (idempotent nếu đã tồn tại)
        self._db.add(entity)

        # 2. Commit và nhận lại data từ DB
        self._db.commit()
        self._db.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        """Xoá cứng (hard delete) entity khỏi DB.

        @param entity: Model instance cần xoá
        """
        self._db.delete(entity)
        self._db.commit()

    def save_all(self, entities: List[T]) -> List[T]:
        """Bulk insert/update nhiều entities trong 1 transaction.

        @param entities: Danh sách model instances
        @returns: Danh sách entities đã được refresh
        """
        # 1. Add tất cả vào session
        for entity in entities:
            self._db.add(entity)

        # 2. Commit 1 lần duy nhất (hiệu quả hơn commit từng cái)
        self._db.commit()

        # 3. Refresh từng entity để lấy generated values
        for entity in entities:
            self._db.refresh(entity)

        return entities
