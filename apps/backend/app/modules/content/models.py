from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column
import enum

from ...core.db import Base

class BlogStatus(enum.Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"
    PENDING = "Pending"
    REJECTED = "Rejected"
    ARCHIVED = "Archived"
    
    def __str__(self):
        return self.value


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
    industry_category: Mapped[Optional[str]] = mapped_column(Text)

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


# bảng core.essay_prompts
class EssayPrompt(Base):
    __tablename__ = "essay_prompts"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    title = Column(Text, nullable=False)
    prompt_text = Column(Text, nullable=False)
    lang = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "prompt_text": self.prompt_text,
            "lang": self.lang,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
    excerpt = Column(Text)
    category = Column(Text)
    tags = Column(Text)  # JSON string for tags array
    featured_image = Column(Text)
    view_count = Column(BigInteger, default=0)
    like_count = Column(BigInteger, default=0)
    dislike_count = Column(BigInteger, default=0)
    is_featured = Column(Text)  # Boolean as text
    status = Column(Text, default="Draft")
    published_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        import json
        
        # Parse tags from JSON string
        tags = []
        if self.tags:
            try:
                tags = json.loads(self.tags) if isinstance(self.tags, str) else self.tags
            except (TypeError, ValueError, json.JSONDecodeError):
                tags = []
        
        return {
            "id": self.id,
            "author_id": self.author_id,
            "title": self.title,
            "slug": self.slug,
            "content_md": self.content_md or "",
            "excerpt": self.excerpt or "",
            "category": self.category or "",
            "tags": tags,
            "featured_image": self.featured_image or "",
            "view_count": self.view_count or 0,
            "like_count": self.like_count or 0,
            "dislike_count": self.dislike_count or 0,
            "is_featured": self.is_featured == "true" if self.is_featured else False,
            "is_published": self.status == "Published" if self.status else False,
            "status": self.status or "Draft",
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# bảng core.blog_comments
class BlogComment(Base):
    __tablename__ = "blog_comments"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    post_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    parent_id = Column(BigInteger)
    content = Column(Text, nullable=False)
    like_count = Column(BigInteger, default=0)
    is_deleted = Column(Boolean, default=False)  # Use proper Boolean type
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "content": self.content if self.is_deleted != "true" else "[deleted]",
            "like_count": self.like_count or 0,
            "is_deleted": self.is_deleted if isinstance(self.is_deleted, bool) else self.is_deleted == "true",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# bảng core.comment_likes
class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    comment_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "comment_id": self.comment_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# bảng core.comment_rate_limits
class CommentRateLimit(Base):
    __tablename__ = "comment_rate_limits"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    post_id = Column(BigInteger, nullable=False)
    comment_count = Column(BigInteger, default=1)
    window_start = Column(TIMESTAMP(timezone=True), server_default=func.now())


# Blog post reactions (likes/dislikes)
class BlogPostReaction(Base):
    __tablename__ = "blog_post_reactions"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    post_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    reaction_type = Column(Text, nullable=False)  # 'like' or 'dislike'
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "reaction_type": self.reaction_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "post_id": self.post_id,
            "comment_count": self.comment_count,
            "window_start": self.window_start.isoformat() if self.window_start else None,
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
    __table_args__ = (
        {"schema": "core"},
        # Thêm unique constraint để tránh trùng lặp
        # UniqueConstraint('onet_code', 'ksa_type', 'name', name='unique_career_ksa')
    )
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


# bảng core.career_interests (RIASEC scores)
class CareerInterest(Base):
    __tablename__ = "career_interests"
    __table_args__ = {"schema": "core"}
    onet_code = Column(Text, primary_key=True)
    r = Column(Numeric(6, 3))  # Realistic
    i = Column(Numeric(6, 3))  # Investigative
    a = Column(Numeric(6, 3))  # Artistic
    s = Column(Numeric(6, 3))  # Social
    e = Column(Numeric(6, 3))  # Enterprising
    c = Column(Numeric(6, 3))  # Conventional
    source = Column(Text)
    fetched_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def get_dominant_code(self) -> str:
        """Return the dominant RIASEC code (highest score)"""
        scores = [
            ('R', float(self.r or 0)),
            ('I', float(self.i or 0)),
            ('A', float(self.a or 0)),
            ('S', float(self.s or 0)),
            ('E', float(self.e or 0)),
            ('C', float(self.c or 0)),
        ]
        scores.sort(key=lambda x: x[1], reverse=True)
        if scores[0][1] == 0:
            return 'N/A'
        return scores[0][0]


# bảng core.career_overview (salary info)
class CareerOverview(Base):
    __tablename__ = "career_overview"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    career_id = Column(BigInteger, nullable=False)
    experience_text = Column(Text)
    degree_text = Column(Text)
    salary_min = Column(Numeric(12, 2))
    salary_max = Column(Numeric(12, 2))
    salary_avg = Column(Numeric(12, 2))
    salary_currency = Column(Text, default='VND')
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
