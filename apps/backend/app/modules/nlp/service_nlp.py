"""
PB32 - PhoBERT NLP: Vietnamese text analysis (essay → RIASEC + Big5)
PB33 - SBERT: Career embeddings for semantic search
PB34 - pgvector: Vector similarity search with hybrid scoring

Primary:  AI-core service (localhost:9000) with PhoBERT + Vietnamese SBERT
Fallback: Gemini API for both embedding and NLP analysis
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from functools import lru_cache
from typing import Optional

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:9000")
EMBEDDING_DIM = 768
_GEMINI_EMBED_MODEL = "models/text-embedding-004"

RIASEC_KEYS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"]
BIG5_KEYS   = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]

# TC18 — SLA threshold for PhoBERT/essay analysis (milliseconds)
ESSAY_ANALYSIS_SLA_MS = 1000

# TC19 — SLA threshold for pgvector similarity search (milliseconds)
VECTOR_SEARCH_SLA_MS = 5000

# TC18 — In-process essay analysis cache (avoids duplicate AI calls for same input)
# Key: SHA-256 of (essay_text + lang), Value: analysis result dict
_essay_cache: dict[str, dict] = {}
_ESSAY_CACHE_MAX = 200  # evict oldest when full

# ─────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────

def _gemini_api_key() -> str:
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GEMINI_API_KEY_1")
        or os.getenv("GEMINI_API_KEY_2")
        or ""
    )


def _vec_to_pg(embedding: list[float]) -> str:
    """Format float list as pgvector literal '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{float(x):.8f}" for x in embedding) + "]"


def _pad_list(lst: list[float], size: int) -> list[float]:
    result = list(lst)[:size]
    while len(result) < size:
        result.append(0.0)
    return result


# ─────────────────────────────────────────────────────────────
#  PB33 — Text Embedding (Gemini / SBERT-compatible 768D)
# ─────────────────────────────────────────────────────────────

