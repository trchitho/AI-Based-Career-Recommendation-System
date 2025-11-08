import argparse
import csv
import math
import random
from datetime import UTC, datetime
from pathlib import Path

import psycopg

random.seed(42)

SQL_USERS = "SELECT user_id::text, emb FROM ai.user_embeddings;"
SQL_ITEMS = """
SELECT c.onet_code::text AS job_id, ce.emb
FROM core.careers c
JOIN ai.career_embeddings ce ON ce.career_id = c.id;
"""


def vec(v):
    # Hỗ trợ nhiều dạng: list/tuple/ndarray/bytes/str từ pgvector
    import numpy as np

    if v is None:
        return []
    if isinstance(v, (list, tuple, np.ndarray)):
        return [float(x) for x in v]
    if isinstance(v, (bytes, bytearray)):
        v = v.decode("utf-8", errors="ignore")
    s = str(v).strip().strip("()[]{}")  # bóc dấu [](){} nếu stringify
    if not s:
        return []
    parts = [p.strip() for p in s.replace("\n", "").split(",") if p.strip() != ""]
    return [float(p) for p in parts]


def cosine(a, b):
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return sum(x * y for x, y in zip(a, b, strict=False)) / (na * nb)


def main():
    ap = argparse.ArgumentParser(description="Bootstrap interactions (job_id = onet_code)")
    ap.add_argument("--db", required=True, help="Postgres URL")
    ap.add_argument("--topn", type=int, default=5, help="positives per user")
    ap.add_argument("--neg_per_pos", type=int, default=4, help="negatives per positive")
    ap.add_argument("--out", default="ai-core/data/processed/interactions.csv")
    args = ap.parse_args()

    # 1) Load users & items
    with psycopg.connect(args.db) as conn, conn.cursor() as cur:
        cur.execute(SQL_USERS)
        users = []
        for uid, emb in cur.fetchall():
            try:
                users.append((uid, vec(emb)))
            except Exception:
                continue

        cur.execute(SQL_ITEMS)
        items = []
        for job_id, emb in cur.fetchall():
            try:
                items.append((job_id, vec(emb)))
            except Exception:
                continue

    now = datetime.now(UTC).isoformat()
    header = ("user_id", "job_id", "label", "ts")
    data_rows = []

    # 2) Build positives (Top-N cosine) + negatives (random từ phần còn lại)
    for uid, uemb in users:
        scored = [(iid, cosine(uemb, iemb)) for iid, iemb in items]
        scored.sort(key=lambda x: x[1], reverse=True)
        pos_ids = [iid for iid, _ in scored[: args.topn]]

        # positives
        for iid in pos_ids:
            data_rows.append((uid, iid, 1, now))

        # negatives (không trùng positives)
        neg_pool = [iid for iid, _ in scored[args.topn :]]
        random.shuffle(neg_pool)
        neg_need = args.topn * args.neg_per_pos
        for iid in neg_pool[:neg_need]:
            data_rows.append((uid, iid, 0, now))

    # 3) Sắp xếp ổn định: positives trước, negatives sau; mỗi nhóm tăng dần theo (user_id, job_id)
    positives = [r for r in data_rows if r[2] == 1]
    negatives = [r for r in data_rows if r[2] == 0]
    positives.sort(key=lambda x: (x[0], x[1]))  # (user_id asc, job_id asc)
    negatives.sort(key=lambda x: (x[0], x[1]))

    rows = [header] + positives + negatives

    # 4) Ghi file CSV
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerows(rows)

    print(f"[OK] interactions → {out_path} (users={len(users)}, items={len(items)})")


if __name__ == "__main__":
    main()
