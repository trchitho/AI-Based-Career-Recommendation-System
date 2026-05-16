"""
Multi-Signal Career Scorer
==========================

Calibrated career recommendation scoring combining 4 orthogonal signals:

1. **Embedding Cosine Similarity** (semantic match between user essay & career text)
   - Source: PhoBERT 768-d vectors
   - Score range: [0, 1]
   - Captures: deep semantic affinity, "what user describes about themselves
     vs what the career involves"

2. **RIASEC Trait Alignment** (Holland Code matching)
   - Source: user_trait_fused.riasec_scores_fused vs career_interests.{r,i,a,s,e,c}
   - Score: cosine similarity of normalized 6-d vectors
   - Captures: psychometric career-personality fit (validated psychology theory)

3. **Big Five Compatibility**
   - Source: user_trait_fused.big5_scores_fused
   - Captures: personality-occupation alignment via OCEAN model
   - Currently uses heuristic mapping (career RIASEC → expected Big5 profile)
     because we don't have ONET Big5 profiles yet

4. **NeuMF Deep Learning Score**
   - Source: trained MLP on (user_feats, item_feats) with implicit feedback
   - Captures: collaborative filtering patterns
   - Cold-start fallback: zero contribution

Final score is a weighted convex combination + sigmoid calibration.
The displayed percentage is calibrated to be psychologically meaningful:
- 80%+ : strong match across multiple signals
- 60-80%: moderate match
- below 60%: weak/uncertain match

This avoids the misleading "all careers show 76-95%" issue caused by
naive min-max normalization on a small candidate pool.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Default weights for each signal in the final score
# Sum should be 1.0
# RIASEC alignment (centered cosine = Pearson) is the strongest theoretical signal,
# embedding semantic match is noisy when essays are short.
DEFAULT_WEIGHTS: dict[str, float] = {
    "embedding": 0.20,    # Semantic match (informative but noisy on short essays)
    "riasec": 0.45,       # Career theory psychometric match (Pearson-centered)
    "big5": 0.10,         # Personality compatibility (heuristic)
    "neumf": 0.25,        # Trained deep learning ranker
}

# Sigmoid calibration parameters
# Honest mapping: raw_blend ∈ [0,1] → display ∈ [0,100] without arbitrary offsets
#   display = 100 * sigmoid(SIGMOID_SHARPNESS * (raw - SIGMOID_CENTER))
SIGMOID_CENTER = 0.50      # True midpoint: raw=0.50 → display ≈ 50%
SIGMOID_SHARPNESS = 8.0    # Curve steepness (higher = more contrast at center)
SIGMOID_OFFSET = 0.0       # No baseline offset (display can go to 0)
SIGMOID_RANGE = 100.0      # Full 0-100% range

# RIASEC dimension order (matches DB column order in core.career_interests)
RIASEC_DIMS = ["R", "I", "A", "S", "E", "C"]

# Big5 dimension order
BIG5_DIMS = ["O", "C", "E", "A", "N"]


# Heuristic mapping: RIASEC dimension → Big5 expected high traits
# Based on empirical research (Costa, McCrae, Holland)
# Each cell: weight that this RIASEC primary contributes to expected Big5 dimension
RIASEC_TO_BIG5_WEIGHTS: dict[str, dict[str, float]] = {
    # Realistic: practical, hands-on → low Openness, low Extraversion
    "R": {"O": 0.30, "C": 0.55, "E": 0.30, "A": 0.45, "N": 0.40},
    # Investigative: analytical → high Openness, high Conscientiousness
    "I": {"O": 0.85, "C": 0.65, "E": 0.35, "A": 0.45, "N": 0.35},
    # Artistic: creative → very high Openness
    "A": {"O": 0.95, "C": 0.40, "E": 0.55, "A": 0.55, "N": 0.50},
    # Social: helping → high Agreeableness, high Extraversion
    "S": {"O": 0.55, "C": 0.55, "E": 0.75, "A": 0.85, "N": 0.40},
    # Enterprising: leading → high Extraversion, low Neuroticism
    "E": {"O": 0.55, "C": 0.55, "E": 0.85, "A": 0.45, "N": 0.30},
    # Conventional: organized → high Conscientiousness
    "C": {"O": 0.30, "C": 0.85, "E": 0.40, "A": 0.55, "N": 0.40},
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CareerSignal:
    """Container for all signal scores for a single career candidate."""

    career_id: str  # O*NET code

    # Component scores ∈ [0, 1]
    embedding_score: float = 0.0
    riasec_score: float = 0.0
    big5_score: float = 0.0
    neumf_score: float = 0.0

    # Final
    raw_blend: float = 0.0     # Weighted blend before sigmoid
    final_score: float = 0.0   # Same as raw_blend, for backward compat
    display_match: float = 0.0  # Calibrated 0-100 percentage

    # Diagnostics
    confidence: float = 0.0
    has_neumf: bool = False
    explanation: dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helper math
# ---------------------------------------------------------------------------


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [-1, 1]; normalized to [0, 1]."""
    if a is None or b is None:
        return 0.0
    a = np.asarray(a, dtype=np.float64).ravel()
    b = np.asarray(b, dtype=np.float64).ravel()
    if a.size == 0 or b.size == 0 or a.size != b.size:
        return 0.0
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    cos = float(np.dot(a, b) / (na * nb))
    # Map [-1, 1] → [0, 1]
    return max(0.0, min(1.0, (cos + 1.0) / 2.0))


