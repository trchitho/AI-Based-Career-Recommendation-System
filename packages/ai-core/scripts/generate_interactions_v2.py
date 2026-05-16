"""
Generate INDEPENDENT user-career interactions for NeuMF training.

Key change vs v1:
- v1 used RIASEC cosine → NeuMF learned RIASEC → data leakage in scorer.
- v2 uses ESSAY EMBEDDING cosine (PhoBERT user vs vi-SBERT career) →
  NeuMF learns SEMANTIC patterns orthogonal to RIASEC → no leakage.

Pipeline:
1. Load all user PhoBERT embeddings (768-d) from ai.user_embeddings
2. Load all career embeddings (768-d) from ai.career_embeddings
3. For each user:
   - Compute cosine sim with all 959 careers
   - Top K (high embedding match) → label=1
   - Bottom L (low embedding match) → label=0
4. Save to data/processed/interactions_v2.csv

This way, NeuMF is forced to learn semantic patterns, not RIASEC.
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


def parse_pgvector(value) -> np.ndarray:
    """Parse pgvector text format → numpy array."""
    if value is None:
        return np.array([])
    if isinstance(value, (list, tuple, np.ndarray)):
        return np.array(value, dtype=np.float32)
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8", errors="ignore")
    s = str(value).strip().strip("[]")
    if not s:
        return np.array([])
    return np.array([float(x) for x in s.split(",")], dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/processed/interactions_v2.csv")
    ap.add_argument("--positives_per_user", type=int, default=15)
    ap.add_argument("--negatives_per_user", type=int, default=30)
    ap.add_argument(
        "--db",
        default=os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8",
        ),
    )
    args = ap.parse_args()

    rng = np.random.default_rng(2026)

    with psycopg.connect(args.db) as conn:
        # Load user embeddings
        with conn.cursor() as cur:
            cur.execute("SELECT user_id::text, emb FROM ai.user_embeddings")
            user_rows = cur.fetchall()

        users: dict[str, np.ndarray] = {}
        for uid, emb_raw in user_rows:
            arr = parse_pgvector(emb_raw)
            if arr.size == 768:
                # L2 normalize for cosine
                norm = np.linalg.norm(arr)
                if norm > 1e-9:
                    users[uid] = arr / norm

        logger.info("Loaded %d user embeddings (768d, normalized)", len(users))

        # Load career embeddings
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.onet_code, ce.emb
                FROM ai.career_embeddings ce
                JOIN core.careers c ON c.id = ce.career_id
                WHERE c.onet_code IS NOT NULL
                """
            )
            career_rows = cur.fetchall()

        careers: dict[str, np.ndarray] = {}
        for onet, emb_raw in career_rows:
            arr = parse_pgvector(emb_raw)
            if arr.size == 768:
                norm = np.linalg.norm(arr)
                if norm > 1e-9:
                    careers[onet] = arr / norm

        logger.info("Loaded %d career embeddings (768d, normalized)", len(careers))

    if not users or not careers:
        logger.error("No data to generate interactions")
        return

    # Stack career matrix for batch cosine computation
    career_ids = list(careers.keys())
    career_matrix = np.vstack([careers[cid] for cid in career_ids])  # (959, 768)
    logger.info("Career matrix shape: %s", career_matrix.shape)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    total_pos = 0
    total_neg = 0

    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "job_id", "label"])

        for user_idx, (uid, user_vec) in enumerate(users.items()):
            # Batch cosine similarity (user_vec @ career_matrix.T)
            sims = career_matrix @ user_vec  # (959,) cosine similarities

            # Sort indices: top → high sim, bottom → low sim
            sorted_idx = np.argsort(-sims)  # descending

            # Top K → positives
            for idx in sorted_idx[: args.positives_per_user]:
                writer.writerow([uid, career_ids[idx], 1])
                total_pos += 1

            # Bottom L (random sample from bottom 50%)
            bottom_pool = sorted_idx[len(sorted_idx) // 2:]
            neg_count = min(args.negatives_per_user, len(bottom_pool))
            neg_idx = rng.choice(len(bottom_pool), size=neg_count, replace=False)
            for ni in neg_idx:
                writer.writerow([uid, career_ids[bottom_pool[ni]], 0])
                total_neg += 1

            if (user_idx + 1) % 500 == 0:
                logger.info("Processed %d users (pos=%d, neg=%d)", user_idx + 1, total_pos, total_neg)

    logger.info("DONE. %d pos + %d neg → %s", total_pos, total_neg, out_path)


if __name__ == "__main__":
    main()
