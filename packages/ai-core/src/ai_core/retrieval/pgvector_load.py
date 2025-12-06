# src/ai_core/retrieval/pgvector_load.py
from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Any, List

import numpy as np
import pandas as pd
import psycopg
from psycopg import sql
from dotenv import load_dotenv

# ---------- DB CONFIG ----------
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL or DB_URL.strip() == "":
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5433")
    PGDATABASE = os.getenv("PGDATABASE", "postgres")
    PGUSER = os.getenv("PGUSER", "postgres")
    PGPASSWORD = os.getenv("PGPASSWORD", "postgres")
    DB_URL = f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}"


# ---------- Helpers ----------
def _strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def build_tag_tokens(tags_vi: str) -> List[str]:
    tokens: List[str] = []
    seen = set()

    if not tags_vi:
        return []

    for raw in tags_vi.split("|"):
        raw = (raw or "").strip()
        if not raw:
            continue

        base = _strip_accents(raw.lower())

        # token dạng slug: quan_ly, lang_nghe_tich_cuc,...
        slug = re.sub(r"[^a-z0-9\s]", " ", base)
        slug = re.sub(r"\s+", "_", slug).strip("_")
        if slug and slug not in seen:
            seen.add(slug)
            tokens.append(slug)

        # token từng từ đơn
        word_txt = re.sub(r"[^a-z0-9\s]", " ", base)
        for w in word_txt.split():
            if len(w) < 2:
                continue
            if w not in seen:
                seen.add(w)
                tokens.append(w)

    return tokens


def parse_riasec(val: Any):
    if val is None:
        return None
    if isinstance(val, (list, tuple)):
        try:
            return [float(x) for x in val]
        except Exception:
            return None
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        # thử JSON
        try:
            obj = json.loads(s)
            if isinstance(obj, (list, tuple)):
                return [float(x) for x in obj]
        except Exception:
            pass
        # fallback: "0.1,0.2,..."
        try:
            parts = [p for p in re.split(r"[,;]", s) if p.strip()]
            return [float(p) for p in parts]
        except Exception:
            return None
    return None


def l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        return vec
    return vec / norm


def insert_rows(conn, schema: str, table: str, rows, truncate: bool):
    fq_table = sql.Identifier(schema, table)
    with conn.cursor() as cur:
        if truncate:
            cur.execute(sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY").format(fq_table))
            print(f"[INFO] Truncated {schema}.{table}")

        q = sql.SQL(
            """
            INSERT INTO {} (job_id, title, tags_vi, tag_tokens, riasec_centroid, embedding)
            VALUES (%s,%s,%s,%s,%s,%s)
            """
        ).format(fq_table)

        for r in rows:
            cur.execute(
                q,
                (
                    r["job_id"],
                    r["title"],
                    r["tags_vi"],
                    r["tag_tokens"],
                    r["riasec_centroid"],
                    r["embedding"],
                ),
            )
    conn.commit()


# ---------- MAIN ----------
def main():
    ap = argparse.ArgumentParser(
        description="Load jobs_vi_tagged + ViSBERT embeddings vào ai.retrieval_jobs_visbert."
    )
    ap.add_argument(
        "--jobs_csv",
        type=Path,
        default=Path("data/catalog/jobs_vi_tagged.csv"),
        help="CSV: job_id,title_vi,description_vi,skills_vi,riasec_centroid_json,tags_vi",
    )
    ap.add_argument(
        "--emb_npy",
        type=Path,
        default=Path("data/embeddings/jobs_embeddings_visbert.npy"),
        help="Numpy .npy (N,768) embeddings",
    )
    ap.add_argument("--schema", type=str, default="ai")
    ap.add_argument("--table", type=str, default="retrieval_jobs_visbert")
    ap.add_argument("--normalize", action="store_true")
    ap.add_argument("--truncate", action="store_true")
    args = ap.parse_args()

    print(f"[INFO] Connecting to {DB_URL}")
    print(f"[INFO] jobs_csv = {args.jobs_csv}")
    print(f"[INFO] emb_npy  = {args.emb_npy}")

    if not args.jobs_csv.exists():
        raise FileNotFoundError(args.jobs_csv)
    if not args.emb_npy.exists():
        raise FileNotFoundError(args.emb_npy)

    df = pd.read_csv(args.jobs_csv, encoding="utf-8-sig", dtype=str, keep_default_na=False)
    emb = np.load(args.emb_npy)
    if emb.ndim != 2:
        raise ValueError(f"Expected (N,D) embeddings, got {emb.shape}")
    if len(df) != emb.shape[0]:
        raise ValueError(f"Row mismatch: CSV={len(df)} vs emb={emb.shape[0]}")

    print(f"[INFO] rows={len(df)} | emb_shape={emb.shape}")

    rows = []
    for (idx, row), vec in zip(df.iterrows(), emb, strict=False):
        job_id = (row.get("job_id") or "").strip()
        if not job_id:
            raise ValueError(f"Missing job_id at CSV row {idx}")

        title = (row.get("title_vi") or "").strip()
        tags_vi = (row.get("tags_vi") or "").strip()
        riasec = parse_riasec(row.get("riasec_centroid_json"))

        v = np.asarray(vec, dtype="float32")
        if args.normalize:
            v = l2_normalize(v)

        rows.append(
            {
                "job_id": job_id,
                "title": title,
                "tags_vi": tags_vi,
                "tag_tokens": build_tag_tokens(tags_vi),
                "riasec_centroid": riasec,
                "embedding": v.tolist(),
            }
        )

    with psycopg.connect(DB_URL) as conn:
        insert_rows(conn, args.schema, args.table, rows, truncate=args.truncate)

    print(f"[OK] Loaded {len(rows)} rows into {args.schema}.{args.table}")


if __name__ == "__main__":
    main()
