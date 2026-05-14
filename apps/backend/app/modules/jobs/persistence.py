"""
Persistence layer — deduplication + upsert logic.

Rules:
  1. Try UNIQUE(job_url) first
  2. Fallback to UNIQUE(content_hash)
  3. If new → INSERT with first_seen_at = now()
  4. If exists → UPDATE changed fields, last_seen_at = now()
  5. NEVER hard-delete — only set is_active = False
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .models import CrawledJob, CrawlRun

logger = logging.getLogger(__name__)


@dataclass
class JobRecord:
    """Normalized job data ready for persistence."""
    industry_group_id: int
    industry_group_slug: str
    source_site: str
    title: str
    company: str
    location: str
    salary: str = ""
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    skills: List[str] = field(default_factory=list)
    experience_level: Optional[str] = None
    employment_type: Optional[str] = None
    description: str = ""
    requirements: str = ""
    posted_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    job_url: str = ""
    apply_url: str = ""
    raw_data: Optional[Dict[str, Any]] = None


@dataclass
class UpsertResult:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0


def upsert_jobs(db: Session, records: List[JobRecord]) -> UpsertResult:
    """
    Upsert a batch of JobRecords into the database.
    Returns counts of inserted / updated / skipped.
    """
    result = UpsertResult()
    now = datetime.now(timezone.utc)

    for rec in records:
        if not rec.title or not rec.job_url:
            result.skipped += 1
            continue

        content_hash = CrawledJob.make_hash(rec.title, rec.company, rec.location)

        # ── Try URL-based lookup first ────────────────────────────────────────
        existing: Optional[CrawledJob] = None
        if rec.job_url:
            existing = db.query(CrawledJob).filter(
                CrawledJob.job_url == rec.job_url
            ).first()

        # ── Fallback: content hash ────────────────────────────────────────────
        if existing is None:
            existing = db.query(CrawledJob).filter(
                CrawledJob.content_hash == content_hash
            ).first()

        if existing is not None:
            # ── UPDATE existing record ────────────────────────────────────────
            changed = False

            def _update(attr: str, new_val: Any) -> None:
                nonlocal changed
                if new_val and getattr(existing, attr) != new_val:
                    setattr(existing, attr, new_val)
                    changed = True

            _update("title", rec.title)
            _update("company", rec.company)
            _update("location", rec.location)
            _update("salary", rec.salary)
            _update("salary_min", rec.salary_min)
            _update("salary_max", rec.salary_max)
            _update("description", rec.description)
            _update("requirements", rec.requirements)
            _update("experience_level", rec.experience_level)
            _update("employment_type", rec.employment_type)
            _update("apply_url", rec.apply_url)
            _update("application_deadline", rec.application_deadline)

            if rec.skills:
                existing.skills = rec.skills
                changed = True

            # Always refresh last_seen_at and ensure active
            existing.last_seen_at = now
            existing.is_active = True
            existing.updated_at = now

            if changed:
                result.updated += 1
            else:
                result.skipped += 1

        else:
            # ── INSERT new record ─────────────────────────────────────────────
            job = CrawledJob(
                industry_group_id=rec.industry_group_id,
                industry_group_slug=rec.industry_group_slug,
                source_site=rec.source_site,
                title=rec.title,
                company=rec.company,
                location=rec.location,
                salary=rec.salary,
                salary_min=rec.salary_min,
                salary_max=rec.salary_max,
                skills=rec.skills or [],
                experience_level=rec.experience_level,
                employment_type=rec.employment_type,
                description=rec.description,
                requirements=rec.requirements,
                posted_date=rec.posted_date,
                application_deadline=rec.application_deadline,
                job_url=rec.job_url,
                apply_url=rec.apply_url or rec.job_url,
                content_hash=content_hash,
                is_active=True,
                first_seen_at=now,
                last_seen_at=now,
                raw_data=rec.raw_data,
            )
            db.add(job)
            result.inserted += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[Persistence] Commit failed: {e}")
        raise

    return result


def mark_inactive_expired(db: Session) -> int:
    """
    Xóa jobs đã hết hạn ứng tuyển (application_deadline đã qua).
    Returns count of jobs deleted.
    """
    now = datetime.now(timezone.utc)
    count = (
        db.query(CrawledJob)
        .filter(
            CrawledJob.application_deadline != None,
            CrawledJob.application_deadline < now,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return count


def create_crawl_run(
    db: Session,
    industry_slug: Optional[str],
    source_site: str,
) -> CrawlRun:
    run = CrawlRun(
        industry_group_slug=industry_slug,
        source_site=source_site,
        status="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def finish_crawl_run(
    db: Session,
    run: CrawlRun,
    result: UpsertResult,
    status: str = "success",
    error: Optional[str] = None,
) -> None:
    run.finished_at = datetime.now(timezone.utc)
    run.status = status
    run.jobs_inserted = result.inserted
    run.jobs_updated = result.updated
    run.jobs_skipped = result.skipped
    run.error_message = error
    db.commit()
