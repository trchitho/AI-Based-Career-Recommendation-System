from __future__ import annotations

import threading

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker

from app.core.db import engine, get_db

from . import service
from .schemas import CourseOut, CourseRecommendationsResponse, SeedStatus

router = APIRouter(tags=["courses"])

# ── Session factory for background tasks ──────────────────────────
# Background tasks MUST NOT reuse the request-scoped session (it
# closes when the response is sent).  Create a fresh session instead.
_BgSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _run_in_thread(fn, *args, **kwargs):
    """Spawn a daemon thread so BackgroundTasks doesn't block the event loop."""
    t = threading.Thread(target=fn, args=args, kwargs=kwargs, daemon=True)
    t.start()


def _with_new_session(fn):
    """Wrap fn(db, ...) so it opens and closes its own session."""
    def wrapper(*args, **kwargs):
        db = _BgSession()
        try:
            fn(db, *args, **kwargs)
            db.commit()
        except Exception as exc:
            db.rollback()
            raise exc
        finally:
            db.close()
    return wrapper


# ── Public: get recommendations by skill list ──────────────────────
@router.get("/recommend", response_model=CourseRecommendationsResponse)
async def recommend_courses(
    skills: list[str] = Query(..., description="List of missing skill names"),
    top_k: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    return service.recommend_courses_for_skills(db, skills, top_k_per_skill=top_k)


@router.get("/recommend/skill-gap", response_model=CourseRecommendationsResponse)
async def recommend_courses_for_skill_gap(
    critical: list[str] = Query(default=[], description="Critical missing skills"),
    important: list[str] = Query(default=[], description="Important missing skills"),
    nice_to_have: list[str] = Query(default=[], description="Nice-to-have missing skills"),
    owned_skills: list[str] = Query(default=[], description="Skills already present in the CV"),
    career_name: str | None = Query(default=None),
    analysis_id: int | None = Query(default=None, description="Skill-gap analysis id for DB cache reuse"),
    top_k: int = Query(3, ge=1, le=5),
    db: Session = Depends(get_db),
):
    return service.recommend_courses_for_skill_groups(
        db=db,
        critical=critical,
        important=important,
        nice_to_have=nice_to_have,
        owned_skills=owned_skills,
        career_name=career_name,
        analysis_id=analysis_id,
        top_k_per_skill=top_k,
    )


# ── Public: search courses ─────────────────────────────────────────
@router.get("/search", response_model=list[CourseOut])
async def search_courses(
    q: str = Query(..., min_length=2),
    platform: str | None = Query(None),
    level: str | None = Query(None),
    is_free: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_

    from .models import CourseCatalog

    query = db.query(CourseCatalog).filter(
        or_(
            CourseCatalog.title.ilike(f"%{q}%"),
            CourseCatalog.description.ilike(f"%{q}%"),
        )
    )
    if platform:
        query = query.filter(CourseCatalog.platform == platform)
    if level:
        query = query.filter(CourseCatalog.level == level)
    if is_free is not None:
        query = query.filter(CourseCatalog.is_free == is_free)
    return query.order_by(CourseCatalog.rating.desc()).limit(limit).all()


# ── Admin: pipeline management ─────────────────────────────────────

@router.post("/admin/seed", response_model=dict)
async def seed_courses_endpoint(db: Session = Depends(get_db)):
    """Load static course dataset into DB (idempotent)."""
    return service.seed_courses(db)


@router.post("/admin/embed", response_model=dict)
async def embed_courses(background_tasks: BackgroundTasks):
    """Generate SBERT embeddings for un-embedded courses (background)."""
    def _task(db):
        service.run_embedding_pipeline(db)

    background_tasks.add_task(_with_new_session(_task))
    return {"status": "embedding started in background"}


@router.post("/admin/build-map", response_model=dict)
async def build_map(
    background_tasks: BackgroundTasks,
    skills: list[str] | None = Body(default=None),
):
    """Compute skill ↔ course cosine-similarity map (background)."""
    def _task(db):
        service.build_skill_course_map(db, skills)

    background_tasks.add_task(_with_new_session(_task))
    return {"status": "mapping started in background"}


@router.post("/admin/sync-neo4j", response_model=dict)
async def sync_neo4j(background_tasks: BackgroundTasks):
    """Push course-skill relationships to Neo4j (background)."""
    def _task(db):
        from .neo4j_sync import sync_courses_to_neo4j
        sync_courses_to_neo4j(db)

    background_tasks.add_task(_with_new_session(_task))
    return {"status": "neo4j sync started in background"}


@router.post("/admin/run-all", response_model=dict)
async def run_full_pipeline(background_tasks: BackgroundTasks):
    """seed → embed → build-map → sync-neo4j  (background)."""
    def _task(db):
        service.seed_courses(db)
        service.run_embedding_pipeline(db)
        service.build_skill_course_map(db)
        try:
            from .neo4j_sync import sync_courses_to_neo4j
            sync_courses_to_neo4j(db)
        except Exception:
            pass

    background_tasks.add_task(_with_new_session(_task))
    return {"status": "full pipeline started in background"}


# ── Admin: real-time web crawl ─────────────────────────────────────

class CrawlRequest(BaseModel):
    keywords: list[str] | None = None
    platforms: list[str] | None = None
    page_size: int = 10


@router.post("/admin/crawl", response_model=dict)
async def crawl_courses(
    background_tasks: BackgroundTasks,
    body: CrawlRequest = Body(default=None),
):
    """
    Crawl courses from Coursera / Udemy / LinkedIn via web scraping.
    Runs in a background thread with its own DB session.
    After inserting, auto re-embeds and rebuilds the skill map.
    """
    # body may be None when called without a JSON payload
    if body is None:
        body = CrawlRequest()

    from .crawler import run_crawl

    kws = body.keywords
    plats = body.platforms or ["coursera", "udemy", "linkedin"]
    size = body.page_size

    def _task(db):
        result = run_crawl(db, keywords=kws, platforms=plats, page_size=size)
        inserted = result.get("inserted", 0)
        print(f"🌐 Crawl finished: {inserted} new, {result.get('updated', 0)} updated")
        if inserted > 0:
            print("🔄 Re-embedding new courses…")
            service.run_embedding_pipeline(db)
            print("🗺️  Rebuilding skill map…")
            service.build_skill_course_map(db)
            print("✅ Post-crawl pipeline done")

    background_tasks.add_task(_with_new_session(_task))
    return {
        "status": "crawl started in background",
        "keywords": kws,
        "platforms": plats,
        "page_size": size,
    }


@router.get("/admin/status", response_model=SeedStatus)
async def get_status(db: Session = Depends(get_db)):
    """Check pipeline status."""
    return service.get_status(db)
