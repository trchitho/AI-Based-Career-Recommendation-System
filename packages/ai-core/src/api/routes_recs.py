# src/api/routes_recs.py
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_core.recsys.bandit import FinalItem, recommend_with_bandit
from ai_core.recsys.multi_signal_scorer import (
    DEFAULT_WEIGHTS,
    calibrate_to_percent,
    score_career_batch,
)
from ai_core.recsys.service import infer_scores
from ai_core.recsys.trait_db_loader import (
    get_career_riasec_lookup,
    get_riasec_from_assessment,
    get_user_trait_fused,
)
from ai_core.retrieval.service_pgvector import search_candidates_for_embedding
from ai_core.traits.loader import load_traits_and_embedding_for_assessment

from .cache import recs_cache
from .metrics import metrics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recs", tags=["recommendations"])


class TopCareersRequest(BaseModel):
    assessment_id: int
    top_k: int = 20


class CareerItem(BaseModel):
    career_id: str
    final_score: float
    display_match: float = 0.0
    embedding_score: float = 0.0
    riasec_score: float = 0.0
    big5_score: float = 0.0
    neumf_score: float = 0.0
    confidence: float = 0.0


class TopCareersResponse(BaseModel):
    items: list[CareerItem]


def _cache_key(assessment_id: int, top_k: int) -> str:
    return f"recs:top_careers:{assessment_id}:{top_k}"


