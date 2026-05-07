"""
Company Update Scheduler
========================
Chay hang ngay luc 02:00 AM (gio Viet Nam, UTC+7) de cap nhat cong ty.
Dung APScheduler (BackgroundScheduler) tich hop vao FastAPI lifespan.

Su dung:
    from app.modules.companies.scheduler import start_scheduler, stop_scheduler
    # Goi trong FastAPI lifespan startup/shutdown
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.core.db import engine
from .scraper import scrape_all_groups, SLUG_TO_KEYWORDS
from .updater import upsert_companies, log_run

logger = logging.getLogger(__name__)

# Career groups metadata (mirrors career_groups.csv)
GROUPS = [
    {"id":  1, "slug": "management",            "name": "Quan ly",                "onet": "11"},
    {"id":  2, "slug": "business-finance",      "name": "Kinh doanh & Tai chinh", "onet": "13"},
    {"id":  3, "slug": "computer-math",         "name": "Cong nghe thong tin",    "onet": "15"},
    {"id":  4, "slug": "architecture-engineering","name":"Kien truc & Ky thuat",  "onet": "17"},
    {"id":  5, "slug": "life-science",          "name": "Khoa hoc tu nhien",      "onet": "19"},
    {"id":  6, "slug": "community-social",      "name": "Dich vu cong dong",      "onet": "21"},
    {"id":  7, "slug": "legal",                 "name": "Phap ly",                "onet": "23"},
    {"id":  8, "slug": "education",             "name": "Giao duc",               "onet": "25"},
    {"id":  9, "slug": "arts-media",            "name": "Nghe thuat & Truyen thong","onet":"27"},
    {"id": 10, "slug": "healthcare-practitioners","name":"Y te chuyen nghiep",    "onet": "29"},
    {"id": 11, "slug": "healthcare-support",    "name": "Ho tro y te",            "onet": "31"},
    {"id": 12, "slug": "protective-service",    "name": "Dich vu bao ve",         "onet": "33"},
    {"id": 13, "slug": "food-service",          "name": "Dich vu an uong",        "onet": "35"},
    {"id": 14, "slug": "building-maintenance",  "name": "Bao tri toa nha",        "onet": "37"},
    {"id": 15, "slug": "personal-care",         "name": "Cham soc ca nhan",       "onet": "39"},
    {"id": 16, "slug": "sales",                 "name": "Ban hang",               "onet": "41"},
    {"id": 17, "slug": "office-admin",          "name": "Hanh chinh van phong",   "onet": "43"},
    {"id": 18, "slug": "farming-forestry",      "name": "Nong nghiep & Lam nghiep","onet":"45"},
    {"id": 19, "slug": "construction",          "name": "Xay dung",               "onet": "47"},
    {"id": 20, "slug": "installation-repair",   "name": "Lap dat & Sua chua",     "onet": "49"},
    {"id": 21, "slug": "production",            "name": "San xuat",               "onet": "51"},
    {"id": 22, "slug": "transportation",        "name": "Van tai",                "onet": "53"},
]
GROUP_MAP = {g["slug"]: g for g in GROUPS}


def _run_update(slugs: Optional[List[str]] = None, max_pages: int = 2):
    """
    Synchronous wrapper — APScheduler goi ham nay trong thread rieng.
    Chay scrape + upsert + log cho tat ca (hoac mot so) nhom nghe.
    """
    start = datetime.now(timezone.utc)
    target = slugs or list(SLUG_TO_KEYWORDS.keys())
    logger.info(f"[scheduler] Daily update started — {len(target)} groups, {start.isoformat()}")

    # Run async scraper in new event loop (APScheduler uses thread pool)
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results_by_slug = loop.run_until_complete(
            scrape_all_groups(slugs=target, max_pages=max_pages)
        )
    except Exception as e:
        logger.error(f"[scheduler] Scrape failed: {e}")
        return
    finally:
        loop.close()

    # Upsert into DB
    total = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    with Session(engine) as db:
        for slug, companies in results_by_slug.items():
            g = GROUP_MAP.get(slug)
            if not g or not companies:
                continue
            stats = upsert_companies(
                db=db,
                results=companies,
                group_id=g["id"],
                group_slug=g["slug"],
                group_name=g["name"],
                onet=g["onet"],
            )
            log_run(db, slug, "scraper_daily", stats,
                    detail=f"Scraped {len(companies)} raw → {stats}")
            for k in total:
                total[k] += stats.get(k, 0)
            logger.info(f"[scheduler] {slug}: +{stats['inserted']} new, ~{stats['updated']} updated")

    elapsed = (datetime.now(timezone.utc) - start).seconds
    logger.info(
        f"[scheduler] Done in {elapsed}s | "
        f"inserted={total['inserted']} updated={total['updated']} "
        f"skipped={total['skipped']} errors={total['errors']}"
    )


# ── Scheduler singleton ────────────────────────────────────────────
_scheduler: Optional[BackgroundScheduler] = None


def start_scheduler():
    """
    Khoi dong APScheduler:
    - Job chinh: chay luc 02:00 Asia/Ho_Chi_Minh moi ngay
    - Job thu cong: co the trigger qua API
    """
    global _scheduler
    if _scheduler and _scheduler.running:
        logger.info("[scheduler] Already running")
        return

    _scheduler = BackgroundScheduler(
        timezone="Asia/Ho_Chi_Minh",
        job_defaults={
            "coalesce": True,           # skip missed runs
            "max_instances": 1,         # only one instance at a time
            "misfire_grace_time": 3600, # 1h grace if server was down
        }
    )

    # ── Daily full update at 02:00 AM VN time ─────────────────────
    _scheduler.add_job(
        func=_run_update,
        trigger=CronTrigger(hour=2, minute=0, timezone="Asia/Ho_Chi_Minh"),
        id="daily_company_update",
        name="Daily company update (all groups)",
        replace_existing=True,
    )

    # ── High-priority groups: update every 6 hours ─────────────────
    _scheduler.add_job(
        func=lambda: _run_update(
            slugs=["computer-math", "management", "business-finance"],
            max_pages=3,
        ),
        trigger=IntervalTrigger(hours=6),
        id="frequent_hot_groups",
        name="Frequent update: IT + Management + Finance",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "[scheduler] Started. Jobs: "
        "daily_company_update @ 02:00 | "
        "frequent_hot_groups every 6h"
    )


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped")


def trigger_now(slugs: Optional[List[str]] = None):
    """Manually trigger update (for API or admin use)."""
    import threading
    t = threading.Thread(
        target=_run_update,
        kwargs={"slugs": slugs, "max_pages": 2},
        daemon=True,
        name="manual_company_update",
    )
    t.start()
    return {"status": "started", "groups": slugs or "all"}


def get_scheduler_status() -> dict:
    """Return scheduler state for monitoring."""
    if not _scheduler:
        return {"running": False, "jobs": []}
    jobs = []
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": next_run.isoformat() if next_run else None,
        })
    return {"running": _scheduler.running, "jobs": jobs}
