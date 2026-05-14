"""
SQLAlchemy models for the job crawling & labor market intelligence system.

Tables (schema: core):
  - job_industry_groups  : canonical industry taxonomy
  - crawled_jobs         : all crawled job listings (never hard-deleted)
  - crawl_runs           : audit log of each crawl execution
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float, Index,
    Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from app.core.db import Base


class JobIndustryGroup(Base):
    """Canonical industry group taxonomy — seeded once, never changed by crawlers."""
    __tablename__ = "job_industry_groups"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_job_industry_slug"),
        {"schema": "core"},
    )

    id         = Column(Integer, primary_key=True)
    name       = Column(String(120), nullable=False)   # English canonical
    slug       = Column(String(80), nullable=False)    # URL-safe key
    name_vi    = Column(String(120))                   # Vietnamese display
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<IndustryGroup {self.slug}>"


class CrawledJob(Base):
    """
    Persistent job listing record.

    Deduplication:
      - PRIMARY: UNIQUE(job_url)  — exact URL match
      - FALLBACK: UNIQUE(content_hash) — hash(title+company+location)

    Lifecycle:
      - is_active=True  : job is live / deadline not passed
      - is_active=False : job expired or removed from source (NEVER deleted)
    """
    __tablename__ = "crawled_jobs"
    __table_args__ = (
        UniqueConstraint("job_url", name="uq_crawled_job_url"),
        UniqueConstraint("content_hash", name="uq_crawled_job_hash"),
        Index("ix_crawled_jobs_industry", "industry_group_id"),
        Index("ix_crawled_jobs_source", "source_site"),
        Index("ix_crawled_jobs_active", "is_active"),
        Index("ix_crawled_jobs_posted", "posted_date"),
        Index("ix_crawled_jobs_last_seen", "last_seen_at"),
        {"schema": "core"},
    )

    id                  = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_group_id   = Column(Integer, nullable=False)   # FK → job_industry_groups.id
    industry_group_slug = Column(String(80), nullable=False)
    source_site         = Column(String(50), nullable=False)  # vietnamworks|itviec|topcv|careerviet|linkedin

    # Core job fields
    title               = Column(String(500), nullable=False)
    company             = Column(String(300))
    location            = Column(String(200))
    salary              = Column(String(200))          # raw string e.g. "15-25 triệu"
    salary_min          = Column(Float)                # parsed min (VND millions)
    salary_max          = Column(Float)                # parsed max (VND millions)
    skills              = Column(ARRAY(Text), default=[])
    experience_level    = Column(String(100))          # fresher|junior|mid|senior|lead|manager
    employment_type     = Column(String(80))           # full-time|part-time|contract|internship
    description         = Column(Text)
    requirements        = Column(Text)

    # Dates
    posted_date         = Column(DateTime(timezone=True))
    application_deadline = Column(DateTime(timezone=True))

    # Source tracking
    job_url             = Column(Text, nullable=False)
    apply_url           = Column(Text)
    content_hash        = Column(String(64), nullable=False)  # sha256(title+company+location)

    # Lifecycle
    is_active           = Column(Boolean, default=True, nullable=False)
    first_seen_at       = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Raw extracted data (for re-processing)
    raw_data            = Column(JSONB)

    def __repr__(self) -> str:
        return f"<CrawledJob {self.source_site}:{self.title[:40]}>"

    @staticmethod
    def make_hash(title: str, company: str, location: str) -> str:
        """Deterministic content hash for deduplication."""
        raw = f"{(title or '').strip().lower()}|{(company or '').strip().lower()}|{(location or '').strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class CrawlRun(Base):
    """Audit log for each crawl execution — used for metrics & debugging."""
    __tablename__ = "crawl_runs"
    __table_args__ = (
        Index("ix_crawl_runs_started", "started_at"),
        Index("ix_crawl_runs_industry", "industry_group_slug"),
        {"schema": "core"},
    )

    id                  = Column(BigInteger, primary_key=True, autoincrement=True)
    industry_group_slug = Column(String(80))           # null = full crawl
    source_site         = Column(String(50))
    started_at          = Column(DateTime(timezone=True), server_default=func.now())
    finished_at         = Column(DateTime(timezone=True))
    status              = Column(String(20), default="running")  # running|success|failed|partial
    jobs_found          = Column(Integer, default=0)
    jobs_inserted       = Column(Integer, default=0)
    jobs_updated        = Column(Integer, default=0)
    jobs_skipped        = Column(Integer, default=0)
    error_message       = Column(Text)
    detail              = Column(JSONB)

    def __repr__(self) -> str:
        return f"<CrawlRun {self.source_site}/{self.industry_group_slug} {self.status}>"
