"""
faster_stt_service.py
=====================
Real-time STT using faster-whisper (4-5x faster than openai-whisper).
Model: base (balance speed vs accuracy for Vietnamese)
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")  # only used by ws_stt.py (legacy); stt-live uses _get_fw_model()

_model_cache = None
_model_loaded = False


def _get_model():
    """Lazy-load faster-whisper model (singleton). Does NOT cache None — retries on failure."""
    global _model_cache, _model_loaded
    if _model_loaded:
        return _model_cache
    try:
        from faster_whisper import WhisperModel
        logger.info(f"[FasterWhisper] Loading model: {MODEL_SIZE} ...")
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        _model_cache = model
        _model_loaded = True
        logger.info(f"[FasterWhisper] Model ready: {MODEL_SIZE}")
        return model
    except Exception as e:
        logger.error(f"[FasterWhisper] Failed to load model '{MODEL_SIZE}': {e}")
        # Do NOT set _model_loaded=True — allow retry on next call
        return None


def transcribe_audio_bytes(
    audio_bytes: bytes,
    content_type: str = "audio/webm",
    language: str = "vi",
) -> Optional[str]:
    """
    Transcribe audio bytes using faster-whisper.
    Returns transcript string or None on failure.
    Fast: ~200ms for 3s audio on CPU with int8 quantization.
    """
    model = _get_model()
    if not model:
        return None

    ext = "webm"
    ct = (content_type or "").lower()
    if "mp3" in ct:  ext = "mp3"
    elif "wav" in ct:  ext = "wav"
    elif "mp4" in ct or "m4a" in ct:  ext = "mp4"
    elif "ogg" in ct:  ext = "ogg"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=f".{ext}", prefix="stt_fw_"
        ) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        logger.info(f"[FasterWhisper] Transcribing {len(audio_bytes)} bytes ({ext}) lang={language}")

        _HALLUCINATION_PHRASES = [
            "la la school", "subscribe", "đăng ký kênh", "bấm like",
            "cảm ơn các bạn đã xem", "hẹn gặp lại", "dòng cốt phúc",
            "chúc các bạn học tốt", "nhấn chuông",
        ]

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

        # Filter: only include segments with speech detected
        valid_segs = [seg.text.strip() for seg in segments if seg.no_speech_prob < 0.7]
        text = " ".join(valid_segs).strip()

        # Reject known hallucination patterns
        if text and any(p in text.lower() for p in _HALLUCINATION_PHRASES):
            logger.warning(f"[FasterWhisper] Hallucination rejected: {repr(text[:80])}")
            return None

        logger.info(f"[FasterWhisper] Result: {repr(text)} | duration={info.duration:.1f}s")
        return text if text else None

    except Exception as e:
        logger.error(f"[FasterWhisper] Transcribe error ({ext}, {len(audio_bytes)}b): {e}", exc_info=True)
        return None
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# Singleton for use in routes
faster_stt = type("FasterSTT", (), {"transcribe": staticmethod(transcribe_audio_bytes)})()
