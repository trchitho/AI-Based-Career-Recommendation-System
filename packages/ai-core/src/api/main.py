# packages/ai-core/src/api/main.py
from __future__ import annotations
import os, json, time
from pathlib import Path
from typing import Optional, List, Dict

import numpy as np
import torch
import psycopg2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModel, AutoTokenizer

# =========================================================
# FastAPI
# =========================================================
app = FastAPI(title="career-ai-core", version="0.1.0")

@app.get("/")
def root():
    return {
        "ok": True,
        "service": "career-ai-core",
        "endpoints": ["/search", "/health", "/ai/infer_user_traits"],
    }

@app.get("/health")
def health():
    return {"status": "up"}

# =========================================================
# Config chung
# =========================================================
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
RETR_TABLE = os.getenv("RETR_TABLE", "ai.retrieval_jobs_visbert") 
IVF_PROBES = int(os.getenv("IVF_PROBES", "10"))

# =========================================================
# Retrieval (vi-SBERT) - GIỮ LOGIC CŨ
# =========================================================
SBERT_DIR = Path("models/vi_sbert")
SBERT_NAME = (SBERT_DIR / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
TOK_S = AutoTokenizer.from_pretrained(SBERT_NAME, use_fast=True)
MDL_S = AutoModel.from_pretrained(SBERT_NAME).eval().to("cuda" if torch.cuda.is_available() else "cpu")
DEVICE_S = next(MDL_S.parameters()).device

def mean_pool(last_hidden_state, attention_mask):
    m = attention_mask.unsqueeze(-1).type_as(last_hidden_state)
    return (last_hidden_state * m).sum(1) / m.sum(1).clamp(min=1e-9)

def encode_text_sbert(text: str, max_length: int = 256, normalize: bool = True) -> List[float]:
    enc = TOK_S([text], padding=True, truncation=True, max_length=max_length, return_tensors="pt").to(DEVICE_S)
    with torch.no_grad():
        v = mean_pool(MDL_S(**enc).last_hidden_state, enc["attention_mask"])
        if normalize:
            v = torch.nn.functional.normalize(v, p=2, dim=1)
    return v[0].cpu().tolist()

class SearchReq(BaseModel):
    text: Optional[str] = None
    vector: Optional[List[float]] = None
    topk: int = 10
    allowed_tokens: Optional[List[str]] = None  # lọc theo tag_tokens (GIST)

@app.post("/search")
def search(req: SearchReq):
    if req.text:
        q = encode_text_sbert(req.text)
    elif req.vector:
        x = np.array(req.vector, dtype="float32")
        q = (x / (np.linalg.norm(x) + 1e-12)).tolist()
    else:
        raise HTTPException(400, "text hoặc vector là bắt buộc")

    qlit = "[" + ",".join(f"{float(x):.8f}" for x in q) + "]"

    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        # thiết lập probes cho ivfflat
        try:
            cur.execute("SET ivfflat.probes = %s;", (IVF_PROBES,))
        except Exception:
            pass

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
            cur.execute(sql, (qlit, qlit, max(req.topk * 5, 100), req.allowed_tokens, req.topk))
        else:
            sql = f"""
            SELECT job_id, title, (embedding <=> %s::vector) AS dist
            FROM {RETR_TABLE}
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """
            cur.execute(sql, (qlit, qlit, req.topk))

        rows = cur.fetchall()

    hits = [{"job_id": jid, "title": title, "score": float(1.0 - dist)} for (jid, title, dist) in rows]
    return {"topk": req.topk, "results": hits}

# =========================================================
# (NEW) PhoBERT online inference cho essay  → ai.user_embeddings (+ preds nếu có)
# =========================================================
PHO_DIR = Path(os.getenv("PHOBERT_DIR", "models/riasec_phobert"))
if (PHO_DIR / "tokenizer_name.txt").exists():
    PHO_BACKBONE_NAME = (PHO_DIR / "tokenizer_name.txt").read_text(encoding="utf-8").strip()
else:
    PHO_BACKBONE_NAME = "vinai/phobert-base"

TOK_E = AutoTokenizer.from_pretrained(PHO_BACKBONE_NAME)
MDL_E = AutoModel.from_pretrained(PHO_BACKBONE_NAME).eval().to("cuda" if torch.cuda.is_available() else "cpu")
DEVICE_E = next(MDL_E.parameters()).device

def encode_essay_768(text: str, max_length: int = 256) -> List[float]:
    enc = TOK_E([text], return_tensors="pt", truncation=True, padding=True, max_length=max_length).to(DEVICE_E)
    with torch.no_grad():
        hs = MDL_E(**enc).last_hidden_state
        vec = mean_pool(hs, enc["attention_mask"])[0]              # [768]
        vec = torch.nn.functional.normalize(vec, p=2, dim=0)       # L2
    return vec.cpu().tolist()

# (Optional) heads dự đoán RIASEC/Big5 – có thì dùng, không có vẫn chạy encode
RIASEC_HEAD = None
BIG5_HEAD   = None
def _try_load_heads():
    global RIASEC_HEAD, BIG5_HEAD
    try:
        from ai_core.training.modeling import TextRegressor  # nếu chưa có module này, bỏ qua
        # RIASEC
        RIASEC_HEAD = TextRegressor.from_pretrained(str(PHO_DIR), out_dim=6)
        RIASEC_HEAD.load_state_dict(torch.load("models/riasec_phobert/best.pt", map_location="cpu"))
        RIASEC_HEAD.to(DEVICE_E).eval()
        # BigFive
        BIG5_HEAD = TextRegressor.from_pretrained(str(PHO_DIR), out_dim=5)
        BIG5_HEAD.load_state_dict(torch.load("models/big5_phobert/best.pt", map_location="cpu"))
        BIG5_HEAD.to(DEVICE_E).eval()
    except Exception:
        RIASEC_HEAD, BIG5_HEAD = None, None

_try_load_heads()

def _predict_traits(text: str):
    if RIASEC_HEAD is None or BIG5_HEAD is None:
        return None, None
    enc = TOK_E([text], return_tensors="pt", truncation=True, padding=True, max_length=256).to(DEVICE_E)
    with torch.no_grad():
        r = RIASEC_HEAD(**enc).logits.squeeze(0).cpu().numpy()
        b = BIG5_HEAD(**enc).logits.squeeze(0).cpu().numpy()
    # scale 0..1 theo min-max từng vector
    def mm01(x: np.ndarray):
        x = x.astype(np.float32)
        mn, mx = float(x.min()), float(x.max())
        return ((x - mn) / (mx - mn + 1e-6)).tolist() if mx > mn else [0.5] * len(x)
    return mm01(r), mm01(b)

class ScoresIn(BaseModel):
    RIASEC: Optional[Dict[str, float]] = None
    BigFive: Optional[Dict[str, float]] = None

class InferReq(BaseModel):
    user_id: int
    essay_text: str
    lang: str = "vi"
    test_scores: Optional[ScoresIn] = None  # hiện chỉ tiếp nhận, chưa fuse tại API này

class InferRes(BaseModel):
    user_id: int
    embedding_dim: int = 768
    essay_embedding: List[float]
    pred_riasec: Optional[List[float]] = None
    pred_big5: Optional[List[float]] = None
    model: str = "phobert"

@app.post("/ai/infer_user_traits", response_model=InferRes)
def infer_user_traits(req: InferReq):
    text = (req.essay_text or "").strip()
    if len(text) < 5:
        raise HTTPException(422, "essay_text quá ngắn")

    # 1) Encode essay → 768d
    emb = encode_essay_768(text)

    # 2) (tuỳ) dự đoán trait từ essay
    pred_r, pred_b = _predict_traits(text)

    # 3) Upsert DB
    emb_lit = "[" + ",".join(f"{float(x):.8f}" for x in emb) + "]"  # vector literal
    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        # ai.user_embeddings (PK user_id)
        cur.execute(
            """
            INSERT INTO ai.user_embeddings (user_id, emb, source, model_name, built_at)
            VALUES (%s, %s::vector, 'essay', %s, now())
            ON CONFLICT (user_id) DO UPDATE
              SET emb = EXCLUDED.emb,
                  source = 'essay',
                  model_name = EXCLUDED.model_name,
                  built_at = now();
            """,
            (req.user_id, emb_lit, PHO_BACKBONE_NAME),
        )
        # ai.user_trait_preds nếu có head
        if pred_r is not None and pred_b is not None:
            cur.execute(
                """
                INSERT INTO ai.user_trait_preds (user_id, riasec_pred, big5_pred, model_name, built_at)
                VALUES (%s, %s::jsonb, %s::jsonb, %s, now())
                ON CONFLICT (user_id) DO UPDATE
                  SET riasec_pred = EXCLUDED.riasec_pred,
                      big5_pred   = EXCLUDED.big5_pred,
                      model_name  = EXCLUDED.model_name,
                      built_at    = now();
                """,
                (req.user_id, json.dumps(pred_r), json.dumps(pred_b), PHO_BACKBONE_NAME),
            )
        conn.commit()

    return InferRes(
        user_id=req.user_id,
        essay_embedding=emb,
        pred_riasec=pred_r,
        pred_big5=pred_b,
    )
