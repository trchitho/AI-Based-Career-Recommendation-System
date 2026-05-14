"""
faster_stt_service.py — Whisper STT via faster-whisper (CPU, int8).
Used by the legacy /ws/stt WebSocket endpoint as a fallback when Deepgram is unavailable.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

_MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")

_model = None
_model_loaded = False

_HALLUCINATION_PHRASES = [
    "la la school", "subscribe", "đăng ký kênh",
    "dòng cốt phúc", "hẹn gặp lại",
]


def _get_model():
    """Lazy-load faster-whisper model. Retries on failure (never caches None)."""
    global _model, _model_loaded
    if _model_loaded:
        return _model
    try:
        from faster_whisper import WhisperModel
        logger.info(f"[FasterWhisper] Loading model: {_MODEL_SIZE}")
        _model = WhisperModel(_MODEL_SIZE, device="cpu", compute_type="int8")
        _model_loaded = True
        logger.info(f"[FasterWhisper] Model ready: {_MODEL_SIZE}")
    except Exception as e:
        logger.error(f"[FasterWhisper] Failed to load '{_MODEL_SIZE}': {e}")
        # Do NOT set _model_loaded — allow retry on next call
    return _model


def transcribe_audio_bytes(
    audio_bytes: bytes,
    content_type: str = "audio/webm",
    language: str = "vi",
) -> Optional[str]:
    """
    Transcribe raw audio bytes using faster-whisper.
    Returns transcript string or None on failure / no speech.
    """
    model = _get_model()
    if not model:
        return None

    ext = "webm"
    ct = (content_type or "").lower()
    if "mp3" in ct:   ext = "mp3"
    elif "wav" in ct:  ext = "wav"
    elif "mp4" in ct or "m4a" in ct: ext = "mp4"
    elif "ogg" in ct:  ext = "ogg"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}", prefix="stt_") as f:
            f.write(audio_bytes)
            tmp_path = f.name

        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            best_of=1,
            temperature=0.0,
            initial_prompt="Đây là câu trả lời phỏng vấn tuyển dụng bằng tiếng Việt.",
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 200, "speech_pad_ms": 100},
            condition_on_previous_text=False,
            no_speech_threshold=0.7,
            compression_ratio_threshold=2.0,
            log_prob_threshold=-0.8,
        )

        valid = [s.text.strip() for s in segments if s.no_speech_prob < 0.7]
        text = " ".join(valid).strip()
        logger.info(f"[FasterWhisper] Result: {repr(text)} | duration={info.duration:.1f}s")

        if any(p in text.lower() for p in _HALLUCINATION_PHRASES):
            logger.warning(f"[FasterWhisper] Hallucination rejected: {repr(text[:80])}")
            return None

        return text or None

    except Exception as e:
        logger.error(f"[FasterWhisper] Transcribe error ({ext}, {len(audio_bytes)}b): {e}", exc_info=True)
        return None
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# Module-level alias for convenience
faster_stt = type("FasterSTT", (), {"transcribe": staticmethod(transcribe_audio_bytes)})()