def get_embedding(text_input: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """
    PB33: Generate 768D text embedding.
    Primary: AI-core SBERT (Vietnamese-optimized)
    Fallback: Gemini text-embedding-004
    Returns [] on failure (caller decides whether to skip or raise).
    """
    text_input = (text_input or "").strip()
    if not text_input:
        return []

    # 1) Try AI-core SBERT endpoint
    try:
        res = requests.post(
            f"{AI_CORE_URL}/ai/encode",
            json={"text": text_input[:2000]},
            timeout=8,
        )
        if res.status_code == 200:
            data = res.json()
            emb = data.get("embedding") or data.get("vector") or []
            if emb and len(emb) == EMBEDDING_DIM:
                return [float(x) for x in emb]
    except Exception as e:
        logger.debug(f"[NLP] AI-core /ai/encode unavailable: {e}")

    # 2) Fallback: Gemini embed
    api_key = _gemini_api_key()
    if not api_key:
        return []
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        result = genai.embed_content(
            model=_GEMINI_EMBED_MODEL,
            content=text_input[:2000],
            task_type=task_type,
        )
        emb = result.get("embedding") or result["embedding"]
        return emb if emb else []
    except Exception as e:
        logger.warning(f"[NLP] Gemini embed_content failed: {e}")
        return []


# ─────────────────────────────────────────────────────────────
#  PB32 — Essay Analysis (PhoBERT → Gemini fallback)
# ─────────────────────────────────────────────────────────────

def _analyze_via_aicore(essay_text: str, lang: str = "auto") -> dict | None:
    """Try AI-core PhoBERT service. Returns None if unavailable."""
    try:
        res = requests.post(
            f"{AI_CORE_URL}/ai/infer_user_traits",
            json={"essay_text": essay_text, "lang": lang},
            timeout=15,
        )
        if res.status_code == 200:
            data = res.json()
            riasec = _pad_list([float(x) for x in (data.get("riasec") or [])], 6)
            big5   = _pad_list([float(x) for x in (data.get("big5")   or [])], 5)
            return {
                "source":        "phobert",
                "detected_lang": data.get("detected_lang", "vi"),
                "riasec":        riasec,
                "big5":          big5,
                "embedding":     data.get("embedding", []),
                "traits_vi":     data.get("traits_vi", []),
                "dominant":      data.get("dominant", ""),
            }
    except Exception as e:
        logger.debug(f"[NLP] AI-core /ai/infer_user_traits unavailable ({AI_CORE_URL}): {e}")
    return None


def _analyze_via_gemini(essay_text: str) -> dict:
    """
    PB32 fallback: Gemini structured NLP for Vietnamese/English essay.
    Extracts RIASEC + Big5 via prompt engineering.
    """
    api_key = _gemini_api_key()
    if not api_key:
        return _empty_analysis("no_api_key")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = f"""Bạn là chuyên gia tâm lý học nghề nghiệp. Hãy phân tích đoạn văn dưới đây và cho điểm theo hai thang đo tính cách.

Văn bản: "{essay_text[:1500]}"

Trả về **chỉ JSON** với định dạng chính xác sau (điểm từ 0.0 đến 1.0):
{{
  "riasec": [r, i, a, s, e, c],
  "big5":   [openness, conscientiousness, extraversion, agreeableness, neuroticism],
  "dominant": "X",
  "traits_vi": ["đặc điểm 1", "đặc điểm 2", "đặc điểm 3"],
  "detected_lang": "vi"
}}

RIASEC: R=Realistic(thực tế/kỹ thuật), I=Investigative(nghiên cứu/khoa học), A=Artistic(sáng tạo/nghệ thuật), S=Social(giao tiếp/giúp đỡ), E=Enterprising(lãnh đạo/kinh doanh), C=Conventional(ngăn nắp/hệ thống).
Chỉ trả về JSON, không thêm markdown hay giải thích."""

        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            logger.warning(f"[NLP] Gemini returned non-JSON: {raw[:200]}")
            return _empty_analysis("parse_error")

        parsed = json.loads(match.group())
        riasec = _pad_list([float(x) for x in (parsed.get("riasec") or [])], 6)
        big5   = _pad_list([float(x) for x in (parsed.get("big5")   or [])], 5)

        embedding = get_embedding(essay_text, task_type="RETRIEVAL_DOCUMENT")

        return {
            "source":        "gemini",
            "detected_lang": parsed.get("detected_lang", "vi"),
            "riasec":        riasec,
            "big5":          big5,
            "embedding":     embedding,
            "traits_vi":     parsed.get("traits_vi", []),
            "dominant":      parsed.get("dominant", ""),
        }
    except Exception as e:
        logger.error(f"[NLP] Gemini analysis failed: {e}")
        return _empty_analysis("gemini_error")


def _empty_analysis(reason: str) -> dict:
    return {
        "source":        reason,
        "detected_lang": "vi",
        "riasec":        [0.0] * 6,
        "big5":          [0.0] * 5,
        "embedding":     [],
        "traits_vi":     [],
        "dominant":      "",
    }


def _essay_cache_key(essay_text: str, lang: str) -> str:
    """SHA-256 hash used as cache key for essay analysis results."""
    raw = f"{lang}:{essay_text.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def analyze_essay(essay_text: str, lang: str = "auto") -> dict:
    """
    PB32 - Main entry: analyze essay → RIASEC + Big5 + embedding.
    Tries PhoBERT AI-core first, falls back to Gemini.
    Returns unified structure with padded/trimmed arrays.

    Enhancements (TC18):
    - Measures wall-clock response_time_ms and embeds it in the result.
    - Caches results keyed by (lang, essay_text) hash to avoid redundant AI calls.
    - Logs a WARNING if response exceeds ESSAY_ANALYSIS_SLA_MS (1 000 ms).
    """
    text_in = (essay_text or "").strip()
    if not text_in:
        return {**_empty_analysis("empty_input"), "response_time_ms": 0, "from_cache": False}

    # TC18 — Check in-process cache first
    cache_key = _essay_cache_key(text_in, lang)
    if cache_key in _essay_cache:
        cached = dict(_essay_cache[cache_key])
        cached["from_cache"] = True
        cached["response_time_ms"] = 0
        return cached

    t0 = time.perf_counter()
    result = _analyze_via_aicore(text_in, lang) or _analyze_via_gemini(text_in)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    result["riasec"] = _pad_list(result["riasec"], 6)
    result["big5"]   = _pad_list(result["big5"],   5)

    if not result.get("embedding"):
        result["embedding"] = get_embedding(text_in, task_type="RETRIEVAL_DOCUMENT")

    # TC18 — Attach timing metadata
    result["response_time_ms"] = elapsed_ms
    result["from_cache"] = False

    if elapsed_ms > ESSAY_ANALYSIS_SLA_MS:
        logger.warning(
            "[NLP][TC18] Essay analysis exceeded SLA: %.0f ms > %d ms (source=%s)",
            elapsed_ms, ESSAY_ANALYSIS_SLA_MS, result.get("source"),
        )

    # Store in cache (evict oldest entry when full)
    if len(_essay_cache) >= _ESSAY_CACHE_MAX:
        oldest_key = next(iter(_essay_cache))
        del _essay_cache[oldest_key]
    _essay_cache[cache_key] = {k: v for k, v in result.items()
                                if k not in ("response_time_ms", "from_cache")}

    return result


# ─────────────────────────────────────────────────────────────
#  PB32 — User embedding storage
# ─────────────────────────────────────────────────────────────

def store_user_embedding(
    session: Session,
    user_id: int,
    embedding: list[float],
    source: str = "essay",
    model_name: str = "gemini-text-embedding-004",
) -> bool:
    """Store user essay embedding in ai.user_embeddings (upsert by user_id + source)."""
    if not embedding or len(embedding) != EMBEDDING_DIM:
        return False
    vec_str = _vec_to_pg(embedding)
    try:
        ensure_pgvector_schema(session)
        session.execute(text("""
            INSERT INTO ai.user_embeddings (user_id, emb, source, model_name, built_at)
            VALUES (:uid, :emb::vector(768), :src, :model, NOW())
            ON CONFLICT DO NOTHING
        """), {"uid": user_id, "emb": vec_str, "src": source, "model": model_name})
        # Always update to latest
        session.execute(text("""
            UPDATE ai.user_embeddings
            SET emb = :emb::vector(768), model_name = :model, built_at = NOW()
            WHERE user_id = :uid AND source = :src
        """), {"uid": user_id, "emb": vec_str, "src": source, "model": model_name})
        return True
    except Exception as e:
        logger.error(f"[NLP] store_user_embedding(user_id={user_id}): {e}")
        return False


def analyze_and_store(
    session: Session,
    user_id: int,
    essay_text: str,
    lang: str = "auto",
) -> dict:
    """
    PB32+PB34: Full pipeline — analyze essay then persist embedding.
    Returns analysis result dict (same as analyze_essay).
    """
    result = analyze_essay(essay_text, lang)
    if result["embedding"]:
        store_user_embedding(
            session,
            user_id,
            result["embedding"],
            source="essay",
            model_name="phobert" if result["source"] == "phobert" else "gemini-text-embedding-004",
        )
    return result


# ─────────────────────────────────────────────────────────────
#  PB34 — pgvector schema & career index
# ─────────────────────────────────────────────────────────────

def ensure_pgvector_schema(session: Session) -> bool:
    """
    PB34: Create pgvector extension + ai schema + tables if they don't exist.
    Safe to call multiple times (all IF NOT EXISTS).
    """
    try:
        try:
            session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            logger.warning(f"[NLP] pgvector extension: {e}")

        session.execute(text("CREATE SCHEMA IF NOT EXISTS ai"))

        session.execute(text("""
            CREATE TABLE IF NOT EXISTS ai.career_embeddings (
                id          BIGSERIAL PRIMARY KEY,
                career_id   BIGINT NOT NULL,
                onet_code   TEXT,
                title       TEXT,
                description TEXT,
                embedding   vector(768),
                model_name  TEXT DEFAULT 'gemini-text-embedding-004',
                built_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(career_id)
            )
        """))

        session.execute(text("""
            CREATE TABLE IF NOT EXISTS ai.user_embeddings (
                id         BIGSERIAL PRIMARY KEY,
                user_id    BIGINT NOT NULL,
                emb        vector(768),
                source     TEXT DEFAULT 'essay',
                model_name TEXT DEFAULT 'phobert+vi-sbert',
                built_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE (user_id, source)
            )
        """))

        # HNSW index (pgvector >= 0.5) — best for cosine similarity
        try:
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS career_emb_hnsw_idx
                ON ai.career_embeddings
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            """))
        except Exception:
            try:
                session.execute(text("""
                    CREATE INDEX IF NOT EXISTS career_emb_ivf_idx
                    ON ai.career_embeddings
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 50)
                """))
            except Exception as idx_e:
                logger.warning(f"[NLP] Could not create vector index: {idx_e}")

        # User embedding index
        try:
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS user_emb_hnsw_idx
                ON ai.user_embeddings
                USING hnsw (emb vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            """))
        except Exception:
            pass

        session.commit()
        return True
    except Exception as e:
        logger.error(f"[NLP] ensure_pgvector_schema failed: {e}")
        session.rollback()
        return False


