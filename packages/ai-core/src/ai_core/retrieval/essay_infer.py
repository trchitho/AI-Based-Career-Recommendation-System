# ai_core/retrieval/essay_infer.py
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any

import numpy as np
import psycopg
import torch
try:
    from googletrans import Translator
except Exception:
    class _DetectInfo:
        def __init__(self, lang: str):
            self.lang = lang

    class Translator:  # minimal fallback when googletrans is unavailable
        def detect(self, text: str):
            text = (text or "").strip()
            if not text:
                return _DetectInfo("vi")
            # ASCII heuristic → 'en', otherwise 'vi'
            return _DetectInfo("en" if re.fullmatch(r"[ -~]+", text) else "vi")

        class _Translated:
            def __init__(self, text: str):
                self.text = text

        def translate(self, text: str, src: str = "auto", dest: str = "vi"):
            # Fallback: no real translation, return original text
            return self._Translated(text)
from transformers import AutoTokenizer, AutoModel

from api.config import get_pg_dsn  # đã có trong ai-core/api/config.py


# ---------- Config & globals ----------

_PHOBERT_DIR = Path(os.getenv("PHOBERT_DIR", "models/riasec_phobert"))

try:
    _TOKENIZER_NAME = (_PHOBERT_DIR / "tokenizer_name.txt").read_text(
        encoding="utf-8"
    ).strip()
    if not _TOKENIZER_NAME:
        _TOKENIZER_NAME = "vinai/phobert-base"
except Exception:
    _TOKENIZER_NAME = "vinai/phobert-base"

_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_TOK = AutoTokenizer.from_pretrained(_TOKENIZER_NAME, use_fast=True)
_MDL = AutoModel.from_pretrained(str(_PHOBERT_DIR)).to(_DEVICE).eval()

_TRANS = Translator()


@dataclass
class EssayInferResult:
    user_id: int
    essay_id: Optional[int]
    lang_in: str
    lang_used: str
    translated: bool
    dim: int
    l2_normalized: bool
    model_name: str = "phobert+vi-sbert"


# ---------- Helpers ----------

def _clean(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def detect_lang(text: str) -> str:
    """
    Chỉ phân biệt 'vi' / 'en' / 'other', ưu tiên googletrans,
    fallback heuristic để tránh crash.
    """
    text = _clean(text)
    if not text:
        return "vi"

    try:
        info = _TRANS.detect(text)
        lang = (info.lang or "").lower()
        if lang.startswith("vi"):
            return "vi"
        if lang.startswith("en"):
            return "en"
    except Exception:
        pass

    # Heuristic: toàn ASCII gần như chắc EN
    if re.fullmatch(r"[ -~]+", text):
        return "en"
    # Mặc định coi là VI
    return "vi"


def maybe_translate_to_vi(text: str, hint_lang: Optional[str]) -> tuple[str, str, bool]:
    """
    Trả về: (text_vi, lang_used, translated?)
    """
    lang = (hint_lang or "").lower()
    if lang not in {"vi", "en"}:
        lang = detect_lang(text)

    if lang == "vi":
        return text, "vi", False

    # lang == 'en' hoặc khác → cố dịch sang VI
    try:
        out = _TRANS.translate(text, src=lang, dest="vi").text
        return out, "vi", True
    except Exception:
        # dịch lỗi → dùng nguyên bản
        return text, lang, False


@torch.inference_mode()
def encode_vi_phobert(text_vi: str) -> np.ndarray:
    """
    Encode 1 đoạn tiếng Việt -> vector 768 (L2-normalized).
    """
    text_vi = _clean(text_vi)
    if not text_vi:
        return np.zeros(768, dtype="float32")

    batch = _TOK(
        text_vi,
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
    batch = {k: v.to(_DEVICE) for k, v in batch.items()}
    out = _MDL(**batch)
    hidden = out.last_hidden_state  # [1, L, H]
    vec = hidden.mean(dim=1).squeeze(0).detach().cpu().float().numpy()  # (768,)
    n = float(np.linalg.norm(vec) + 1e-12)
    return (vec / n).astype("float32")


def upsert_user_embedding(
    user_id: int,
    emb: np.ndarray,
    source: str = "essay",
    model_name: str = "phobert+vi-sbert",
) -> None:
    """
    Ghi vào ai.user_embeddings, override cùng user_id.
    """
    sql = """
    INSERT INTO ai.user_embeddings (user_id, emb, source, model_name, built_at)
    VALUES (%(uid)s, %(emb)s, %(source)s, %(model)s, now())
    ON CONFLICT (user_id) DO UPDATE
       SET emb       = EXCLUDED.emb,
           source    = EXCLUDED.source,
           model_name= EXCLUDED.model_name,
           built_at  = now();
    """
    dsn = get_pg_dsn()
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            sql,
            {
                "uid": int(user_id),
                "emb": emb.tolist(),
                "source": source,
                "model": model_name,
            },
        )
        conn.commit()


# ---------- Public API ----------

def infer_and_upsert(
    user_id: int,
    essay_text: str,
    essay_id: Optional[int] = None,
    lang_hint: Optional[str] = None,
) -> EssayInferResult:
    """
    Pipeline ngắn hạn:
      1) Chuẩn hoá text.
      2) Detect lang (vi/en) nếu lang_hint không chắc chắn.
      3) Nếu EN → dịch sang VI.
      4) Encode PhoBERT -> 768d, L2-normalized.
      5) Upsert ai.user_embeddings.
      6) Trả metadata (FE/BE dùng log/debug).
    """
    text_norm = _clean(essay_text)
    if not text_norm:
        raise ValueError("essay_text is empty")

    lang_in = detect_lang(text_norm) if not lang_hint else lang_hint
    text_vi, lang_used, translated = maybe_translate_to_vi(text_norm, lang_in)
    emb = encode_vi_phobert(text_vi)

    upsert_user_embedding(
        user_id=user_id,
        emb=emb,
        source="essay",
        model_name="phobert+vi-sbert",
    )

    return EssayInferResult(
        user_id=int(user_id),
        essay_id=essay_id,
        lang_in=lang_in,
        lang_used=lang_used,
        translated=translated,
        dim=int(emb.shape[0]),
        l2_normalized=True,
        model_name="phobert+vi-sbert",
    )
