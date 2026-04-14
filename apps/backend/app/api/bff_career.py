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
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

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

# Redis client - enhanced caching
try:
    from ..core.cache import cache_manager

    print("✅ Enhanced caching available")
except ImportError:
    cache_manager = None
    print("⚠️ Enhanced caching not available, using basic Redis")

# Fallback to basic Redis if enhanced caching not available
_redis = None
_redis_available = True


async def _get_redis():
    """Get Redis client, returns None if Redis is not available"""
    global _redis, _redis_available

    if cache_manager:
        return cache_manager

    if not _redis_available:
        return None

    if _redis is None:
        try:
            import redis.asyncio as redis_async

            _redis = redis_async.from_url(REDIS_URL, decode_responses=True)
            # Test connection
            await _redis.ping()
            print("✅ Basic Redis cache connected")
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


def _fetch_sections(conn: psycopg.Connection, code: str, language: str = "en") -> Dict[str, Any]:
    """Fetch career data from all available tables with language support"""
    with conn.cursor(row_factory=dict_row) as cur:
        # Language column selection helper
        def get_lang_col(en_col: str, vi_col: str) -> str:
            if language == "vi":
                return f"COALESCE({vi_col}, {en_col})"
            else:
                return f"COALESCE({en_col}, {vi_col})"

        # 1. Career header from core.careers
        cur.execute(
            f"""
            SELECT id, onet_code, 
                   {get_lang_col("title_en", "title_vi")} AS title, 
                   {get_lang_col("short_desc_en", "short_desc_vn")} AS short_desc,
                   alternative_titles_en, alternative_titles_vi,
                   industry_category, source
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
            f"""
            SELECT {get_lang_col("task_en", "task_vi")} AS task_text, 
                   importance, task_type, incumbents_responding
            FROM core.career_tasks 
            WHERE onet_code = %s 
            ORDER BY importance DESC NULLS LAST, id ASC
            """,
            (code,),
        )
        tasks = cur.fetchall()

        # 3. Technology from core.career_technology
        cur.execute(
            f"""
            SELECT {get_lang_col("category", "category_vi")} AS category, 
                   {get_lang_col("name_en", "name_vi")} AS name,
                   {get_lang_col("example_en", "example_vi")} AS example,
                   hot_flag, in_demand_flag, commodity_code
            FROM core.career_technology 
            WHERE onet_code = %s 
            ORDER BY hot_flag DESC NULLS LAST, in_demand_flag DESC NULLS LAST, id ASC
            """,
            (code,),
        )
        techs = cur.fetchall()

        # 4. KSAs from core.career_ksas (skills, knowledge, abilities)
        cur.execute(
            f"""
            SELECT ksa_type, 
                   {get_lang_col("name", "name_vi")} AS name,
                   {get_lang_col("description", "description_vi")} AS description,
                   category, level, importance 
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
            f"""
            SELECT {get_lang_col("summary_md", "summary_md_vi")} AS summary_md,
                   {get_lang_col("growth_label", "growth_label_vi")} AS growth_label,
                   {get_lang_col("CAST(openings_est AS TEXT)", "openings_est_vi")} AS openings_est
            FROM core.career_outlook 
            WHERE onet_code = %s
            """,
            (code,),
        )
        outlook = cur.fetchone()

        # 6. Overview from core.career_overview (join by career_id)
        cur.execute(
            f"""
            SELECT {get_lang_col("experience_text", "experience_text_vi")} AS experience_text,
                   {get_lang_col("degree_text", "degree_text_vi")} AS degree_text,
                   salary_min, salary_max, salary_avg, salary_currency,
                   salary_min_en, salary_max_en, salary_avg_en, salary_currency_en,
                   salary_bands, salary_bands_en
            FROM core.career_overview 
            WHERE career_id = %s
            """,
            (career_id,),
        )
        overview = cur.fetchone()

        # 7. NEW: Detailed Work Activities (DWAs)
        cur.execute(
            f"""
            SELECT dwa_id, 
                   {get_lang_col("dwa_title", "dwa_title_vi")} AS dwa_title,
                   element_id, iwa_id
            FROM core.career_dwas 
            WHERE onet_code = %s
            ORDER BY dwa_id
            """,
            (code,),
        )
        dwas = cur.fetchall()

        # 8. NEW: Education Percentages
        cur.execute(
            f"""
            SELECT element_id,
                   {get_lang_col("element_name", "element_name_vi")} AS element_name,
                   category, 
                   {get_lang_col("category_description", "category_description_vi")} AS category_description,
                   data_value, n, standard_error
            FROM core.career_education_pct 
            WHERE onet_code = %s
            ORDER BY category, data_value DESC
            """,
            (code,),
        )
        education_pct = cur.fetchall()

        # 9. NEW: Career Preparation
        cur.execute(
            f"""
            SELECT job_zone,
                   {get_lang_col("education_summary_en", "education_summary_vi")} AS education_summary,
                   {get_lang_col("experience_summary_en", "experience_summary_vi")} AS experience_summary,
                   {get_lang_col("domain_source", "domain_source_vi")} AS domain_source
            FROM core.career_prep 
            WHERE onet_code = %s
            """,
            (code,),
        )
        prep = cur.fetchone()

        # 10. NEW: Wages (US or Vietnam based on language)
        if language == "vi":
            # Vietnam wages
            cur.execute(
                """
                SELECT annual_median_vnd, annual_min_vnd, annual_max_vnd,
                       monthly_median_vnd, monthly_min_vnd, monthly_max_vnd,
                       region_hcm_monthly, region_hanoi_monthly, region_danang_monthly, region_provinces_monthly,
                       experience_level, job_zone, industry_category, data_quality, market_demand
                FROM core.career_wages_vi 
                WHERE onet_code = %s
                """,
                (code,),
            )
        else:
            # US wages
            cur.execute(
                """
                SELECT annual_median, annual_10th_percentile, annual_25th_percentile, 
                       annual_75th_percentile, annual_90th_percentile,
                       hourly_median, hourly_10th_percentile, hourly_25th_percentile,
                       hourly_75th_percentile, hourly_90th_percentile,
                       experience_level, job_zone, industry_category, data_quality, market_demand
                FROM core.career_wages_us 
                WHERE onet_code = %s
                """,
                (code,),
            )
        wages = cur.fetchone()

        # 11. NEW: Work Activity Summary
        cur.execute(
            """
            SELECT s.element_id, s.importance_score, s.level_score, s.combined_score, 
                   s.activity_rank, s.is_top_activity,
                   m.element_name_vi, m.element_name, m.description_vi, m.description,
                   m.activity_category_vi, m.activity_category
            FROM core.career_work_activity_summary s
            LEFT JOIN core.career_work_activities_master m ON s.element_id = m.element_id
            WHERE s.onet_code = %s
            ORDER BY s.activity_rank ASC NULLS LAST, s.combined_score DESC
            """,
            (code,),
        )
        work_activities = cur.fetchall()

        # 12. NEW: Work Context
        cur.execute(
            f"""
            SELECT element_id,
                   {get_lang_col("element_name", "element_name_vi")} AS element_name,
                   scale_id, category,
                   {get_lang_col("category_description", "category_description_vi")} AS category_description,
                   data_value, n, standard_error
            FROM core.career_work_context 
            WHERE onet_code = %s
            ORDER BY scale_id, data_value DESC
            """,
            (code,),
        )
        work_context = cur.fetchall()

    # Build response DTO with all sections
    dto = {
        "onet_code": header["onet_code"],
        "title": header["title"],
        "short_desc": header["short_desc"],
        "alternative_titles": header["alternative_titles_vi"] if language == "vi" else header["alternative_titles_en"],
        "industry_category": header["industry_category"],
        "language": language,
        "sections": {
            # Original sections
            "tasks": tasks or [],
            "technology": techs or [],
            "skills": skills or [],
            "knowledge": knowledge or [],
            "abilities": abilities or [],
            "outlook": outlook,
            "overview": overview,
            # New sections
            "detailed_work_activities": dwas or [],
            "education_requirements": education_pct or [],
            "preparation": prep,
            "wages": wages,
            "work_activities": work_activities or [],
            "work_context": work_context or [],
        },
        "source": [{"name": "O*NET Web Services", "version": "30.x", "license": "CC BY 4.0"}],
    }
    return dto