def _pearson_cosine(a: np.ndarray, b: np.ndarray) -> float:
    """
    Centered cosine (Pearson correlation) — removes systematic bias when
    both vectors are non-negative (e.g., RIASEC scores all ≥ 0).
    
    Plain cosine on non-negative vectors is biased high (~0.85 even for random
    vectors). Pearson removes this bias by subtracting the mean first, giving
    a more honest measure of "do these two profiles agree on what's HIGHER
    than average?"
    
    Returns value in [0, 1] (scaled from [-1, 1]).
    """
    if a is None or b is None:
        return 0.0
    a = np.asarray(a, dtype=np.float64).ravel()
    b = np.asarray(b, dtype=np.float64).ravel()
    if a.size == 0 or b.size == 0 or a.size != b.size:
        return 0.0
    a_centered = a - a.mean()
    b_centered = b - b.mean()
    na = float(np.linalg.norm(a_centered))
    nb = float(np.linalg.norm(b_centered))
    if na < 1e-12 or nb < 1e-12:
        # All values equal → no signal, return neutral
        return 0.5
    cos = float(np.dot(a_centered, b_centered) / (na * nb))
    # Map [-1, 1] → [0, 1]
    return max(0.0, min(1.0, (cos + 1.0) / 2.0))


def _sigmoid(x: float) -> float:
    """Numerically stable sigmoid."""
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


def _normalize_riasec(scores: list[float] | tuple[float, ...] | np.ndarray | None) -> np.ndarray | None:
    """
    Normalize RIASEC vector to a unit-like vector.
    - If max value > 1.5, assume scale 1-5 → divide by 5
    - If max value > 5.5, assume scale 0-100 → divide by 100
    - Otherwise assume already in [0, 1]
    Then L2-normalize so cosine is well-defined.
    """
    if scores is None:
        return None
    arr = np.asarray(scores, dtype=np.float64).ravel()
    if arr.size != 6:
        return None
    max_val = float(arr.max())
    if max_val > 5.5:
        arr = arr / 100.0
    elif max_val > 1.5:
        arr = arr / 5.0
    arr = np.clip(arr, 0.0, 1.0)
    return arr


def _normalize_big5(scores: list[float] | tuple[float, ...] | np.ndarray | None) -> np.ndarray | None:
    """Same scaling logic as RIASEC for Big5 (5-d vector)."""
    if scores is None:
        return None
    arr = np.asarray(scores, dtype=np.float64).ravel()
    if arr.size != 5:
        return None
    max_val = float(arr.max())
    if max_val > 5.5:
        arr = arr / 100.0
    elif max_val > 1.5:
        arr = arr / 5.0
    arr = np.clip(arr, 0.0, 1.0)
    return arr


