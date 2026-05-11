"""
Test cases cho /api/interview/voice/tts endpoint - Yêu Cầu 4
"""

import io
from unittest.mock import AsyncMock, patch

import app.api.voice_interview  # noqa: F401
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

SAMPLE_AUDIO = b"\xff\xfb\x90\x00" * 100


class TestTTSEndpoint:
    def test_tts_success_female(self):
        """Tiêu chí 4.1, 4.3, 4.8: TTS với giọng nữ trả về audio_url + question_text"""
        with patch("app.api.voice_interview.tts_service") as mock_tts:
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        "https://r2.dev/q1.mp3",
                "duration_seconds": 5.0,
                "voice_used":       "vi-VN-HoaiMyNeural",
                "question_text":    "Xin chào!",
                "word_timestamps":  [{"word": "Xin", "offset_ms": 0, "duration_ms": 300}],
            })

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Xin chào!", "voice_preference": "female"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["audio_url"] == "https://r2.dev/q1.mp3"   # Tiêu chí 4.3
        assert data["question_text"] == "Xin chào!"            # Tiêu chí 4.3
        assert data["voice_used"] == "vi-VN-HoaiMyNeural"      # Tiêu chí 4.8
        assert "word_timestamps" in data                        # Tiêu chí 4.6
        assert data["duration_seconds"] == 5.0

    def test_tts_success_male(self):
        """Tiêu chí 4.8: TTS với giọng nam"""
        with patch("app.api.voice_interview.tts_service") as mock_tts:
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        "https://r2.dev/q1-male.mp3",
                "duration_seconds": 4.5,
                "voice_used":       "vi-VN-NamMinhNeural",
                "question_text":    "Câu hỏi tiếp theo",
                "word_timestamps":  [],
            })

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Câu hỏi tiếp theo", "voice_preference": "male"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["voice_used"] == "vi-VN-NamMinhNeural"

    def test_tts_invalid_voice_returns_400(self):
        """Tiêu chí 4.8: voice không hợp lệ → 400"""
        response = client.post(
            "/api/interview/voice/tts",
            data={"question_text": "Hello", "voice_preference": "robot"},
        )
        assert response.status_code == 400

    def test_tts_empty_text_returns_400(self):
        """question_text rỗng → 400"""
        response = client.post(
            "/api/interview/voice/tts",
            data={"question_text": "   ", "voice_preference": "female"},
        )
        assert response.status_code == 400

    def test_tts_missing_text_returns_422(self):
        """Thiếu question_text → 422"""
        response = client.post(
            "/api/interview/voice/tts",
            data={"voice_preference": "female"},
        )
        assert response.status_code == 422

    def test_tts_service_unavailable_returns_503(self):
        """Edge TTS fail → 503"""
        with patch("app.api.voice_interview.tts_service") as mock_tts:
            mock_tts.synthesize_text = AsyncMock(side_effect=RuntimeError("Edge TTS timeout"))

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Câu hỏi", "voice_preference": "female"},
            )

        assert response.status_code == 503

    def test_tts_response_has_word_timestamps(self):
        """Tiêu chí 4.6: response chứa word_timestamps"""
        timestamps = [
            {"word": "Hãy", "offset_ms": 0,   "duration_ms": 250},
            {"word": "kể",  "offset_ms": 300,  "duration_ms": 200},
        ]
        with patch("app.api.voice_interview.tts_service") as mock_tts:
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        "https://r2.dev/q.mp3",
                "duration_seconds": 3.0,
                "voice_used":       "vi-VN-HoaiMyNeural",
                "question_text":    "Hãy kể",
                "word_timestamps":  timestamps,
            })

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Hãy kể", "voice_preference": "female"},
            )

        data = response.json()
        assert data["word_timestamps"] == timestamps

    def test_tts_no_audio_url_when_no_session(self):
        """Tiêu chí 4.2: không có audio_url khi R2 chưa cấu hình và không có session_id"""
        with patch("app.api.voice_interview.tts_service") as mock_tts:
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        None,  # R2 chưa cấu hình
                "duration_seconds": 3.0,
                "voice_used":       "vi-VN-HoaiMyNeural",
                "question_text":    "Câu hỏi",
                "word_timestamps":  [],
            })

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Câu hỏi", "voice_preference": "female"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["audio_url"] is None


    def test_tts_db_save_ai_question_columns(self):
        """
        Tiêu chí 4.2 + DB: Khi có session_id integer, lưu DB record với
        audio_type='ai_question', transcript=None, message_id=None
        """
        with (
            patch("app.api.voice_interview.tts_service") as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        "https://r2.dev/q.mp3",
                "duration_seconds": 4.0,
                "voice_used":       "vi-VN-HoaiMyNeural",
                "question_text":    "Câu hỏi",
                "word_timestamps":  [],
            })
            mock_db_save.return_value = "test-uuid"

            response = client.post(
                "/api/interview/voice/tts",
                data={
                    "question_text":    "Câu hỏi",
                    "voice_preference": "female",
                    "session_id":       "5",  # integer session_id
                },
            )

        assert response.status_code == 200
        mock_db_save.assert_called_once()
        kwargs = mock_db_save.call_args.kwargs

        # Verify DB columns cho ai_question
        assert kwargs["session_id"]   == 5
        assert kwargs["audio_type"]   == "ai_question"
        assert kwargs["file_url"]     == "https://r2.dev/q.mp3"
        assert kwargs["message_id"]   is None       # ai_question không có message
        assert kwargs["transcript"]   is None       # ai_question không có transcript
        assert kwargs["duration_seconds"] == 4.0

    def test_tts_no_db_save_when_no_audio_url(self):
        """
        Tiêu chí 4.2: Không lưu DB nếu không có audio_url và upload cũng fail
        """
        with (
            patch("app.api.voice_interview.tts_service") as mock_tts,
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_tts.synthesize_text = AsyncMock(return_value={
                "audio_data":       SAMPLE_AUDIO,
                "audio_url":        None,  # R2 chưa cấu hình
                "duration_seconds": 3.0,
                "voice_used":       "vi-VN-HoaiMyNeural",
                "question_text":    "Câu hỏi",
                "word_timestamps":  [],
            })
            # Upload cũng fail → audio_url vẫn None
            mock_storage.upload_audio = AsyncMock(side_effect=Exception("R2 not configured"))

            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Câu hỏi", "voice_preference": "female", "session_id": "5"},
            )

        assert response.status_code == 200
        # DB save không được gọi vì audio_url vẫn None sau khi upload fail
        mock_db_save.assert_not_called()