def store_career_embedding(
    session: Session,
    career_id: int,
    onet_code: Optional[str],
    title: str,
    description: str,
    embedding: list[float],
    model_name: str = "gemini-text-embedding-004",
) -> bool:
    """PB33/PB34: Upsert a career's 768D embedding in pgvector."""
    if not embedding or len(embedding) != EMBEDDING_DIM:
        return False
    vec_str = _vec_to_pg(embedding)
    try:
        session.execute(text("""
            INSERT INTO ai.career_embeddings
                (career_id, onet_code, title, description, embedding, model_name, built_at)
            VALUES
                (:career_id, :onet_code, :title, :desc, :emb::vector(768), :model_name, NOW())
            ON CONFLICT (career_id) DO UPDATE SET
                embedding   = EXCLUDED.embedding,
                model_name  = EXCLUDED.model_name,
                title       = EXCLUDED.title,
                description = EXCLUDED.description,
                built_at    = NOW()
        """), {
            "career_id": career_id,
            "onet_code": onet_code,
            "title":     (title or "")[:500],
            "desc":      (description or "")[:1000],
            "emb":       vec_str,
            "model_name": model_name,
        })
        return True
    except Exception as e:
        logger.error(f"[NLP] store_career_embedding(career_id={career_id}): {e}")
        return False