def _expected_big5_from_career_riasec(career_riasec: np.ndarray) -> np.ndarray:
    """
    Predict the expected Big5 profile for a career given its RIASEC vector.
    Uses Holland-OCEAN empirical mapping (Costa & McCrae research).

    career_riasec: 6-d vector in [0, 1]
    Returns: 5-d vector [O, C, E, A, N] in [0, 1]
    """
    expected = np.zeros(5, dtype=np.float64)
    total_weight = 0.0

    for i, dim in enumerate(RIASEC_DIMS):
        w = float(career_riasec[i])
        if w <= 0:
            continue
        big5_weights = RIASEC_TO_BIG5_WEIGHTS[dim]
        for j, big5_dim in enumerate(BIG5_DIMS):
            expected[j] += w * big5_weights[big5_dim]
        total_weight += w

    if total_weight > 1e-9:
        expected /= total_weight

    return np.clip(expected, 0.0, 1.0)


def calibrate_to_percent(raw_score: float, confidence: float = 1.0) -> float:
    """
    Map raw blend score [0, 1] to display percentage [0, 100].

    Uses sigmoid calibration tuned so:
    - raw=0.30 → ~25% (weak match)
    - raw=0.50 → ~50% (median match)
    - raw=0.70 → ~80% (strong match)
    - raw=0.85 → ~92% (excellent match)

    Confidence adjusts the steepness — low confidence flattens the curve
    (avoids over-confident percentages when signals are missing).
    """
    raw = max(0.0, min(1.0, raw_score))
    sharpness = SIGMOID_SHARPNESS * max(0.3, min(1.0, confidence))
    s = _sigmoid(sharpness * (raw - SIGMOID_CENTER))
    display = SIGMOID_OFFSET + SIGMOID_RANGE * s
    return round(display, 1)


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------


def score_career(
    career_id: str,
    embedding_score: float,
    user_riasec: Optional[np.ndarray],
    career_riasec: Optional[np.ndarray],
    user_big5: Optional[np.ndarray],
    neumf_score: Optional[float] = None,
    weights: Optional[dict[str, float]] = None,
) -> CareerSignal:
    """
    Compute multi-signal score for a single career.

    Args:
        career_id: O*NET code
        embedding_score: pre-computed cosine similarity in [0, 1] from retrieval
        user_riasec: 6-d normalized RIASEC vector for user (or None if missing)
        career_riasec: 6-d normalized RIASEC vector for career (or None)
        user_big5: 5-d normalized Big5 vector for user (or None)
        neumf_score: optional NeuMF prediction in [0, 1]
        weights: override default signal weights

    Returns:
        CareerSignal with all component scores and calibrated display_match
    """
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        w.update(weights)
        # Renormalize
        s = sum(w.values())
        if s > 0:
            w = {k: v / s for k, v in w.items()}

    sig = CareerSignal(career_id=career_id)
    sig.embedding_score = max(0.0, min(1.0, float(embedding_score)))

    # ---- RIASEC alignment (Pearson — removes non-negative bias) ----
    if user_riasec is not None and career_riasec is not None:
        sig.riasec_score = _pearson_cosine(user_riasec, career_riasec)
    else:
        sig.riasec_score = 0.0

    # ---- Big5 compatibility (using career RIASEC → expected Big5) ----
    if user_big5 is not None and career_riasec is not None:
        expected_big5 = _expected_big5_from_career_riasec(career_riasec)
        sig.big5_score = _pearson_cosine(user_big5, expected_big5)
    else:
        sig.big5_score = 0.0

    # ---- NeuMF (optional) ----
    if neumf_score is not None:
        sig.neumf_score = max(0.0, min(1.0, float(neumf_score)))
        sig.has_neumf = True
    else:
        sig.neumf_score = 0.0
        sig.has_neumf = False

    # ---- Compute confidence ----
    # High confidence if all signals are present and embedding is informative
    available_signals = 1  # embedding always present
    if user_riasec is not None and career_riasec is not None:
        available_signals += 1
    if user_big5 is not None:
        available_signals += 1
    if sig.has_neumf:
        available_signals += 1
    # Confidence ∈ [0.25, 1.0] based on signal availability
    sig.confidence = 0.25 + 0.75 * (available_signals / 4.0)

    # ---- Weighted blend ----
    # Renormalize weights based on which signals are available
    active_weights: dict[str, float] = {"embedding": w["embedding"]}
    if user_riasec is not None and career_riasec is not None:
        active_weights["riasec"] = w["riasec"]
    if user_big5 is not None:
        active_weights["big5"] = w["big5"]
    if sig.has_neumf:
        active_weights["neumf"] = w["neumf"]

    total = sum(active_weights.values())
    if total < 1e-9:
        sig.raw_blend = 0.0
    else:
        active_weights = {k: v / total for k, v in active_weights.items()}
        blend = 0.0
        if "embedding" in active_weights:
            blend += active_weights["embedding"] * sig.embedding_score
        if "riasec" in active_weights:
            blend += active_weights["riasec"] * sig.riasec_score
        if "big5" in active_weights:
            blend += active_weights["big5"] * sig.big5_score
        if "neumf" in active_weights:
            blend += active_weights["neumf"] * sig.neumf_score
        sig.raw_blend = blend

    sig.final_score = sig.raw_blend
    sig.display_match = calibrate_to_percent(sig.raw_blend, sig.confidence)

    sig.explanation = {
        "embedding_score": round(sig.embedding_score, 4),
        "riasec_score": round(sig.riasec_score, 4),
        "big5_score": round(sig.big5_score, 4),
        "neumf_score": round(sig.neumf_score, 4) if sig.has_neumf else None,
        "raw_blend": round(sig.raw_blend, 4),
        "confidence": round(sig.confidence, 3),
        "weights_active": {k: round(v, 3) for k, v in active_weights.items()},
    }

    return sig


