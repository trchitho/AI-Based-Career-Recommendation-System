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

import logging
import os
import time
from app.core.serialization import dumps_str as json_dumps, loads as json_loads  # orjson binary
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

    print("[OK] Enhanced caching available")
except ImportError:
    cache_manager = None
    print("[WARN] Enhanced caching not available, using basic Redis")

# Fallback to basic Redis if enhanced caching not available
_redis = None
_redis_available = True
_memory_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_MEMORY_CACHE_TTL_SECONDS = 60 * 60 * 12
_MEMORY_CACHE_MAX_ITEMS = 512

RIASEC_INTERESTS_VI = {
    "R": {
        "label": "Thực tế",
        "description": "Phù hợp với công việc thiên về thao tác thực hành, công cụ, máy móc, kỹ thuật hoặc môi trường làm việc cụ thể.",
    },
    "I": {
        "label": "Nghiên cứu",
        "description": "Thể hiện mức độ công việc cần phân tích, tìm hiểu dữ liệu, khám phá vấn đề và ra quyết định dựa trên tư duy logic.",
    },
    "A": {
        "label": "Nghệ thuật",
        "description": "Gắn với các nhiệm vụ sáng tạo, biểu đạt ý tưởng, thiết kế, nội dung hoặc cách làm linh hoạt, ít rập khuôn.",
    },
    "S": {
        "label": "Xã hội",
        "description": "Cho thấy công việc cần hỗ trợ, hướng dẫn, tư vấn, chăm sóc hoặc tương tác thường xuyên với con người.",
    },
    "E": {
        "label": "Quản lý và thuyết phục",
        "description": "Phù hợp với hoạt động lãnh đạo, bán hàng, đàm phán, kinh doanh, ra quyết định và tạo ảnh hưởng đến người khác.",
    },
    "C": {
        "label": "Quy củ",
        "description": "Thể hiện mức độ công việc cần tuân thủ quy trình, xử lý hồ sơ, tổ chức dữ liệu và đảm bảo tính chính xác.",
    },
}


