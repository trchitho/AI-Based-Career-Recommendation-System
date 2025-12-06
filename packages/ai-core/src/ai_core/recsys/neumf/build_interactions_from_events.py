# src/ai_core/recsys/neumf/build_interactions_from_events.py
from __future__ import annotations

import csv
import os
from collections import defaultdict
from datetime import datetime
from typing import Dict, Tuple, List

import psycopg2

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
OUT_CSV = os.getenv("INTERACTIONS_CSV", "data/processed/interactions.csv")


def load_events() -> List[Tuple[int, str, str]]:
    """
    Đọc analytics.career_events, trả về list (user_id, job_id, event_type).
    """
    sql = """
    SELECT user_id, job_id, event_type
    FROM analytics.career_events
    WHERE user_id IS NOT NULL AND job_id IS NOT NULL
    """
    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return [(int(u), str(j), str(e)) for (u, j, e) in rows]


def build_interactions(events: List[Tuple[int, str, str]], neg_ratio: int = 3):
    """
    Tạo pairs (user_id, job_id, label) với negative sampling.
    label=1 nếu có click/save/apply; label=0 nếu chỉ impression.
    """
    # 1) Gom theo user_job
    stats: Dict[Tuple[int, str], Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    jobs_by_user: Dict[int, set] = defaultdict(set)
    all_jobs = set()

    for user_id, job_id, etype in events:
        stats[(user_id, job_id)][etype] += 1
        jobs_by_user[user_id].add(job_id)
        all_jobs.add(job_id)

    positives = []
    negatives = []

    for (user_id, job_id), cnt in stats.items():
        pos = cnt.get("click", 0) + cnt.get("save", 0) + cnt.get("apply", 0)
        imp = cnt.get("impression", 0)
        if pos > 0:
            positives.append((user_id, job_id, 1))
        elif imp > 0:
            negatives.append((user_id, job_id, 0))

    # 2) Negative sampling thêm một chút random job chưa từng thấy cho user
    import random

    random.seed(42)
    for user_id in jobs_by_user.keys():
        seen = jobs_by_user[user_id]
        candidates = list(all_jobs - seen)
        random.shuffle(candidates)
        for job_id in candidates[: neg_ratio * len(seen)]:
            negatives.append((user_id, job_id, 0))

    return positives + negatives


def main():
    print(f"[B4] Load events from analytics.career_events ...")
    events = load_events()
    print(f"[B4] Total raw events: {len(events)}")

    pairs = build_interactions(events)
    print(f"[B4] Interactions (pos+neg): {len(pairs)}")

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "job_id", "implicit_rating", "timestamp"])
        for user_id, job_id, label in pairs:
            writer.writerow([
                user_id,
                job_id,                     # phải là onet_code chuẩn
                float(label),               # implicit rating as float
                datetime.utcnow().isoformat()
            ])

    print(f"[B4] Wrote {OUT_CSV}")


if __name__ == "__main__":
    main()
