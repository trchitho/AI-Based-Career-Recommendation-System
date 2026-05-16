"""
Database loaders for the multi-signal scorer.

Reads:
- ai.user_trait_fused → user RIASEC + Big5 vectors
- core.career_interests → career RIASEC vectors (for given O*NET codes)

Wraps queries in module-level cache to avoid repeated DB hits in a single
request cycle (career RIASEC table is small and changes rarely).
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

import psycopg

logger = logging.getLogger(__name__)


def _get_db_url() -> str:
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8",
    )


# ---------------------------------------------------------------------------
# Career RIASEC cache (1 hour TTL) — small table, ~960 rows total
# ---------------------------------------------------------------------------

_CAREER_RIASEC_CACHE: dict[str, list[float]] = {}
_CAREER_RIASEC_CACHE_AT: float = 0.0
_CAREER_RIASEC_CACHE_TTL: float = 3600.0
_CAREER_RIASEC_LOCK = threading.Lock()


def get_career_riasec_lookup() -> dict[str, list[float]]:
    """
    Return dict { onet_code: [R, I, A, S, E, C] } for ALL careers.
    Cached for 1 hour.
    """
    global _CAREER_RIASEC_CACHE, _CAREER_RIASEC_CACHE_AT
    now = time.time()
    with _CAREER_RIASEC_LOCK:
        if _CAREER_RIASEC_CACHE and (now - _CAREER_RIASEC_CACHE_AT) < _CAREER_RIASEC_CACHE_TTL:
            return _CAREER_RIASEC_CACHE

    try:
        with psycopg.connect(_get_db_url()) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT onet_code, r, i, a, s, e, c
                    FROM core.career_interests
                    WHERE r IS NOT NULL
                    """
                )
                rows = cur.fetchall()
    except Exception as e:
        logger.warning("[trait_db_loader] Failed to fetch career RIASEC: %s", e)
        return {}

    lookup: dict[str, list[float]] = {}
    for onet, r, i, a, s, e, c in rows:
        lookup[str(onet)] = [
            float(r or 0),
            float(i or 0),
            float(a or 0),
            float(s or 0),
            float(e or 0),
            float(c or 0),
        ]

    with _CAREER_RIASEC_LOCK:
        _CAREER_RIASEC_CACHE = lookup
        _CAREER_RIASEC_CACHE_AT = now

    logger.info("[trait_db_loader] Loaded career RIASEC for %d careers", len(lookup))
    return lookup


def invalidate_career_riasec_cache() -> None:
    global _CAREER_RIASEC_CACHE, _CAREER_RIASEC_CACHE_AT
    with _CAREER_RIASEC_LOCK:
        _CAREER_RIASEC_CACHE = {}
        _CAREER_RIASEC_CACHE_AT = 0.0


# ---------------------------------------------------------------------------
# User trait fused loader (per-request, no cache — already fast lookup by PK)
# ---------------------------------------------------------------------------


def get_user_trait_fused(user_id: int) -> tuple[Optional[list[float]], Optional[list[float]]]:
    """
    Return (riasec_scores_fused, big5_scores_fused) for given user.
    Returns (None, None) if user has no fused trait yet (cold-start).
    """
    try:
        with psycopg.connect(_get_db_url()) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT riasec_scores_fused, big5_scores_fused
                    FROM ai.user_trait_fused
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    (int(user_id),),
                )
                row = cur.fetchone()
    except Exception as e:
        logger.warning("[trait_db_loader] Failed to fetch user_trait_fused for user %s: %s", user_id, e)
        return None, None

    if not row:
        return None, None

    riasec, big5 = row
    riasec_list = list(riasec) if riasec else None
    big5_list = list(big5) if big5 else None
    return riasec_list, big5_list


# ---------------------------------------------------------------------------
# RIASEC from assessment fallback (if user_trait_fused is empty)
# ---------------------------------------------------------------------------


def get_riasec_from_assessment(assessment_id: int) -> Optional[list[float]]:
    """
    Fallback: read RIASEC scores from core.assessments (latest in same session).
    Returns 6-d list or None.
    """
    dim_order = ["R", "I", "A", "S", "E", "C"]
    try:
        with psycopg.connect(_get_db_url()) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT scores
                    FROM core.assessments
                    WHERE id = %s AND a_type = 'RIASEC'
                    LIMIT 1
                    """,
                    (int(assessment_id),),
                )
                row = cur.fetchone()
                if not row or not row[0]:
                    # Try same session
                    cur.execute(
                        """
                        SELECT a2.scores
                        FROM core.assessments a1
                        JOIN core.assessments a2
                          ON a2.session_id = a1.session_id
                        WHERE a1.id = %s AND a2.a_type = 'RIASEC'
                        LIMIT 1
                        """,
                        (int(assessment_id),),
                    )
                    row = cur.fetchone()
    except Exception as e:
        logger.warning("[trait_db_loader] Failed to fetch RIASEC from assessment %s: %s", assessment_id, e)
        return None

    if not row or not row[0]:
        return None

    scores = row[0]
    if not isinstance(scores, dict):
        return None

    out: list[float] = []
    for dim in dim_order:
        v = scores.get(dim)
        if v is None:
            return None
        try:
            out.append(float(v))
        except (TypeError, ValueError):
            return None
    return out


__all__ = [
    "get_career_riasec_lookup",
    "get_user_trait_fused",
    "get_riasec_from_assessment",
    "invalidate_career_riasec_cache",
]