def _top_riasec_interests(row: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not row:
        return []
    pairs = [
        ("R", row.get("r")),
        ("I", row.get("i")),
        ("A", row.get("a")),
        ("S", row.get("s")),
        ("E", row.get("e")),
        ("C", row.get("c")),
    ]
    ranked = sorted(
        ((code, float(score)) for code, score in pairs if score is not None),
        key=lambda item: item[1],
        reverse=True,
    )[:2]
    return [
        {
            "code": code,
            "label": RIASEC_INTERESTS_VI[code]["label"],
            "description": RIASEC_INTERESTS_VI[code]["description"],
            "score": round(score, 3),
        }
        for code, score in ranked
    ]


def _memory_get(key: str) -> dict[str, Any] | None:
    item = _memory_cache.get(key)
    if not item:
        return None
    expires_at, value = item
    if expires_at < time.time():
        _memory_cache.pop(key, None)
        return None
    return value


def _memory_set(key: str, value: dict[str, Any]) -> None:
    if len(_memory_cache) >= _MEMORY_CACHE_MAX_ITEMS:
        oldest_key = min(_memory_cache, key=lambda k: _memory_cache[k][0])
        _memory_cache.pop(oldest_key, None)
    _memory_cache[key] = (time.time() + _MEMORY_CACHE_TTL_SECONDS, value)


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
            print("[OK] Basic Redis cache connected")
        except Exception as e:
            print(f"[WARN] Redis not available, caching disabled: {e}")
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


def _safe_query(cur, conn, sql: str, params: tuple):
    """Execute a query and return results, rolling back on error (handles missing tables)."""
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    except Exception as e:
        logger.warning(f"[BFF] Optional query failed (table may not exist): {e}")
        try: conn.rollback()
        except Exception: pass
        return []


def _safe_query_one(cur, conn, sql: str, params: tuple):
    """Execute a query and return one row, rolling back on error."""
    try:
        cur.execute(sql, params)
        return cur.fetchone()
    except Exception as e:
        logger.warning(f"[BFF] Optional query failed (table may not exist): {e}")
        try: conn.rollback()
        except Exception: pass
        return None


def _fetch_sections(conn: psycopg.Connection, code: str, language: str = "en") -> Dict[str, Any]:
    """Fetch career data from all available tables with language support"""
    with conn.cursor(row_factory=dict_row) as cur:
        # Language column selection helper
        def get_lang_col(en_col: str, vn_col: str) -> str:
            if language == "vi":
                # For specific columns, if VN is same as EN, return NULL to trigger fallbacks to better sources in FE
                if vn_col in ["experience_text_vn", "degree_text_vn"]:
                     return f"NULLIF(NULLIF({vn_col}, {en_col}), '')"
                return f"COALESCE(NULLIF({vn_col}, ''), {en_col})"
            else:
                return f"COALESCE(NULLIF({en_col}, ''), {vn_col})"

        # 1. Career header from core.careers
        cur.execute(
            f"""
            SELECT {get_lang_col("title_en", "title_vn")} AS title,
                   {get_lang_col("short_desc_en", "short_desc_vn")} AS description,
                   title_vn AS title_vi, title_en,
                   short_desc_vn AS short_desc_vi, short_desc_en,
                   alternative_titles_vn AS alternative_titles_vi, alternative_titles_en,
                   industry_category, onet_code, id
            FROM core.careers
            WHERE onet_code = %s OR onet_code = %s OR slug = %s
            LIMIT 1
            """,
            (code, code.replace('.', '-'), code),
        )
        header = cur.fetchone()
        if not header:
            raise HTTPException(status_code=404, detail=f"Career not found: {code}")

        career_id = header["id"]

        # 2. Tasks from core.career_tasks
        cur.execute(
            f"""
            SELECT task_id,
                   {get_lang_col("task_en", "task_vn")} AS task_text,
                   task_en, task_vn AS task_vi,
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
            SELECT {get_lang_col("category", "category_vn")} AS category,
                   {get_lang_col("name_en", "name_vn")} AS name,
                   {get_lang_col("example_en", "example_vn")} AS example,
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
                   {get_lang_col("name_en", "name_vn")} AS name,
                   {get_lang_col("description_en", "description_vn")} AS description,
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
            SELECT {get_lang_col("summary_md_en", "summary_md_vn")} AS summary_md,
                   {get_lang_col("growth_label_en", "growth_label_vn")} AS growth_label,
                   {get_lang_col("openings_est_en", "openings_est_vn")} AS openings_est,
                   openings_est_en, openings_est_vn
            FROM core.career_outlook 
            WHERE onet_code = %s
            """,
            (code,),
        )
        outlook = cur.fetchone()

        # 6. Overview from core.career_overview (join by career_id)
        cur.execute(
            f"""
            SELECT {get_lang_col("experience_text_en", "experience_text_vn")} AS experience_text,
                   {get_lang_col("degree_text_en", "degree_text_vn")} AS degree_text,
                   salary_min_vn as salary_min, salary_max_vn as salary_max, salary_avg_vn as salary_avg, salary_currency_vn as salary_currency,
                   salary_min_en, salary_max_en, salary_avg_en, salary_currency_en,
                   salary_bands_vn as salary_bands, salary_bands_en
            FROM core.career_overview 
            WHERE career_id = %s
            """,
            (career_id,),
        )
        overview = cur.fetchone()

        # 7. NEW: Detailed Work Activities (DWAs) - enriched with category and description
        cur.execute(
            f"""
            SELECT d.dwa_id, 
                   {get_lang_col("d.dwa_title_en", "d.dwa_title_vn")} AS dwa_title,
                   d.element_id,
                   COALESCE(m.activity_category_vi, m.activity_category) AS activity_category,
                   COALESCE(m.description_vi, m.description) AS activity_description
            FROM core.career_dwas d
            LEFT JOIN core.career_work_activities_master m ON d.element_id = m.element_id
            WHERE d.onet_code = %s
            ORDER BY d.dwa_id
            """,
            (code,),
        )
        dwas = cur.fetchall()

        # 8. NEW: Education Percentages
        cur.execute(
            f"""
            SELECT element_id,
                   {get_lang_col("element_name_en", "element_name_vn")} AS element_name,
                   category, 
                   {get_lang_col("category_description_en", "category_description_vn")} AS category_description,
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
                f"""
                SELECT dwa_id,
                       {get_lang_col("dwa_title_en", "dwa_title_vn")} AS dwa_title,
                       element_id, iwa_id
                FROM core.career_dwas
                WHERE onet_code = %s ORDER BY dwa_id
                """, (code,),
            )
            dwas = cur.fetchall()
        except Exception as _e:
            logger.warning(f"[BFF] Optional table query failed: {_e}")
            try: conn.rollback()
            except Exception: pass

        # 8. Education Percentages (optional table)
        education_pct = []
        try:
            cur.execute(
                f"""
                SELECT element_id,
                       {get_lang_col("element_name_en", "element_name_vn")} AS element_name,
                       category,
                       {get_lang_col("category_description_en", "category_description_vn")} AS category_description,
                       data_value, n, standard_error
                FROM core.career_education_pct
                WHERE onet_code = %s ORDER BY category, data_value DESC
                """, (code,),
            )
            education_pct = cur.fetchall()
        except Exception as _e:
            logger.warning(f"[BFF] Optional table query failed: {_e}")
            try: conn.rollback()
            except Exception: pass

        # 9. Career Preparation (optional table)
        prep = None
        try:
            cur.execute(
                f"""
                SELECT job_zone,
                       {get_lang_col("education_summary_en", "education_summary_vn")} AS education_summary,
                       {get_lang_col("experience_summary_en", "experience_summary_vn")} AS experience_summary,
                       COALESCE(domain_source_vn, '') AS domain_source
                FROM core.career_prep
                WHERE onet_code = %s
                """, (code,),
            )
            prep = cur.fetchone()
        except Exception as _e:
            logger.warning(f"[BFF] career_prep query failed: {_e}")
            try: conn.rollback()
            except Exception: pass

        # 10. Wages (optional — career_wages_vi may not exist yet)
        wages = None
        try:
            if language == "vi":
                cur.execute(
                    """
                    SELECT annual_median_vnd, annual_min_vnd, annual_max_vnd,
                           monthly_median_vnd, monthly_min_vnd, monthly_max_vnd,
                           region_hcm_monthly, region_hanoi_monthly,
                           region_danang_monthly, region_provinces_monthly,
                           experience_level, job_zone, industry_category,
                           data_quality, market_demand
                    FROM core.career_wages_vi WHERE onet_code = %s
                    """, (code,),
                )
            else:
                cur.execute(
                    """
                    SELECT annual_median, annual_10th_percentile, annual_25th_percentile,
                           annual_75th_percentile, annual_90th_percentile,
                           hourly_median, hourly_10th_percentile, hourly_25th_percentile,
                           hourly_75th_percentile, hourly_90th_percentile,
                           experience_level, job_zone, industry_category,
                           data_quality, market_demand
                    FROM core.career_wages_us WHERE onet_code = %s
                    """, (code,),
                )
            wages = cur.fetchone()
        except Exception as _e:
            logger.warning(f"[BFF] wages query failed (table may not exist): {_e}")
            try: conn.rollback()
            except Exception: pass

        # 11. Work Activity Summary (optional table)
        work_activities = []
        try:
            cur.execute(
                """
                SELECT s.element_id, s.importance_score, s.level_score, s.combined_score,
                       s.activity_rank, s.is_top_activity,
                       m.element_name_vn, m.element_name, m.description_vn, m.description,
                       m.activity_category_vn, m.activity_category
                FROM core.career_work_activity_summary s
                LEFT JOIN core.career_work_activities_master m ON s.element_id = m.element_id
                WHERE s.onet_code = %s
                ORDER BY s.activity_rank ASC NULLS LAST, s.combined_score DESC
                """, (code,),
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

        # 12. NEW: Work Context - trả về đầy đủ cả EN và VI để FE xử lý
        cur.execute(
            """
            SELECT element_id,
                   element_name,
                   element_name_vi,
                   scale_id, category,
                   category_description,
                   category_description_vi,
                   data_value, n, standard_error
            FROM core.career_work_context 
            WHERE onet_code = %s
            ORDER BY scale_id, element_id, data_value DESC
            """,
            (code,),
        )
        work_context = cur.fetchall()

        # 13. RIASEC interests from O*NET career_interests: display top 2 labels only.
        cur.execute(
            """
            SELECT r, i, a, s, e, c
            FROM core.career_interests
            WHERE onet_code = %s
            """,
            (header["onet_code"],),
        )
        riasec_interests = _top_riasec_interests(cur.fetchone())

    # Build response DTO with all sections
    dto = {
        "onet_code": header["onet_code"],
        "title": header["title"],
        "title_vn": header["title_vi"],
        "title_en": header["title_en"],
        "description": header["description"],
        "description_vn": header["short_desc_vi"],
        "description_en": header["short_desc_en"],
        "alternative_titles": header["alternative_titles_vi"] if language == "vi" else header["alternative_titles_en"],
        "industry_category": header["industry_category"],
        "language": language,
        "riasec_interests": riasec_interests,
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
    language: str = Query("vi", description="Language is locked to vi"),
):
    """Get career details by onet_code or slug with section locking based on plan and language support"""
    normalized_code = _normalize_onet_code(onet_code)

    # Validate plan
    valid_plans = ["free", "basic", "premium", "pro"]
    if plan not in valid_plans:
        plan = "free"

    # Vietnamese-only product mode. Keep the query parameter for compatibility, but ignore EN.
    language = "vi"

    cache_key = f"career:v11:{normalized_code}:{plan}:{language}"

    memory_cached = _memory_get(cache_key)
    if memory_cached:
        return memory_cached

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
                cached = json_loads(cached_data) if cached_data else None

            if cached:
                _memory_set(cache_key, cached)
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
                # Career catalog is stable; cache longer to keep detail pages snappy.
                await cache_manager.set(cache_key, dto, ttl=_MEMORY_CACHE_TTL_SECONDS)
            else:
                # Use basic Redis
                await cache_client.set(cache_key, json_dumps(dto), ex=_MEMORY_CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    _memory_set(cache_key, dto)

    return dto
