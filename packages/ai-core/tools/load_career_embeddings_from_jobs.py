# E:\OneDrive\Desktop\ai-core\tools\load_career_embeddings_from_jobs.py
import argparse
import os
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg

"""
Nạp embedding cho careers (job_id = onet_code) vào ai.career_embeddings
- Đọc jobs.csv: job_id,title,description,skills,riasec_vector
- Encode text bằng SentenceTransformers (mặc định: local e5-base)
- Map job_id -> career_id (core.careers.onet_code)
- UPSERT: nếu tồn tại career_id -> update emb/model_name/built_at/job_id
"""


def mask_url_password(url: str) -> str:
    try:
        # postgresql://user:pass@host:port/db...
        if "://" in url and "@" in url and ":" in url.split("://", 1)[1]:
            head, tail = url.split("://", 1)
            creds, rest = tail.split("@", 1)
            if ":" in creds:
                user, _ = creds.split(":", 1)
                return f"{head}://{user}:***@{rest}"
    except Exception:
        pass
    return url


def resolve_db_url(cli_db: str | None) -> str:
    # Ưu tiên: --db > env:DATABASE_URL > PG* biến rời
    if cli_db and cli_db.strip():
        return cli_db.strip()
    env_url = os.getenv("DATABASE_URL", "").strip()
    if env_url:
        return env_url
    PGHOST = os.getenv("PGHOST", "localhost")
    PGPORT = os.getenv("PGPORT", "5433")
    PGDATABASE = os.getenv("PGDATABASE", "career_ai")
    PGUSER = os.getenv("PGUSER", "postgres")
    PGPASSWORD = os.getenv("PGPASSWORD", "postgres")
    return f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}?sslmode=prefer&connect_timeout=10"


def load_model(model_name: str):
    from sentence_transformers import SentenceTransformer

    p = Path(model_name)
    if p.exists() and p.is_dir():
        # sanity check file trọng số
        if not ((p / "model.safetensors").exists() or (p / "pytorch_model.bin").exists()):
            raise RuntimeError(f"[ERR] Local model folder missing weights: {p}")
    return SentenceTransformer(model_name)


def ensure_vector_literal(vec):
    # pgvector chấp nhận dạng '[v1,v2,...]'
    return "[" + ",".join(f"{float(x):.8f}" for x in vec) + "]"


UPSERT_SQL = """
INSERT INTO ai.career_embeddings (career_id, job_id, emb, model_name, built_at)
VALUES (%s, %s, %s::vector, %s, NOW())
ON CONFLICT (career_id) DO UPDATE
SET emb = EXCLUDED.emb,
    model_name = EXCLUDED.model_name,
    built_at = EXCLUDED.built_at,
    job_id = EXCLUDED.job_id;
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", help="Postgres URL (ưu tiên hơn env)")
    ap.add_argument("--csv", default=r"E:\OneDrive\Desktop\ai-core\data\catalog\jobs.csv")
    ap.add_argument(
        "--model",
        default=r"E:\OneDrive\Desktop\ai-core\models\vi_sbert",
        help="HF repo id hoặc local path",
    )
    ap.add_argument("--batch_size", type=int, default=64)
    ap.add_argument(
        "--text_mode", choices=["desc", "title+desc", "title+desc+skills"], default="title+desc"
    )
    args = ap.parse_args()

    DB_URL = resolve_db_url(args.db)
    print(f"[INFO] Connecting to {mask_url_password(DB_URL)}")

    # 1) Kết nối DB sớm để fail-fast & báo lỗi rõ
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                ok = cur.fetchone()
        if ok != (1,):
            raise RuntimeError("[ERR] Sanity SELECT 1 thất bại.")
    except Exception:
        print("[ERR] Không kết nối được PostgreSQL.")
        print("      - Kiểm tra lại user/password/host/port/db")
        print("      - echo $env:DATABASE_URL trong PowerShell đang là gì?")
        print("      - Với password có ký tự đặc biệt (@,:,/), hãy URL-encode.")
        raise

    # 2) Đọc CSV
    df = pd.read_csv(args.csv)
    needed = {"job_id", "title", "description", "skills"}
    missing = needed - set(df.columns)
    if missing:
        raise ValueError(f"Thiếu cột trong CSV: {missing}")

    # 3) Ghép text để embed
    if args.text_mode == "desc":
        texts = df["description"].fillna("").astype(str).tolist()
    elif args.text_mode == "title+desc":
        texts = (df["title"].fillna("") + " . " + df["description"].fillna("")).astype(str).tolist()
    else:
        texts = (
            (
                df["title"].fillna("")
                + " . "
                + df["description"].fillna("")
                + " . "
                + df["skills"].fillna("")
            )
            .astype(str)
            .tolist()
        )

    # 4) Load model
    model = load_model(args.model)

    # 5) Encode
    emb_list = []
    for i in range(0, len(texts), args.batch_size):
        batch = texts[i : i + args.batch_size]
        embs = model.encode(
            batch,
            batch_size=args.batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        emb_list.append(embs)
    if emb_list:
        embs_all = np.vstack(emb_list)
    else:
        embs_all = np.zeros((0, 768), dtype=np.float32)  # e5-base = 768d

    job_ids = df["job_id"].astype(str).tolist()

    # 6) Map job_id -> career_id
    MAP_SQL = "SELECT id, onet_code FROM core.careers WHERE onet_code = ANY(%s);"
    with psycopg.connect(DB_URL) as conn:
        conn.execute("SET statement_timeout = '600s';")
        with conn.cursor() as cur:
            cur.execute(MAP_SQL, (job_ids,))
            rows = cur.fetchall()
    onet_to_cid = {onet: cid for cid, onet in rows}

    # 7) Upsert
    inserted, skipped = 0, 0
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            for j, vec in zip(job_ids, embs_all, strict=False):
                cid = onet_to_cid.get(j)
                if not cid:
                    skipped += 1
                    continue
                vlit = ensure_vector_literal(vec)
                cur.execute(UPSERT_SQL, (cid, j, vlit, str(Path(args.model))))
                inserted += 1
        conn.commit()

    print(
        f"[OK] career_embeddings upserted={inserted}, skipped(no career_id)={skipped}, model={args.model}"
    )


if __name__ == "__main__":
    main()
