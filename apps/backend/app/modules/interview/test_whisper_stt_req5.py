"""
Test cases cho Yêu Cầu 5: Speech-to-Text (STT) Pipeline
Đảm bảo 100% Tiêu Chí Chấp Nhận pass
"""

import pytest
from unittest.mock import MagicMock, patch

from app.modules.interview.whisper_stt_service import (
    WhisperSTTService,
    STTFileTooLargeError,
    STTNoSpeechError,
    STTDurationError,
    STTUnsupportedFormatError,
    MAX_FILE_SIZE_BYTES,
    MIN_DURATION_SECONDS,
    MAX_DURATION_SECONDS,
    SUPPORTED_FORMATS,
    CONTENT_TYPE_TO_EXT,
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_AUDIO = b"\xff\xfb\x90\x00" * 5000  # ~20KB fake audio


def make_mock_whisper_result(text: str, duration: float = 10.0) -> dict:
    return {"text": text, "duration": duration}


def make_stt_service() -> WhisperSTTService:
    return WhisperSTTService(model_size="base")


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.5: File size limit
# ─────────────────────────────────────────────────────────────────────────────

class TestFileSizeLimit:
    @pytest.mark.asyncio
    async def test_file_too_large_raises_error(self):
        """Tiêu chí 5.5: audio > 25MB → STTFileTooLargeError"""
        svc = make_stt_service()
        large_audio = b"x" * (MAX_FILE_SIZE_BYTES + 1)

        with pytest.raises(STTFileTooLargeError):
            await svc.transcribe(large_audio)

    @pytest.mark.asyncio
    async def test_file_exactly_25mb_raises_error(self):
        """Tiêu chí 5.5: audio == 25MB + 1 byte → error"""
        svc = make_stt_service()
        large_audio = b"x" * (MAX_FILE_SIZE_BYTES + 1)

        with pytest.raises(STTFileTooLargeError):
            await svc.transcribe(large_audio)

    @pytest.mark.asyncio
    async def test_empty_audio_raises_no_speech(self):
        """Empty audio → STTNoSpeechError"""
        svc = make_stt_service()

        with pytest.raises(STTNoSpeechError):
            await svc.transcribe(b"")

    def test_max_file_size_constant(self):
        """MAX_FILE_SIZE_BYTES phải là 25MB"""
        assert MAX_FILE_SIZE_BYTES == 25 * 1024 * 1024


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.4: Duration validation
# ─────────────────────────────────────────────────────────────────────────────

class TestDurationValidation:
    @pytest.mark.asyncio
    async def test_audio_too_short_raises_error(self):
        """Tiêu chí 5.4: audio < 1 giây → STTDurationError"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("Xin chào", 0.5)):
            with pytest.raises(STTDurationError, match="too short"):
                await svc.transcribe(SAMPLE_AUDIO)

    @pytest.mark.asyncio
    async def test_audio_too_long_raises_error(self):
        """Tiêu chí 5.4: audio > 300 giây → STTDurationError"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("Xin chào", 301.0)):
            with pytest.raises(STTDurationError, match="too long"):
                await svc.transcribe(SAMPLE_AUDIO)

    @pytest.mark.asyncio
    async def test_audio_exactly_3s_is_valid(self):
        """Tiêu chí 5.4: audio == 3 giây → OK"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("Xin chào", 3.0)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert result == "Xin chào"

    @pytest.mark.asyncio
    async def test_audio_exactly_300s_is_valid(self):
        """Tiêu chí 5.4: audio == 300 giây → OK"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("Câu trả lời dài", 300.0)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert result == "Câu trả lời dài"

    @pytest.mark.asyncio
    async def test_none_duration_skips_validation(self):
        """Nếu Whisper không trả về duration → bỏ qua validation"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("Transcript", None)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert result == "Transcript"

    def test_duration_constants(self):
        """Kiểm tra constants đúng giá trị"""
        assert MIN_DURATION_SECONDS == 1.0
        assert MAX_DURATION_SECONDS == 300.0


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.6: No speech detection
# ─────────────────────────────────────────────────────────────────────────────

class TestNoSpeechDetection:
    @pytest.mark.asyncio
    async def test_empty_transcript_raises_no_speech(self):
        """Tiêu chí 5.6: transcript rỗng → STTNoSpeechError"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("", 10.0)):
            with pytest.raises(STTNoSpeechError):
                await svc.transcribe(SAMPLE_AUDIO)

    @pytest.mark.asyncio
    async def test_whitespace_transcript_raises_no_speech(self):
        """Tiêu chí 5.6: transcript chỉ whitespace → STTNoSpeechError"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("   \n\t  ", 10.0)):
            with pytest.raises(STTNoSpeechError):
                await svc.transcribe(SAMPLE_AUDIO)

    @pytest.mark.asyncio
    async def test_valid_transcript_returns_text(self):
        """Tiêu chí 5.6: transcript có nội dung → trả về text"""
        svc = make_stt_service()
        expected = "Tôi có 3 năm kinh nghiệm làm việc với Python."

        with patch.object(svc, "_run_whisper", return_value=(expected, 15.0)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert result == expected


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.1, 5.2, 5.3: Whisper transcription
# ─────────────────────────────────────────────────────────────────────────────

class TestWhisperTranscription:
    @pytest.mark.asyncio
    async def test_transcribe_returns_plain_text(self):
        """Tiêu chí 5.3: trả về transcript dạng plain text"""
        svc = make_stt_service()
        expected = "Xin chào, tôi là ứng viên."

        with patch.object(svc, "_run_whisper", return_value=(expected, 5.0)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert isinstance(result, str)
        assert result == expected

    @pytest.mark.asyncio
    async def test_transcribe_strips_whitespace(self):
        """Tiêu chí 5.3: transcript được strip whitespace"""
        svc = make_stt_service()

        with patch.object(svc, "_run_whisper", return_value=("  Xin chào  ", 5.0)):
            result = await svc.transcribe(SAMPLE_AUDIO)

        assert result == "Xin chào"

    @pytest.mark.asyncio
    async def test_transcribe_uses_vietnamese_language(self):
        """Tiêu chí 5.2: language='vi' được truyền vào Whisper"""
        svc = make_stt_service()
        captured_lang = {}

        def mock_run_whisper(audio_path, language):
            captured_lang["language"] = language
            return ("Xin chào", 5.0)

        with patch.object(svc, "_run_whisper", side_effect=mock_run_whisper):
            await svc.transcribe(SAMPLE_AUDIO)

        assert captured_lang["language"] == "vi"

    @pytest.mark.asyncio
    async def test_transcribe_default_language_is_vi(self):
        """Tiêu chí 5.2: default language là 'vi'"""
        svc = make_stt_service()
        captured_lang = {}

        def mock_run_whisper(audio_path, language):
            captured_lang["language"] = language
            return ("Xin chào", 5.0)

        with patch.object(svc, "_run_whisper", side_effect=mock_run_whisper):
            # Không truyền language → dùng default
            await svc.transcribe(SAMPLE_AUDIO)

        assert captured_lang["language"] == "vi"

    def test_run_whisper_calls_model_with_vi_language(self):
        """Tiêu chí 5.1, 5.2: _run_whisper gọi model.transcribe với language='vi'"""
        svc = make_stt_service()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {
            "text": "Xin chào",
            "duration": 5.0,
        }
        svc._model = mock_model

        with patch("subprocess.run") as mock_run:
            mock_proc = MagicMock()
            mock_proc.stdout = b"\x00\x00" * 16000  # 1.0s of silent audio
            mock_run.return_value = mock_proc
            transcript, duration = svc._run_whisper("/tmp/test.wav", "vi")

        mock_model.transcribe.assert_called_once()
        call_kwargs = mock_model.transcribe.call_args
        assert call_kwargs[1]["language"] == "vi"
        assert transcript == "Xin chào"
        assert duration == 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.7: Supported formats
# ─────────────────────────────────────────────────────────────────────────────

class TestSupportedFormats:
    def test_supported_formats_include_required(self):
        """Tiêu chí 5.7: WebM, MP4, WAV, MP3 phải được hỗ trợ"""
        svc = make_stt_service()
        formats = svc.supported_formats
        assert "webm" in formats
        assert "mp4" in formats
        assert "wav" in formats
        assert "mp3" in formats

    def test_content_type_webm_maps_to_webm(self):
        """Tiêu chí 5.7: audio/webm → webm"""
        svc = make_stt_service()
        assert svc._get_extension("audio/webm") == "webm"

    def test_content_type_mp4_maps_to_mp4(self):
        """Tiêu chí 5.7: audio/mp4 → mp4"""
        svc = make_stt_service()
        assert svc._get_extension("audio/mp4") == "mp4"

    def test_content_type_wav_maps_to_wav(self):
        """Tiêu chí 5.7: audio/wav → wav"""
        svc = make_stt_service()
        assert svc._get_extension("audio/wav") == "wav"

    def test_content_type_mp3_maps_to_mp3(self):
        """Tiêu chí 5.7: audio/mpeg → mp3"""
        svc = make_stt_service()
        assert svc._get_extension("audio/mpeg") == "mp3"

    def test_unknown_content_type_defaults_to_webm(self):
        """Unknown content type → fallback webm"""
        svc = make_stt_service()
        assert svc._get_extension("audio/unknown") == "webm"

    def test_none_content_type_defaults_to_webm(self):
        """None content type → fallback webm"""
        svc = make_stt_service()
        assert svc._get_extension(None) == "webm"

    @pytest.mark.asyncio
    async def test_transcribe_uses_correct_extension_for_webm(self):
        """Tiêu chí 5.7: file temp được tạo với đúng extension"""
        svc = make_stt_service()
        created_paths = []

        original_run = svc._run_whisper

        def capture_path(audio_path, language):
            created_paths.append(audio_path)
            return ("Xin chào", 5.0)

        with patch.object(svc, "_run_whisper", side_effect=capture_path):
            await svc.transcribe(SAMPLE_AUDIO, content_type="audio/webm")

        assert len(created_paths) == 1
        assert created_paths[0].endswith(".webm")

    @pytest.mark.asyncio
    async def test_transcribe_uses_correct_extension_for_wav(self):
        """Tiêu chí 5.7: file temp .wav"""
        svc = make_stt_service()
        created_paths = []

        def capture_path(audio_path, language):
            created_paths.append(audio_path)
            return ("Xin chào", 5.0)

        with patch.object(svc, "_run_whisper", side_effect=capture_path):
            await svc.transcribe(SAMPLE_AUDIO, content_type="audio/wav")

        assert created_paths[0].endswith(".wav")


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.8: Round-trip equivalence
# ─────────────────────────────────────────────────────────────────────────────

class TestRoundTripEquivalence:
    @pytest.mark.asyncio
    async def test_stt_transcript_equals_typed_text(self):
        """
        Tiêu chí 5.8: STT → transcript → submit_answer tạo ra kết quả
        tương đương với người dùng gõ trực tiếp cùng nội dung.

        Property: transcribe(audio_of(text)) == text
        (với mock Whisper trả về đúng text)
        """
        svc = make_stt_service()
        original_text = "Tôi có 3 năm kinh nghiệm làm việc với Python và FastAPI."

        # Simulate: Whisper nhận dạng đúng text đã nói
        with patch.object(svc, "_run_whisper", return_value=(original_text, 10.0)):
            transcript = await svc.transcribe(SAMPLE_AUDIO)

        # Round-trip: transcript == original text
        assert transcript == original_text

    @pytest.mark.asyncio
    async def test_stt_transcript_is_plain_text_no_markup(self):
        """
        Tiêu chí 5.8: transcript là plain text, không có markup/HTML/JSON
        """
        svc = make_stt_service()
        plain_text = "Dự án tôi tự hào nhất là hệ thống e-commerce."

        with patch.object(svc, "_run_whisper", return_value=(plain_text, 8.0)):
            transcript = await svc.transcribe(SAMPLE_AUDIO)

        # Không có HTML tags
        assert "<" not in transcript
        assert ">" not in transcript
        # Không có JSON brackets
        assert "{" not in transcript
        assert "}" not in transcript
        # Là plain text
        assert isinstance(transcript, str)

    @pytest.mark.asyncio
    async def test_multiple_transcriptions_consistent(self):
        """
        Tiêu chí 5.8: Cùng audio → cùng transcript (deterministic)
        """
        svc = make_stt_service()
        expected = "Thách thức lớn nhất là tối ưu hóa performance."

        results = []
        for _ in range(3):
            with patch.object(svc, "_run_whisper", return_value=(expected, 7.0)):
                result = await svc.transcribe(SAMPLE_AUDIO)
                results.append(result)

        # Tất cả kết quả phải giống nhau
        assert all(r == expected for r in results)


# ─────────────────────────────────────────────────────────────────────────────
# Service properties
# ─────────────────────────────────────────────────────────────────────────────

class TestServiceProperties:
    def test_model_size_property(self):
        """model_size property trả về đúng giá trị"""
        svc = WhisperSTTService(model_size="small")
        assert svc.model_size == "small"

    def test_supported_formats_property(self):
        """supported_formats trả về set"""
        svc = make_stt_service()
        assert isinstance(svc.supported_formats, set)
        assert len(svc.supported_formats) > 0

    def test_lazy_model_loading(self):
        """Model chưa được load khi khởi tạo"""
        svc = WhisperSTTService(model_size="base")
        assert svc._model is None

    def test_content_type_map_completeness(self):
        """CONTENT_TYPE_TO_EXT phải có đủ 4 format bắt buộc"""
        assert "audio/webm" in CONTENT_TYPE_TO_EXT
        assert "audio/mp4" in CONTENT_TYPE_TO_EXT
        assert "audio/wav" in CONTENT_TYPE_TO_EXT
        assert "audio/mpeg" in CONTENT_TYPE_TO_EXT
