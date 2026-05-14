"""
APScheduler integration for the job crawling system.

Schedule:
  - Full crawl: every 6 hours (all industries, all sources)
  - Expire check: every 1 hour (mark deadline-passed jobs inactive)

Crawl runs in a daemon thread with its own asyncio event loop so it
never blocks the uvicorn/FastAPI event loop.
All output goes to the server log (stdout) — no subprocess needed.
"""
from __future__ import annotations

import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_job_scheduler = None
_scheduler_lock = threading.Lock()


# ── Core crawl runner ─────────────────────────────────────────────────────────

def _run_crawl_in_thread(industry_slugs: Optional[List[str]] = None) -> None:
    """
    Run the full crawl pipeline in a dedicated thread with its own event loop.
    Output goes directly to server stdout/logs — fully visible.
    """
    from sqlalchemy.orm import sessionmaker
    from app.core.db import engine
    from .service import run_crawl_pipeline

    logger.info(f"[JobCrawler] ▶ Starting crawl | industries={industry_slugs or 'all'}")
    print(f"[JobCrawler] ▶ Starting crawl | industries={industry_slugs or 'all'}", flush=True)

    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            run_crawl_pipeline(db, industry_slugs=industry_slugs)
        )
        msg = (
            f"[JobCrawler] ✅ Done | "
            f"inserted={result.get('inserted', 0)} "
            f"updated={result.get('updated', 0)} "
            f"skipped={result.get('skipped', 0)} "
            f"time={result.get('duration_s', 0):.1f}s"
        )
        logger.info(msg)
        print(msg, flush=True)
    except Exception as e:
        logger.error(f"[JobCrawler] ❌ Error: {e}", exc_info=True)
        print(f"[JobCrawler] ❌ Error: {e}", flush=True)
    finally:
        loop.close()
        db.close()


def trigger_crawl_now(industry_slugs: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Trigger a crawl immediately in a background daemon thread.
    Returns immediately — progress visible in server logs.
    """
    thread = threading.Thread(
        target=_run_crawl_in_thread,
        args=(industry_slugs,),
        daemon=True,
        name=f"job-crawl-{'manual' if industry_slugs else 'full'}",
    )
    thread.start()
    logger.info(f"[JobCrawler] Thread started: {thread.name}")
    return {
        "triggered": True,
        "industries": industry_slugs or "all",
        "thread": thread.name,
        "at": datetime.now(timezone.utc).isoformat(),
    }


# ── Expire check ──────────────────────────────────────────────────────────────

def _run_expire_check() -> None:
    """Mark jobs with passed deadlines as inactive."""
    from sqlalchemy.orm import sessionmaker
    from app.core.db import engine
    from .persistence import mark_inactive_expired

    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        count = mark_inactive_expired(db)
        if count:
            logger.info(f"[JobCrawler] Expire check: {count} jobs marked inactive")
    except Exception as e:
        logger.error(f"[JobCrawler] Expire check error: {e}")
    finally:
        db.close()


# ── APScheduler ───────────────────────────────────────────────────────────────

def _get_scheduler():
    global _job_scheduler
    if _job_scheduler is not None:
        return _job_scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.executors.pool import ThreadPoolExecutor as _TPE
        from apscheduler.jobstores.memory import MemoryJobStore

        _job_scheduler = BackgroundScheduler(
            jobstores={"default": MemoryJobStore()},
            executors={"default": _TPE(max_workers=2)},
            job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 600},
            timezone="Asia/Ho_Chi_Minh",
        )
    except Exception as e:
        logger.error(f"[JobScheduler] Failed to create scheduler: {e}")
        return None
    return _job_scheduler


def start_job_scheduler() -> None:
    """Start the APScheduler background scheduler."""
    with _scheduler_lock:
        scheduler = _get_scheduler()
        if scheduler is None:
            return
        if scheduler.running:
            return
        try:
            scheduler.add_job(
                _run_crawl_in_thread,
                trigger="interval",
                hours=1,
                id="job_full_crawl",
                name="Full job crawl (all 20 industries)",
                replace_existing=True,
            )
            scheduler.add_job(
                _run_expire_check,
                trigger="interval",
                hours=1,
                id="job_expire_check",
                name="Mark expired jobs inactive",
                replace_existing=True,
            )
            scheduler.start()
            logger.info("[JobScheduler] Started — full crawl every 1h, expire check every 1h")
        except Exception as e:
            logger.error(f"[JobScheduler] Start failed: {e}")


def stop_job_scheduler() -> None:
    """Stop the scheduler gracefully."""
    global _job_scheduler
    with _scheduler_lock:
        if _job_scheduler and _job_scheduler.running:
            try:
                _job_scheduler.shutdown(wait=False)
                logger.info("[JobScheduler] Stopped")
            except Exception as e:
                logger.warning(f"[JobScheduler] Stop warning: {e}")


def get_scheduler_status() -> Dict[str, Any]:
    """Return scheduler state for the /api/jobs/crawl/status endpoint."""
    scheduler = _get_scheduler()
    if scheduler is None:
        return {"running": False, "error": "Scheduler not initialized"}
    jobs = []
    if scheduler.running:
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            })
    return {"running": scheduler.running, "jobs": jobs}
