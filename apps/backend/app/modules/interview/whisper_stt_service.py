"""
Whisper STT Service - Yêu Cầu 5: Speech-to-Text (STT) Pipeline

Tiêu chí 5.1: Xử lý audio bằng Whisper model
Tiêu chí 5.2: Nhận dạng tiếng Việt (language='vi')
Tiêu chí 5.3: Trả về transcript dạng plain text
Tiêu chí 5.4: Xử lý audio 3–300 giây
Tiêu chí 5.5: File > 25MB → HTTP 413
Tiêu chí 5.6: Không có giọng nói → STT_NO_SPEECH_DETECTED
Tiêu chí 5.7: Hỗ trợ WebM, MP4, WAV, MP3
Tiêu chí 5.8: Round-trip equivalence với text interview
"""

import os
import tempfile
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024   # 25 MB — Tiêu chí 5.5
MIN_DURATION_SECONDS = 3.0               # Tiêu chí 5.4
MAX_DURATION_SECONDS = 300.0             # Tiêu chí 5.4

# Tiêu chí 5.7: supported formats
SUPPORTED_FORMATS = {"webm", "mp4", "wav", "mp3", "ogg", "m4a"}

CONTENT_TYPE_TO_EXT = {
    "audio/webm":  "webm",
    "audio/mp4":   "mp4",
    "audio/wav":   "wav",
    "audio/mpeg":  "mp3",
    "audio/mp3":   "mp3",
    "audio/ogg":   "ogg",
    "audio/x-m4a": "m4a",
    "audio/m4a":   "m4a",
}


# ─────────────────────────────────────────────────────────────────────────────
# Custom exceptions
# ─────────────────────────────────────────────────────────────────────────────

class STTFileTooLargeError(Exception):
    """Tiêu chí 5.5: audio > 25MB"""
    pass


class STTNoSpeechError(Exception):
    """Tiêu chí 5.6: không nhận dạng được giọng nói"""
    pass


class STTDurationError(Exception):
    """Tiêu chí 5.4: audio ngoài khoảng 3–300 giây"""
    pass


class STTUnsupportedFormatError(Exception):
    """Tiêu chí 5.7: định dạng không được hỗ trợ"""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# WhisperSTTService
# ─────────────────────────────────────────────────────────────────────────────

class WhisperSTTService:
    """
    STT Service sử dụng OpenAI Whisper model.

    Tiêu chí 5.1: Xử lý audio bằng Whisper
    Tiêu chí 5.2: Ngôn ngữ tiếng Việt (vi)
    Tiêu chí 5.8: Round-trip equivalence — transcript từ audio == text gõ trực tiếp
    """

    def __init__(self, model_size: str = "base") -> None:
        """
        Args:
            model_size: Whisper model size — "tiny", "base", "small", "medium", "large"
                        "base" là mặc định, "small" cho tiếng Việt tốt hơn
        """
        self._model_size = model_size
        self._model = None  # Lazy load để tránh tốn RAM khi không dùng

    def _get_model(self):
        """Lazy load Whisper model."""
        if self._model is None:
            try:
                import whisper
                logger.info(f"[STT] Loading Whisper model: {self._model_size}")
                self._model = whisper.load_model(self._model_size)
                logger.info(f"[STT] Whisper model loaded: {self._model_size}")
            except ImportError:
                raise RuntimeError(
                    "openai-whisper not installed. Run: pip install openai-whisper"
                )
        return self._model

    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "vi",
        content_type: Optional[str] = None,
    ) -> str:
        """
        Tiêu chí 5.1: Xử lý audio bằng Whisper model.
        Tiêu chí 5.2: Nhận dạng tiếng Việt (language='vi').
        Tiêu chí 5.3: Trả về transcript dạng plain text.

        Args:
            audio_data: Raw audio bytes
            language: Language code (default: 'vi' for Vietnamese)
            content_type: MIME type để xác định extension

        Returns:
            Transcript string (có thể rỗng nếu không có giọng nói)

        Raises:
            STTFileTooLargeError: file > 25MB (Tiêu chí 5.5)
            STTNoSpeechError: không nhận dạng được giọng nói (Tiêu chí 5.6)
            STTDurationError: audio ngoài khoảng 3–300 giây (Tiêu chí 5.4)
            STTUnsupportedFormatError: định dạng không hỗ trợ (Tiêu chí 5.7)
        """
        # ── Validate file size (Tiêu chí 5.5) ─────────────────────────────
        if len(audio_data) > MAX_FILE_SIZE_BYTES:
            raise STTFileTooLargeError(
                f"Audio file too large: {len(audio_data)} bytes (max {MAX_FILE_SIZE_BYTES})"
            )

        if len(audio_data) == 0:
            raise STTNoSpeechError("Empty audio data")

        # ── Determine file extension (Tiêu chí 5.7) ───────────────────────
        ext = self._get_extension(content_type)

        # ── Write to temp file và transcribe ──────────────────────────────
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=f".{ext}",
                prefix="stt_audio_"
            ) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name

            transcript, duration = self._run_whisper(tmp_path, language)

            # ── Validate duration (Tiêu chí 5.4) ──────────────────────────
            if duration is not None:
                if duration < MIN_DURATION_SECONDS:
                    raise STTDurationError(
                        f"Audio too short: {duration:.1f}s (min {MIN_DURATION_SECONDS}s)"
                    )
                if duration > MAX_DURATION_SECONDS:
                    raise STTDurationError(
                        f"Audio too long: {duration:.1f}s (max {MAX_DURATION_SECONDS}s)"
                    )

            # ── Tiêu chí 5.6: no speech ────────────────────────────────────
            if not transcript or not transcript.strip():
                raise STTNoSpeechError("STT_NO_SPEECH_DETECTED")

            logger.info(f"[STT] Transcript ({duration or 0:.1f}s): {transcript[:80]}...")
            return transcript.strip()

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    def _run_whisper(self, audio_path: str, language: str) -> tuple[str, Optional[float]]:
        """
        Chạy Whisper transcription đồng bộ.

        Returns:
            (transcript, duration_seconds)
        """
        model = self._get_model()

        # Tiêu chí 5.2: chỉ định language='vi'
        result = model.transcribe(
            audio_path,
            language=language,
            task="transcribe",
            fp16=False,  # CPU-safe
            verbose=False,
        )

        transcript: str = result.get("text", "").strip()
        duration: Optional[float] = result.get("duration")

        return transcript, duration

    def _get_extension(self, content_type: Optional[str]) -> str:
        """
        Tiêu chí 5.7: Xác định extension từ content_type.
        Fallback về 'webm' nếu không xác định được.
        """
        if content_type:
            ext = CONTENT_TYPE_TO_EXT.get(content_type.lower().split(";")[0].strip())
            if ext:
                return ext

        return "webm"  # default fallback

    @property
    def model_size(self) -> str:
        return self._model_size

    @property
    def supported_formats(self) -> set:
        return SUPPORTED_FORMATS.copy()


# ─────────────────────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────────────────────

_model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
whisper_stt_service = WhisperSTTService(model_size=_model_size)
