"""
vector_service.py
=================
vi-SBERT semantic embedding + pgvector similarity search.

Model: paraphrase-multilingual-mpnet-base-v2 (768-dim, supports Vietnamese)
Storage: PostgreSQL with pgvector extension
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import List, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

MODEL_NAME = "paraphrase-multilingual-mpnet-base-v2"
VECTOR_DIM = 768


@lru_cache(maxsize=1)
def _get_model():
    """Lazy-load SBERT model (cached singleton)."""
    from sentence_transformers import SentenceTransformer
    logger.info("[vector] Loading SBERT model: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info("[vector] Model loaded, dim=%d", VECTOR_DIM)
    return model


def embed(texts: List[str]) -> np.ndarray:
    """Encode list of texts to 768-dim vectors."""
    if not texts:
        return np.zeros((0, VECTOR_DIM), dtype=np.float32)
    model = _get_model()
    vecs = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return vecs.astype(np.float32)


def embed_single(text: str) -> np.ndarray:
    return embed([text])[0]


# ── pgvector table init ────────────────────────────────────────────

INIT_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS core.skill_vectors (
    id          SERIAL PRIMARY KEY,
    skill_name  TEXT NOT NULL UNIQUE,
    embedding   vector(768),
    source      TEXT DEFAULT 'onet',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skill_vectors_embedding_idx
    ON core.skill_vectors USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
"""


def ensure_vector_table(db: Session) -> None:
    """Create table + index if not exists."""
    try:
        db.execute(text(INIT_SQL))
        db.commit()
        logger.info("[vector] skill_vectors table ready")
    except Exception as e:
        db.rollback()
        logger.warning("[vector] Table init skipped: %s", e)


# ── Upsert skill vectors ──────────────────────────────────────────

def upsert_skills(db: Session, skill_names: List[str], source: str = "onet") -> int:
    """Embed skill names and store in pgvector table."""
    if not skill_names:
        return 0

    vecs = embed(skill_names)
    count = 0
    for name, vec in zip(skill_names, vecs):
        try:
            db.execute(
                text("""
                    INSERT INTO core.skill_vectors (skill_name, embedding, source)
                    VALUES (:name, :vec, :src)
                    ON CONFLICT (skill_name) DO UPDATE
                      SET embedding = EXCLUDED.embedding,
                          source    = EXCLUDED.source
                """),
                {"name": name, "vec": vec.tolist(), "src": source},
            )
            count += 1
        except Exception as e:
            logger.debug("[vector] upsert skip %s: %s", name, e)
    db.commit()
    return count


# ── Semantic search ───────────────────────────────────────────────

def find_similar_skills(
    db: Session,
    query_skills: List[str],
    top_k: int = 10,
    threshold: float = 0.75,
) -> List[Tuple[str, float]]:
    """
    Find semantically similar skills using cosine similarity via pgvector.

    Returns: [(skill_name, similarity_score), ...]  sorted desc
    """
    if not query_skills:
        return []

    query_vec = embed(query_skills).mean(axis=0)  # average pool

    try:
        rows = db.execute(
            text("""
                SELECT skill_name,
                       1 - (embedding <=> :vec::vector) AS similarity
                FROM   core.skill_vectors
                WHERE  1 - (embedding <=> :vec::vector) >= :threshold
                ORDER  BY embedding <=> :vec::vector
                LIMIT  :k
            """),
            {"vec": query_vec.tolist(), "threshold": threshold, "k": top_k},
        ).fetchall()
        return [(r.skill_name, float(r.similarity)) for r in rows]
    except Exception as e:
        logger.warning("[vector] similarity search failed: %s", e)
        return []


def skill_semantic_match(
    db: Session,
    cv_skills: List[str],
    job_skills: List[str],
    threshold: float = 0.72,
) -> dict:
    """
    Match CV skills against job skills using vector similarity.

    Returns:
        {
          matched: [(cv_skill, job_skill, score)],
          missing: [job_skill],
          extra:   [cv_skill],
        }
    """
    if not cv_skills or not job_skills:
        return {"matched": [], "missing": list(job_skills), "extra": list(cv_skills)}

    cv_vecs  = embed(cv_skills)   # (N, 768)
    job_vecs = embed(job_skills)  # (M, 768)

    # Cosine sim matrix (already L2-normalized → dot product = cosine)
    sim_matrix = cv_vecs @ job_vecs.T  # (N, M)

    matched_pairs: list = []
    matched_job_idx: set = set()
    matched_cv_idx: set  = set()

    # Greedy best-match
    flat_sorted = np.dstack(np.unravel_index(np.argsort(-sim_matrix, axis=None), sim_matrix.shape))[0]
    for ci, ji in flat_sorted:
        if ci in matched_cv_idx or ji in matched_job_idx:
            continue
        score = float(sim_matrix[ci, ji])
        if score < threshold:
            break
        matched_pairs.append((cv_skills[ci], job_skills[ji], round(score, 3)))
        matched_cv_idx.add(ci)
        matched_job_idx.add(ji)

    missing = [job_skills[j] for j in range(len(job_skills)) if j not in matched_job_idx]
    extra   = [cv_skills[c]  for c in range(len(cv_skills))  if c not in matched_cv_idx]

    return {"matched": matched_pairs, "missing": missing, "extra": extra}
