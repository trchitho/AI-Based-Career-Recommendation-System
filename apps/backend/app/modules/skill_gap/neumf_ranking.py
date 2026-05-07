"""
neumf_ranking.py
================
Neural Matrix Factorization (NeuMF) – inspired skill/career ranking.

Architecture (lightweight, no GPU required):
  score(user, item) = sigmoid(
      GMF_output + MLP_output + bias_item
  )
  GMF: element-wise product of user_vec ⊙ item_vec
  MLP: concat(user_vec, item_vec) → Linear → ReLU → Linear → scalar

Since we don't have training pairs yet, we fall back to a feature-based
score that uses the same formula with fixed weights until enough feedback
is collected.
"""
from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Hyper-params ─────────────────────────────────────────────────
LATENT_DIM = 32      # embedding dimension for GMF/MLP factors
MLP_HIDDEN  = 64     # MLP hidden layer size


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-50, min(50, x))))


class NeuMFScorer:
    """
    Lightweight NeuMF scorer for skill/career ranking.

    Without trained weights we use a deterministic feature score;
    weights are updated incrementally via feedback (see thompson_sampling.py).
    """

    def __init__(self):
        rng = np.random.default_rng(42)
        # GMF user/item factors (will be updated with real embeddings)
        self._w_gmf = rng.normal(0, 0.01, LATENT_DIM).astype(np.float32)
        # MLP output weight
        self._w_mlp_out = rng.normal(0, 0.01, MLP_HIDDEN).astype(np.float32)
        # Item bias vector
        self._bias: Dict[str, float] = {}

    # ── Core scoring ─────────────────────────────────────────────

    def score_skill(
        self,
        cv_vec: np.ndarray,
        skill_vec: np.ndarray,
        importance: float = 0.5,
        feedback_bonus: float = 0.0,
    ) -> float:
        """
        Score = sigmoid(GMF_scalar + MLP_scalar + importance_bias + feedback_bonus)

        cv_vec, skill_vec: 768-dim L2-normalized SBERT embeddings
        importance:        O*NET importance score [0,1]
        feedback_bonus:    Thompson Sampling bonus from user interactions
        """
        # Truncate to LATENT_DIM for efficiency
        u = cv_vec[:LATENT_DIM]
        v = skill_vec[:LATENT_DIM]

        # GMF: element-wise product → weighted sum
        gmf_out = float(np.dot(u * v, self._w_gmf))

        # MLP: concatenate → hidden layer (simulated via dot product)
        concat = np.concatenate([u, v])[:MLP_HIDDEN]
        mlp_hidden = np.maximum(0, concat)  # ReLU
        mlp_out = float(np.dot(mlp_hidden, self._w_mlp_out[:len(mlp_hidden)]))

        raw = gmf_out + mlp_out * 0.5 + importance * 2.0 + feedback_bonus
        return _sigmoid(raw)

    def rank_skills(
        self,
        cv_vec: np.ndarray,
        skills: List[Dict[str, Any]],
        feedback_map: Optional[Dict[str, float]] = None,
        top_k: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Rank list of skills using NeuMF score.

        skills: [{"name": str, "embedding": np.ndarray, "importance": float, ...}]
        Returns sorted list with "neumf_score" added.
        """
        feedback_map = feedback_map or {}
        scored = []

        for sk in skills:
            vec = sk.get("embedding")
            if vec is None or len(vec) == 0:
                vec = np.zeros(LATENT_DIM, dtype=np.float32)

            importance = float(sk.get("importance", 0.5))
            fb_bonus   = feedback_map.get(sk["name"], 0.0)

            score = self.score_skill(cv_vec, vec, importance, fb_bonus)
            scored.append({**sk, "neumf_score": round(score, 4)})

        scored.sort(key=lambda x: x["neumf_score"], reverse=True)
        return scored[:top_k]

    def update_bias(self, item_name: str, delta: float) -> None:
        """Increment item bias after positive feedback."""
        self._bias[item_name] = self._bias.get(item_name, 0.0) + delta


# Singleton
_scorer: Optional[NeuMFScorer] = None


def get_scorer() -> NeuMFScorer:
    global _scorer
    if _scorer is None:
        _scorer = NeuMFScorer()
    return _scorer


# ── Convenience: rank from plain skill names ──────────────────────

def rank_skills_by_name(
    cv_skills: List[str],
    job_skills: List[Dict[str, Any]],
    feedback_map: Optional[Dict[str, float]] = None,
    top_k: int = 20,
) -> List[Dict[str, Any]]:
    """
    High-level ranking that handles embedding internally.
    job_skills: [{"name": str, "importance": float, ...}]
    """
    from .vector_service import embed

    if not cv_skills or not job_skills:
        return job_skills[:top_k]

    # Build CV centroid embedding
    cv_vecs = embed(cv_skills)
    cv_vec  = cv_vecs.mean(axis=0)

    # Embed job skills
    skill_names = [s["name"] for s in job_skills]
    skill_vecs  = embed(skill_names)

    skills_with_vecs = [
        {**s, "embedding": skill_vecs[i]}
        for i, s in enumerate(job_skills)
    ]

    scorer = get_scorer()
    return scorer.rank_skills(cv_vec, skills_with_vecs, feedback_map, top_k)
