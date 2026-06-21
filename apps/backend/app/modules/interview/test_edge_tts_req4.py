"""
Test cases cho Yêu Cầu 4: Text-to-Speech (TTS) và Đồng Bộ Văn Bản
Đảm bảo 100% Tiêu Chí Chấp Nhận pass
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.interview.edge_tts_service import EdgeTTSService


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_TEXT = "Xin chào! Hãy giới thiệu về bản thân và kinh nghiệm làm việc của bạn."
SAMPLE_AUDIO = b"\xff\xfb\x90\x00" * 500  # fake MP3 header bytes


def make_mock_stream(audio_data: bytes, word_boundaries: list):
    """Tạo mock stream cho edge_tts.Communicate.stream()"""
    async def _stream():
        yield {"type": "audio", "data": audio_data}
        for wb in word_boundaries:
            yield {"type": "WordBoundary", **wb}
    return _stream()


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 4.8: Hỗ trợ hai giọng tiếng Việt
# ─────────────────────────────────────────────────────────────────────────────

class TestVoiceSupport:
    def test_female_voice_name(self):
        """Tiêu chí 4.8: vi-VN-HoaiMyNeural cho giọng nữ"""
        svc = EdgeTTSService()
        assert svc.VOICES["female"] == "vi-VN-HoaiMyNeural"

    def test_male_voice_name(self):
        """Tiêu chí 4.8: vi-VN-NamMinhNeural cho giọng nam"""
        svc = EdgeTTSService()
        assert svc.VOICES["male"] == "vi-VN-NamMinhNeural"

    def test_validate_female(self):
        assert EdgeTTSService().validate_voice_preference("female") is True

    def test_validate_male(self):
        assert EdgeTTSService().validate_voice_preference("male") is True

    def test_validate_invalid(self):
        assert EdgeTTSService().validate_voice_preference("robot") is False

    def test_get_available_voices(self):
        voices = EdgeTTSService().get_available_voices()
        assert "female" in voices
        assert "male" in voices


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 4.1: Chuyển đổi text thành audio
# ─────────────────────────────────────────────────────────────────────────────

class TestSynthesizeText:
    @pytest.mark.asyncio
    async def test_returns_audio_data(self):
        """Tiêu chí 4.1: synthesize_text trả về audio_data bytes"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert result["audio_data"] == SAMPLE_AUDIO
        assert len(result["audio_data"]) > 0

    @pytest.mark.asyncio
    async def test_returns_question_text(self):
        """Tiêu chí 4.3: response chứa question_text"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert result["question_text"] == SAMPLE_TEXT

    @pytest.mark.asyncio
    async def test_uses_correct_female_voice(self):
        """Tiêu chí 4.1, 4.8: dùng đúng voice name cho female"""
        svc = EdgeTTSService()
        captured_voice = {}

        def mock_communicate_init(text, voice):
            captured_voice["voice"] = voice
            m = MagicMock()
            m.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))
            return m

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", side_effect=mock_communicate_init):
            await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert captured_voice["voice"] == "vi-VN-HoaiMyNeural"

    @pytest.mark.asyncio
    async def test_uses_correct_male_voice(self):
        """Tiêu chí 4.1, 4.8: dùng đúng voice name cho male"""
        svc = EdgeTTSService()
        captured_voice = {}

        def mock_communicate_init(text, voice):
            captured_voice["voice"] = voice
            m = MagicMock()
            m.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))
            return m

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", side_effect=mock_communicate_init):
            await svc.synthesize_text(SAMPLE_TEXT, "male")

        assert captured_voice["voice"] == "vi-VN-NamMinhNeural"

    @pytest.mark.asyncio
    async def test_invalid_voice_raises_value_error(self):
        """Tiêu chí 4.8: voice không hợp lệ → ValueError"""
        svc = EdgeTTSService()
        with pytest.raises(ValueError, match="Invalid voice preference"):
            await svc.synthesize_text(SAMPLE_TEXT, "robot")

    @pytest.mark.asyncio
    async def test_empty_audio_raises_runtime_error(self):
        """Tiêu chí 4.1: Edge TTS không tạo được audio → RuntimeError"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(b"", []))

        with (
            patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate),
            patch.object(svc, "_try_fallback_voice", side_effect=RuntimeError("Failed to generate audio"))
        ):
            with pytest.raises(RuntimeError, match="Failed to generate audio"):
                await svc.synthesize_text(SAMPLE_TEXT, "female")


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 4.2: Lưu audio vào Audio_Storage
# ─────────────────────────────────────────────────────────────────────────────

