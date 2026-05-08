"""
Embedding pipeline using sentence-transformers (SBERT all-MiniLM-L6-v2).
Falls back to Gemini text-embedding when sentence-transformers is unavailable.
"""
from __future__ import annotations

import logging
import math
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Try SBERT ─────────────────────────────────────────────────────
_sbert_model = None

def _get_sbert():
    global _sbert_model
    if _sbert_model is not None:
        return _sbert_model
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("✅ SBERT model loaded: all-MiniLM-L6-v2")
        return _sbert_model
    except Exception as e:
        logger.warning(f"⚠️  sentence-transformers not available: {e}")
        return None


def embed_text(text: str) -> Optional[list[float]]:
    """
    Embed a single text string.
    Returns a list[float] (384-dim for MiniLM) or None if no encoder available.
    """
    if not text or not text.strip():
        return None

    # 1️⃣  Try SBERT
    model = _get_sbert()
    if model:
        try:
            vec = model.encode(text, normalize_embeddings=True)
            return vec.tolist()
        except Exception as e:
            logger.warning(f"SBERT encode failed: {e}")

    # 2️⃣  Fallback: Gemini embedding (text-embedding-004)
    try:
        import google.generativeai as genai  # type: ignore
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
            )
            return result["embedding"]
    except Exception as e:
        logger.warning(f"Gemini embedding fallback failed: {e}")

    return None


def embed_batch(texts: list[str]) -> list[Optional[list[float]]]:
    """Embed a batch of texts. Uses SBERT batch inference when available."""
    if not texts:
        return []

    model = _get_sbert()
    if model:
        try:
            vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return [v.tolist() for v in vecs]
        except Exception as e:
            logger.warning(f"SBERT batch encode failed: {e}")

    # Fallback: encode one by one
    return [embed_text(t) for t in texts]


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot   = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def relevance_label(score: float) -> str:
    if score >= 0.70:
        return "Highly Relevant"
    if score >= 0.50:
        return "Relevant"
    return "Related"
