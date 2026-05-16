"""
Re-encode all user essays with vi-SBERT (matching career embeddings).

Why: career_embeddings uses vi-SBERT (768d). user_embeddings was using
PhoBERT (also 768d) but DIFFERENT vector space → cosine ~0.05 (random).

After re-encoding with vi-SBERT, user-career cosine should be 0.4-0.7
for matching personas, providing real semantic signal.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import numpy as np
import psycopg
import torch

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)


def get_visbert_model():
    """Load vi-SBERT model from models/vi_sbert_768."""
    from sentence_transformers import SentenceTransformer
    model_dir = _REPO_ROOT / "models" / "vi_sbert_768"
    logger.info("Loading vi-SBERT from %s", model_dir)
    model = SentenceTransformer(str(model_dir))
    logger.info("vi-SBERT loaded (output_dim=%d)", model.get_sentence_embedding_dimension())
    return model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--db", default=os.getenv("DATABASE_URL",
                    "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"))
    args = ap.parse_args()

    model = get_visbert_model()

    with psycopg.connect(args.db) as conn:
        # Get all users with essays (synthetic + real)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (e.user_id) e.user_id, e.content
                FROM core.essays e
                WHERE e.content IS NOT NULL AND length(e.content) >= 30
                ORDER BY e.user_id, e.created_at DESC
            """)
            rows = cur.fetchall()

        logger.info("Found %d users with essays", len(rows))

        # Batch encode
        total = len(rows)
        for i in range(0, total, args.batch):
            batch = rows[i:i + args.batch]
            user_ids = [r[0] for r in batch]
            texts = [r[1][:512] for r in batch]  # truncate

            with torch.no_grad():
                embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

            with conn.cursor() as cur:
                for uid, emb in zip(user_ids, embs):
                    emb_list = emb.tolist()
                    emb_str = "[" + ",".join(f"{x:.8f}" for x in emb_list) + "]"
                    cur.execute("""
                        INSERT INTO ai.user_embeddings (user_id, emb, source, model_name)
                        VALUES (%s, %s::vector(768), 'essay', 'vi-sbert')
                        ON CONFLICT (user_id) DO UPDATE
                            SET emb = EXCLUDED.emb,
                                model_name = EXCLUDED.model_name,
                                built_at = now()
                    """, (uid, emb_str))
                conn.commit()

            logger.info("Encoded %d/%d users", min(i + args.batch, total), total)

    logger.info("DONE. Re-encoded %d users with vi-SBERT", total)


if __name__ == "__main__":
    main()
