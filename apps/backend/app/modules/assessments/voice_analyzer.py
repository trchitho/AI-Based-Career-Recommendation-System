"""
Voice personality analyzer using Gemini multimodal audio input.

Pipeline:
  audio bytes (webm/wav/mp3)
      → Gemini multimodal prompt
      → structured JSON { transcript, big5, riasec, summary, confidence }
      → persist to Assessment.essay_analysis + ai.user_trait_preds
      → fuse_user_traits
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any

from app.core.gemini_manager import multi_stream_manager
from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import Assessment

# ---------------------------------------------------------------------------
# Gemini prompt
# ---------------------------------------------------------------------------

_ANALYSIS_PROMPT = """
You are an expert psychologist conducting voice-based personality assessment.
Listen to the audio recording carefully and analyze the speaker's personality.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "transcript": "<transcription of what was said, or empty string if unclear>",
  "big5": {
    "openness":          <0.0 to 1.0>,
    "conscientiousness": <0.0 to 1.0>,
    "extraversion":      <0.0 to 1.0>,
    "agreeableness":     <0.0 to 1.0>,
    "neuroticism":       <0.0 to 1.0>
  },
  "riasec": {
    "realistic":      <0.0 to 1.0>,
    "investigative":  <0.0 to 1.0>,
    "artistic":       <0.0 to 1.0>,
    "social":         <0.0 to 1.0>,
    "enterprising":   <0.0 to 1.0>,
    "conventional":   <0.0 to 1.0>
  },
  "voice_summary": "<1-2 sentence natural language summary of personality from voice>",
  "confidence": <0.0 to 1.0, how confident you are in this analysis>
}

Base your analysis on:
- Tone, pace, and energy of speech
- Vocabulary and language used
- Topics mentioned
- Emotional expressiveness
- Organization of thoughts