# ─────────────────────────────────────────────────────────────
#  PB34 — Semantic search
# ─────────────────────────────────────────────────────────────

def semantic_search(
    session: Session,
    query_text: str,
    top_k: int = 10,
    min_score: float = 0.2,
    ef_search: int = 100,
) -> list[dict]:
    """
    PB34: Semantic career search using pgvector cosine similarity.
    Generates query embedding then finds nearest career vectors.

    Enhancements (TC19):
    - Sets hnsw.ef_search before query (higher = better recall, default 100 balances
      speed vs accuracy; pgvector default is 40 which favours speed but lowers recall).
    - Measures and returns query_time_ms in each result's metadata.
    - Logs a WARNING if query exceeds VECTOR_SEARCH_SLA_MS (5 000 ms).
    - ef_search param is exposed so callers can tune for their use-case.
    """
    embedding = get_embedding(query_text, task_type="RETRIEVAL_QUERY")
    if not embedding:
        logger.warning("[NLP] semantic_search: could not generate query embedding")
        return []

    vec_str = _vec_to_pg(embedding)
    try:
        # TC19 — Tune HNSW ef_search for this session
        try:
            session.execute(text(f"SET hnsw.ef_search = {int(ef_search)}"))
        except Exception:
            pass  # older pgvector or IVFFlat index — silently skip

        t0 = time.perf_counter()
        rows = session.execute(text("""
            SELECT
                ce.career_id,
                ce.onet_code,
                ce.title,
                ce.description,
                1 - (ce.embedding <=> :vec::vector(768)) AS similarity
            FROM ai.career_embeddings ce
            WHERE 1 - (ce.embedding <=> :vec::vector(768)) >= :min_score
            ORDER BY ce.embedding <=> :vec::vector(768)
            LIMIT :top_k
        """), {"vec": vec_str, "min_score": min_score, "top_k": top_k}).mappings().all()
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

        # TC19 — SLA check
        if elapsed_ms > VECTOR_SEARCH_SLA_MS:
            logger.warning(
                "[NLP][TC19] pgvector search exceeded SLA: %.0f ms > %d ms (top_k=%d)",
                elapsed_ms, VECTOR_SEARCH_SLA_MS, top_k,
            )

        results = [
            {
                "career_id":    str(row["career_id"]),
                "onet_code":    row.get("onet_code"),
                "title":        row["title"] or "",
                "description":  (row.get("description") or "")[:200],
                "similarity":   round(float(row["similarity"]), 4),
                "query_time_ms": elapsed_ms,
            }
            for row in rows
        ]
        logger.debug("[NLP] semantic_search: %d results in %.0f ms", len(results), elapsed_ms)
        return results

    except Exception as e:
        logger.error(f"[NLP] semantic_search failed: {e}")
        return []


