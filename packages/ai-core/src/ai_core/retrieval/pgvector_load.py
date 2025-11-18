# src/retrieval/pgvector_load.py
import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()


def infer_tokens_from_tags(tags: str) -> list[str]:
    """
    Sinh tokens tá»« chuá»—i tags_vi dáº¡ng 'abc|def ghi|x-y'
    - háº¡ chá»¯, bá» dáº¥u, thay khoáº£ng tráº¯ng = _
    - lá»c kÃ­ tá»± cÃ²n láº¡i [a-z0-9_]
    """
    tokens = []
    if not tags:
        return tokens
    for t in [x.strip() for x in tags.split("|") if x.strip()]:
        # NFC -> NFKD -> remove diacritics
        t_norm = unicodedata.normalize("NFKD", t)
        t_ascii = "".join(ch for ch in t_norm if not unicodedata.combining(ch))
        t_ascii = t_ascii.lower()
        t_ascii = t_ascii.replace(" ", "_")
        t_ascii = re.sub(r"[^a-z0-9_]+", "", t_ascii)
        if t_ascii:
            tokens.append(t_ascii)
    return tokens


def l2_normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (mat / norms).astype("float32")


def get_db_url(cli_db_url: str | None) -> str:
    db_url = cli_db_url or os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERR] DATABASE_URL is not set. Put it in .env or pass --db_url", file=sys.stderr)
        sys.exit(2)
    return db_url


def main():
    ap = argparse.ArgumentParser("Load vi-SBERT embeddings/meta into Postgres (pgvector)")
    # --db_url giá» lÃ  tÃ¹y chá»n
    ap.add_argument("--db_url", default=None, help="Override DATABASE_URL (optional)")
    ap.add_argument("--table", default="retrieval_jobs_visbert")
    ap.add_argument("--idx_json", required=True, help="data/embeddings/jobs_index_visbert.json")
    ap.add_argument("--emb_npy", required=True, help="data/embeddings/jobs_embeddings_visbert.npy")
    ap.add_argument(
        "--normalize", action="store_true", help="L2-normalize trÆ°á»›c khi insert (cosine)"
    )
    ap.add_argument("--truncate", action="store_true", help="TRUNCATE table trÆ°á»›c khi náº¡p")
    args = ap.parse_args()

    db_url = get_db_url(args.db_url)

    metas = json.loads(Path(args.idx_json).read_text(encoding="utf-8"))
    X = np.load(args.emb_npy).astype("float32")
    if args.normalize:
        X = l2_normalize(X)

    if len(metas) != X.shape[0]:
        raise SystemExit(f"[ERR] meta ({len(metas)}) != embeddings ({X.shape[0]})")

    rows = []
    for m, v in zip(metas, X, strict=False):
        title = m.get("title")
        tags_vi = (
            m.get("tags_vi") or m.get("skills") or ""
        )  # fallback tá»« 'skills' náº¿u thiáº¿u tags_vi
        tag_tokens = m.get("tag_tokens")  # cÃ³ thá»ƒ lÃ  list hoáº·c None

        if (not tag_tokens) and tags_vi:
            tag_tokens = infer_tokens_from_tags(tags_vi)

        rows.append(
            (
                m.get("job_id"),
                title,
                tags_vi,
                tag_tokens or [],  # luÃ´n lÃ  list
                m.get("riasec_centroid") or None,
                list(map(float, v.tolist())),
            )
        )

    with psycopg2.connect(db_url) as conn, conn.cursor() as cur:
        if args.truncate:
            cur.execute(f"TRUNCATE TABLE {args.table};")

        sql = f"""
        INSERT INTO {args.table}
        (job_id, title, tags_vi, tag_tokens, riasec_centroid, embedding)
        VALUES %s
        """
        execute_values(cur, sql, rows, page_size=500)
        conn.commit()

    print(f"[OK] Loaded {len(rows)} rows into {args.table}")


if __name__ == "__main__":
    main()
