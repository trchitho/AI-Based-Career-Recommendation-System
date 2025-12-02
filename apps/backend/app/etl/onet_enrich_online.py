# apps/backend/app/etl/onet_enrich_online.py
from __future__ import annotations

import argparse
import os
from typing import Iterable, Tuple

import psycopg
from psycopg import Connection
from psycopg.rows import tuple_row

from app.services.onet_client_v2 import OnetV2Client
from app.etl.online_parsers import (
    parse_work_activities_online,
    parse_dwas_online,
    parse_work_context_online,
    parse_education_pct_online,
)

# Lấy DATABASE_URL từ .env giống onet_loader.py
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("Missing DATABASE_URL env")


# ---------- SQL UPSERT khớp DDL bạn gửi ----------

UPSERT_WORK_ACTS = """
INSERT INTO core.career_work_activities (onet_code, activity)
VALUES (%s, %s)
ON CONFLICT (onet_code, activity) DO NOTHING;
"""

UPSERT_DWAS = """
INSERT INTO core.career_dwas (onet_code, dwa)
VALUES (%s, %s)
ON CONFLICT (onet_code, dwa) DO NOTHING;
"""

UPSERT_WORK_CTX = """
INSERT INTO core.career_work_context (onet_code, context)
VALUES (%s, %s)
ON CONFLICT (onet_code, context) DO NOTHING;
"""

UPSERT_EDU_PCT = """
INSERT INTO core.career_education_pct (onet_code, label, pct)
VALUES (%s, %s, %s)
ON CONFLICT (onet_code, label)
DO UPDATE SET
    pct        = EXCLUDED.pct,
    fetched_at = now();
"""


# ---------- Helpers ----------

def iter_onet_codes(conn: Connection) -> Iterable[str]:
    with conn.cursor(row_factory=tuple_row) as cur:
        cur.execute(
            "SELECT DISTINCT onet_code FROM core.careers WHERE onet_code IS NOT NULL ORDER BY onet_code"
        )
        for (code,) in cur.fetchall():
            yield code


def enrich_one_code(conn: Connection, client: OnetV2Client, code: str) -> None:
    """
    Gọi O*NET Web Services 2.0 cho 1 occupation, fill 4 bảng:
      - career_work_activities
      - career_dwas
      - career_work_context
      - career_education_pct
    """
    # 1) Gọi API v2
    work_acts_obj = client.get_occupation_section(code, "work_activities")
    dwas_obj = client.get_occupation_section(code, "dwa")
    work_ctx_obj = client.get_occupation_section(code, "work_context")
    edu_obj = client.get_occupation_section(code, "education")

    # 2) Parse sang list
    work_acts = parse_work_activities_online(work_acts_obj)
    dwas_list = parse_dwas_online(dwas_obj)
    work_ctx = parse_work_context_online(work_ctx_obj)
    edu_pct = parse_education_pct_online(edu_obj)  # List[Tuple[label, pct]]

    # 3) Ghi vào DB
    with conn.cursor() as cur:
        for act in work_acts:
            cur.execute(UPSERT_WORK_ACTS, (code, act))

        for dwa in dwas_list:
            cur.execute(UPSERT_DWAS, (code, dwa))

        for ctx in work_ctx:
            cur.execute(UPSERT_WORK_CTX, (code, ctx))

        for label, pct in edu_pct:
            cur.execute(UPSERT_EDU_PCT, (code, label, pct))

    conn.commit()


def run_enrich_online(single_code: str | None = None) -> None:
    client = OnetV2Client()

    with psycopg.connect(DB_URL) as conn:
        if single_code:
            codes = [single_code]
        else:
            codes = iter_onet_codes(conn)

        ok = err = 0
        for code in codes:
            code = code.strip()
            if not code:
                continue
            try:
                print(f"[ONLINE] Enrich {code} ...", flush=True)
                enrich_one_code(conn, client, code)
                ok += 1
            except Exception as ex:
                err += 1
                print(f"[ERR] {code}: {ex}", flush=True)

        print(f"[SUMMARY] ok={ok}, err={err}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Enrich 4 Online tables from O*NET Web Services v2.0"
    )
    parser.add_argument(
        "--code",
        type=str,
        help="Chỉ enrich 1 onet_code (vd: 11-1011.00). Nếu bỏ trống sẽ chạy all.",
    )
    args = parser.parse_args()

    run_enrich_online(single_code=args.code)