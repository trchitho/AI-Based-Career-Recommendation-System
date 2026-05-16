"""
cv_worker.py
============
Background worker cho CV processing pipeline:
  1. vi-SBERT semantic matching
  2. NeuMF ranking
  3. Thompson Sampling adjustment
  4. Save to DB
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _normalize_skills(skills: List[Any]) -> List[str]:
    """Convert skill list (strings or dicts) to list of name strings."""
    result = []
    for s in (skills or []):
        if isinstance(s, str):
            result.append(s)
        elif isinstance(s, dict):
            name = s.get("name") or s.get("skill_name") or s.get("title") or ""
            if name:
                result.append(str(name))
    return [s.strip() for s in result if s.strip()]


def _rank_missing_by_weight(job_skills: List[Dict[str, Any]], missing_names: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
    """Deterministic fallback when embedding/NeuMF is unavailable."""
    wanted = {str(name).strip().lower() for name in missing_names if str(name).strip()}
    ranked = []
    for skill in job_skills or []:
        name = str(skill.get("name") or "").strip()
        if not name or name.lower() not in wanted:
            continue
        importance = float(skill.get("importance") or 0.5)
        level = float(skill.get("level") or 0.0)
        score = (importance * 0.72) + (level * 0.28)
        ranked.append({
            "name": name,
            "score": round(score, 4),
            "importance": importance,
            "level": level,
            "fallback_reason": "ranked_by_importance_level",
        })
    ranked.sort(key=lambda item: (item["score"], item["importance"], item["level"], item["name"]), reverse=True)
    return ranked[:top_k]


async def run_cv_pipeline(
    db: Session,
    analysis_id: int,
    cv_text: str,
    cv_skills: List[Any],
    job_skills: List[Dict[str, Any]],
    user_id: int,
    notify_fn=None,
) -> Dict[str, Any]:
    """
    Full async pipeline:
      cv_skills → vi-SBERT embed → NeuMF rank → Thompson adjust → save DB
    """
    t0 = time.perf_counter()
    result: Dict[str, Any] = {"analysis_id": analysis_id, "stages": {}}

    # Normalize inputs to plain strings
    cv_skill_names = _normalize_skills(cv_skills)
    job_skill_names = [s["name"] for s in job_skills if s.get("name")]

    # ── Stage 1: Semantic match ───────────────────────────────────
    try:
        from .vector_service import skill_semantic_match, ensure_vector_table
        ensure_vector_table(db)

        match_result = await asyncio.get_event_loop().run_in_executor(
            None,
            skill_semantic_match,
            db, cv_skill_names, job_skill_names, 0.72,
        )
        result["stages"]["semantic_match"] = {
            "matched": len(match_result["matched"]),
            "missing": len(match_result["missing"]),
        }
        result["semantic_matched"] = match_result["matched"]
        result["semantic_missing"] = match_result["missing"]
        result["semantic_extra"]   = match_result["extra"]
        logger.info("[cv-worker] Stage1 semantic match: %s pairs", len(match_result["matched"]))
    except Exception as e:
        logger.warning("[cv-worker] Stage1 error: %s", e)
        result["stages"]["semantic_match"] = {"error": str(e)}
        result["semantic_missing"] = job_skill_names  # fallback

    # ── Stage 2: NeuMF ranking ────────────────────────────────────
    try:
        from .neumf_ranking import rank_skills_by_name

        missing_names = result.get("semantic_missing", job_skill_names)
        # missing_names may be strings (from semantic_match) or tuples
        missing_name_strs = [
            m if isinstance(m, str) else (m[1] if isinstance(m, (list, tuple)) and len(m) > 1 else str(m))
            for m in missing_names
        ]
        imp_map = {s["name"]: s.get("importance", 0.5) for s in job_skills}
        missing_dicts = [
            {"name": n, "importance": imp_map.get(n, 0.5)}
            for n in missing_name_strs if n
        ]

        ranked = await asyncio.get_event_loop().run_in_executor(
            None,
            rank_skills_by_name,
            cv_skill_names, missing_dicts, None, 20,
        )
        result["neumf_priority_skills"] = [
            {"name": r["name"], "score": r["neumf_score"], "importance": r["importance"]}
            for r in ranked
        ]
        result["stages"]["neumf_ranking"] = {"ranked": len(ranked)}
        logger.info("[cv-worker] Stage2 NeuMF ranked %s skills", len(ranked))
    except Exception as e:
        logger.warning("[cv-worker] Stage2 error: %s", e)
        missing_names = result.get("semantic_missing", job_skill_names)
        missing_name_strs = [
            m if isinstance(m, str) else (m[1] if isinstance(m, (list, tuple)) and len(m) > 1 else str(m))
            for m in missing_names
        ]
        fallback_ranked = _rank_missing_by_weight(job_skills, missing_name_strs, 20)
        result["neumf_priority_skills"] = fallback_ranked
        result["stages"]["neumf_ranking"] = {
            "error": str(e),
            "fallback": "importance_level",
            "ranked": len(fallback_ranked),
        }

    # ── Stage 3: Thompson Sampling ────────────────────────────────
    try:
        from .thompson_sampling import rerank_with_thompson, ensure_feedback_table, record_event

        ensure_feedback_table(db)
        for sk in result.get("neumf_priority_skills", []):
            record_event(db, user_id, "skill", sk["name"], "impression", analysis_id)

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

    # ── Persist to DB (fix: use cast() not ::jsonb with named params) ─
    try:
        from sqlalchemy import text
        priority_json = json.dumps(result.get("final_priority_skills", [])[:10], ensure_ascii=False)
        match_count   = len(result.get("semantic_matched", []))

        # Use positional-style $1/$2 via raw psycopg2 to avoid parameter conflict
        # Or simply build the JSONB literal inline after sanitizing
        db.execute(
            text("""
                UPDATE core.skill_gap_analyses
                SET skill_gaps = COALESCE(skill_gaps, '{}'::jsonb) || jsonb_build_object(
                    'neumf_priority', CAST(:priority AS jsonb),
                    'semantic_match_count', CAST(:match_count AS integer)
                )
                WHERE id = :aid
            """),
            {
                "aid":        analysis_id,
                "priority":   priority_json,
                "match_count": match_count,
            },
        )
        db.commit()
        logger.info("[cv-worker] DB persist OK for analysis_id=%s", analysis_id)
    except Exception as e:
        logger.warning("[cv-worker] DB persist: %s", e)
        try:
            db.rollback()
        except Exception:
            pass

    logger.info("[cv-worker] Pipeline done in %.2fs for analysis_id=%s", elapsed, analysis_id)
    return result
