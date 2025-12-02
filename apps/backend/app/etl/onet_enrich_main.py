from __future__ import annotations

import argparse
import asyncio

from loguru import logger

from app.services.onet_client_v2 import OnetV2Client
from app.core.db import get_pg_pool, close_pg_pool
from app.etl.onet_enrich_ksas import upsert_career_ksa_rows


# ---------- Helper: lấy danh sách onet_code ----------

async def fetch_onet_codes(pool):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT DISTINCT onet_code
            FROM core.careers
            WHERE onet_code IS NOT NULL
            ORDER BY onet_code
            """
        )
    return [r["onet_code"] for r in rows]


# ---------- Helper: gọi O*NET v2 trong thread (không block event loop) ----------

async def fetch_table_rows(client: OnetV2Client, table_id: str, code: str):
    """
    Gọi OnetV2Client.iter_database_rows(...) trong thread pool để không block event loop.
    """
    def _job():
        return list(
            client.iter_database_rows(
                table_id,
                filters=[f"onetsoc_code.eq.{code}"],
                start=1,
                end=200,
            )
        )

    return await asyncio.to_thread(_job)


async def enrich_one_code(pool, client: OnetV2Client, code: str) -> None:
    """
    Enrich KSA cho 1 onet_code:
      - knowledge
      - skills
      - abilities
    """
    # 1) fetch rows từ O*NET v2 (chạy trong thread)
    kn_rows = await fetch_table_rows(client, "knowledge", code)
    sk_rows = await fetch_table_rows(client, "skills", code)
    ab_rows = await fetch_table_rows(client, "abilities", code)

    # 2) upsert vào DB
    async with pool.acquire() as conn:
        if kn_rows:
            await upsert_career_ksa_rows(conn, kn_rows, ksa_type="knowledge", source="ONLINE")
        if sk_rows:
            await upsert_career_ksa_rows(conn, sk_rows, ksa_type="skill", source="ONLINE")
        if ab_rows:
            await upsert_career_ksa_rows(conn, ab_rows, ksa_type="ability", source="ONLINE")

    logger.info(f"[OK] {code} – KSA enriched")


async def enrich_ksas(only_code: str | None = None, max_concurrent: int = 10):
    pool = await get_pg_pool()
    client = OnetV2Client()

    # Lấy danh sách nghề cần chạy
    if only_code:
        onet_codes = [only_code]
    else:
        onet_codes = await fetch_onet_codes(pool)

    total = len(onet_codes)
    logger.info(f"Enrich KSAs for {total} occupations (max_concurrent={max_concurrent})")

    semaphore = asyncio.Semaphore(max_concurrent)
    done = 0

    async def worker(code: str):
        nonlocal done
        async with semaphore:
            try:
                await enrich_one_code(pool, client, code)
            except Exception as ex:
                logger.error(f"[FAIL] {code}: {ex}")
            finally:
                done += 1
                if done % 10 == 0 or done == total:
                    logger.info(f"Progress: {done}/{total}")

    tasks = [asyncio.create_task(worker(code)) for code in onet_codes]
    await asyncio.gather(*tasks)

    await close_pg_pool()
    logger.info("All done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich KSAs from O*NET v2 Database Services")
    parser.add_argument(
        "--code",
        type=str,
        help='Chỉ enrich 1 onet_code (vd: "11-1011.00"). Nếu bỏ trống sẽ chạy all.',
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=10,
        help="Số occupation xử lý song song (mặc định 10, nên giữ trong 5–20).",
    )
    args = parser.parse_args()

    asyncio.run(enrich_ksas(only_code=args.code, max_concurrent=args.max_concurrent))