@router.post("/top_careers", response_model=TopCareersResponse)
def top_careers(req: TopCareersRequest):
    """
    Multi-signal career recommendation.

    Pipeline:
      1. Retrieval (B3): pgvector cosine search → top 200 candidates by embedding
      2. NeuMF re-rank (B4): MLP score for each candidate (cold-start safe)
      3. Multi-signal blend (NEW):
         - Embedding cosine (weight 40%)
         - RIASEC trait alignment (weight 35%)
         - Big5 personality compatibility (weight 10%)
         - NeuMF deep learning score (weight 15%)
      4. Sigmoid calibration → display_match in 0-100% range
      5. Cache result for 10 minutes

    Returns careers sorted by calibrated final_score descending.
    """
    metrics.inc("recs_total")

    # ---- 0) Cache lookup ----
    cache_key = _cache_key(req.assessment_id, req.top_k)
    cached = recs_cache.get(cache_key)
    if cached is not None:
        metrics.inc("cache_hit")
        return cached
    metrics.inc("cache_miss")

    # ---- 1) Load user assessment snapshot (essay embedding + user_id) ----
    try:
        snapshot = load_traits_and_embedding_for_assessment(req.assessment_id)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error loading assessment snapshot: {e}",
        ) from e

    user_vec = snapshot.embedding_vector
    user_id = snapshot.user_id

    # ---- 2) Retrieval B3 (semantic candidates) ----
    candidates = search_candidates_for_embedding(user_vec, top_n=200)
    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates from retrieval")

    candidate_ids = [c.job_id for c in candidates]

    # ---- 3) Load user traits (RIASEC + Big5) ----
    user_riasec, user_big5 = get_user_trait_fused(user_id)
    if user_riasec is None:
        # Fallback: read directly from assessment if fused not yet built
        user_riasec = get_riasec_from_assessment(req.assessment_id)
        if user_riasec:
            logger.info("[recs] Using RIASEC from assessment %s (fused not available)", req.assessment_id)

    if user_riasec is None:
        logger.warning("[recs] User %s has no RIASEC trait — multi-signal scorer will skip RIASEC component", user_id)
        metrics.inc("recs_no_riasec")

    if user_big5 is None:
        logger.debug("[recs] User %s has no Big5 trait — Big5 component skipped", user_id)
        metrics.inc("recs_no_big5")

    # ---- 4) Career RIASEC lookup (cached) ----
    career_riasec_lookup = get_career_riasec_lookup()

    # ---- 5) NeuMF deep learning scores (best effort) ----
    neumf_scores: dict[str, float] = {}
    try:
        scored = infer_scores(user_id, candidate_ids)
        if scored:
            metrics.inc("recs_neumf_ok")
            # scored is list[dict] with {"job_id", "rank_score"}
            for item in scored:
                if isinstance(item, dict):
                    cid = item.get("job_id") or item.get("career_id")
                    rs = item.get("rank_score")
                    if cid and rs is not None:
                        neumf_scores[str(cid)] = float(rs)
                else:
                    cid = getattr(item, "job_id", None) or getattr(item, "career_id", None)
                    rs = getattr(item, "rank_score", None)
                    if cid and rs is not None:
                        neumf_scores[str(cid)] = float(rs)
        else:
            logger.info("[recs] NeuMF returned empty for user_id=%s — using retrieval+trait only", user_id)
            metrics.inc("recs_cold_start")
    except ValueError as e:
        # Cold-start: user not in user_feats — expected for brand-new users
        logger.info(
            "[recs] NeuMF cold-start for user_id=%s (reason=%s); using retrieval+trait scoring",
            user_id, str(e)[:100],
        )
        metrics.inc("recs_cold_start")
    except Exception as e:
        logger.warning("[recs] NeuMF inference failed: %s", e)
        metrics.inc("recs_neumf_error")

    # ---- 6) Multi-signal scoring ----
    # Re-normalize embedding scores: retrieval gives raw cosine which has DC offset
    # bias (user essays vs career texts). Rank-based rescale within retrieved
    # candidates is HONEST because it preserves ordering and reflects relative
    # match quality among the top-N candidates (which are already pre-filtered).
    raw_emb_scores = [c.score_sim for c in candidates]
    if raw_emb_scores:
        emb_min = min(raw_emb_scores)
        emb_max = max(raw_emb_scores)
        emb_range = max(emb_max - emb_min, 1e-9)
    else:
        emb_min = 0.0
        emb_range = 1.0

    candidate_dicts = []
    for c in candidates:
        # Rescale to [0, 1] within retrieved candidates
        # Top candidate gets 1.0, bottom gets 0.0
        # This is RANK information from retrieval, not a fixed offset
        rescaled = (c.score_sim - emb_min) / emb_range
        candidate_dicts.append({
            "career_id": c.job_id,
            "embedding_score": rescaled,
        })

    signals = score_career_batch(
        candidates=candidate_dicts,
        user_riasec=user_riasec,
        user_big5=user_big5,
        career_riasec_lookup=career_riasec_lookup,
        neumf_scores=neumf_scores if neumf_scores else None,
        weights=DEFAULT_WEIGHTS,
    )

    # ---- 7) Build final items (top_k selected by backend after RIASEC L1/L2 filter) ----
    final_items: list[FinalItem] = []
    for sig in signals:
        item = FinalItem(
            career_id=sig.career_id,
            final_score=float(sig.final_score),
            rank_score=float(sig.final_score),
            sim_score=float(sig.embedding_score),
            cf_score=float(sig.neumf_score) if sig.has_neumf else None,
            trait_score=float(sig.riasec_score),
        )
        final_items.append(item)

    # Light bandit re-rank pass (currently a no-op stub, kept for API stability)
    final_items = recommend_with_bandit(
        ranked_items=[
            {
                "career_id": s.career_id,
                "rank_score": s.final_score,
                "sim_score": s.embedding_score,
                "cf_score": s.neumf_score if s.has_neumf else None,
                "trait_score": s.riasec_score,
            }
            for s in signals
        ],
        user_id=user_id,
        top_k=len(signals),  # don't cut yet — backend will filter+slice
    )

    # ---- 8) Build response with calibrated display_match per item ----
    sig_lookup = {s.career_id: s for s in signals}
    response_items: list[CareerItem] = []
    for fi in final_items:
        sig = sig_lookup.get(fi.career_id)
        if sig is None:
            # Defensive: should not happen
            response_items.append(
                CareerItem(
                    career_id=fi.career_id,
                    final_score=fi.final_score,
                    display_match=calibrate_to_percent(fi.final_score, 0.5),
                )
            )
            continue
        response_items.append(
            CareerItem(
                career_id=sig.career_id,
                final_score=float(sig.final_score),
                display_match=float(sig.display_match),
                embedding_score=float(sig.embedding_score),
                riasec_score=float(sig.riasec_score),
                big5_score=float(sig.big5_score),
                neumf_score=float(sig.neumf_score),
                confidence=float(sig.confidence),
            )
        )

    response = TopCareersResponse(items=response_items)

    # ---- 9) Cache & return ----
    recs_cache.set(cache_key, response, ttl=600)

    # Log distribution of display_match for debugging
    if response_items:
        matches = [r.display_match for r in response_items[:10]]
        logger.debug(
            "[recs] Top-10 display_match distribution: min=%.1f max=%.1f mean=%.1f",
            min(matches), max(matches), sum(matches) / len(matches),
        )

    return response


@router.post("/cache/invalidate")
def invalidate_cache(assessment_id: int | None = None):
    """
    Invalidate recommendation cache.
    - Without args: clear all cache.
    - With assessment_id: clear specific entries (any top_k variant).
    """
    if assessment_id is None:
        recs_cache.clear()
        return {"status": "ok", "action": "cleared_all"}

    cleared = 0
    for k in (5, 10, 20, 50, 100):
        key = _cache_key(assessment_id, k)
        if recs_cache.get(key) is not None:
            recs_cache.invalidate(key)
            cleared += 1
    return {"status": "ok", "action": "cleared", "assessment_id": assessment_id, "entries": cleared}
