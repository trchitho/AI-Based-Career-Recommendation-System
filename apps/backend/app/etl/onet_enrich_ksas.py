# apps/backend/app/etl/onet_enrich_ksas.py
from __future__ import annotations

from datetime import datetime
from typing import Iterable

import asyncpg
from loguru import logger

from app.services.onet_client_v2 import OnetV2Client
from app.core.config import settings


async def get_pg_pool():
    return await asyncpg.create_pool(dsn=settings.database_url)


async def upsert_career_ksa_rows(
    conn: asyncpg.Connection,
    rows: Iterable[dict],
    ksa_type: str,
    source: str,
):
    """
    rows: list row từ O*NET database/rows/{knowledge|skills|abilities}
    mapping sang core.career_ksas:
      - onet_code
      - ksa_type
      - name (element_name)
      - importance (scale_id == 'IM' → data_value)
      - level (scale_id == 'LV' → data_value)
    """
    # Gom importance/level theo (onet_code, element_id)
    tmp: dict[tuple[str, str], dict] = {}
    for r in rows:
        code = r["onetsoc_code"]
        elem_id = r["element_id"]
        elem_name = r["element_name"]
        scale_id = r["scale_id"]
        val = r["data_value"]

        key = (code, elem_id)
        if key not in tmp:
            tmp[key] = {
                "onet_code": code,
                "element_id": elem_id,
                "name": elem_name,
                "importance": None,
                "level": None,
            }
        if scale_id == "IM":
            tmp[key]["importance"] = val
        elif scale_id == "LV":
            tmp[key]["level"] = val

    fetched_at = datetime.utcnow()

    records = list(tmp.values())
    if not records:
        return

    # ON CONFLICT theo (onet_code, ksa_type, element_id, source)
    sql = """
        INSERT INTO core.career_ksas (
            onet_code, ksa_type, element_id,
            name, importance, level,
            source, fetched_at
        )
        VALUES (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8
        )
        ON CONFLICT (onet_code, ksa_type, element_id, source)
        DO UPDATE SET
            name = EXCLUDED.name,
            importance = COALESCE(EXCLUDED.importance, core.career_ksas.importance),
            level = COALESCE(EXCLUDED.level, core.career_ksas.level),
            fetched_at = EXCLUDED.fetched_at
    """

    await conn.executemany(
        sql,
        [
            (
                r["onet_code"],
                ksa_type,
                r["element_id"],
                r["name"],
                r["importance"],
                r["level"],
                source,
                fetched_at,
            )
            for r in records
        ],
    )
    logger.info(f"Upserted {len(records)} {ksa_type} KSAs from O*NET ({source})")