def hybrid_search(
    session: Session,
    query_text: str,
    riasec_scores: Optional[list[float]] = None,
    top_k: int = 10,
    min_score: float = 0.15,
    semantic_weight: float = 0.7,
) -> list[dict]:
    """
    PB34: Hybrid search combining:
    - Semantic similarity (70% by default) via pgvector cosine
    - RIASEC profile match (30%) via dot-product with career RIASEC weights

    riasec_scores: [R, I, A, S, E, C] normalized 0-1, or None to skip RIASEC weighting.
    Returns ranked careers with combined_score.
    """
    # Semantic search (wider net — more candidates than top_k)
    candidates = semantic_search(session, query_text, top_k=top_k * 3, min_score=min_score)
    if not candidates:
        return []

    if not riasec_scores or len(riasec_scores) < 6:
        # No RIASEC weighting — return semantic results directly
        return candidates[:top_k]

    # Enrich candidates with RIASEC match from core.careers
    career_ids = [int(c["career_id"]) for c in candidates]
    riasec_map: dict[int, float] = {}

    try:
        rows = session.execute(text("""
            SELECT id,
                   riasec_r, riasec_i, riasec_a,
                   riasec_s, riasec_e, riasec_c
            FROM core.careers
            WHERE id = ANY(:ids)
        """), {"ids": career_ids}).mappings().all()

        for row in rows:
            career_riasec = [
                float(row.get("riasec_r") or 0),
                float(row.get("riasec_i") or 0),
                float(row.get("riasec_a") or 0),
                float(row.get("riasec_s") or 0),
                float(row.get("riasec_e") or 0),
                float(row.get("riasec_c") or 0),
            ]
            # Dot product similarity (normalized)
            dot = sum(a * b for a, b in zip(riasec_scores, career_riasec))
            mag_user   = sum(x**2 for x in riasec_scores) ** 0.5 or 1.0
            mag_career = sum(x**2 for x in career_riasec) ** 0.5 or 1.0
            riasec_map[int(row["id"])] = dot / (mag_user * mag_career)
    except Exception as e:
        logger.warning(f"[NLP] hybrid_search: RIASEC lookup failed: {e}")

    # Combine scores
    results = []
    for c in candidates:
        cid = int(c["career_id"])
        sem_score    = c["similarity"]
        riasec_score = riasec_map.get(cid, 0.0)
        combined     = (
            semantic_weight * sem_score
            + (1 - semantic_weight) * riasec_score
        )
        results.append({**c, "riasec_match": round(riasec_score, 4), "combined_score": round(combined, 4)})

    results.sort(key=lambda x: x["combined_score"], reverse=True)
    return results[:top_k]


