"""
Job crawling & labor market intelligence API.

Endpoints:
  GET  /api/jobs                          → paginated job listings
  GET  /api/jobs/industries               → all industry groups
  GET  /api/jobs/trending                 → newest jobs per industry (for Trends page)
  GET  /api/jobs/analytics/demand         → industry demand stats
  GET  /api/jobs/analytics/salary-trends  → salary trends
  GET  /api/jobs/analytics/skills         → top skills
  GET  /api/jobs/crawl/history            → crawl run history
  POST /api/jobs/crawl/trigger            → manually trigger crawl
  GET  /api/jobs/crawl/status             → scheduler status
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.serialization import ORJSONResponse

from .constants import INDUSTRY_GROUPS, INDUSTRY_BY_SLUG
from .models import CrawledJob
from .service import (
    _job_to_dict,
    get_crawl_history,
    get_industry_demand_stats,
    get_salary_trends,
    get_top_skills,
    get_trending_jobs_by_industry,
    run_crawl_pipeline,
)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ── Industry groups ───────────────────────────────────────────────────────────

@router.get("/industries")
def list_industries():
    """Return all hard-coded industry groups."""
    return ORJSONResponse([
        {
            "id": g.id,
            "name": g.name,
            "slug": g.slug,
            "name_vi": g.name_vi,
        }
        for g in INDUSTRY_GROUPS
    ])


# ── Job listings ──────────────────────────────────────────────────────────────

@router.get("")
def list_jobs(
    industry: Optional[str] = Query(None, description="Filter by industry slug"),
    source: Optional[str] = Query(None, description="Filter by source site"),
    active_only: bool = Query(True),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Paginated job listings with optional filters."""
    query = db.query(CrawledJob)

    if active_only:
        query = query.filter(CrawledJob.is_active == True)
    if industry:
        if industry not in INDUSTRY_BY_SLUG:
            raise HTTPException(400, f"Unknown industry slug: {industry}")
        query = query.filter(CrawledJob.industry_group_slug == industry)
    if source:
        query = query.filter(CrawledJob.source_site == source)

    total = query.count()
    jobs = (
        query
        .order_by(CrawledJob.first_seen_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return ORJSONResponse({
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [_job_to_dict(j) for j in jobs],
    })


@router.get("/trending")
def trending_jobs(
    limit_per_industry: int = Query(0, ge=0, le=100, description="0 = tất cả jobs"),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """
    Return all active jobs from DB grouped by industry.
    Jobs hết hạn ứng tuyển (is_active=False) sẽ không hiển thị.
    limit_per_industry=0 means no limit (return all).
    """
    jobs = get_trending_jobs_by_industry(
        db,
        limit_per_industry=limit_per_industry,
        active_only=active_only,
    )
    return ORJSONResponse({
        "total": len(jobs),
        "source": "database",
        "trending_jobs": jobs,
    })


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics/demand")
def industry_demand(db: Session = Depends(get_db)):
    """Industry demand statistics — job counts, salary ranges."""
    return ORJSONResponse(get_industry_demand_stats(db))


@router.get("/analytics/trends-summary")
def trends_summary_from_crawled(db: Session = Depends(get_db)):
    """
    Trends summary computed from REAL crawled job data.
    Returns salary trends, top skills, industry demand — all from DB.
    Used by the Trends page charts.
    """
    from .service import get_trends_summary_from_crawled
    return ORJSONResponse(get_trends_summary_from_crawled(db))


@router.get("/analytics/salary-trends")
def salary_trends(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Salary trends for the last N days."""
    return ORJSONResponse(get_salary_trends(db, days=days))


@router.get("/analytics/skills")
def top_skills(
    industry: Optional[str] = Query(None),
    top_n: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db),
):
    """Most demanded skills (optionally filtered by industry)."""
    return ORJSONResponse(get_top_skills(db, industry_slug=industry, top_n=top_n))


# ── Crawl management ──────────────────────────────────────────────────────────

@router.get("/crawl/history")
def crawl_history(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Recent crawl run history."""
    return ORJSONResponse(get_crawl_history(db, limit=limit))


@router.get("/crawl/status")
def crawl_status():
    """Scheduler status and next run times."""
    from .scheduler import get_scheduler_status
    return ORJSONResponse(get_scheduler_status())


@router.post("/crawl/trigger")
async def trigger_crawl(
    industries: Optional[List[str]] = None,
    sources: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """
    Manually trigger a crawl.
    Runs in background — returns immediately with job info.
    Pass industries=null to crawl all 20 industry groups.
    """
    from .scheduler import trigger_crawl_now

    # Validate industry slugs
    if industries:
        invalid = [s for s in industries if s not in INDUSTRY_BY_SLUG]
        if invalid:
            raise HTTPException(400, f"Unknown industry slugs: {invalid}")

    result = trigger_crawl_now(industry_slugs=industries)
    return ORJSONResponse({
        "message": "Crawl triggered in background",
        **result,
    })


@router.post("/crawl/run-sync")
async def run_crawl_sync(
    industries: Optional[List[str]] = None,
    sources: Optional[List[str]] = None,
    db: Session = Depends(get_db),
):
    """
    Run crawl synchronously and wait for result.
    Use for testing — may take 30-120 seconds.
    """
    if industries:
        invalid = [s for s in industries if s not in INDUSTRY_BY_SLUG]
        if invalid:
            raise HTTPException(400, f"Unknown industry slugs: {invalid}")

    result = await run_crawl_pipeline(db, industry_slugs=industries, sources=sources)
    return ORJSONResponse(result)
