# apps/backend/app/api/bff_career.py
"""
BFF Career API - Fetch career details from 5 tables:
- core.careers (header)
- core.career_tasks
- core.career_ksas (skills, knowledge, abilities)
- core.career_technology
- core.career_outlook
- core.career_overview (salary via career_id join)

Section locking by plan:
- Free/Basic: 3 sections visible (About, Responsibilities, Technology)
- Premium: 4 sections visible (+ Competencies)
- Pro: 5 sections visible (all)
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Section visibility by plan
# Free/Basic: 3 sections (about, responsibilities, technology)
# Premium: 4 sections (+ competencies)
# Pro: 5 sections (all including sidebar info)
PLAN_SECTIONS = {
    "free": ["about", "responsibilities", "technology"],
    "basic": ["about", "responsibilities", "technology"],
    "premium": ["about", "responsibilities", "technology", "competencies"],
    "pro": ["about", "responsibilities", "technology", "competencies", "sidebar"],
}

router = APIRouter(prefix="/bff/catalog", tags=["catalog"])

# Redis client - optional, will be None if Redis is not available
_redis = None
_redis_available = True


async def _get_redis():
    """Get Redis client, returns None if Redis is not available"""
    global _redis, _redis_available
    
    if not _redis_available:
        return None
    
    if _redis is None:
        try:
            import redis.asyncio as redis_async
            _redis = redis_async.from_url(REDIS_URL, decode_responses=True)
            # Test connection
            await _redis.ping()
        except Exception as e:
            print(f"⚠️ Redis not available, caching disabled: {e}")
            _redis_available = False
            _redis = None
            return None
    
    return _redis


def _normalize_onet_code(code: str) -> str:
    """
    Normalize onet_code from various formats:
    - "49-9061.00" -> "49-9061.00" (already correct)
    - "camera-and-photographic-equipment-repairers-49-9061-00" -> "49-9061.00"
    - "49-9061-00" -> "49-9061.00"
    """
    if re.match(r"^\d{2}-\d{4}\.\d{2}$", code):
        return code
    
    slug_match = re.search(r"(\d{2})-(\d{4})-(\d{2})$", code)
    if slug_match:
        return f"{slug_match.group(1)}-{slug_match.group(2)}.{slug_match.group(3)}"
    
    dash_match = re.match(r"^(\d{2})-(\d{4})-(\d{2})$", code)
    if dash_match:
        return f"{dash_match.group(1)}-{dash_match.group(2)}.{dash_match.group(3)}"
    
    return code


def _fetch_sections(conn: psycopg.Connection, code: str) -> Dict[str, Any]:
    """Fetch career data from 5 tables + careers header"""
    with conn.cursor(row_factory=dict_row) as cur:
        # 1. Career header from core.careers
        cur.execute(
            """
            SELECT id, onet_code, title_en AS title, short_desc_en AS short_desc
            FROM core.careers
            WHERE onet_code = %s
            """,
            (code,),
        )
        header = cur.fetchone()
        if not header:
            raise HTTPException(status_code=404, detail=f"Career not found: {code}")

        career_id = header["id"]

        # 2. Tasks from core.career_tasks
        cur.execute(
            """
            SELECT task_text, importance 
            FROM core.career_tasks 
            WHERE onet_code = %s 
            ORDER BY importance DESC NULLS LAST, id ASC
            """,
            (code,),
        )
        tasks = cur.fetchall()

        # 3. Technology from core.career_technology
        cur.execute(
            """
            SELECT category, name, hot_flag 
            FROM core.career_technology 
            WHERE onet_code = %s 
            ORDER BY hot_flag DESC NULLS LAST, id ASC
            """,
            (code,),
        )
        techs = cur.fetchall()

        # 4. KSAs from core.career_ksas (skills, knowledge, abilities)
        cur.execute(
            """
            SELECT ksa_type, name, category, level, importance 
            FROM core.career_ksas 
            WHERE onet_code = %s 
            ORDER BY importance DESC NULLS LAST, id ASC
            """,
            (code,),
        )
        ksas = cur.fetchall()
        skills = [x for x in ksas if x["ksa_type"] == "skill"]
        knowledge = [x for x in ksas if x["ksa_type"] == "knowledge"]
        abilities = [x for x in ksas if x["ksa_type"] == "ability"]

        # 5. Outlook from core.career_outlook
        cur.execute(
            """
            SELECT summary_md, growth_label, openings_est 
            FROM core.career_outlook 
            WHERE onet_code = %s
            """,
            (code,),
        )
        outlook = cur.fetchone()

        # 6. Overview from core.career_overview (join by career_id)
        cur.execute(
            """
            SELECT experience_text, degree_text, salary_min, salary_max, salary_avg, salary_currency
            FROM core.career_overview 
            WHERE career_id = %s
            """,
            (career_id,),
        )
        overview = cur.fetchone()

    # Build response DTO
    dto = {
        "onet_code": header["onet_code"],
        "title": header["title"],
        "short_desc": header["short_desc"],
        "sections": {
            "tasks": tasks or [],
            "technology": techs or [],
            "skills": skills or [],
            "knowledge": knowledge or [],
            "abilities": abilities or [],
            "outlook": outlook,
            "overview": overview,
        },
        "source": [{"name": "O*NET Web Services", "version": "30.x", "license": "CC BY 4.0"}],
    }
    return dto


@router.get("/career/{onet_code}")
async def get_career(onet_code: str, plan: str = Query("free", description="User plan: free, basic, premium, pro")):
    """Get career details by onet_code or slug with section locking based on plan"""
    normalized_code = _normalize_onet_code(onet_code)
    
    # Validate plan
    valid_plans = ["free", "basic", "premium", "pro"]
    if plan not in valid_plans:
        plan = "free"
    
    cache_key = f"career:v3:{normalized_code}:{plan}"
    
    # Try to get from cache (if Redis is available)
    r = await _get_redis()
    if r:
        try:
            cached = await r.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Ignore cache errors, proceed to DB

    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Missing DATABASE_URL")
    
    with psycopg.connect(DATABASE_URL) as conn:
        dto = _fetch_sections(conn, normalized_code)
    
    # Apply section locking based on plan
    allowed_sections = PLAN_SECTIONS.get(plan, PLAN_SECTIONS["free"])
    dto["plan"] = plan
    dto["allowed_sections"] = allowed_sections
    dto["locked_sections"] = [s for s in ["about", "responsibilities", "technology", "competencies", "sidebar"] if s not in allowed_sections]

    # Try to cache (if Redis is available)
    if r:
        try:
            await r.set(cache_key, json.dumps(dto, ensure_ascii=False, default=str), ex=1800)
        except Exception:
            pass  # Ignore cache errors
    
    return dto
