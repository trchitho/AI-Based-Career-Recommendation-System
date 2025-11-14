from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, BigInteger, Text, Integer, Boolean, TIMESTAMP, Numeric, func, JSON
)

from sqlalchemy.orm import Mapped, mapped_column
from ...core.db import Base

# bảng core.career_categories
class CareerCategory(Base):
    __tablename__ = "career_categories"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    name = Column(Text, nullable=False, unique=True)
    parent_id = Column(BigInteger)

# bảng core.careers
class Career(Base):
    __tablename__ = "careers"
    __table_args__ = {"schema": "core"}
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    # Some DBs have title_vi/title_en instead of a generic title
    title_vi: Mapped[Optional[str]] = mapped_column(Text)
    title_en: Mapped[Optional[str]] = mapped_column(Text)
    # Many DBs store short descriptions in localized columns
    short_desc_en: Mapped[Optional[str]] = mapped_column(Text)
    short_desc_vn: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    onet_code: Mapped[Optional[str]] = mapped_column(Text, unique=True)

    def to_dict(self) -> dict:
        # Fallback title from slug if localized titles are missing
        fallback = (self.slug or "").replace("-", " ").title() if getattr(self, "slug", None) else ""
        display_title = self.title_vi or self.title_en or fallback
        short_desc = self.short_desc_vn or self.short_desc_en or ""
        return {
            "id": self.id,
            "slug": self.slug,
            "title": display_title,
            "short_desc": short_desc,
            "description": short_desc,
            "onet_code": self.onet_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# bảng core.blog_posts
class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    author_id = Column(BigInteger, nullable=False)
    title = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)
    content_md = Column(Text, nullable=False)
    status = Column(Text)  # blog_status enum => map text
    published_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "author_id": self.author_id,
            "title": self.title,
            "slug": self.slug,
            "content_md": self.content_md,
            "status": self.status,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# bảng core.comments
class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    post_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    parent_id = Column(BigInteger)
    content = Column(Text, nullable=False)
    status = Column(Text)  # 'Visible' | ...
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "content": self.content,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# bảng core.essays
class Essay(Base):
    __tablename__ = "essays"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    lang = Column(Text)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    prompt_id = Column(BigInteger)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "lang": self.lang,
            "content": self.content,
            "prompt_id": self.prompt_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# bảng core.career_ksas (skills)
class CareerKSA(Base):
    __tablename__ = "career_ksas"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    onet_code = Column(Text, nullable=False)
    ksa_type = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    category = Column(Text)
    level = Column(Numeric(5, 2))
    importance = Column(Numeric(5, 2))
    source = Column(Text)
    fetched_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_skill(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.category or "",
            "category": self.ksa_type,
            "proficiency_levels": [],
            "learning_resources": [],
            "created_at": self.fetched_at.isoformat() if self.fetched_at else None,
            "updated_at": self.fetched_at.isoformat() if self.fetched_at else None,
        }
