# app/modules/recommendation/thompson_sampling.py
"""
Thompson Sampling service for career recommendation re-ranking.

Each (user_id, job_onet) pair maintains a Beta distribution:
  alpha = total_likes + 1      (prior = 1 → uniform)
  beta  = total_impressions - total_likes + 1

A higher alpha/beta ratio means the user has liked this career more often.
The expected value E[θ] = alpha / (alpha + beta) is used as a re-ranking boost.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.logging import logger
from sqlalchemy import text
from sqlalchemy.orm import Session

# Weight for Thompson Sampling boost relative to NeuMF match_score
TS_BOOST_WEIGHT = 0.15


class ThompsonSamplingService:
    """Records user feedback and provides re-ranking boosts."""

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def record_like(
        self,
        db: Session,
        user_id: int,
        job_onet: str,
    ) -> Dict[str, Any]:
        """
        Record a "like" (reward = 1) for a career.

        - Increments alpha for the Beta distribution.
        - Also logs a 'save' event in analytics.career_events for ML training.
        - Creates a row in analytics.career_feedback if one does not exist.
        """
        self._upsert_feedback(db, user_id=user_id, job_onet=job_onet, reward=1)
        self._log_career_event(db, user_id=user_id, job_onet=job_onet, event_type="save")
        db.commit()

        row = self._get_feedback(db, user_id, job_onet)
        alpha = row["alpha"] if row else 2
        beta = row["beta"] if row else 1
        expected = alpha / (alpha + beta)
        logger.info(
            f"[TS] Like recorded: user={user_id} job={job_onet} "
            f"alpha={alpha} beta={beta} E[θ]={expected:.3f}"
        )
        return {
            "ok": True,
            "job_onet": job_onet,
            "alpha": alpha,
            "beta": beta,
            "expected_reward": round(expected, 4),
        }

    def apply_boost(
        self,
        db: Session,
        user_id: int,
        items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Re-rank recommendations by adding a Thompson Sampling boost.

        boost(career) = TS_BOOST_WEIGHT × E[θ(career)]

        Items are sorted by (match_score + boost) descending.
        The original position numbering is updated after re-ranking.
        """
        if not items or not user_id:
            return items

        # Fetch feedback for all relevant careers in one query
        job_onets = [
            it.get("job_onet") or it.get("career_id")
            for it in items
            if it.get("job_onet") or it.get("career_id")
        ]
        feedback_map = self._bulk_get_feedback(db, user_id, job_onets)

        for it in items:
            onet = it.get("job_onet") or it.get("career_id") or ""
            fb = feedback_map.get(onet)
            if fb:
                alpha, beta = fb["alpha"], fb["beta"]
            else:
                alpha, beta = 1, 1  # no prior → uniform Beta(1,1)

            expected = alpha / (alpha + beta)
            boost = TS_BOOST_WEIGHT * expected
            it["ts_boost"] = round(boost, 4)
            it["ts_expected_reward"] = round(expected, 4)
            it["match_score_boosted"] = it.get("match_score", 0.0) + boost

        # Sort by boosted score descending
        items.sort(
            key=lambda x: (
                -x.get("match_score_boosted", 0.0),
                x.get("job_onet", ""),
            )
        )

        # Re-assign positions after re-ranking
        for idx, it in enumerate(items, start=1):
            it["position"] = idx

        logger.info(f"[TS] Applied boost to {len(items)} careers for user {user_id}")
        return items

    # ------------------------------------------------------------------ #
    # DB helpers
    # ------------------------------------------------------------------ #

    def _upsert_feedback(
        self,
        db: Session,
        user_id: int,
        job_onet: str,
        reward: int,  # 1 = like, -1 = dislike (future)
    ) -> None:
        """
        Upsert a row in analytics.career_feedback.
        alpha tracks total rewards (likes); beta tracks total non-likes (impressions - likes).
        """
        db.execute(
            text(
                """
                INSERT INTO analytics.career_feedback
                    (user_id, job_onet, alpha, beta)
                VALUES
                    (:user_id, :job_onet,
                     CASE WHEN :reward = 1 THEN 2 ELSE 1 END,
                     CASE WHEN :reward = 1 THEN 1 ELSE 2 END)
                ON CONFLICT (user_id, job_onet) DO UPDATE
                    SET alpha = analytics.career_feedback.alpha +
                                CASE WHEN :reward = 1 THEN 1 ELSE 0 END,
                        beta  = analytics.career_feedback.beta  +
                                CASE WHEN :reward = 1 THEN 0 ELSE 1 END,
                        updated_at = NOW()
                """
            ),
            {"user_id": user_id, "job_onet": job_onet, "reward": reward},
        )

    def _get_feedback(
        self,
        db: Session,
        user_id: int,
        job_onet: str,
    ) -> Optional[Dict[str, int]]:
        row = db.execute(
            text(
                """
                SELECT alpha, beta
                FROM analytics.career_feedback
                WHERE user_id = :user_id AND job_onet = :job_onet
                """
            ),
            {"user_id": user_id, "job_onet": job_onet},
        ).mappings().first()
        if not row:
            return None
        return {"alpha": int(row["alpha"]), "beta": int(row["beta"])}

    def _bulk_get_feedback(
        self,
        db: Session,
        user_id: int,
        job_onets: List[str],
    ) -> Dict[str, Dict[str, int]]:
        """
        Fetch alpha/beta for all (user_id, job_onet) pairs in one query.
        Returns {job_onet: {alpha, beta}}.
        """
        if not job_onets:
            return {}

        rows = db.execute(
            text(
                """
                SELECT job_onet, alpha, beta
                FROM analytics.career_feedback
                WHERE user_id = :user_id
                  AND job_onet = ANY(:job_onets)
                """
            ),
            {"user_id": user_id, "job_onets": job_onets},
        ).mappings().all()

        return {
            row["job_onet"]: {"alpha": int(row["alpha"]), "beta": int(row["beta"])}
            for row in rows
        }

    def _log_career_event(
        self,
        db: Session,
        user_id: int,
        job_onet: str,
        event_type: str,
    ) -> None:
        try:
            db.execute(
                text(
                    """
                    INSERT INTO analytics.career_events
                        (user_id, job_id, event_type, source)
                    VALUES
                        (:user_id, :job_id, :event_type, 'thompson_sampling')
                    """
                ),
                {"user_id": user_id, "job_id": job_onet, "event_type": event_type},
            )
        except Exception as e:
            logger.warning(f"[TS] Failed to log career event: {e}")
