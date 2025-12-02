from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import psycopg

# ========= SQL =========

# 1) User embeddings (ưu tiên nếu user có ở cả 2 nơi)
SQL_USER_UE = """
SELECT ue.user_id::text, ue.emb, COALESCE(ue.source, 'essay') AS source
FROM ai.user_embeddings ue;
"""

# 2) Quick text embeddings (fallback)
SQL_USER_QTE = """
SELECT qe.user_id::text, qe.emb, COALESCE(qe.source, 'essay') AS source
FROM ai.quick_text_embeddings qe;
"""

# Hàng A (career_id làm key item) — chỉ dùng cột có thật: title_vi, title_en
SQL_ITEM_BY_CAREER_ID = """
SELECT
  c.id::text        AS item_id,
  c.onet_code::text AS onet_code,
  ce.emb,
  COALESCE(c.title_vi, c.title_en) AS title
FROM core.careers c
JOIN ai.career_embeddings ce ON ce.career_id = c.id;
"""

# Hàng B (onet_code làm key item) — chỉ dùng cột có thật: title_vi, title_en
SQL_ITEM_BY_ONET = """
SELECT
  c.onet_code::text AS item_id,
  c.onet_code::text AS onet_code,
  ce.emb,
  COALESCE(c.title_vi, c.title_en) AS title
FROM core.careers c
JOIN ai.career_embeddings ce ON ce.career_id = c.id;
"""

# RIASEC cho item (map onet_code -> 6 chiều)
SQL_JOB_RIASEC = """
SELECT onet_code::text, r, i, a, s, e, c
FROM core.career_interests;
"""

# Điểm test người dùng
SQL_USER_SCORES = """
SELECT user_id::text, a_type, scores
FROM core.assessments
WHERE a_type IN ('RIASEC', 'BigFive');
"""

# ========= Utils =========

def table_exists(conn, schema: str, table: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT to_regclass(%s) IS NOT NULL",
            (f"{schema}.{table}",),
        )
        return cur.fetchone()[0]

def vec_to_list(v):
    """Parse pgvector -> list[float]. Hỗ trợ list/tuple/ndarray/bytes/str."""
    if v is None:
        return []
    if isinstance(v, (list, tuple, np.ndarray)):
        return [float(x) for x in v]
    if isinstance(v, (bytes, bytearray)):
        v = v.decode("utf-8", errors="ignore")
    s = str(v).strip().strip("[](){}")
    if not s:
        return []
    parts = [p.strip() for p in s.replace("\n", "").split(",") if p.strip()]
    return [float(p) for p in parts]

def to_float_list_from_scores(scores_val: Any, expected_len: int) -> list[float]:
    """
    Chấp nhận list/tuple, dict (RIASEC:R,I,A,S,E,C; BigFive:O,C,E,A,N) hoặc JSON text.
    Normalize về [0,1]: nếu có giá trị >1 coi như 0..100 và chia 100; sau đó clip 0..1.
    """
    def _normalize(lst: list[float]) -> list[float]:
        if any(abs(x) > 1.0 for x in lst):
            lst = [x / 100.0 for x in lst]
        return [float(min(1.0, max(0.0, x))) for x in lst]

    if scores_val is None:
        return [0.0] * expected_len

    if isinstance(scores_val, (bytes, bytearray)):
        scores_val = scores_val.decode("utf-8", errors="ignore")

    if isinstance(scores_val, str):
        try:
            scores_val = json.loads(scores_val)
        except Exception:
            return [0.0] * expected_len

    if isinstance(scores_val, (list, tuple)):
        lst = [float(x) for x in scores_val]
        if len(lst) < expected_len:
            lst += [0.0] * (expected_len - len(lst))
        elif len(lst) > expected_len:
            lst = lst[:expected_len]
        return _normalize(lst)

    if isinstance(scores_val, dict):
        order = ["R", "I", "A", "S", "E", "C"] if expected_len == 6 else ["O", "C", "E", "A", "N"]
        lst = []
        for k in order:
            try:
                lst.append(float(scores_val.get(k, 0.0)))
            except Exception:
                lst.append(0.0)
        return _normalize(lst)

    return [0.0] * expected_len