If the audio is too short, noisy, or unclear, still return valid JSON with your best estimates
and a lower confidence score.
""".strip()


# ---------------------------------------------------------------------------
# Core analyzer
# ---------------------------------------------------------------------------

def analyse_voice(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict[str, Any]:
    """
    Send audio bytes to Gemini and get personality trait JSON back.

    Returns a dict with keys: transcript, big5, riasec, voice_summary, confidence.
    On failure returns a safe fallback dict.
    """
    stream = multi_stream_manager.get_assessment_stream()

    if not stream.is_available():
        print("[voice_analyzer] Gemini assessment stream not available — returning neutral fallback")
        return _neutral_fallback("Gemini not available")

    try:
        import google.generativeai as genai

        # Build audio Part inline
        audio_part = {
            "inline_data": {
                "mime_type": mime_type,
                "data": base64.b64encode(audio_bytes).decode("utf-8"),
            }
        }

        response = stream.model.generate_content(
            [_ANALYSIS_PROMPT, audio_part],
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1024,
            ),
        )

        raw = (response.text or "").strip()
        print(f"[voice_analyzer] Gemini raw response length={len(raw)}")

        return _parse_response(raw)

    except Exception as e:
        print(f"[voice_analyzer] Gemini error: {repr(e)}")
        return _neutral_fallback(str(e))


def _parse_response(raw: str) -> dict[str, Any]:
    """Extract JSON from Gemini response, tolerating markdown code fences."""
    # Strip ```json ... ``` fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find a JSON object anywhere in the text
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                print(f"[voice_analyzer] Could not parse JSON from response: {raw[:200]}")
                return _neutral_fallback("JSON parse error")
        else:
            return _neutral_fallback("No JSON found in response")

    # Validate and clamp values
    big5 = data.get("big5", {})
    riasec = data.get("riasec", {})

    def _clamp(v: Any) -> float:
        try:
            return max(0.0, min(1.0, float(v)))
        except (TypeError, ValueError):
            return 0.5

    return {
        "transcript": str(data.get("transcript", "")),
        "big5": {
            "openness":          _clamp(big5.get("openness",          0.5)),
            "conscientiousness": _clamp(big5.get("conscientiousness", 0.5)),
            "extraversion":      _clamp(big5.get("extraversion",      0.5)),
            "agreeableness":     _clamp(big5.get("agreeableness",     0.5)),
            "neuroticism":       _clamp(big5.get("neuroticism",       0.5)),
        },
        "riasec": {
            "realistic":     _clamp(riasec.get("realistic",     0.167)),
            "investigative": _clamp(riasec.get("investigative", 0.167)),
            "artistic":      _clamp(riasec.get("artistic",      0.167)),
            "social":        _clamp(riasec.get("social",        0.167)),
            "enterprising":  _clamp(riasec.get("enterprising",  0.167)),
            "conventional":  _clamp(riasec.get("conventional",  0.167)),
        },
        "voice_summary": str(data.get("voice_summary", "")),
        "confidence": _clamp(data.get("confidence", 0.5)),
    }


def _neutral_fallback(reason: str) -> dict[str, Any]:
    return {
        "transcript": "",
        "big5": {
            "openness": 0.5, "conscientiousness": 0.5, "extraversion": 0.5,
            "agreeableness": 0.5, "neuroticism": 0.5,
        },
        "riasec": {
            "realistic": 0.167, "investigative": 0.167, "artistic": 0.167,
            "social": 0.167, "enterprising": 0.167, "conventional": 0.167,
        },
        "voice_summary": "",
        "confidence": 0.0,
        "error": reason,
    }


# ---------------------------------------------------------------------------
# Persist helpers
# ---------------------------------------------------------------------------

BIG5_KEYS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
RIASEC_KEYS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"]


def _to_pg_real_array(values: list[float]) -> str:
    return "{" + ",".join(f"{v:.6f}" for v in values) + "}"


def save_voice_traits(
    session: Session,
    user_id: int,
    assessment_id: int,
    analysis: dict[str, Any],
) -> None:
    """
    Persist voice analysis results:
      1. Update Assessment.essay_analysis with voice data (merged)
      2. Upsert ai.user_trait_preds with source='voice'
      3. Call fuse_user_traits
    """
    # 1 — Merge voice analysis into Assessment.essay_analysis
    try:
        assessment = session.get(Assessment, assessment_id)
        if assessment:
            existing = assessment.essay_analysis or {}
            existing["voice_analysis"] = {
                "transcript":    analysis.get("transcript", ""),
                "voice_summary": analysis.get("voice_summary", ""),
                "confidence":    analysis.get("confidence", 0.0),
                "big5":          analysis.get("big5", {}),
                "riasec":        analysis.get("riasec", {}),
            }
            assessment.essay_analysis = existing
            session.flush()
    except Exception as e:
        print(f"[voice_analyzer] Failed to update assessment.essay_analysis: {repr(e)}")

    # 2 — Upsert ai.user_trait_preds (source='voice')
    try:
        big5_vals  = [analysis["big5"][k]   for k in BIG5_KEYS]
        riasec_vals = [analysis["riasec"][k] for k in RIASEC_KEYS]
        r_arr = _to_pg_real_array(riasec_vals)
        b_arr = _to_pg_real_array(big5_vals)

        # Use essay_id = -1 * assessment_id as synthetic key for voice entries
        synthetic_essay_id = -(assessment_id)

        sql = f"""
            INSERT INTO ai.user_trait_preds
                (user_id, essay_id, riasec_pred, big5_pred, source, model_name, built_at)
            VALUES (
                {int(user_id)},
                {synthetic_essay_id},
                '{r_arr}'::real[],
                '{b_arr}'::real[],
                'voice',
                'gemini-voice',
                now()
            )
            ON CONFLICT (user_id, essay_id) DO UPDATE
              SET riasec_pred = EXCLUDED.riasec_pred,
                  big5_pred   = EXCLUDED.big5_pred,
                  source      = EXCLUDED.source,
                  model_name  = EXCLUDED.model_name,
                  built_at    = now();
        """
        session.execute(text(sql))
        session.commit()
        print(f"[voice_analyzer] Saved voice traits for user_id={user_id}, assessment_id={assessment_id}")
    except Exception as e:
        session.rollback()
        print(f"[voice_analyzer] Failed to upsert user_trait_preds: {repr(e)}")

    # 3 — Re-fuse traits so results reflect voice data
    try:
        from .service import fuse_user_traits
        fuse_user_traits(session, user_id=user_id)
    except Exception as e:
        print(f"[voice_analyzer] fuse_user_traits after voice failed: {repr(e)}")
