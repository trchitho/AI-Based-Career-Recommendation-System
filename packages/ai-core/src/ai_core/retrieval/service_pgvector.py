# src/ai_core/retrieval/service_pgvector.py
from dataclasses import dataclass
from typing import List

import numpy as np
from psycopg_pool import ConnectionPool

from api.config import get_pg_dsn  # helper lấy DATABASE_URL


@dataclass
class Candidate:
    job_id: str       # O*NET code
    score_sim: float  # 0–1, similarity


# Khởi tạo pool 1 lần, dùng chung
pool = ConnectionPool(get_pg_dsn())


# ---------- helper parse / format pgvector ----------

def _pgvector_to_np(v) -> np.ndarray:
    """
    Chuyển giá trị pgvector (có thể trả về dạng list / tuple / str / bytes)
    thành np.ndarray(float32).
    """
    if v is None:
        raise ValueError("pgvector value is None")

    # Nếu driver trả về list/tuple/ndarray thì đơn giản
    if isinstance(v, (list, tuple, np.ndarray)):
        return np.asarray(v, dtype="float32")

    # Nếu trả về bytes -> decode
    if isinstance(v, (bytes, bytearray)):
        v = v.decode("utf-8", errors="ignore")

    # Fallback: string "[0.01,0.02,...]"
    s = str(v).strip().strip("[](){}")
    if not s:
        raise ValueError("Empty pgvector string")

    parts = [p.strip() for p in s.replace("\n", "").split(",") if p.strip()]
    vals = [float(p) for p in parts]
    return np.asarray(vals, dtype="float32")


def _np_to_pgvector_str(vec: np.ndarray) -> str:
    """
    Chuyển np.ndarray -> string chuẩn cho pgvector, ví dụ: "[0.1,0.2,...]".
    Psycopg sẽ gửi string này, còn server cast ::vector(768).
    """
    flat = vec.astype("float32").reshape(-1)
    return "[" + ",".join(f"{float(x):.6f}" for x in flat) + "]"


# ---------- core logic ----------

def _fetch_user_vector(user_id: int) -> np.ndarray:
    """
    Lấy embedding essay mới nhất của user từ ai.user_embeddings.
    Schema thật: emb vector(768)
    """
    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT emb
            FROM ai.user_embeddings
            WHERE user_id = %s
              AND source = 'essay'
            ORDER BY built_at DESC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(f"No essay embedding for user_id={user_id}")

        return _pgvector_to_np(row[0])


def search_candidates_for_embedding(user_vec: np.ndarray, top_n: int = 200) -> List[Candidate]:
    """
    Retrieval B3 theo VECTOR của bài test, không theo user_id.
    """
    vec_str = _np_to_pgvector_str(user_vec)

    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT job_id,
                   1 - (embedding <=> %s::vector(768)) AS score_sim
            FROM ai.retrieval_jobs_visbert
            ORDER BY embedding <-> %s::vector(768)
            LIMIT %s
            """,
            (vec_str, vec_str, top_n),
        )
        rows = cur.fetchall()

    return [Candidate(job_id=r[0], score_sim=float(r[1])) for r in rows]

def search_candidates_for_user(user_id: int, top_n: int = 200) -> List[Candidate]:
    """
    B3 – Retrieval bằng pgvector cho 1 user cụ thể.
    Dùng ai.user_embeddings → emb → search trên ai.retrieval_jobs_visbert.
    """
    user_vec = _fetch_user_vector(user_id)
    return search_candidates_for_embedding(user_vec, top_n=top_n)


def list_user_ids_with_embeddings(source: str = "essay") -> List[int]:
    """
    Trả về list user_id có embedding trong ai.user_embeddings, để test B3 cho ALL users.
    """
    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT user_id
            FROM ai.user_embeddings
            WHERE source = %s
            ORDER BY user_id
            """,
            (source,),
        )
        rows = cur.fetchall()
    return [int(r[0]) for r in rows]


if __name__ == "__main__":
    # Quick manual test:
    #   python -m ai_core.retrieval.service_pgvector --user-id 9 --top-n 5
    # hoặc:
    #   python -m ai_core.retrieval.service_pgvector --all-users --top-n 3
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, help="User ID để test retrieval")
    parser.add_argument("--all-users", action="store_true", help="Chạy retrieval cho tất cả user có embedding")
    parser.add_argument("--top-n", type=int, default=5)
    args = parser.parse_args()

    if args.all_users:
        uids = list_user_ids_with_embeddings()
        print(f"[TEST] Found {len(uids)} users with embeddings:", uids)
        for uid in uids:
            print(f"\n[TEST] user_id={uid}")
            try:
                cands = search_candidates_for_user(uid, top_n=args.top_n)
            except Exception as e:
                print("  Error:", e)
                continue
            for c in cands:
                print(f"  {c.job_id}  sim={c.score_sim:.4f}")
    else:
        uid = args.user_id or 1
        print(f"[TEST] search_candidates_for_user(user_id={uid}, top_n={args.top_n})")
        try:
            cands = search_candidates_for_user(uid, top_n=args.top_n)
        except Exception as e:
            print("Error:", e)
        else:
            for c in cands:
                print(f"{c.job_id}  sim={c.score_sim:.4f}")

                