# ========= Main =========

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--db",
        default="postgresql://postgres:postgres@localhost:5433/career_ai?sslmode=prefer&connect_timeout=10",
    )
    ap.add_argument("--user_out", default="data/processed/user_feats.json")
    ap.add_argument("--item_out", default="data/processed/item_feats.json")
    ap.add_argument(
        "--item_id_mode",
        choices=["career_id", "onet_code"],
        default="career_id",
        help="Chọn key item: career_id (số) hoặc onet_code (chuỗi).",
    )
    ap.add_argument(
        "--use_assessments",
        action="store_true",
        help="Đọc core.assessments để đổ riasec/big5 thật vào user_feats.",
    )
    args = ap.parse_args()

    with psycopg.connect(args.db) as conn:
        conn.autocommit = True

        # 1) user_feats
        user_feats: dict[str, dict[str, Any]] = {}

        # 1.1) quick_text_embeddings (base)
        with conn.cursor() as cur:
            try:
                cur.execute(SQL_USER_QTE)
                for uid, emb, source in cur.fetchall():
                    user_feats[uid] = {
                        "text": np.array(vec_to_list(emb), dtype=np.float32).tolist(),
                        "riasec": [0, 0, 0, 0, 0, 0],
                        "big5": [0, 0, 0, 0, 0],
                        "source": source or "essay",
                    }
            except Exception:
                pass  # bảng có thể chưa tồn tại

        # 1.2) user_embeddings (override)
        with conn.cursor() as cur:
            cur.execute(SQL_USER_UE)
            for uid, emb, source in cur.fetchall():
                user_feats[uid] = {
                    "text": np.array(vec_to_list(emb), dtype=np.float32).tolist(),
                    "riasec": user_feats.get(uid, {}).get("riasec", [0, 0, 0, 0, 0, 0]),
                    "big5": user_feats.get(uid, {}).get("big5", [0, 0, 0, 0, 0]),
                    "source": source or "essay",
                }

        # 2) điểm test (optional)
        if args.use_assessments:
            with conn.cursor() as cur:
                cur.execute(SQL_USER_SCORES)
                rows = cur.fetchall()
            for uid, a_type, scores in rows:
                if uid not in user_feats:
                    user_feats[uid] = {
                        "text": [],
                        "riasec": [0, 0, 0, 0, 0, 0],
                        "big5": [0, 0, 0, 0, 0],
                        "source": "profile",
                    }
                if a_type == "RIASEC":
                    user_feats[uid]["riasec"] = to_float_list_from_scores(scores, 6)
                elif a_type == "BigFive":
                    user_feats[uid]["big5"] = to_float_list_from_scores(scores, 5)

        # 3) item_feats (text + riasec + title)
        onet_to_riasec: dict[str, list[float]] = {}
        with conn.cursor() as cur:
            cur.execute(SQL_JOB_RIASEC)
            for onet, r, i, a, s, e, c in cur.fetchall():
                onet_to_riasec[onet] = [float(r), float(i), float(a), float(s), float(e), float(c)]

        sql_item = SQL_ITEM_BY_CAREER_ID if args.item_id_mode == "career_id" else SQL_ITEM_BY_ONET

        item_feats: dict[str, dict[str, Any]] = {}
        with conn.cursor() as cur:
            cur.execute(sql_item)
            for item_id, onet, emb, title in cur.fetchall():
                item_feats[str(item_id)] = {
                    "text":   np.array(vec_to_list(emb), dtype=np.float32).tolist(),
                    "riasec": onet_to_riasec.get(onet, [0, 0, 0, 0, 0, 0]),
                    "title":  title or "",
                }

    # 4) Ghi file
    Path(args.user_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.user_out).write_text(
        json.dumps(user_feats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path(args.item_out).write_text(
        json.dumps(item_feats, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"[OK] Write → {args.user_out}, {args.item_out}")
    print(f"[INFO] item_id_mode = {args.item_id_mode}, use_assessments={args.use_assessments}")
    print(f"[INFO] users={len(user_feats)}, items={len(item_feats)}")


if __name__ == "__main__":
    main()