def user_career_match(
    session: Session,
    user_id: int,
    top_k: int = 10,
) -> list[dict]:
    """
    PB34: Find careers semantically similar to a user's essay embedding.
    Reads the latest embedding from ai.user_embeddings.
    """
    try:
        row = session.execute(text("""
            SELECT emb FROM ai.user_embeddings
            WHERE user_id = :uid AND source = 'essay'
            ORDER BY built_at DESC LIMIT 1
        """), {"uid": user_id}).fetchone()

        if not row:
            return []

        emb_raw = row[0]
        if isinstance(emb_raw, str):
            vec_str = emb_raw
        elif isinstance(emb_raw, (list, tuple)):
            vec_str = _vec_to_pg(list(emb_raw))
        else:
            vec_str = str(emb_raw)

        rows = session.execute(text("""
            SELECT
                ce.career_id,
                ce.onet_code,
                ce.title,
                ce.description,
                1 - (ce.embedding <=> :vec::vector(768)) AS similarity
            FROM ai.career_embeddings ce
            ORDER BY ce.embedding <=> :vec::vector(768)
            LIMIT :top_k
        """), {"vec": vec_str, "top_k": top_k}).mappings().all()

        return [
            {
                "career_id":   str(row["career_id"]),
                "onet_code":   row.get("onet_code"),
                "title":       row["title"] or "",
                "description": (row.get("description") or "")[:200],
                "similarity":  round(float(row["similarity"]), 4),
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"[NLP] user_career_match(user_id={user_id}): {e}")
        return []


# ─────────────────────────────────────────────────────────────
#  PB33 — Career batch indexing
# ─────────────────────────────────────────────────────────────

def build_career_index(
    session: Session,
    batch_size: int = 50,
    force_rebuild: bool = False,
) -> dict:
    """
    PB33/PB34: Index all careers from core.careers into ai.career_embeddings.

    Generates embedding from: title_vi (or title_en) + description + skills.
    Skips already-indexed careers unless force_rebuild=True.
    Returns progress dict with counts.
    """
    ensure_pgvector_schema(session)

    start_time = time.time()
    indexed = 0
    skipped = 0
    failed  = 0

    try:
        if force_rebuild:
            where_clause = "1=1"
        else:
            where_clause = """
                c.id NOT IN (SELECT career_id FROM ai.career_embeddings)
            """

        rows = session.execute(text(f"""
            SELECT
                c.id,
                c.onet_code,
                COALESCE(c.title_vi, c.title_en, c.title) AS title,
                COALESCE(c.description_vi, c.description, '') AS description
            FROM core.careers c
            WHERE {where_clause}
            ORDER BY c.id
            LIMIT 5000
        """)).mappings().all()

        total = len(rows)

        for i, row in enumerate(rows):
            career_id = int(row["id"])
            title     = (row.get("title") or "").strip()
            desc      = (row.get("description") or "").strip()
            onet_code = row.get("onet_code")

            # Build rich text for embedding
            embed_text = f"{title}. {desc}"[:1800]
            if not embed_text.strip():
                skipped += 1
                continue

            embedding = get_embedding(embed_text, task_type="RETRIEVAL_DOCUMENT")
            if not embedding:
                failed += 1
                logger.warning(f"[NLP] build_career_index: no embedding for career {career_id}")
                continue

            ok = store_career_embedding(
                session, career_id, onet_code, title, desc, embedding
            )
            if ok:
                indexed += 1
            else:
                failed += 1

            # Commit every batch
            if (i + 1) % batch_size == 0:
                session.commit()
                logger.info(f"[NLP] build_career_index: {i+1}/{total} done ({indexed} indexed)")

        session.commit()

    except Exception as e:
        logger.error(f"[NLP] build_career_index failed: {e}")
        session.rollback()

    elapsed = round(time.time() - start_time, 2)
    return {
        "indexed":       indexed,
        "skipped":       skipped,
        "failed":        failed,
        "total_careers": indexed + skipped + failed,
        "elapsed_sec":   elapsed,
    }


# ─────────────────────────────────────────────────────────────
#  PB34 — Index status
# ─────────────────────────────────────────────────────────────

def get_index_status(session: Session) -> dict:
    """PB34: Return vector index coverage statistics."""
    try:
        total_careers = session.execute(
            text("SELECT COUNT(*) FROM core.careers")
        ).scalar() or 0

        indexed = 0
        model_name = None
        last_built = None
        try:
            row = session.execute(text("""
                SELECT COUNT(*) AS cnt,
                       MAX(model_name) AS model,
                       MAX(built_at)  AS last_built
                FROM ai.career_embeddings
            """)).mappings().first()
            if row:
                indexed    = int(row["cnt"] or 0)
                model_name = row.get("model")
                last_built = str(row["last_built"]) if row.get("last_built") else None
        except Exception:
            pass

        user_emb_count = 0
        try:
            user_emb_count = int(
                session.execute(text("SELECT COUNT(*) FROM ai.user_embeddings")).scalar() or 0
            )
        except Exception:
            pass

        return {
            "total_careers":      int(total_careers),
            "indexed_careers":    indexed,
            "coverage_pct":       round(indexed / max(total_careers, 1) * 100, 1),
            "unindexed_careers":  max(int(total_careers) - indexed, 0),
            "user_embeddings":    user_emb_count,
            "vector_dim":         EMBEDDING_DIM,
            "model":              model_name or "gemini-text-embedding-004",
            "last_built":         last_built,
            "pgvector_ready":     indexed > 0,
            "ai_core_url":        AI_CORE_URL,
        }
    except Exception as e:
        return {
            "total_careers":   0,
            "indexed_careers": 0,
            "coverage_pct":    0,
            "unindexed_careers": 0,
            "user_embeddings": 0,
            "vector_dim":      EMBEDDING_DIM,
            "model":           "gemini-text-embedding-004",
            "last_built":      None,
            "pgvector_ready":  False,
            "ai_core_url":     AI_CORE_URL,
            "error":           str(e),
        }
