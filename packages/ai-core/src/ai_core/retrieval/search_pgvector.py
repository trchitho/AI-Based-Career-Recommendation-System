# src/retrieval/search_pgvector.py
import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import psycopg2
import torch
from dotenv import load_dotenv
from transformers import AutoModel, AutoTokenizer

load_dotenv()


# ---------- Embedding encode ----------
def mean_pool(last_hidden_state, attention_mask):
    m = attention_mask.unsqueeze(-1).type_as(last_hidden_state)
    return (last_hidden_state * m).sum(1) / m.sum(1).clamp(min=1e-9)


def encode_queries(
    texts: list[str],
    model_dir: str,
    max_length: int = 256,
    normalize: bool = True,
) -> np.ndarray:
    model_name = (Path(model_dir) / "tokenizer_name.txt").read_text().strip()
    tok = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    mdl = (
        AutoModel.from_pretrained(model_name)
        .eval()
        .to("cuda" if torch.cuda.is_available() else "cpu")
    )
    vecs = []
    with torch.no_grad():
        for t in texts:
            enc = tok(
                [t], padding=True, truncation=True, max_length=max_length, return_tensors="pt"
            ).to(mdl.device)
            out = mdl(**enc)
            v = mean_pool(out.last_hidden_state, enc["attention_mask"])
            if normalize:
                v = torch.nn.functional.normalize(v, p=2, dim=1)
            vecs.append(v.cpu().numpy().astype("float32"))
    return np.vstack(vecs)


# ---------- Query expansion (VI) ----------
def expand_query_vi(q: str) -> str:
    """ThÃªm Ã­t tá»« khÃ³a ká»¹ nÄƒng phá»• biáº¿n Ä‘á»ƒ tÄƒng recall nhÆ°ng khÃ´ng lÃ m lá»‡ch Ã½ gá»‘c."""
    q_low = q.lower()
    extra = []
    if "trá»±c quan hÃ³a" in q_low or "truc quan hoa" in q_low:
        extra += ["BI", "dashboard", "PowerBI", "Tableau"]
    if "khoa há»c dá»¯ liá»‡u" in q_low or "khoa hoc du lieu" in q_low:
        extra += ["data science", "ML", "machine learning"]
    if "cÆ¡ sá»Ÿ dá»¯ liá»‡u" in q_low or "co so du lieu" in q_low or "sql" in q_low:
        extra += ["database", "ETL"]
    if "an ninh thÃ´ng tin" in q_low or "security" in q_low or "infosec" in q_low:
        extra += ["infosec", "pentest"]
    if "quáº£n trá»‹ há»‡ thá»‘ng" in q_low or "sysadmin" in q_low or "devops" in q_low:
        extra += ["linux", "automation"]
    if extra:
        q = f"{q} " + " ".join(extra)
    return q


# ---------- Utils ----------
def to_pgvector_literal(vec: np.ndarray) -> str:
    v = vec.reshape(-1).tolist()
    return "[" + ",".join(f"{float(x):.8f}" for x in v) + "]"


def get_db_url(cli_db_url: str | None) -> str:
    db_url = cli_db_url or os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERR] DATABASE_URL is not set. Put it in .env or pass --db_url", file=sys.stderr)
        sys.exit(2)
    return db_url