@router.get("/career/{onet_code}")
async def get_career(
    onet_code: str,
    plan: str = Query("free", description="User plan: free, basic, premium, pro"),
    language: str = Query("en", description="Language: en (English) or vi (Vietnamese)"),
):
    """Get career details by onet_code or slug with section locking based on plan and language support"""
    normalized_code = _normalize_onet_code(onet_code)

    # Validate plan
    valid_plans = ["free", "basic", "premium", "pro"]
    if plan not in valid_plans:
        plan = "free"

    # Validate language
    valid_languages = ["en", "vi"]
    if language not in valid_languages:
        language = "en"

    cache_key = f"career:v5:{normalized_code}:{plan}:{language}"

    # Try to get from cache (enhanced or basic Redis)
    cache_client = await _get_redis()
    if cache_client:
        try:
            if cache_manager:
                # Use enhanced cache manager
                cached = await cache_manager.get(cache_key)
            else:
                # Use basic Redis
                cached_data = await cache_client.get(cache_key)
                cached = json.loads(cached_data) if cached_data else None

            if cached:
                return cached
        except Exception as e:
            logger.warning(f"Cache get error: {e}")

    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Missing DATABASE_URL")

    # Add database monitoring if available
    try:
        from ..core.database_monitor import monitor_psycopg_connection

        with psycopg.connect(DATABASE_URL) as conn:
            # Add monitoring to connection
            conn = monitor_psycopg_connection(conn)
            dto = _fetch_sections(conn, normalized_code, language)
    except ImportError:
        # Fallback without monitoring
        with psycopg.connect(DATABASE_URL) as conn:
            dto = _fetch_sections(conn, normalized_code, language)

    # Apply section locking based on plan
    allowed_sections = PLAN_SECTIONS.get(plan, PLAN_SECTIONS["free"])
    dto["plan"] = plan
    dto["allowed_sections"] = allowed_sections
    dto["locked_sections"] = [
        s for s in ["about", "responsibilities", "technology", "competencies", "sidebar"] if s not in allowed_sections
    ]

    # Try to cache (enhanced or basic Redis)
    if cache_client:
        try:
            if cache_manager:
                # Use enhanced cache manager with 30 minute TTL
                await cache_manager.set(cache_key, dto, ttl=1800)
            else:
                # Use basic Redis
                await cache_client.set(cache_key, json.dumps(dto, ensure_ascii=False, default=str), ex=1800)
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    return dto
