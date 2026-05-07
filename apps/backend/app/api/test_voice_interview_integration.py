"""
Integration tests cho Voice Interview API
Yêu cầu 8.4: Test complete voice interview flow
Yêu cầu 3.6: Test tích hợp với AIPipelineService
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.api.voice_interview import router

# ─────────────────────────────────────────────────────────────────────────────
# Test App Setup
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI()
app.include_router(router)

SAMPLE_AUDIO = b"\xff\xfb\x90\x00" * 5000  # ~20KB fake audio


def make_mock_user():
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    return user


def make_mock_session(session_id: int = 1, question_count: int = 10):
    session = MagicMock()
    session.id = session_id
    session.user_id = 1
    session.question_count = question_count
    session.interview_mode = "voice"
    session.tab_switch_count = 0
    session.status = "active"
    return session


# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_endpoint(self):
        """Voice API health check returns healthy status"""
        client = TestClient(app)
        response = client.get("/api/interview/voice/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "voice-interview"


# ─────────────────────────────────────────────────────────────────────────────
# TTS Endpoint Tests (Yêu cầu 4.1, 4.3, 4.8)
# ─────────────────────────────────────────────────────────────────────────────

class TestTTSEndpoint:
    def test_tts_invalid_voice_preference(self):
        """Yêu cầu 4.8: Invalid voice_preference → 400"""
        client = TestClient(app)
        with patch("app.api.voice_interview.get_db"):
            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "Xin chào", "voice_preference": "robot"},
            )
        assert response.status_code == 400

    def test_tts_empty_question_text(self):
        """Empty question_text → 400"""
        client = TestClient(app)
        with patch("app.api.voice_interview.get_db"):
            response = client.post(
                "/api/interview/voice/tts",
                data={"question_text": "   ", "voice_preference": "female"},
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_tts_returns_audio_url_and_question_text(self):
        """Yêu cầu 4.3: Response chứa audio_url + question_text"""
        mock_tts_result = {
            "audio_url": "https://r2.dev/test.mp3",
            "duration_seconds": 3.5,
            "word_timestamps": [{"word": "Xin", "offset_ms": 0, "duration_ms": 200}],
            "question_text": "Xin chào",
        }

        with (
            patch("app.api.voice_interview.AudioPipelineService") as MockPipeline,
            patch("app.api.voice_interview.get_db"),
        ):
            mock_instance = AsyncMock()
            mock_instance.generate_question_audio = AsyncMock(return_value=mock_tts_result)
            MockPipeline.return_value = mock_instance

            client = TestClient(app)
            response = client.post(
                "/api/interview/voice/tts",
                data={
                    "question_text": "Xin chào",
                    "voice_preference": "female",
                    "session_id": "1",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "audio_url" in data
        assert "question_text" in data
        assert data["question_text"] == "Xin chào"


# ─────────────────────────────────────────────────────────────────────────────
# STT Endpoint Tests (Yêu cầu 5.1-5.7)
# ─────────────────────────────────────────────────────────────────────────────

class TestSTTEndpoint:
    def test_stt_empty_audio(self):
        """Empty audio → 400"""
        client = TestClient(app)
        with patch("app.api.voice_interview.get_db"):
            response = client.post(
                "/api/interview/voice/stt",
                files={"audio_file": ("test.webm", b"", "audio/webm")},
            )
        assert response.status_code == 400

    def test_stt_file_too_large(self):
        """Yêu cầu 5.5: File > 25MB → 413"""
        client = TestClient(app)
        large_audio = b"x" * (25 * 1024 * 1024 + 1)
        with patch("app.api.voice_interview.get_db"):
            response = client.post(
                "/api/interview/voice/stt",
                files={"audio_file": ("test.webm", large_audio, "audio/webm")},
            )
        assert response.status_code == 413

    @pytest.mark.asyncio
    async def test_stt_no_speech_returns_allow_retry(self):
        """Yêu cầu 5.6: No speech → allow_retry=True"""
        from app.modules.interview.whisper_stt_service import STTNoSpeechError

        with (
            patch("app.api.voice_interview.whisper_stt_service") as mock_stt,
            patch("app.api.voice_interview.get_db"),
        ):
            mock_stt.transcribe = AsyncMock(side_effect=STTNoSpeechError("No speech"))

            client = TestClient(app)
            response = client.post(
                "/api/interview/voice/stt",
                files={"audio_file": ("test.webm", SAMPLE_AUDIO, "audio/webm")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["allow_retry"] is True
        assert data["error"] == "STT_NO_SPEECH_DETECTED"

    @pytest.mark.asyncio
    async def test_stt_returns_transcript(self):
        """Yêu cầu 5.3: STT returns plain text transcript"""
        expected_transcript = "Tôi có 3 năm kinh nghiệm làm việc với Python."

        with (
            patch("app.api.voice_interview.whisper_stt_service") as mock_stt,
            patch("app.api.voice_interview.get_db"),
        ):
            mock_stt.transcribe = AsyncMock(return_value=expected_transcript)

            client = TestClient(app)
            response = client.post(
                "/api/interview/voice/stt",
                files={"audio_file": ("test.webm", SAMPLE_AUDIO, "audio/webm")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["transcript"] == expected_transcript


# ─────────────────────────────────────────────────────────────────────────────
# Voice Answer Endpoint Tests (Yêu cầu 3.4-3.9)
# ─────────────────────────────────────────────────────────────────────────────

class TestVoiceAnswerEndpoint:
    def test_answer_tab_switch_violation_rejected(self):
        """Yêu cầu 6.7: tab_switch_count >= 3 → 403"""
        client = TestClient(app)

        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.get_db"),
        ):
            response = client.post(
                "/api/interview/voice/answer",
                data={
                    "session_id": "1",
                    "tab_switch_count": "3",
                },
                files={"audio_file": ("test.webm", SAMPLE_AUDIO, "audio/webm")},
            )

        assert response.status_code == 403

    def test_answer_invalid_audio_format(self):
        """Invalid audio content-type → 400"""
        client = TestClient(app)

        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.get_db"),
            patch("app.api.voice_interview.AIPipelineService") as MockAI,
        ):
            mock_ai = MagicMock()
            mock_ai.db = MagicMock()
            mock_ai.db.query.return_value.filter.return_value.first.return_value = make_mock_session()
            MockAI.return_value = mock_ai

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1", "tab_switch_count": "0"},
                files={"audio_file": ("test.txt", SAMPLE_AUDIO, "text/plain")},
            )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_answer_stt_no_speech_returns_retry(self):
        """Yêu cầu 3.8: STT no speech → allow_retry=True"""
        from app.modules.interview.whisper_stt_service import STTNoSpeechError

        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.AIPipelineService") as MockAI,
            patch("app.api.voice_interview.AudioPipelineService") as MockAudio,
            patch("app.api.voice_interview.get_db"),
        ):
            mock_ai = MagicMock()
            mock_ai.db = MagicMock()
            mock_ai.db.query.return_value.filter.return_value.first.return_value = make_mock_session()
            MockAI.return_value = mock_ai

            mock_audio = AsyncMock()
            mock_audio.process_user_audio = AsyncMock(side_effect=STTNoSpeechError("No speech"))
            MockAudio.return_value = mock_audio

            client = TestClient(app)
            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1", "tab_switch_count": "0"},
                files={"audio_file": ("test.webm", SAMPLE_AUDIO, "audio/webm")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["allow_retry"] is True

    @pytest.mark.asyncio
    async def test_answer_complete_flow(self):
        """
        Yêu cầu 8.4: Complete voice answer flow:
        audio → STT → AIPipelineService → TTS → response
        """
        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.AIPipelineService") as MockAI,
            patch("app.api.voice_interview.AudioPipelineService") as MockAudio,
            patch("app.api.voice_interview.get_db"),
        ):
            mock_ai = MagicMock()
            mock_ai.db = MagicMock()
            mock_ai.db.query.return_value.filter.return_value.first.return_value = make_mock_session()
            mock_ai.submit_answer = AsyncMock(return_value={
                "status": "continue",
                "next_question": "Hãy kể về dự án bạn tự hào nhất.",
                "question_number": 2,
                "question_type": "technical",
                "evaluation": {"score": 8, "feedback": "Tốt"},
            })
            MockAI.return_value = mock_ai

            mock_audio = AsyncMock()
            mock_audio.process_user_audio = AsyncMock(return_value={
                "transcript": "Tôi có 3 năm kinh nghiệm.",
                "file_url": "https://r2.dev/answer.webm",
                "audio_record_id": "uuid-123",
            })
            mock_audio.generate_question_audio = AsyncMock(return_value={
                "audio_url": "https://r2.dev/q2.mp3",
                "duration_seconds": 4.0,
                "word_timestamps": [],
                "question_text": "Hãy kể về dự án bạn tự hào nhất.",
            })
            MockAudio.return_value = mock_audio

            client = TestClient(app)
            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1", "tab_switch_count": "0"},
                files={"audio_file": ("test.webm", SAMPLE_AUDIO, "audio/webm")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["transcript"] == "Tôi có 3 năm kinh nghiệm."
        assert data["ai_response"]["status"] == "continue"
        assert data["next_question_audio"]["audio_url"] == "https://r2.dev/q2.mp3"


# ─────────────────────────────────────────────────────────────────────────────
# Tab Switch Endpoint Tests (Yêu cầu 6.6)
# ─────────────────────────────────────────────────────────────────────────────

class TestTabSwitchEndpoint:
    def test_tab_switch_updates_count(self):
        """Yêu cầu 6.6: Tab switch count is persisted to backend"""
        mock_session = make_mock_session()

        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.get_db") as mock_db_dep,
        ):
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.first.return_value = mock_session
            mock_db_dep.return_value = mock_db

            client = TestClient(app)
            response = client.patch(
                "/api/interview/voice/tab-switch",
                data={"session_id": "1", "tab_switch_count": "2"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["tab_switch_count"] == 2
        assert data["session_terminated"] is False

    def test_tab_switch_3_terminates_session(self):
        """Yêu cầu 6.5: tab_switch_count >= 3 → session terminated"""
        mock_session = make_mock_session()

        with (
            patch("app.api.voice_interview.get_current_user_from_token", return_value=make_mock_user()),
            patch("app.api.voice_interview.get_db") as mock_db_dep,
        ):
            mock_db = MagicMock()
            mock_db.query.return_value.filter.return_value.first.return_value = mock_session
            mock_db_dep.return_value = mock_db

            client = TestClient(app)
            response = client.patch(
                "/api/interview/voice/tab-switch",
                data={"session_id": "1", "tab_switch_count": "3"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["session_terminated"] is True
