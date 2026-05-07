"""
Test cases cho STT integration trong /answer endpoint - Yêu Cầu 5
Đảm bảo 100% Tiêu Chí Chấp Nhận pass
"""

import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

import app.api.voice_interview  # noqa: F401
from app.main import app
from app.modules.interview.whisper_stt_service import (
    STTNoSpeechError,
    STTDurationError,
    STTFileTooLargeError,
)
from fastapi.testclient import TestClient

client = TestClient(app)


def make_audio(content: bytes = b"audio " * 500, ct: str = "audio/webm"):
    return ("test.webm", io.BytesIO(content), ct)


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.1, 5.2, 5.3: Whisper transcription via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestSTTViaAnswerEndpoint:
    def test_stt_returns_transcript_in_response(self):
        """Tiêu chí 5.3: /answer trả về transcript từ STT"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = "Tôi có 3 năm kinh nghiệm với Python."
            mock_ai.return_value = {
                "evaluation": {"score": 8, "feedback": "Tốt"},
                "next_question": {"id": "q2", "text": "Câu hỏi 2", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 10},
            }
            mock_tts.return_value = {"audio_url": "https://r2.dev/q2.mp3", "duration": 5}
            mock_db.return_value = "uuid-1"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["transcript"] == "Tôi có 3 năm kinh nghiệm với Python."

    def test_stt_called_with_audio_data_and_content_type(self):
        """Tiêu chí 5.1, 5.7: process_stt được gọi với audio_data và content_type"""
        captured = {}

        async def capture_stt(audio_data, content_type=None):
            captured["audio_data"] = audio_data
            captured["content_type"] = content_type
            return "Transcript"

        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", side_effect=capture_stt),
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_ai.return_value = {
                "evaluation": {"score": 8, "feedback": "OK"},
                "next_question": {"id": "q2", "text": "Q2", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 10},
            }
            mock_tts.return_value = None
            mock_db.return_value = "uuid"

            audio_content = b"real audio data " * 100
            client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": ("test.webm", io.BytesIO(audio_content), "audio/webm")},
            )

        assert captured["audio_data"] == audio_content
        assert captured["content_type"] == "audio/webm"


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.5: File size limit via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestFileSizeLimitViaEndpoint:
    def test_large_file_returns_413(self):
        """Tiêu chí 5.5: file > 25MB → 413"""
        large_content = b"x" * (26 * 1024 * 1024)
        response = client.post(
            "/api/interview/voice/answer",
            data={"session_id": "1"},
            files={"audio_file": ("big.webm", io.BytesIO(large_content), "audio/webm")},
        )
        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.6: No speech detection via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestNoSpeechViaEndpoint:
    def test_stt_no_speech_returns_retry(self):
        """Tiêu chí 5.6: STTNoSpeechError → success=False, allow_retry=True"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.side_effect = STTNoSpeechError("STT_NO_SPEECH_DETECTED")
            mock_db.return_value = "uuid"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "STT_NO_SPEECH_DETECTED"
        assert data["allow_retry"] is True

    def test_stt_no_speech_still_saves_db_record(self):
        """Tiêu chí 5.6 + 3.9: DB record vẫn được lưu dù không có transcript"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.side_effect = STTNoSpeechError("STT_NO_SPEECH_DETECTED")
            mock_db.return_value = "uuid"

            client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        mock_db.assert_called_once()
        assert mock_db.call_args.kwargs["transcript"] is None


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.4: Duration error via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestDurationErrorViaEndpoint:
    def test_stt_duration_error_returns_retry(self):
        """Tiêu chí 5.4: STTDurationError → success=False, allow_retry=True"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.side_effect = STTDurationError("Audio too short: 1.5s (min 3.0s)")
            mock_db.return_value = "uuid"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "STT_DURATION_ERROR"
        assert data["allow_retry"] is True
        assert "1.5s" in data["message"]


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.7: Format support via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestFormatSupportViaEndpoint:
    @pytest.mark.parametrize("content_type,filename", [
        ("audio/webm", "test.webm"),
        ("audio/mp4",  "test.mp4"),
        ("audio/wav",  "test.wav"),
        ("audio/mpeg", "test.mp3"),
    ])
    def test_supported_formats_accepted(self, content_type, filename):
        """Tiêu chí 5.7: WebM, MP4, WAV, MP3 đều được chấp nhận"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio")
            mock_stt.return_value = "Transcript"
            mock_ai.return_value = {
                "evaluation": {"score": 8, "feedback": "OK"},
                "next_question": {"id": "q2", "text": "Q2", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 10},
            }
            mock_tts.return_value = None
            mock_db.return_value = "uuid"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": (filename, io.BytesIO(b"audio " * 500), content_type)},
            )

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_non_audio_content_type_rejected(self):
        """Tiêu chí 5.7: non-audio content type → 400"""
        response = client.post(
            "/api/interview/voice/answer",
            data={"session_id": "1"},
            files={"audio_file": ("test.txt", io.BytesIO(b"text"), "text/plain")},
        )
        assert response.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# Tiêu chí 5.8: Round-trip equivalence via /answer
# ─────────────────────────────────────────────────────────────────────────────

class TestRoundTripEquivalenceViaEndpoint:
    def test_transcript_passed_to_ai_pipeline(self):
        """
        Tiêu chí 5.8: transcript từ STT được truyền vào AI Pipeline
        → kết quả tương đương với text interview
        """
        original_text = "Tôi có kinh nghiệm với React và Node.js."
        captured_transcript = {}

        async def capture_pipeline(session_id, transcript, db):
            captured_transcript["value"] = transcript
            return {
                "evaluation": {"score": 9, "feedback": "Xuất sắc"},
                "next_question": {"id": "q2", "text": "Q2", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 10},
            }

        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", side_effect=capture_pipeline),
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = original_text
            mock_tts.return_value = None
            mock_db.return_value = "uuid"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        # Transcript từ STT được truyền vào AI Pipeline (round-trip equivalence)
        assert captured_transcript["value"] == original_text
        assert response.json()["transcript"] == original_text
