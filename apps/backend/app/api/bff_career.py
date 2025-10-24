# apps/backend/app/api/bff_career.py

from pathlib import Path
from dotenv import load_dotenv


from __future__ import annotations
import os
import json
from typing import Any, Dict, Optional

import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException
import redis.asyncio as redis

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

router = APIRouter(prefix="/bff/catalog", tags=["catalog"])

# Simple async Redis client (create once)
_redis: Optional[redis.Redis] = None


async def _get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis


def _fetch_sections(conn: psycopg.Connection, code: str) -> Dict[str, Any]:
    with conn.cursor(row_factory=dict_row) as cur:
        # Career header
        cur.execute(
            """
            SELECT onet_code, title_en AS title, short_desc_en AS short_desc
            FROM core.careers
            WHERE onet_code=%s
        """,
            (code,),
        )
        header = cur.fetchone()
        if not header:
            raise HTTPException(status_code=404, detail="Career not found")

        # Sections
        cur.execute(
            "SELECT task_text, importance FROM core.career_tasks WHERE onet_code=%s ORDER BY id ASC",
            (code,),
        )
        tasks = cur.fetchall()

        cur.execute(
            "SELECT category, name, hot_flag FROM core.career_technology WHERE onet_code=%s ORDER BY id ASC",
            (code,),
        )
        techs = cur.fetchall()

        cur.execute(
            "SELECT ksa_type, name, category, level, importance FROM core.career_ksas WHERE onet_code=%s ORDER BY id ASC",
            (code,),
        )
        ksas = cur.fetchall()
        skills = [x for x in ksas if x["ksa_type"] == "skill"]
        knowledge = [x for x in ksas if x["ksa_type"] == "knowledge"]
        abilities = [x for x in ksas if x["ksa_type"] == "ability"]

        cur.execute(
            "SELECT job_zone, education, training FROM core.career_prep WHERE onet_code=%s",
            (code,),
        )
        prep = cur.fetchone()

        cur.execute(
            "SELECT area, median_annual, currency, timespan FROM core.career_wages_us WHERE onet_code=%s ORDER BY id ASC",
            (code,),
        )
        wages = cur.fetchall()

        cur.execute(
            "SELECT summary_md, growth_label, openings_est FROM core.career_outlook WHERE onet_code=%s",
            (code,),
        )
        outlook = cur.fetchone()

        cur.execute(
            "SELECT r,i,a,s,e,c FROM core.career_interests WHERE onet_code=%s", (code,)
        )
        ints = cur.fetchone()

    dto = {
        "onet_code": header["onet_code"],
        "title": header["title"],
        "short_desc": header["short_desc"],
        "sections": {
            "tasks": tasks,
            "technology": techs,
            "skills": skills,
            "knowledge": knowledge,
            "abilities": abilities,
            "education": {
                "job_zone": prep.get("job_zone") if prep else None,
                "education_req": prep.get("education") if prep else None,
                "training": prep.get("training") if prep else None,
            },
            "wages_us": wages,
            "outlook": outlook,
            "interests": ints,
        },
        "source": [
            {"name": "O*NET Web Services", "version": "30.x", "license": "CC BY 4.0"}
        ],
    }
    return dto


@router.get("/career/{onet_code}")
async def get_career(onet_code: str):
    r = await _get_redis()
    cache_key = f"career:{onet_code}"
    c = await r.get(cache_key)
    if c:
        return json.loads(c)

    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Missing DATABASE_URL")
    with psycopg.connect(DATABASE_URL) as conn:
        dto = _fetch_sections(conn, onet_code)

    # Cache 30 phút
    await r.set(cache_key, json.dumps(dto, ensure_ascii=False), ex=1800)
    return dto
