# src/api/main.py  (giữ nguyên phần import hiện có)
import json
import os
from pathlib import Path

import numpy as np
import psycopg2
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModel, AutoTokenizer

app = FastAPI()


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "career-retrieval",
        "endpoints": ["/search", "/health", "/ai/infer_user_traits"],
    }


@app.get("/health")
def health():
    return {"status": "up"}


# --- cấu hình ---
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
TABLE = "retrieval_jobs_visbert_data"

# ===== Retrieval vi-SBERT (giữ nguyên) =====
MODEL_DIR = Path("models/vi_sbert")
MODEL_NAME = (MODEL_DIR / "tokenizer_name.txt").read_text().strip()
TOK = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
MDL = (
    AutoModel.from_pretrained(MODEL_NAME).eval().to("cuda" if torch.cuda.is_available() else "cpu")
)
DEVICE = next(MDL.parameters()).device


def mean_pool(last_hidden_state, attention_mask):
    m = attention_mask.unsqueeze(-1).type_as(last_hidden_state)
    return (last_hidden_state * m).sum(1) / m.sum(1).clamp(min=1e-9)


def encode_text(text: str, max_length: int = 256, normalize: bool = True) -> list[float]:
    enc = TOK([text], padding=True, truncation=True, max_length=max_length, return_tensors="pt").to(
        DEVICE
    )
    with torch.no_grad():
        v = mean_pool(MDL(**enc).last_hidden_state, enc["attention_mask"])
        if normalize:
            v = torch.nn.functional.normalize(v, p=2, dim=1)
    return v[0].cpu().tolist()


class SearchReq(BaseModel):
    text: str | None = None
    vector: list[float] | None = None
    topk: int = 10
    allowed_tokens: list[str] | None = None


@app.post("/search")
def search(req: SearchReq):
    if req.text:
        q = encode_text(req.text)
    elif req.vector:
        x = np.array(req.vector, dtype="float32")
        x = x / (np.linalg.norm(x) + 1e-12)
        q = x.tolist()
    else:
        raise HTTPException(400, "text hoặc vector là bắt buộc")

    qlit = "[" + ",".join(f"{float(x):.8f}" for x in q) + "]"

    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        cur.execute("SET ivfflat.probes = %s;", (10,))
        if req.allowed_tokens:
            sql = f"""
            WITH cand AS (
              SELECT job_id, title, tag_tokens, (embedding <=> %s::vector) AS dist
              FROM {TABLE}
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
            FROM {TABLE}
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """
            cur.execute(sql, (qlit, qlit, req.topk))
        rows = cur.fetchall()

    hits = [
        {"job_id": jid, "title": title, "score": float(1.0 - dist)} for (jid, title, dist) in rows
    ]
    return {"topk": req.topk, "results": hits}


# ============ (NEW) PhoBERT online inference cho essay ============

# Cho phép cấu hình riêng backbone cho essay (PhoBERT)
PHO_DIR = Path(os.getenv("PHOBERT_DIR", "models/riasec_phobert"))
PHO_NAME_FILE = PHO_DIR / "tokenizer_name.txt"
PHO_BACKBONE = None
PHO_TOK = None
PHO_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _load_phobert():
    global PHO_TOK, PHO_BACKBONE
    if not PHO_NAME_FILE.exists():
        # fallback an toàn
        backbone_name = "vinai/phobert-base"
    else:
        backbone_name = PHO_NAME_FILE.read_text(encoding="utf-8").strip()
    PHO_TOK = AutoTokenizer.from_pretrained(backbone_name)
    PHO_BACKBONE = AutoModel.from_pretrained(backbone_name).to(PHO_DEVICE).eval()


def encode_essay_768(text: str) -> list[float]:
    if PHO_BACKBONE is None:
        _load_phobert()
    enc = PHO_TOK([text], return_tensors="pt", truncation=True, padding=True, max_length=256).to(
        PHO_DEVICE
    )
    with torch.no_grad():
        hs = PHO_BACKBONE(**enc).last_hidden_state
        vec = mean_pool(hs, enc["attention_mask"])[0]
        vec = torch.nn.functional.normalize(vec, p=2, dim=0)
    return vec.cpu().tolist()


