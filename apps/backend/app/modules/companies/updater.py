"""
Company Updater
===============
Nhan ket qua scrape, upsert vao DB companies table.
- Neu cong ty da ton tai (theo ten + slug): cap nhat URLs con thieu.
- Neu cong ty moi: insert.
- Ghi log vao bang company_update_logs.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Column, BigInteger, Integer, String, Text, TIMESTAMP, func, text
from sqlalchemy.orm import Session

from app.core.db import Base, engine
from .models import Company
from .scraper import CompanyResult

logger = logging.getLogger(__name__)


# ── Update log model ───────────────────────────────────────────────
class CompanyUpdateLog(Base):
    __tablename__ = "company_update_logs"
    __table_args__ = {"schema": "core"}

    id         = Column(BigInteger, primary_key=True)
    run_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())
    group_slug = Column(String(80))
    source     = Column(String(50))         # scraper source
    inserted   = Column(Integer, default=0)
    updated    = Column(Integer, default=0)
    skipped    = Column(Integer, default=0)
    errors     = Column(Integer, default=0)
    detail     = Column(Text)

try:
    Base.metadata.create_all(bind=engine, tables=[CompanyUpdateLog.__table__])
except Exception:
    pass


def _normalize_name(name: str) -> str:
    """Normalize for deduplication."""
    return re.sub(r'[^a-zA-Z0-9]', '', name.lower())


def upsert_companies(
    db: Session,
    results: List[CompanyResult],
    group_id: int,
    group_slug: str,
    group_name: str,
    onet: str,
) -> dict:
    """
    Upsert scraped companies into DB.
    Returns stats: inserted, updated, skipped.
    """
    stats = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    for r in results:
        if not r.name or len(r.name.strip()) < 2:
            continue

        try:
            # Try exact name match first
            existing = (
                db.query(Company)
                .filter(
                    Company.career_group_slug == group_slug,
                    Company.name.ilike(r.name.strip()),
                )
                .first()
            )

            # Fallback: normalized match
            if not existing:
                norm = _normalize_name(r.name)
                for comp in db.query(Company).filter(
                    Company.career_group_slug == group_slug
                ).all():
                    if _normalize_name(comp.name) == norm:
                        existing = comp
                        break

            if existing:
                # Update only empty URL fields
                changed = False
                url_map = {
                    "vietnamworks_url": r.board_url if r.source_board == "vietnamworks" else None,
                    "topcv_url":        r.board_url if r.source_board == "topcv" else None,
                    "itviec_url":       r.board_url if r.source_board == "itviec" else None,
                    "jobstreet_url":    r.board_url if r.source_board == "jobstreet" else None,
                    "careers_url":      getattr(r, "careers_url", None),
                }
                for field, val in url_map.items():
                    if val and not getattr(existing, field):
                        setattr(existing, field, val)
                        changed = True

                if changed:
                    db.add(existing)
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                # Insert new company
                obj = Company(
                    career_group_id=group_id,
                    career_group_slug=group_slug,
                    career_group_name=group_name,
                    onet_major_group=onet,
                    name=r.name.strip()[:200],
                    industry=r.industry,
                    size=r.size,
                    location=r.location[:200] if r.location else None,
                    careers_url=getattr(r, "careers_url", None) or r.board_url,
                    vietnamworks_url=r.board_url if r.source_board == "vietnamworks" else None,
                    topcv_url=r.board_url if r.source_board == "topcv" else None,
                    itviec_url=r.board_url if r.source_board == "itviec" else None,
                    jobstreet_url=r.board_url if r.source_board == "jobstreet" else None,
                    other_url=r.board_url if r.source_board not in ("vietnamworks","topcv","itviec","jobstreet") else None,
                    is_active=True,
                    verified=False,   # scraped → unverified until human review
                )
                db.add(obj)
                stats["inserted"] += 1

        except Exception as e:
            logger.error(f"[updater] Error upserting '{r.name}': {e}")
            stats["errors"] += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[updater] Commit error: {e}")

    return stats


def log_run(db: Session, group_slug: str, source: str, stats: dict, detail: str = ""):
    """Write update run to log table."""
    try:
        log = CompanyUpdateLog(
            group_slug=group_slug,
            source=source,
            inserted=stats.get("inserted", 0),
            updated=stats.get("updated", 0),
            skipped=stats.get("skipped", 0),
            errors=stats.get("errors", 0),
            detail=detail[:1000] if detail else None,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"[updater] Failed to write log: {e}")
