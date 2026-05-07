"""
thompson_sampling.py
====================
Thompson Sampling (Beta-Bernoulli bandit) để tự điều chỉnh gợi ý
dựa trên lượt click/like của người dùng.

Mỗi item (skill / career) có:
    alpha = clicks + 1      (prior = 1 → non-zero CTR estimate)
    beta  = impressions - clicks + 1

Khi cần rank, sample CTR ~ Beta(alpha, beta) cho mỗi item,
dùng sample đó để boost/penalize score từ NeuMF.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── DB table ──────────────────────────────────────────────────────

INIT_SQL = """
CREATE TABLE IF NOT EXISTS core.feedback_events (
    id           BIGSERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    item_type    TEXT NOT NULL,          -- 'skill' | 'career' | 'job'
    item_name    TEXT NOT NULL,
    event_type   TEXT NOT NULL,          -- 'impression' | 'click' | 'like' | 'dislike'
    analysis_id  INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_user_item_idx
    ON core.feedback_events (user_id, item_type, item_name);
"""


def ensure_feedback_table(db: Session) -> None:
    try:
        db.execute(text(INIT_SQL))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("[thompson] Table init: %s", e)


# ── Record events ─────────────────────────────────────────────────

def record_event(
    db: Session,
    user_id: int,
    item_type: str,
    item_name: str,
    event_type: str,
    analysis_id: Optional[int] = None,
) -> None:
    """Record impression / click / like / dislike."""
    try:
        db.execute(
            text("""
                INSERT INTO core.feedback_events
                    (user_id, item_type, item_name, event_type, analysis_id)
                VALUES (:uid, :itype, :iname, :etype, :aid)
            """),
            {
                "uid": user_id, "itype": item_type,
                "iname": item_name, "etype": event_type,
                "aid": analysis_id,
            },
        )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("[thompson] record_event: %s", e)


# ── Compute Beta params ───────────────────────────────────────────

def get_beta_params(
    db: Session,
    user_id: int,
    item_type: str,
    item_names: List[str],
) -> Dict[str, Dict[str, float]]:
    """
    For each item, compute (alpha, beta) from DB feedback.

    alpha = positive_events + 1
    beta  = negative_events + impressions_without_click + 1
    """
    if not item_names:
        return {}

    try:
        rows = db.execute(
            text("""
                SELECT item_name,
                       COUNT(*) FILTER (WHERE event_type IN ('click','like')) AS positives,
                       COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
                       COUNT(*) FILTER (WHERE event_type = 'dislike') AS negatives
                FROM   core.feedback_events
                WHERE  user_id   = :uid
                  AND  item_type = :itype
                  AND  item_name = ANY(:names)
                GROUP  BY item_name
            """),
            {"uid": user_id, "itype": item_type, "names": item_names},
        ).fetchall()

        result: Dict[str, Dict[str, float]] = {}
        for r in rows:
            positives   = int(r.positives or 0)
            impressions = int(r.impressions or 0)
            negatives   = int(r.negatives or 0)
            alpha = positives + 1
            beta  = max(impressions - positives, 0) + negatives + 1
            result[r.item_name] = {"alpha": alpha, "beta": beta}
        return result
    except Exception as e:
        logger.warning("[thompson] get_beta_params: %s", e)
        return {}


# ── Sample & compute bonus ────────────────────────────────────────

def compute_thompson_bonus(
    db: Session,
    user_id: int,
    item_type: str,
    item_names: List[str],
    scale: float = 0.3,
) -> Dict[str, float]:
    """
    Sample CTR from Beta distribution → convert to score bonus.

    bonus = (sampled_CTR - 0.5) * scale
      → positive if user liked it before
      → negative if user disliked / ignored it
    """
    params = get_beta_params(db, user_id, item_type, item_names)
    bonuses: Dict[str, float] = {}

    for name in item_names:
        p = params.get(name, {"alpha": 1, "beta": 1})
        sampled_ctr = float(np.random.beta(p["alpha"], p["beta"]))
        bonuses[name] = round((sampled_ctr - 0.5) * scale, 4)

    return bonuses


# ── Rerank with Thompson Sampling ────────────────────────────────

def rerank_with_thompson(
    db: Session,
    user_id: int,
    item_type: str,
    items: List[Dict[str, Any]],
    score_key: str = "neumf_score",
    name_key: str = "name",
) -> List[Dict[str, Any]]:
    """
    Adjust existing scores with Thompson Sampling bonus and re-sort.

    items: list of dicts with at least {name_key: str, score_key: float}
    Returns same list with 'thompson_score' added, sorted desc.
    """
    names   = [it[name_key] for it in items]
    bonuses = compute_thompson_bonus(db, user_id, item_type, names)

    for it in items:
        base  = float(it.get(score_key, 0.5))
        bonus = bonuses.get(it[name_key], 0.0)
        it["thompson_score"] = round(base + bonus, 4)

    items.sort(key=lambda x: x["thompson_score"], reverse=True)
    return items