# ---------- Main ----------
def main():
    ap = argparse.ArgumentParser("Search with pgvector (cosine + tag/SOC filters + hybrid score)")
    # nguá»“n DB
    ap.add_argument("--db_url", default=None, help="Override DATABASE_URL (optional)")
    ap.add_argument("--table", default="retrieval_jobs_visbert")

    # tham sá»‘ tÃ¬m kiáº¿m
    ap.add_argument("--topk", type=int, default=10)
    ap.add_argument(
        "--fetch_k", type=int, default=None, help="Overfetch trÆ°á»›c lá»c; máº·c Ä‘á»‹nh max(topk*5, 100)"
    )
    ap.add_argument("--probes", type=int, default=10, help="ivfflat.probes")

    # nguá»“n truy váº¥n
    ap.add_argument("--query_text", nargs="*", default=None)
    ap.add_argument("--query_vector", default=None)
    ap.add_argument("--model", default="models/vi_sbert", help="folder chá»©a tokenizer_name.txt")
    ap.add_argument("--max_length", type=int, default=256)
    ap.add_argument("--no_norm", action="store_true")

    # lá»c domain
    ap.add_argument(
        "--allowed_tokens", nargs="*", default=None, help="VD: cong_nghe_thong_tin du_lieu ml bi"
    )
    ap.add_argument(
        "--soc_prefix", default="", help="VD: 15- cho Computer & Mathematical; rá»—ng Ä‘á»ƒ bá» qua"
    )
    ap.add_argument("--min_match", type=int, default=0, help="YÃªu cáº§u tá»‘i thiá»ƒu sá»‘ tag trÃ¹ng")

    # hybrid score
    ap.add_argument("--alpha", type=float, default=0.75)
    ap.add_argument("--beta", type=float, default=0.15)
    ap.add_argument("--gamma", type=float, default=0.10)
    ap.add_argument("--user_riasec", nargs="*", type=float, default=None, help="6 sá»‘ [R,I,A,S,E,C]")
    ap.add_argument(
        "--min_score", type=float, default=None, help="NgÆ°á»¡ng final_score; bá» qua náº¿u khÃ´ng Ä‘áº·t"
    )

    args = ap.parse_args()
    db_url = get_db_url(args.db_url)

    # chuáº©n bá»‹ vector truy váº¥n
    if args.query_text:
        texts = [expand_query_vi(t) for t in args.query_text]
        Q = encode_queries(
            texts, args.model, max_length=args.max_length, normalize=(not args.no_norm)
        )
    elif args.query_vector:
        Q = np.load(args.query_vector).astype("float32")
        if Q.ndim == 1:
            Q = Q[None, :]
        if not args.no_norm:
            Q = (Q / np.linalg.norm(Q, axis=1, keepdims=True)).astype("float32")
    else:
        raise SystemExit("Cáº§n --query_text (kÃ¨m --model) hoáº·c --query_vector")

    fetch_k = args.fetch_k if (args.fetch_k and args.fetch_k > 0) else max(args.topk * 5, 100)
    user_r = args.user_riasec if (args.user_riasec and len(args.user_riasec) == 6) else None
    # náº¿u khÃ´ng cÃ³ vector ngÆ°á»i dÃ¹ng thÃ¬ táº¯t gamma
    gamma = args.gamma if user_r is not None else 0.0

    qlit = to_pgvector_literal(Q[0])

    with psycopg2.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SET ivfflat.probes = %s;", (args.probes,))

        t0 = time.perf_counter()

        # ---- CTE: láº¥y candidates theo cosine, rá»“i lá»c, cá»™ng Ä‘iá»ƒm hybrid ----
        if (
            args.allowed_tokens
            or args.soc_prefix
            or args.min_match > 0
            or gamma > 0.0
            or args.beta > 0.0
        ):
            # Truy váº¥n cÃ³ hybrid score (alpha/beta/gamma) + lá»c SOC, tag, min_match
            sql = f"""
            WITH cand AS (
              SELECT job_id, title, tag_tokens, riasec_centroid,
                     (embedding <=> %s::vector) AS dist
              FROM {args.table}
              ORDER BY embedding <=> %s::vector
              LIMIT %s
            ),
            filt AS (
              SELECT job_id, title, tag_tokens, riasec_centroid, dist,
                     (SELECT COUNT(*) FROM unnest(tag_tokens) t
                       WHERE %s::text[] IS NOT NULL AND t = ANY(%s::text[])) AS tag_hits
              FROM cand
              WHERE (%s = '' OR job_id LIKE %s || '%%')         -- SOC prefix
            ),
            norm AS (
              SELECT *,
                     MAX(tag_hits) OVER() AS _max_hits
              FROM filt
              WHERE (%s::int = 0 OR tag_hits >= %s::int)        -- min_match
            )
            SELECT job_id, title, dist, tag_hits, _max_hits,
                   (%s) * (1.0 - dist)
                 + (%s) * CASE WHEN _max_hits > 0 THEN (tag_hits::float / _max_hits) ELSE 0 END
                 + (%s) * CASE
                            WHEN %s::real[] IS NOT NULL AND riasec_centroid IS NOT NULL THEN
                              -- 1 - cosine_distance(riasec_job, riasec_user)
                              (
                                (
                                  (SELECT SUM(x*y) FROM unnest(riasec_centroid) WITH ORDINALITY AS r(x,i)
                                   JOIN unnest(%s::real[])     WITH ORDINALITY AS u(y,j) ON i=j)
                                )
                                /
                                GREATEST(
                                  sqrt((SELECT SUM(x*x) FROM unnest(riasec_centroid) x)),
                                  1e-9
                                )
                                /
                                GREATEST(
                                  sqrt((SELECT SUM(y*y) FROM unnest(%s::real[]) y)),
                                  1e-9
                                )
                              )
                            ELSE 0
                          END AS final_score
            FROM norm
            {"WHERE (%s IS NULL OR final_score >= %s)" if args.min_score is not None else ""}
            ORDER BY final_score DESC
            LIMIT %s;
            """

            params = [
                qlit,
                qlit,
                fetch_k,  # cand
                args.allowed_tokens,
                args.allowed_tokens,  # tag_hits
                args.soc_prefix,
                args.soc_prefix,  # filt: SOC
                args.min_match,
                args.min_match,  # norm: min_match
                args.alpha,
                args.beta,
                gamma,  # weights
                user_r,
                user_r,
                user_r,  # riasec
            ]
            if args.min_score is not None:
                params += [args.min_score, args.min_score]
            params += [args.topk]

            cur.execute(sql, params)
            rows = cur.fetchall()
            dt_ms = (time.perf_counter() - t0) * 1000.0

            results = []
            for i, (jid, title, dist, tag_hits, _max_hits, final_score) in enumerate(rows, 1):
                results.append(
                    {
                        "rank": i,
                        "job_id": jid,
                        "title": title,
                        "score_cosine": float(1.0 - dist),
                        "tag_hits": int(tag_hits) if tag_hits is not None else 0,
                        "final_score": float(final_score),
                    }
                )

        else:
            # Truy váº¥n cÆ¡ báº£n (chá»‰ cosine)
            sql = f"""
            SELECT job_id, title, (embedding <=> %s::vector) AS dist
            FROM {args.table}
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """
            cur.execute(sql, (qlit, qlit, args.topk))
            rows = cur.fetchall()
            dt_ms = (time.perf_counter() - t0) * 1000.0
            results = [
                {"rank": i + 1, "job_id": r[0], "title": r[1], "score_cosine": float(1.0 - r[2])}
                for i, r in enumerate(rows)
            ]

    payload = {
        "latency_ms": round(dt_ms, 3),
        "params": {
            "topk": args.topk,
            "fetch_k": fetch_k,
            "probes": args.probes,
            "alpha": args.alpha,
            "beta": args.beta,
            "gamma": gamma,
            "soc_prefix": args.soc_prefix,
            "min_match": args.min_match,
            "allowed_tokens": args.allowed_tokens,
            "min_score": args.min_score,
        },
        "results": results,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
