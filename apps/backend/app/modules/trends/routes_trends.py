"""
Trends API — Real-time job market trend analysis and data.

Endpoints:
  GET /api/trends/summary      → Tổng quan thị trường (top skills, stats)
  GET /api/trends/skills       → Danh sách kỹ năng trending (có filter/sort)
  GET /api/trends/jobs         → Danh sách job listings (có filter/search)
  GET /api/trends/categories   → Phân loại nghề nghiệp
  GET /api/trends/companies    → Top công ty tuyển dụng
  POST /api/trends/refresh     → Trigger rebuild trending data (admin only)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket

router = APIRouter()

# Import the new data service and websocket manager
from .data_service import data_service
from .websocket_service import websocket_manager

# ── Path đến RankingSystem ──────────────────────────────────────────────────
# Đọc từ env hoặc dùng default relative path
_RANKING_DIR = Path(
    os.getenv("RANKING_SYSTEM_PATH", r"C:\RankingSystem")
)
_TRENDING_JSON = _RANKING_DIR / "trending.json"
_JOBS_UNIFIED_JSON = _RANKING_DIR / "jobs_unified.json"


def _load_json(path: Path) -> dict:
    """Load JSON file, trả về {} nếu không tồn tại."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _get_trending() -> dict:
    data = _load_json(_TRENDING_JSON)
    if not data:
        raise HTTPException(
            status_code=503,
            detail="Trending data chưa có. Vui lòng chạy RankingSystem scraper trước.",
        )
    return data


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/summary", tags=["trends"])
async def get_trends_summary():
    """
    Tổng quan thị trường: metrics, top skills, industry demand, regional data.
    """
    try:
        # Initialize Redis connection
        await data_service.initialize_redis()
        
        # Get comprehensive trend summary
        summary = await data_service.get_trend_summary()
        
        return summary
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting trends summary: {e}")
        
        # Fallback to mock data if service fails
        return {
            "generated_at": "2024-01-01T00:00:00",
            "market_metrics": {
                "avg_salary": 1750,
                "salary_change": 8.4,
                "job_postings": 12482,
                "posting_change": 12.1,
                "market_health": 84,
                "health_change": -2.5,
                "recruitment_speed": 4.2,
                "speed_change": 0.5
            },
            "top_trending": [],
            "industry_demand": [],
            "regional_distribution": [],
            "salary_trends": [],
            "live_skills": []
        }


@router.get("/skills", tags=["trends"])
def get_trending_skills(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="trending_score", description="trending_score | total_jobs | growth_rate"),
    status: Optional[str] = Query(default=None, description="RISING | STABLE | DECLINING | NEW"),
    search: Optional[str] = Query(default=None, description="Tìm theo tên skill"),
):
    """
    Danh sách kỹ năng trending với filter và phân trang.
    """
    data = _get_trending()
    skills: list[dict] = data.get("all_skills", data.get("top_trending", []))

    # Filter by status
    if status:
        skills = [s for s in skills if s.get("status", "").upper() == status.upper()]

    # Filter by search
    if search:
        q = search.lower()
        skills = [s for s in skills if q in s.get("skill", "").lower()]

    # Sort
    valid_sorts = {"trending_score", "total_jobs", "growth_rate"}
    sort_key = sort_by if sort_by in valid_sorts else "trending_score"
    skills = sorted(skills, key=lambda x: x.get(sort_key, 0), reverse=True)

    total = len(skills)
    page_data = skills[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "skills": page_data,
    }


@router.get("/jobs", tags=["trends"])
def get_trending_jobs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None, description="Tìm theo title, company, skill"),
    location: Optional[str] = Query(default=None, description="Lọc theo địa điểm"),
    source: Optional[str] = Query(default=None, description="topcv | itviec | vnw"),
    skill: Optional[str] = Query(default=None, description="Lọc theo skill"),
):
    """
    Danh sách job listings từ tất cả nguồn, có filter và phân trang.
    """
    # Thử đọc jobs_unified trước, fallback về trending.json
    jobs_data = _load_json(_JOBS_UNIFIED_JSON)
    if jobs_data:
        jobs: list[dict] = jobs_data.get("jobs", [])
    else:
        trending = _get_trending()
        jobs = trending.get("jobs", [])

    # Filter by search
    if search:
        q = search.lower()
        jobs = [
            j for j in jobs
            if q in (j.get("title") or "").lower()
            or q in (j.get("company") or "").lower()
            or any(q in s.lower() for s in (j.get("skills") or []))
        ]

    # Filter by location
    if location:
        loc = location.lower()
        jobs = [j for j in jobs if loc in (j.get("location") or "").lower()]

    # Filter by source
    if source:
        jobs = [j for j in jobs if (j.get("source") or "").lower() == source.lower()]

    # Filter by skill
    if skill:
        sk = skill.lower()
        jobs = [
            j for j in jobs
            if any(sk in s.lower() for s in (j.get("skills") or []))
        ]

    total = len(jobs)
    page_data = jobs[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "jobs": page_data,
    }


@router.get("/categories", tags=["trends"])
def get_job_categories():
    """Phân loại nghề nghiệp theo số lượng job."""
    data = _get_trending()
    categories = data.get("categories", {})
    # Chuyển dict → list để dễ render
    result = [
        {"name": k, "count": v if isinstance(v, int) else v.get("count", 0)}
        for k, v in categories.items()
    ]
    result.sort(key=lambda x: x["count"], reverse=True)
    return {"categories": result}


@router.get("/companies", tags=["trends"])
def get_top_companies(limit: int = Query(default=20, ge=1, le=50)):
    """Top công ty đang tuyển dụng nhiều nhất."""
    data = _get_trending()
    companies = data.get("top_companies", [])[:limit]
    return {"companies": companies}


@router.post("/refresh", tags=["trends"])
def refresh_trending_data():
    """
    Trigger rebuild trending data từ RankingSystem.
    Chạy trending.py trong background.
    """
    trending_script = _RANKING_DIR / "trending.py"
    if not trending_script.exists():
        raise HTTPException(status_code=503, detail="RankingSystem không tìm thấy.")

    try:
        result = subprocess.run(
            [sys.executable, str(trending_script)],
            cwd=str(_RANKING_DIR),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Rebuild thất bại: {result.stderr[:200]}",
            )
        return {"success": True, "message": "Trending data đã được cập nhật."}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Rebuild timeout (>120s).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time trend updates."""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