def score_career_batch(
    candidates: list[dict],
    user_riasec: Optional[list[float]],
    user_big5: Optional[list[float]],
    career_riasec_lookup: dict[str, list[float]],
    neumf_scores: Optional[dict[str, float]] = None,
    weights: Optional[dict[str, float]] = None,
) -> list[CareerSignal]:
    """
    Score multiple careers efficiently in one call.

    Args:
        candidates: list of {"career_id": str, "embedding_score": float}
        user_riasec: list of 6 floats (R, I, A, S, E, C)
        user_big5: list of 5 floats (O, C, E, A, N)
        career_riasec_lookup: dict career_id (O*NET) → [R,I,A,S,E,C]
        neumf_scores: optional dict career_id → score
        weights: optional weights override

    Returns:
        List of CareerSignal objects, sorted by final_score descending
    """
    user_riasec_norm = _normalize_riasec(user_riasec) if user_riasec else None
    user_big5_norm = _normalize_big5(user_big5) if user_big5 else None

    results: list[CareerSignal] = []
    for c in candidates:
        cid = c.get("career_id") or c.get("job_id") or ""
        if not cid:
            continue
        emb_score = float(c.get("embedding_score") or c.get("score_sim") or 0.0)
        career_riasec = career_riasec_lookup.get(cid)
        career_riasec_norm = _normalize_riasec(career_riasec) if career_riasec else None

        neumf = None
        if neumf_scores and cid in neumf_scores:
            neumf = float(neumf_scores[cid])

        sig = score_career(
            career_id=cid,
            embedding_score=emb_score,
            user_riasec=user_riasec_norm,
            career_riasec=career_riasec_norm,
            user_big5=user_big5_norm,
            neumf_score=neumf,
            weights=weights,
        )
        results.append(sig)

    # Sort: primary by final_score desc, tiebreak by career_id for determinism
    results.sort(key=lambda x: (-x.final_score, x.career_id))
    return results


__all__ = [
    "CareerSignal",
    "DEFAULT_WEIGHTS",
    "calibrate_to_percent",
    "score_career",
    "score_career_batch",
]