class TestAudioStorage:
    @pytest.mark.asyncio
    async def test_stores_audio_when_session_id_provided(self):
        """Tiêu chí 4.2: upload audio khi có session_id"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with (
            patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate),
            patch("app.modules.interview.edge_tts_service.audio_storage_service") as mock_storage,
        ):
            mock_storage.upload_ai_question_audio = AsyncMock(return_value="https://r2.dev/q1.mp3")
            result = await svc.synthesize_text(SAMPLE_TEXT, "female", session_id="123")

        assert result["audio_url"] == "https://r2.dev/q1.mp3"
        mock_storage.upload_ai_question_audio.assert_called_once()

    @pytest.mark.asyncio
    async def test_audio_url_none_without_session_id(self):
        """Tiêu chí 4.2: không upload nếu không có session_id"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert result["audio_url"] is None

    @pytest.mark.asyncio
    async def test_storage_failure_non_blocking(self):
        """Tiêu chí 4.2: storage fail không block TTS — vẫn trả về audio_data"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with (
            patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate),
            patch("app.modules.interview.edge_tts_service.audio_storage_service") as mock_storage,
        ):
            mock_storage.upload_ai_question_audio = AsyncMock(side_effect=Exception("R2 down"))
            result = await svc.synthesize_text(SAMPLE_TEXT, "female", session_id="123")

        # audio_data vẫn có, audio_url là None
        assert result["audio_data"] == SAMPLE_AUDIO
        assert result["audio_url"] is None


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 4.6: Word timestamps
# ─────────────────────────────────────────────────────────────────────────────

class TestWordTimestamps:
    @pytest.mark.asyncio
    async def test_word_timestamps_collected(self):
        """Tiêu chí 4.6: word_timestamps được thu thập từ WordBoundary events"""
        svc = EdgeTTSService()

        word_boundaries = [
            {"text": "Xin",   "offset": 0,          "duration": 2_000_000},
            {"text": "chào",  "offset": 2_500_000,   "duration": 2_000_000},
            {"text": "bạn",   "offset": 5_000_000,   "duration": 2_000_000},
        ]

        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(
            return_value=make_mock_stream(SAMPLE_AUDIO, word_boundaries)
        )

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text("Xin chào bạn", "female")

        ts = result["word_timestamps"]
        assert len(ts) == 3
        assert ts[0]["word"] == "Xin"
        assert ts[0]["offset_ms"] == 0       # 0 // 10_000
        assert ts[1]["word"] == "chào"
        assert ts[1]["offset_ms"] == 250     # 2_500_000 // 10_000
        assert ts[2]["word"] == "bạn"
        assert ts[2]["offset_ms"] == 500

    @pytest.mark.asyncio
    async def test_empty_timestamps_when_no_word_boundary(self):
        """Tiêu chí 4.6: word_timestamps rỗng nếu Edge TTS không trả về WordBoundary"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert result["word_timestamps"] == []

    @pytest.mark.asyncio
    async def test_duration_from_timestamps(self):
        """Duration được tính từ last word timestamp khi có timestamps"""
        svc = EdgeTTSService()

        # Last word: offset=5000ms, duration=1000ms → total=6000ms → 6.0s
        word_boundaries = [
            {"text": "Hello", "offset": 0,           "duration": 10_000_000},
            {"text": "world", "offset": 50_000_000,  "duration": 10_000_000},
        ]

        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(
            return_value=make_mock_stream(SAMPLE_AUDIO, word_boundaries)
        )

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text("Hello world", "female")

        # offset=50_000_000//10_000=5000ms, duration=10_000_000//10_000=1000ms → 6000ms → 6.0s
        assert result["duration_seconds"] == pytest.approx(6.0, abs=0.1)

    @pytest.mark.asyncio
    async def test_duration_fallback_word_count(self):
        """Duration fallback từ word count khi không có timestamps"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        text = "một hai ba bốn năm"  # 5 words → 5/2.5 = 2.0s
        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(text, "female")

        assert result["duration_seconds"] == pytest.approx(2.0, abs=0.1)


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 4.3: Response chứa audio_url + question_text
# ─────────────────────────────────────────────────────────────────────────────

class TestResponseStructure:
    @pytest.mark.asyncio
    async def test_all_required_keys_present(self):
        """Tiêu chí 4.3: response có đủ audio_url, question_text, duration_seconds, word_timestamps"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result = await svc.synthesize_text(SAMPLE_TEXT, "female")

        assert "audio_data"       in result
        assert "audio_url"        in result
        assert "duration_seconds" in result
        assert "voice_used"       in result
        assert "question_text"    in result  # Tiêu chí 4.3
        assert "word_timestamps"  in result  # Tiêu chí 4.6

    @pytest.mark.asyncio
    async def test_voice_used_matches_preference(self):
        """voice_used phải match với voice_preference"""
        svc = EdgeTTSService()
        mock_communicate = MagicMock()
        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))

        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result_f = await svc.synthesize_text(SAMPLE_TEXT, "female")

        mock_communicate.stream = MagicMock(return_value=make_mock_stream(SAMPLE_AUDIO, []))
        with patch("app.modules.interview.edge_tts_service.edge_tts.Communicate", return_value=mock_communicate):
            result_m = await svc.synthesize_text(SAMPLE_TEXT, "male")

        assert result_f["voice_used"] == "vi-VN-HoaiMyNeural"
        assert result_m["voice_used"] == "vi-VN-NamMinhNeural"
