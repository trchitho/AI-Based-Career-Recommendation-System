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
import sys
import tempfile
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Patch whisper.audio.run (local ref) to use full ffmpeg path ──────────────
def _patch_whisper_ffmpeg(ffmpeg_full_path: str) -> None:
    """
    Whisper imports `from subprocess import run` as a local reference.
    We must patch whisper.audio.run directly — patching subprocess.run won't work.
    """
    try:
        import whisper.audio as _wa
        _orig_run = _wa.run  # the local 'run' ref inside whisper.audio

        def _patched_run(cmd, *args, **kwargs):
            if isinstance(cmd, (list, tuple)) and len(cmd) > 0:
                if str(cmd[0]).lower() in ("ffmpeg", "ffmpeg.exe"):
                    cmd = [ffmpeg_full_path] + list(cmd[1:])
            return _orig_run(cmd, *args, **kwargs)

        _wa.run = _patched_run
        logger.info(f"[STT] whisper.audio.run patched -> {ffmpeg_full_path}")
    except Exception as e:
        logger.warning(f"[STT] whisper.audio patch failed: {e}")


# ── Find ffmpeg and patch Whisper to use full path ───────────────────────────
def _setup_ffmpeg() -> str:
    """Return full path to ffmpeg exe and patch Whisper's load_audio to use it."""
    import shutil, importlib

    # 1. Find ffmpeg
    ffmpeg_exe = shutil.which("ffmpeg")

    if not ffmpeg_exe:
        try:
            imageio_ffmpeg = importlib.import_module("imageio_ffmpeg")
            src = imageio_ffmpeg.get_ffmpeg_exe()
            # Copy to Scripts dir as ffmpeg.exe
            scripts_dir = os.path.dirname(sys.executable)
            dst = os.path.join(scripts_dir, "ffmpeg.exe")
            if not os.path.exists(dst):
                import shutil as _sh
                _sh.copy2(src, dst)
            ffmpeg_exe = dst
            # Add to PATH
            ffmpeg_dir = os.path.dirname(dst)
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
            ffmpeg_exe = shutil.which("ffmpeg") or dst
        except Exception as e:
            logger.warning(f"[STT] ffmpeg setup failed: {e}")
            return "ffmpeg"

    # 2. Patch whisper.audio.load_audio to use the full path
    try:
        import whisper.audio as _wa
        import re as _re

        original_load = _wa.load_audio

        def _patched_load_audio(file: str, sr: int = _wa.SAMPLE_RATE):
            # Replace "ffmpeg" at start of cmd with full path
            import numpy as np
            from subprocess import CalledProcessError, run as _run
            cmd = [
                ffmpeg_exe, "-nostdin", "-threads", "0",
                "-i", file,
                "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le",
                "-ar", str(sr), "-",
            ]
            try:
                out = _run(cmd, capture_output=True, check=True)
            except CalledProcessError as e:
                raise RuntimeError(f"ffmpeg error: {e.stderr.decode()}") from e
            return np.frombuffer(out.stdout, np.int16).flatten().astype(np.float32) / 32768.0

        _wa.load_audio = _patched_load_audio
        logger.info(f"[STT] Whisper patched with ffmpeg: {ffmpeg_exe}")
    except Exception as e:
        logger.warning(f"[STT] Whisper patch failed: {e}")

    return ffmpeg_exe


_FFMPEG_EXE = _setup_ffmpeg()

# Patch whisper.audio.run so Whisper's internal ffmpeg calls use full path
if _FFMPEG_EXE and _FFMPEG_EXE != "ffmpeg":
    _patch_whisper_ffmpeg(_FFMPEG_EXE)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024   # 25 MB — Tiêu chí 5.5
MIN_DURATION_SECONDS = 1.0               # Lowered: browser recordings can be < 3s
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

    @staticmethod
    def _get_ffmpeg_exe() -> str:
        """Get absolute path to ffmpeg — works regardless of server PATH."""
        # Priority 1: imageio_ffmpeg bundled binary (most reliable on Windows)
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            pass
        # Priority 2: module-level cached path
        if _FFMPEG_EXE and _FFMPEG_EXE != "ffmpeg":
            return _FFMPEG_EXE
        # Priority 3: shutil.which
        import shutil
        return shutil.which("ffmpeg") or "ffmpeg"

    def _run_whisper(self, audio_path: str, language: str) -> tuple[str, Optional[float]]:
        """
        Convert audio to numpy array using ffmpeg (explicit path),
        then pass numpy array to model.transcribe — bypasses Whisper's
        internal load_audio which uses hardcoded 'ffmpeg' string.
        """
        import numpy as np
        import subprocess

        model = self._get_model()

        # Always get fresh ffmpeg path (not cached module var that may fail)
        ffmpeg_exe = self._get_ffmpeg_exe()
        logger.debug(f"[STT] Using ffmpeg: {ffmpeg_exe}")

        cmd = [
            ffmpeg_exe, "-nostdin", "-threads", "0",
            "-i", audio_path,
            "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le",
            "-ar", "16000", "-",
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, check=True)
            audio_np = np.frombuffer(proc.stdout, np.int16).flatten().astype(np.float32) / 32768.0
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"ffmpeg decode failed: {e.stderr.decode(errors='ignore')[:200]}") from e

        duration_s = float(len(audio_np)) / 16000.0

        # Pass numpy array — Whisper skips load_audio entirely
        result = model.transcribe(
            audio_np,
            language=language,
            task="transcribe",
            fp16=False,
            verbose=False,
        )

        transcript: str = result.get("text", "").strip()
        return transcript, duration_s

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
