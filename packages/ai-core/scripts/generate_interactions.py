"""
Generate synthetic user-career interactions for NeuMF training.

Logic:
- For each user: compute RIASEC alignment with all 959 careers
- Top-K careers (high RIASEC similarity) → label=1 (positive)
- Random low-similarity careers → label=0 (negative)

Output: data/processed/interactions.csv with columns user_id, job_id, label
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
from pathlib import Path

import numpy as np
import psycopg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/processed/interactions.csv")
    ap.add_argument("--positives_per_user", type=int, default=20)
    ap.add_argument("--negatives_per_user", type=int, default=30)
    ap.add_argument(
        "--db",
        default=os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8",
        ),
    )
    args = ap.parse_args()

    rng = np.random.default_rng(42)

    with psycopg.connect(args.db) as conn:
        # 1) Load all user RIASEC fused scores
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id::text, riasec_scores_fused
                FROM ai.user_trait_fused
                WHERE riasec_scores_fused IS NOT NULL
                """
            )
            user_rows = cur.fetchall()

        if not user_rows:
            logger.error("No users in ai.user_trait_fused")
            return

        users: dict[str, np.ndarray] = {}
        for uid, riasec in user_rows:
            arr = np.array(list(riasec), dtype=np.float64)
            if arr.shape[0] == 6:
                users[uid] = arr

        logger.info("Loaded %d users with RIASEC", len(users))

        # 2) Load career RIASEC for all jobs
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT onet_code, r, i, a, s, e, c
                FROM core.career_interests
                WHERE r IS NOT NULL
                """
            )
            career_rows = cur.fetchall()

        careers: dict[str, np.ndarray] = {}
        for onet, r, i, a, s, e, c in career_rows:
            careers[onet] = np.array(
                [float(r or 0), float(i or 0), float(a or 0), float(s or 0), float(e or 0), float(c or 0)],
                dtype=np.float64,
            )

        logger.info("Loaded %d careers with RIASEC", len(careers))

    # 3) Generate interactions
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    career_ids = list(careers.keys())
    total_pos = 0
    total_neg = 0

    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "job_id", "label"])

        for user_idx, (uid, user_vec) in enumerate(users.items()):
            # Compute similarity with all careers
            sims = [(cid, cosine_sim(user_vec, cvec)) for cid, cvec in careers.items()]
            sims.sort(key=lambda x: x[1], reverse=True)

            # Top-K → positives
            for cid, sim in sims[: args.positives_per_user]:
                writer.writerow([uid, cid, 1])
                total_pos += 1

            # Random selection from bottom 50% → negatives
            bottom_half = [s for s in sims[len(sims) // 2 :]]
            neg_indices = rng.choice(len(bottom_half), size=min(args.negatives_per_user, len(bottom_half)), replace=False)
            for ni in neg_indices:
                cid = bottom_half[ni][0]
                writer.writerow([uid, cid, 0])
                total_neg += 1

            if (user_idx + 1) % 100 == 0:
                logger.info("Processed %d users (pos=%d, neg=%d)", user_idx + 1, total_pos, total_neg)

    logger.info("Done. Wrote %d positives + %d negatives to %s", total_pos, total_neg, out_path)


if __name__ == "__main__":
    main()
