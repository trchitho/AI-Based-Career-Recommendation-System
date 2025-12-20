# src/api/routes_retrieval.py

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import numpy as np
import psycopg2
import torch
from fastapi import APIRouter, HTTPException, Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel

from ai_core.retrieval.service_pgvector import search_candidates_for_user, Candidate
from ai_core.traits.loader import load_traits_and_embedding_for_assessment

router = APIRouter(prefix="/search", tags=["retrieval"])

# ---------------- CONFIG ----------------

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:123456@localhost:5433/career_ai",
)
RETR_TABLE = os.getenv("RETR_TABLE", "ai.retrieval_jobs_visbert")
IVF_PROBES = int(os.getenv("IVF_PROBES", "32"))
MODEL_DIR = os.getenv("RETR_MODEL_DIR", "models/vi_sbert_768")

MODEL_PATH = Path(MODEL_DIR)
TOK_NAME_FILE = MODEL_PATH / "tokenizer_name.txt"


def _read_model_name(p: Path) -> str:
    text = p.read_text(encoding="utf-8-sig").strip()
    return text.lstrip("\ufeff").strip()


if TOK_NAME_FILE.exists():
    MODEL_NAME = _read_model_name(TOK_NAME_FILE)
else:
    MODEL_NAME = MODEL_PATH.as_posix()

print(f"[BOOT][SEARCH] RETR_TABLE={RETR_TABLE} | MODEL_DIR={MODEL_DIR} | MODEL_NAME={MODEL_NAME}")

# ---------------- ENCODER (lazy load) ----------------

_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_TOKENIZER: AutoTokenizer | None = None
_MODEL: AutoModel | None = None


def _get_encoder():
    global _TOKENIZER, _MODEL
    if _TOKENIZER is None or _MODEL is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
        _MODEL = AutoModel.from_pretrained(MODEL_NAME).to(_DEVICE).eval()
    return _TOKENIZER, _MODEL


def encode_text(text: str) -> list[float]:
    """Encode 1 câu thành vector 768D, L2-normalized."""
    tok, mdl = _get_encoder()
    with torch.no_grad():
        inputs = tok(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256,
        ).to(_DEVICE)
        out = mdl(**inputs).last_hidden_state  # [1, L, H]
        vec = out.mean(dim=1).squeeze(0)       # mean pooling
        v = vec / (vec.norm(p=2) + 1e-12)
        return v.detach().cpu().numpy().astype("float32").tolist()


# ---------------- SCHEMA ----------------

class SearchByAssessmentReq(BaseModel):
    assessment_id: int
    top_k: int = 20

@router.post("/by_assessment")
def search_by_assessment(req: SearchByAssessmentReq):
    snapshot = load_traits_and_embedding_for_assessment(req.assessment_id)
    user_vec = snapshot.embedding_vector

    cands = search_candidates_for_user(
        user_vec,
        req.top_k,
    )
    return [{"job_id": c.job_id, "score": c.score_sim} for c in cands]



class SearchReq(BaseModel):
    user_id: int
    top_k: int = 50
class SearchResItem(BaseModel):
    job_id: str
    score: float
@router.post("", response_model=list[SearchResItem])
def search(req: SearchReq):
    try:
        cands: list[Candidate] = search_candidates_for_user(
            user_id=req.user_id,
            top_n=req.top_k,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return [
        SearchResItem(job_id=c.job_id, score=c.score_sim)
        for c in cands
    ]



class SearchReq(BaseModel):
    text: Optional[str] = None
    vector: Optional[list[float]] = None
    topk: int = 10
    allowed_tokens: Optional[list[str]] = None  # optional filter on tag_tokens
@router.post("/search")
def search(req: SearchReq):
    # 1) Chuẩn bị vector truy vấn
    if req.text:
        q = encode_text(req.text)
    elif req.vector:
        x = np.asarray(req.vector, dtype="float32")
        x = x / (np.linalg.norm(x) + 1e-12)
        q = x.tolist()
    else:
        raise HTTPException(status_code=400, detail="text hoặc vector là bắt buộc")

    qlit = "[" + ",".join(f"{float(x):.8f}" for x in q) + "]"

    # 2) Query Postgres + pgvector
    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        # set probes cho IVFFLAT
        cur.execute("SET ivfflat.probes = %s;", (IVF_PROBES,))

        if req.allowed_tokens:
            sql = f"""
            WITH cand AS (
              SELECT job_id, title, tag_tokens, (embedding <=> %s::vector) AS dist
              FROM {RETR_TABLE}
              ORDER BY embedding <=> %s::vector
              LIMIT %s
            )
            SELECT job_id, title, dist
            FROM cand
            WHERE tag_tokens && %s::text[]
            ORDER BY dist ASC
            LIMIT %s;
            """
            cur.execute(
                sql,
                (
                    qlit,
                    qlit,
                    max(req.topk * 5, 100),
                    req.allowed_tokens,
                    req.topk,
                ),
            )
        else:
            sql = f"""
            SELECT job_id, title, (embedding <=> %s::vector) AS dist
            FROM {RETR_TABLE}
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """
            cur.execute(sql, (qlit, qlit, req.topk))

        rows = cur.fetchall()

    results = [
        {
            "job_id": jid,
            "title": title,
            "score": float(1.0 - dist),
        }
        for (jid, title, dist) in rows
    ]

    payload = {"topk": req.topk, "results": results}

    pretty = json.dumps(
        jsonable_encoder(payload),
        indent=2,
        ensure_ascii=False,  # giữ Unicode trong title_vi nếu có
    )

    return Response(
        content=pretty,
        media_type="application/json; charset=utf-8",
    )
