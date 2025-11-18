"""
Load English SBERT embeddings from catalog CSV into Postgres (pgvector).
Example:
python -m ai_core.retrieval.pgvector_load_en ^
  --db postgresql://postgres:123456@localhost:5433/career_ai ^
  --csv packages/ai-core/data/catalog/jobs.csv ^
  --table ai.retrieval_jobs_ensbert ^
  --model_dir packages/ai-core/models/en_sbert_768 ^
  --dim 768 --lang en --normalize
"""

import argparse
import json
import psycopg
import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import torch


def normalize(vecs: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-12
    return vecs / norm


def main():
    ap = argparse.ArgumentParser("Load English SBERT embeddings/meta into Postgres (pgvector)")
    ap.add_argument("--db", required=True, help="Postgres connection string")
    ap.add_argument("--csv", required=True, help="CSV file (.csv)")
    ap.add_argument("--table", default="ai.retrieval_jobs_ensbert")
    ap.add_argument("--model_dir", required=True, help="Directory of SBERT model")
    ap.add_argument("--dim", type=int, default=768)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--normalize", action="store_true")
    ap.add_argument("--truncate", action="store_true")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(csv_path)

    print(f"[INFO] Loading CSV → {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"[INFO] rows={len(df)} | columns={list(df.columns)}")

    # text to embed
    texts = []
    for _, r in df.iterrows():
        desc = str(r.get("description", "") or "")
        title = str(r.get("title", "") or "")
        tags = str(r.get("tags_en", "") or "")
        combined = " ".join([title, desc, tags]).strip()
        texts.append(combined if combined else title)

    print(f"[INFO] Encoding with model: {args.model_dir}")
    model = SentenceTransformer(args.model_dir)
    with torch.no_grad():
        emb = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)

    if args.normalize:
        emb = normalize(emb)

    print(f"[INFO] Embeddings shape: {emb.shape}")

    conn = psycopg.connect(args.db)
    with conn:
        with conn.cursor() as cur:
            if args.truncate:
                print(f"[WARN] Truncating table {args.table} ...")
                cur.execute(f"TRUNCATE TABLE {args.table} RESTART IDENTITY;")

            insert_sql = f"""
            INSERT INTO {args.table}
              (job_id, title, description, tags_en, riasec_centroid, embedding)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (job_id) DO UPDATE
              SET title=EXCLUDED.title,
                  description=EXCLUDED.description,
                  tags_en=EXCLUDED.tags_en,
                  riasec_centroid=EXCLUDED.riasec_centroid,
                  embedding=EXCLUDED.embedding;
            """

            for i, r in tqdm(df.iterrows(), total=len(df), ncols=90):
                job_id = str(r.get("job_id"))
                title = str(r.get("title", ""))
                desc = str(r.get("description", ""))
                tags = str(r.get("tags_en", ""))
                riasec_str = str(r.get("riasec_vector", "") or "").strip()
                try:
                    riasec_vec = json.loads(riasec_str) if riasec_str else None
                except Exception:
                    riasec_vec = None

                cur.execute(
                    insert_sql,
                    (job_id, title, desc, tags, riasec_vec, emb[i].tolist()),
                )

    conn.close()
    print(f"[OK] Loaded {len(df)} records into {args.table}")


if __name__ == "__main__":
    main()
