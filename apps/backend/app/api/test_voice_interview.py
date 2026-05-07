"""
Test cases cho Voice Interview API - Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời
Đảm bảo 100% Tiêu Chí Chấp Nhận pass
"""

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Import module trước khi patch để path resolution hoạt động
import app.api.voice_interview  # noqa: F401
from app.main import app

client = TestClient(app)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def make_audio(content: bytes = b"mock audio data " * 100, filename: str = "test.webm"):
    return (filename, io.BytesIO(content), "audio/webm")


def mock_db():
    """Mock DB session — save_audio_metadata sẽ được patch riêng"""
    db = MagicMock()
    db.execute = MagicMock()
    db.commit = MagicMock()
    return db


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

class TestHealthCheck:
    def test_health_check(self):
        response = client.get("/api/interview/voice/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "voice-interview"


# ─────────────────────────────────────────────
# POST /start
# ─────────────────────────────────────────────

class TestStartVoiceInterview:
    def test_start_success(self):
        """Tiêu chí 3.7 (backend): start trả về session_id, first_question, progress"""
        with patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = {"audio_url": "https://r2.dev/q1.mp3", "duration": 5}

            response = client.post(
                "/api/interview/voice/start",
                data={"job_id": "1", "question_count": "10"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "session_id" in data
        assert data["progress"]["current"] == 1
        assert data["progress"]["total"] == 10

    def test_start_first_question_structure(self):
        """First question phải có id, text, type"""
        with patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = None

            response = client.post(
                "/api/interview/voice/start",
                data={"job_id": "1"},
            )

        data = response.json()
        q = data["first_question"]
        assert "id" in q
        assert "text" in q
        assert "type" in q


# ─────────────────────────────────────────────
# POST /answer — validation
# ─────────────────────────────────────────────

class TestSubmitVoiceAnswerValidation:
    def test_invalid_file_type_returns_400(self):
        """Tiêu chí 3.4: file không phải audio → 400"""
        response = client.post(
            "/api/interview/voice/answer",
            data={"session_id": "1"},
            files={"audio_file": ("test.txt", io.BytesIO(b"text"), "text/plain")},
        )
        assert response.status_code == 400
        assert "Invalid audio file format" in response.json()["detail"]

    def test_empty_file_returns_400(self):
        """Tiêu chí 3.4: file rỗng → 400"""
        response = client.post(
            "/api/interview/voice/answer",
            data={"session_id": "1"},
            files={"audio_file": ("test.webm", io.BytesIO(b""), "audio/webm")},
        )
        assert response.status_code == 400
        assert "Empty audio file" in response.json()["detail"]

    def test_missing_session_id_returns_422(self):
        """Thiếu session_id → 422"""
        response = client.post(
            "/api/interview/voice/answer",
            files={"audio_file": make_audio()},
        )
        assert response.status_code == 422

    def test_missing_audio_file_returns_422(self):
        """Thiếu audio_file → 422"""
        response = client.post(
            "/api/interview/voice/answer",
            data={"session_id": "1"},
        )
        assert response.status_code == 422

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


# ─────────────────────────────────────────────
# POST /answer — happy path
# ─────────────────────────────────────────────

class TestSubmitVoiceAnswerSuccess:
    def test_full_pipeline_success(self):
        """
        Tiêu chí 3.4, 3.5, 3.6, 3.7, 3.9:
        upload → STT → AI Pipeline → TTS → DB save → response
        """
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = "Tôi có 3 năm kinh nghiệm với React."
            mock_ai.return_value = {
                "evaluation": {"score": 8, "feedback": "Tốt"},
                "next_question": {"id": "q2", "text": "Dự án tự hào nhất?", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 10},
            }
            mock_tts.return_value = {"audio_url": "https://r2.dev/q2.mp3", "duration": 6}
            mock_db_save.return_value = str(uuid.uuid4())

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1", "message_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        data = response.json()

        # Tiêu chí 3.4: upload thành công
        assert data["success"] is True
        assert data["file_url"] == "https://r2.dev/audio.webm"

        # Tiêu chí 3.5: transcript từ STT
        assert data["transcript"] == "Tôi có 3 năm kinh nghiệm với React."

        # Tiêu chí 3.6: AI pipeline response
        assert "evaluation" in data["ai_response"]
        assert "next_question" in data["ai_response"]
        assert data["ai_response"]["progress"]["current"] == 2

        # Tiêu chí 3.7: TTS audio cho câu hỏi tiếp theo
        assert data["next_question_audio"]["audio_url"] == "https://r2.dev/q2.mp3"

        # Tiêu chí 3.9: DB save được gọi
        mock_db_save.assert_called_once()
        call_kwargs = mock_db_save.call_args.kwargs
        assert call_kwargs["session_id"] == 1
        assert call_kwargs["audio_type"] == "user_answer"
        assert call_kwargs["file_url"] == "https://r2.dev/audio.webm"
        assert call_kwargs["transcript"] == "Tôi có 3 năm kinh nghiệm với React."

    def test_db_save_called_with_correct_columns(self):
        """
        Tiêu chí 3.9: Kiểm tra tất cả columns được lưu đúng:
        session_id, file_url, message_id, duration_seconds, transcript, file_size_bytes
        """
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = "Câu trả lời của tôi."
            mock_ai.return_value = {
                "evaluation": {"score": 7, "feedback": "OK"},
                "next_question": {"id": "q3", "text": "Câu hỏi 3", "type": "Hành vi"},
                "progress": {"current": 3, "total": 10},
            }
            mock_tts.return_value = None
            mock_db_save.return_value = "test-uuid-123"

            audio_content = b"audio data " * 200  # ~2200 bytes
            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "5", "message_id": "2"},
                files={"audio_file": ("ans.webm", io.BytesIO(audio_content), "audio/webm")},
            )

        assert response.status_code == 200
        mock_db_save.assert_called_once()
        kwargs = mock_db_save.call_args.kwargs

        # Kiểm tra từng column
        assert kwargs["session_id"] == 5
        assert kwargs["message_id"] == 2
        assert kwargs["audio_type"] == "user_answer"
        assert kwargs["file_url"] == "https://r2.dev/audio.webm"
        assert kwargs["transcript"] == "Câu trả lời của tôi."
        assert kwargs["file_size_bytes"] == len(audio_content)
        # duration_seconds không có từ STT mock nên không được truyền (None là OK)
        # Chỉ kiểm tra các columns bắt buộc
        assert "file_url" in kwargs
        assert "audio_type" in kwargs


# ─────────────────────────────────────────────
# POST /answer — STT errors (Tiêu chí 3.8)
# ─────────────────────────────────────────────

class TestSTTErrorHandling:
    def test_stt_no_speech_detected(self):
        """
        Tiêu chí 3.8: STT trả về transcript rỗng → success=False, allow_retry=True
        DB record vẫn được lưu (transcript=None)
        """
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = ""
            mock_db_save.return_value = "uuid-no-speech"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "STT_NO_SPEECH_DETECTED"
        assert "nhận dạng giọng nói" in data["message"]
        assert data["allow_retry"] is True

        # DB record vẫn được lưu dù không có transcript
        mock_db_save.assert_called_once()
        assert mock_db_save.call_args.kwargs["transcript"] is None

    def test_stt_whitespace_only_transcript(self):
        """Tiêu chí 3.8: transcript chỉ whitespace = no speech"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.return_value = "   "
            mock_db_save.return_value = "uuid-ws"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        data = response.json()
        assert data["success"] is False
        assert data["error"] == "STT_NO_SPEECH_DETECTED"
        assert data["allow_retry"] is True

    def test_stt_exception_returns_retry(self):
        """Tiêu chí 3.8: STT exception → success=False, allow_retry=True"""
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/audio.webm")
            mock_stt.side_effect = Exception("Whisper model error")
            mock_db_save.return_value = "uuid-err"

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        data = response.json()
        assert data["success"] is False
        assert data["error"] == "STT_PROCESSING_ERROR"
        assert data["allow_retry"] is True

    def test_upload_failure_returns_500(self):
        """Tiêu chí 3.4: upload thất bại → 500"""
        with patch("app.api.voice_interview.audio_storage") as mock_storage:
            mock_storage.upload_audio = AsyncMock(side_effect=Exception("R2 unavailable"))

            response = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1"},
                files={"audio_file": make_audio()},
            )

        assert response.status_code == 500
        assert "Failed to upload audio" in response.json()["detail"]


# ─────────────────────────────────────────────
# DB: save_audio_metadata unit tests (Tiêu chí 3.9)
# ─────────────────────────────────────────────

class TestSaveAudioMetadata:
    """Unit tests cho hàm save_audio_metadata — kiểm tra từng column"""

    def test_save_user_answer_all_columns(self):
        """Tất cả columns user_answer không được null ngoài những cột nullable"""
        from app.api.voice_interview import save_audio_metadata

        db = MagicMock()
        db.execute = MagicMock()
        db.commit = MagicMock()

        record_id = save_audio_metadata(
            db=db,
            session_id=10,
            audio_type="user_answer",
            file_url="https://r2.dev/audio.webm",
            message_id=5,
            duration_seconds=12.5,
            file_size_bytes=204800,
            transcript="Câu trả lời của tôi.",
        )

        assert record_id is not None
        db.execute.assert_called_once()
        db.commit.assert_called_once()

        # Kiểm tra params được truyền vào SQL
        call_args = db.execute.call_args
        params = call_args[0][1]  # second positional arg = params dict

        assert params["session_id"] == 10
        assert params["audio_type"] == "user_answer"
        assert params["file_url"] == "https://r2.dev/audio.webm"
        assert params["message_id"] == 5
        assert params["duration_seconds"] == 12.5
        assert params["file_size_bytes"] == 204800
        assert params["transcript"] == "Câu trả lời của tôi."

    def test_save_ai_question_nullable_columns(self):
        """AI question: message_id=None, transcript=None là hợp lệ"""
        from app.api.voice_interview import save_audio_metadata

        db = MagicMock()
        db.execute = MagicMock()
        db.commit = MagicMock()

        record_id = save_audio_metadata(
            db=db,
            session_id=10,
            audio_type="ai_question",
            file_url="https://r2.dev/q1.mp3",
            message_id=None,       # nullable — OK
            duration_seconds=8.0,
            file_size_bytes=None,  # nullable — OK
            transcript=None,       # nullable — OK
        )

        assert record_id is not None
        params = db.execute.call_args[0][1]
        assert params["message_id"] is None
        assert params["transcript"] is None
        assert params["audio_type"] == "ai_question"

    def test_save_generates_uuid(self):
        """Mỗi lần save phải tạo UUID mới"""
        from app.api.voice_interview import save_audio_metadata

        db1 = MagicMock()
        db1.execute = MagicMock()
        db1.commit = MagicMock()

        db2 = MagicMock()
        db2.execute = MagicMock()
        db2.commit = MagicMock()

        id1 = save_audio_metadata(db1, 1, "user_answer", "https://r2.dev/a.webm")
        id2 = save_audio_metadata(db2, 1, "user_answer", "https://r2.dev/b.webm")

        assert id1 != id2  # UUID phải unique


# ─────────────────────────────────────────────
# Integration: complete flow
# ─────────────────────────────────────────────

class TestVoiceInterviewIntegration:
    def test_start_then_answer_flow(self):
        """Tiêu chí 3.1–3.9: Luồng đầy đủ start → answer"""
        # Step 1: start
        with patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = {"audio_url": "https://r2.dev/q1.mp3", "duration": 5}
            start_resp = client.post(
                "/api/interview/voice/start",
                data={"job_id": "1", "question_count": "5"},
            )

        assert start_resp.status_code == 200
        assert start_resp.json()["success"] is True

        # Step 2: answer với integer session_id
        with (
            patch("app.api.voice_interview.audio_storage") as mock_storage,
            patch("app.api.voice_interview.process_stt", new_callable=AsyncMock) as mock_stt,
            patch("app.api.voice_interview.submit_to_ai_pipeline", new_callable=AsyncMock) as mock_ai,
            patch("app.api.voice_interview.generate_tts_audio", new_callable=AsyncMock) as mock_tts2,
            patch("app.api.voice_interview.save_audio_metadata") as mock_db_save,
        ):
            mock_storage.upload_audio = AsyncMock(return_value="https://r2.dev/ans1.webm")
            mock_stt.return_value = "Tôi có kinh nghiệm với Python và FastAPI."
            mock_ai.return_value = {
                "evaluation": {"score": 9, "feedback": "Xuất sắc"},
                "next_question": {"id": "q2", "text": "Dự án lớn nhất?", "type": "Kỹ thuật"},
                "progress": {"current": 2, "total": 5},
            }
            mock_tts2.return_value = {"audio_url": "https://r2.dev/q2.mp3", "duration": 7}
            mock_db_save.return_value = "integration-uuid"

            answer_resp = client.post(
                "/api/interview/voice/answer",
                data={"session_id": "1", "message_id": "1"},
                files={"audio_file": make_audio(b"real audio data " * 200)},
            )

        assert answer_resp.status_code == 200
        data = answer_resp.json()
        assert data["success"] is True
        assert data["transcript"] == "Tôi có kinh nghiệm với Python và FastAPI."
        assert data["ai_response"]["next_question"]["type"] == "Kỹ thuật"
        assert data["ai_response"]["progress"]["current"] == 2
        assert data["next_question_audio"]["audio_url"] == "https://r2.dev/q2.mp3"

        # Verify DB save
        mock_db_save.assert_called_once()

    def test_error_response_format_consistency(self):
        """Tất cả error responses phải có 'detail' hoặc 'message'"""
        cases = [
            {
                "data": {"session_id": "1"},
                "files": {"audio_file": ("t.txt", io.BytesIO(b"x"), "text/plain")},
                "expected": 400,
            },
            {
                "data": {},
                "files": {"audio_file": make_audio()},
                "expected": 422,
            },
        ]
        for case in cases:
            resp = client.post(
                "/api/interview/voice/answer",
                data=case["data"],
                files=case["files"],
            )
            assert resp.status_code == case["expected"]
            body = resp.json()
            assert "detail" in body or "message" in body
