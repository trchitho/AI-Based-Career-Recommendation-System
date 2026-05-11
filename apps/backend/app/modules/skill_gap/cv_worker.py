"""
cv_worker.py
============
Background worker cho CV processing pipeline:
  1. OCR + NER (cv_parser_v2)
  2. vi-SBERT embedding (vector_service)
  3. NeuMF ranking (neumf_ranking)
  4. Thompson Sampling adjustment (thompson_sampling)
  5. Save kết quả vào DB

Chạy qua FastAPI BackgroundTasks (không cần Celery/Redis queue).
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


async def run_cv_pipeline(
    db: Session,
    analysis_id: int,
    cv_text: str,
    cv_skills: List[str],
    job_skills: List[Dict[str, Any]],
    user_id: int,
    notify_fn=None,
) -> Dict[str, Any]:
    """
    Full async pipeline:
      cv_skills (from NER) → vector embed → NeuMF rank → Thompson adjust

    notify_fn: optional async callable(user_id, event_type, data) for WS push.
    Returns enriched analysis result dict.
    """
    t0 = time.perf_counter()
    result: Dict[str, Any] = {"analysis_id": analysis_id, "stages": {}}

    # ── Stage 1: Embed CV skills ──────────────────────────────────
    try:
        from .vector_service import embed, skill_semantic_match, ensure_vector_table
        ensure_vector_table(db)

        # Semantic match: CV skills vs job skills
        job_names = [s["name"] for s in job_skills if s.get("name")]
        match_result = await asyncio.get_event_loop().run_in_executor(
            None,
            skill_semantic_match,
            db, cv_skills, job_names, 0.72,
        )
        result["stages"]["semantic_match"] = {
            "matched": len(match_result["matched"]),
            "missing": len(match_result["missing"]),
        }
        result["semantic_matched"]  = match_result["matched"]
        result["semantic_missing"]  = match_result["missing"]
        result["semantic_extra"]    = match_result["extra"]
        logger.info("[cv-worker] Stage1 semantic match: %s pairs", len(match_result["matched"]))
    except Exception as e:
        logger.warning("[cv-worker] Stage1 error: %s", e)
        result["stages"]["semantic_match"] = {"error": str(e)}

    # ── Stage 2: NeuMF ranking ────────────────────────────────────
    try:
        from .neumf_ranking import rank_skills_by_name

        # Rank missing skills by NeuMF (priority to learn)
        missing_dicts = [
            {"name": s, "importance": 0.5}
            for s in result.get("semantic_missing", [s["name"] for s in job_skills])
        ]
        # Merge importance from original job_skills
        imp_map = {s["name"]: s.get("importance", 0.5) for s in job_skills}
        for d in missing_dicts:
            d["importance"] = imp_map.get(d["name"], 0.5)

        ranked = await asyncio.get_event_loop().run_in_executor(
            None,
            rank_skills_by_name,
            cv_skills, missing_dicts, None, 20,
        )
        result["neumf_priority_skills"] = [
            {"name": r["name"], "score": r["neumf_score"], "importance": r["importance"]}
            for r in ranked
        ]
        result["stages"]["neumf_ranking"] = {"ranked": len(ranked)}
        logger.info("[cv-worker] Stage2 NeuMF ranked %s skills", len(ranked))
    except Exception as e:
        logger.warning("[cv-worker] Stage2 error: %s", e)
        result["stages"]["neumf_ranking"] = {"error": str(e)}

    # ── Stage 3: Thompson Sampling adjustment ─────────────────────
    try:
        from .thompson_sampling import rerank_with_thompson, ensure_feedback_table, record_event

        ensure_feedback_table(db)

        # Record impressions for shown skills
        for sk in result.get("neumf_priority_skills", []):
            record_event(db, user_id, "skill", sk["name"], "impression", analysis_id)

        # Rerank using past feedback
        adjusted = rerank_with_thompson(
            db, user_id, "skill",
            result.get("neumf_priority_skills", []),
            score_key="score",
            name_key="name",
        )
        result["final_priority_skills"] = adjusted
        result["stages"]["thompson"] = {"adjusted": len(adjusted)}
        logger.info("[cv-worker] Stage3 Thompson adjusted %s skills", len(adjusted))
    except Exception as e:
        logger.warning("[cv-worker] Stage3 error: %s", e)
        result["stages"]["thompson"] = {"error": str(e)}

    elapsed = round(time.perf_counter() - t0, 2)
    result["pipeline_elapsed_s"] = elapsed

    # ── Notify via WebSocket ──────────────────────────────────────
    if notify_fn:
        try:
            await notify_fn(user_id, "cv_analysis_complete", {
                "analysis_id": analysis_id,
                "pipeline_elapsed_s": elapsed,
                "top_priority_skills": [
                    s["name"] for s in result.get("final_priority_skills", [])[:5]
                ],
            })
        except Exception:
            pass

    # ── Persist enriched result to DB ─────────────────────────────
    try:
        from sqlalchemy import text
        db.execute(
            text("""
                UPDATE core.skill_gap_analyses
                SET skill_gaps = skill_gaps || jsonb_build_object(
                    'neumf_priority', :priority::jsonb,
                    'semantic_match_count', :match_count
                )
                WHERE id = :aid
            """),
            {
                "aid": analysis_id,
                "priority": __import__("json").dumps(
                    result.get("final_priority_skills", [])[:10]
                ),
                "match_count": len(result.get("semantic_matched", [])),
            },
        )
        db.commit()
    except Exception as e:
        logger.warning("[cv-worker] DB persist: %s", e)

    logger.info("[cv-worker] Pipeline done in %.2fs for analysis_id=%s", elapsed, analysis_id)
    return result
