from __future__ import annotations

import argparse
import asyncio
from typing import Iterable

from loguru import logger

from app.core.db import get_pg_pool
from app.services.onet_client_v2 import OnetV2Client


# ---------------- DB helpers -----------------


async def fetch_onet_codes(pool, only_code: str | None = None) -> list[str]:
    if only_code:
        return [only_code]

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT DISTINCT onet_code FROM core.careers WHERE onet_code IS NOT NULL"
        )
    return [r["onet_code"] for r in rows]


async def upsert_work_activities(conn, onet_code: str, activities: Iterable[str], source: str = "ONLINE") -> None:
    if not activities:
        return
    records = [(onet_code, a.strip(), source) for a in activities if a and a.strip()]
    if not records:
        return

    await conn.executemany(
        """
        INSERT INTO core.career_work_activities (onet_code, activity, source)
        VALUES ($1, $2, $3)
        ON CONFLICT (onet_code, activity)
        DO UPDATE SET source = EXCLUDED.source,
                      fetched_at = now()
        """,
        records,
    )


async def upsert_dwas(conn, onet_code: str, dwas: Iterable[str], source: str = "ONLINE") -> None:
    if not dwas:
        return
    records = [(onet_code, d.strip(), source) for d in dwas if d and d.strip()]
    if not records:
        return

    await conn.executemany(
        """
        INSERT INTO core.career_dwas (onet_code, dwa, source)
        VALUES ($1, $2, $3)
        ON CONFLICT (onet_code, dwa)
        DO UPDATE SET source = EXCLUDED.source,
                      fetched_at = now()
        """,
        records,
    )


async def upsert_work_context(conn, onet_code: str, contexts: Iterable[str], source: str = "ONLINE") -> None:
    if not contexts:
        return
    records = [(onet_code, c.strip(), source) for c in contexts if c and c.strip()]
    if not records:
        return

    await conn.executemany(
        """
        INSERT INTO core.career_work_context (onet_code, context, source)
        VALUES ($1, $2, $3)
        ON CONFLICT (onet_code, context)
        DO UPDATE SET source = EXCLUDED.source,
                      fetched_at = now()
        """,
        records,
    )


async def upsert_education_pct(
    conn,
    onet_code: str,
    rows: Iterable[tuple[str, float | None]],
    source: str = "ONLINE",
) -> None:
    records = []
    for label, pct in rows:
        if not label:
            continue
        records.append((onet_code, label.strip(), pct, source))
    if not records:
        return

    await conn.executemany(
        """
        INSERT INTO core.career_education_pct (onet_code, label, pct, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (onet_code, label)
        DO UPDATE SET pct = EXCLUDED.pct,
                      source = EXCLUDED.source,
                      fetched_at = now()
        """,
        records,
    )


# ---------------- Parsers từ JSON v2 -----------------


def extract_work_activities_elements(client: OnetV2Client, onet_code: str) -> list[str]:
    activities: list[str] = []
    for el in client.iter_occupation_summary_elements(onet_code, "work_activities"):
        name = (el.get("name") or "").strip()
        desc = (el.get("description") or "").strip()
        text = f"{name}: {desc}" if desc else name
        if text:
            activities.append(text)
    return activities


def extract_dwa_elements(client: OnetV2Client, onet_code: str) -> list[str]:
    dwas: list[str] = []
    for el in client.iter_occupation_summary_elements(onet_code, "detailed_work_activities"):
        # v2 thường có 'description' = câu DWA đầy đủ
        desc = (el.get("description") or "").strip()
        name = (el.get("name") or "").strip()
        text = desc or name
        if text:
            dwas.append(text)
    return dwas


def extract_work_context_elements(client: OnetV2Client, onet_code: str) -> list[str]:
    contexts: list[str] = []
    for el in client.iter_occupation_summary_elements(onet_code, "work_context"):
        name = (el.get("name") or "").strip()
        desc = (el.get("description") or "").strip()
        response = el.get("response") or []
        label = ""
        if isinstance(response, list) and response:
            top = response[0]
            label = (top.get("description") or "").strip()

        base = f"{name}: {desc}" if desc else name
        if label:
            text = f"{base} — {label}"
        else:
            text = base
        text = text.strip()
        if text:
            contexts.append(text)
    return contexts


def extract_education_rows(client: OnetV2Client, onet_code: str) -> list[tuple[str, float | None]]:
    data = client.get_education_summary(onet_code)
    rows: list[tuple[str, float | None]] = []

    for item in data.get("response", []):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        pct = item.get("percentage_of_respondents")
        # pct có thể None
        rows.append((title, pct))
    return rows


# ---------------- Worker cho từng nghề -----------------


async def enrich_one_occupation(pool, client: OnetV2Client, onet_code: str) -> None:
    async with pool.acquire() as conn:
        try:
            # 1) Work Activities
            wa_list = extract_work_activities_elements(client, onet_code)
            await upsert_work_activities(conn, onet_code, wa_list)

            # 2) DWAs
            dwa_list = extract_dwa_elements(client, onet_code)
            await upsert_dwas(conn, onet_code, dwa_list)

            # 3) Work Context
            wc_list = extract_work_context_elements(client, onet_code)
            await upsert_work_context(conn, onet_code, wc_list)

            # 4) Education %
            edu_rows = extract_education_rows(client, onet_code)
            await upsert_education_pct(conn, onet_code, edu_rows)

            logger.info(
                f"[{onet_code}] online summary enriched: "
                f"{len(wa_list)} work_activities, {len(dwa_list)} dwas, "
                f"{len(wc_list)} work_context, {len(edu_rows)} education_pct"
            )
        except Exception as exc:
            logger.exception(f"[{onet_code}] Failed to enrich online summary: {exc}")


# ---------------- Orchestrator + CLI -----------------


async def enrich_online(only_code: str | None = None, max_concurrent: int = 5) -> None:
    pool = await get_pg_pool()
    client = OnetV2Client()

    onet_codes = await fetch_onet_codes(pool, only_code)
    logger.info(
        f"Enrich ONLINE for {len(onet_codes)} occupations "
        f"(max_concurrent={max_concurrent})"
    )

    semaphore = asyncio.Semaphore(max_concurrent)

    async def worker(code: str):
        async with semaphore:
            await enrich_one_occupation(pool, client, code)

    tasks = [asyncio.create_task(worker(code)) for code in onet_codes]
    try:
        await asyncio.gather(*tasks)
    finally:
        await pool.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enrich core.* tables from O*NET Online v2")
    parser.add_argument(
        "--code",
        type=str,
        help='Chỉ chạy cho 1 O*NET code, ví dụ: "11-1011.00"',
        default=None,
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=5,
        help="Số occupation chạy song song (default=5)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(enrich_online(only_code=args.code, max_concurrent=args.max_concurrent))