# (Optional) Nếu có head đã train để dự đoán trait, ta load; nếu không thì để None
RIASEC_HEAD = None
BIG5_HEAD = None


def _try_load_heads():
    global RIASEC_HEAD, BIG5_HEAD
    try:
        # Ví dụ: bạn có module TextRegressor đã train
        from ai_core.training.modeling import TextRegressor  # nếu chưa có thì khối except sẽ bỏ qua

        # RIASEC
        RIASEC_HEAD = TextRegressor.from_pretrained(str(PHO_DIR), out_dim=6)
        RIASEC_HEAD.load_state_dict(torch.load("models/riasec_phobert/best.pt", map_location="cpu"))
        RIASEC_HEAD.to(PHO_DEVICE).eval()
        # BIG5
        BIG5_HEAD = TextRegressor.from_pretrained(str(PHO_DIR), out_dim=5)
        BIG5_HEAD.load_state_dict(torch.load("models/big5_phobert/best.pt", map_location="cpu"))
        BIG5_HEAD.to(PHO_DEVICE).eval()
    except Exception:
        RIASEC_HEAD = None
        BIG5_HEAD = None


_try_load_heads()


def _predict_traits(text: str):
    if RIASEC_HEAD is None or BIG5_HEAD is None:
        return None, None
    enc = PHO_TOK([text], return_tensors="pt", truncation=True, padding=True, max_length=256).to(
        PHO_DEVICE
    )
    with torch.no_grad():
        r = RIASEC_HEAD(**enc).logits.squeeze(0).cpu().numpy()
        b = BIG5_HEAD(**enc).logits.squeeze(0).cpu().numpy()

    # scale về 0..1 đơn giản theo min-max từng vector
    def mm01(x):
        x = x.astype(np.float32)
        mn, mx = float(x.min()), float(x.max())
        return ((x - mn) / (mx - mn + 1e-6)).tolist() if mx > mn else [0.5] * len(x)

    return mm01(r), mm01(b)


class ScoresIn(BaseModel):
    RIASEC: dict[str, float] | None = None
    BigFive: dict[str, float] | None = None


class InferReq(BaseModel):
    user_id: int
    essay_text: str
    lang: str = "vi"
    test_scores: ScoresIn | None = None  # có hay không cũng được


class InferRes(BaseModel):
    user_id: int
    embedding_dim: int = 768
    essay_embedding: list[float]
    pred_riasec: list[float] | None = None
    pred_big5: list[float] | None = None
    model: str = "phobert"


@app.post("/ai/infer_user_traits", response_model=InferRes)
def infer_user_traits(req: InferReq):
    text = (req.essay_text or "").strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="essay_text quá ngắn")

    emb = encode_essay_768(text)
    pred_r, pred_b = _predict_traits(text)

    # Upsert DB
    emb_lit = "[" + ",".join(f"{float(x):.8f}" for x in emb) + "]"
    with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
        # 1) ai.user_embeddings (PK user_id)
        cur.execute(
            """
            INSERT INTO ai.user_embeddings (user_id, emb, source, model_name, built_at)
            VALUES (%s, %s::vector, 'essay', 'phobert', now())
            ON CONFLICT (user_id) DO UPDATE
              SET emb = EXCLUDED.emb,
                  source = 'essay',
                  model_name = 'phobert',
                  built_at = now();
        """,
            (req.user_id, emb_lit),
        )

        # 2) (tuỳ) ai.user_trait_preds nếu có head
        if pred_r is not None and pred_b is not None:
            cur.execute(
                """
                INSERT INTO ai.user_trait_preds (user_id, riasec_pred, big5_pred, model_name, built_at)
                VALUES (%s, %s::jsonb, %s::jsonb, 'phobert', now())
                ON CONFLICT (user_id) DO UPDATE
                  SET riasec_pred = EXCLUDED.riasec_pred,
                      big5_pred   = EXCLUDED.big5_pred,
                      model_name  = 'phobert',
                      built_at    = now();
            """,
                (req.user_id, json.dumps(pred_r), json.dumps(pred_b)),
            )
        conn.commit()

    return InferRes(
        user_id=req.user_id,
        essay_embedding=emb,
        pred_riasec=pred_r,
        pred_big5=pred_b,
    )
