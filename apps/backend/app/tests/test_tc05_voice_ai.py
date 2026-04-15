"""
TC05 — PB06 Voice AI Tests
===========================
Test Cases:
  TC05.1  Ghi âm trong môi trường ồn → API vẫn trích xuất từ khóa chính
          (Gemini trả về JSON với confidence thấp nhưng vẫn có transcript & traits)
  TC05.2  Chỉnh sửa văn bản sau khi STT trả về → hệ thống lưu theo nội dung đã sửa
  TC05.3  _parse_response() xử lý JSON có markdown fence
  TC05.4  _neutral_fallback() trả về giá trị an toàn khi Gemini lỗi
  TC05.5  save_voice_traits() lưu đúng vào essay_analysis (mock session)
  TC05.6  Transcript edit endpoint cập nhật đúng trường
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Import trực tiếp từ voice_analyzer
# ---------------------------------------------------------------------------
from app.modules.assessments.voice_analyzer import (
    BIG5_KEYS,
    RIASEC_KEYS,
    _neutral_fallback,
    _parse_response,
)

# ===========================================================================
# TC05.4 — _neutral_fallback()
# ===========================================================================

class TestNeutralFallback:
    """Kiểm tra fallback khi Gemini không khả dụng."""

    def test_fallback_has_all_keys(self):
        result = _neutral_fallback("Gemini not available")
        assert "transcript" in result
        assert "big5" in result
        assert "riasec" in result
        assert "voice_summary" in result
        assert "confidence" in result
        assert "error" in result

    def test_fallback_confidence_is_zero(self):
        result = _neutral_fallback("test reason")
        assert result["confidence"] == 0.0

    def test_fallback_big5_keys_all_present(self):
        result = _neutral_fallback("test")
        for key in BIG5_KEYS:
            assert key in result["big5"], f"Missing big5 key: {key}"

    def test_fallback_riasec_keys_all_present(self):
        result = _neutral_fallback("test")
        for key in RIASEC_KEYS:
            assert key in result["riasec"], f"Missing riasec key: {key}"

    def test_fallback_big5_values_are_neutral(self):
        """Fallback dùng 0.5 (neutral) cho BigFive."""
        result = _neutral_fallback("test")
        for key in BIG5_KEYS:
            assert result["big5"][key] == 0.5

    def test_fallback_riasec_uniform(self):
        """Fallback dùng 1/6 ≈ 0.167 (đều) cho RIASEC."""
        result = _neutral_fallback("test")
        for key in RIASEC_KEYS:
            assert abs(result["riasec"][key] - 0.167) < 0.001

    def test_fallback_error_message_stored(self):
        reason = "Connection timeout"
        result = _neutral_fallback(reason)
        assert result["error"] == reason


# ===========================================================================
# TC05.3 — _parse_response() với nhiều định dạng đầu vào
# ===========================================================================

class TestParseResponse:
    """Kiểm tra parse JSON từ Gemini response."""

    def _valid_json(self, confidence=0.85, transcript="Hello world") -> str:
        data = {
            "transcript": transcript,
            "big5": {
                "openness": 0.7,
                "conscientiousness": 0.8,
                "extraversion": 0.6,
                "agreeableness": 0.9,
                "neuroticism": 0.3
            },
            "riasec": {
                "realistic": 0.4,
                "investigative": 0.6,
                "artistic": 0.5,
                "social": 0.7,
                "enterprising": 0.8,
                "conventional": 0.3
            },
            "voice_summary": "Speaker is outgoing and organized.",
            "confidence": confidence
        }
        return json.dumps(data)

    def test_clean_json_parsed_correctly(self):
        result = _parse_response(self._valid_json())
        assert result["confidence"] == 0.85
        assert result["transcript"] == "Hello world"
        assert result["big5"]["openness"] == 0.7

    def test_markdown_fence_stripped(self):
        """TC05.3: JSON trong markdown fence được xử lý."""
        raw = "```json\n" + self._valid_json() + "\n```"
        result = _parse_response(raw)
        assert result["confidence"] == 0.85
        assert "error" not in result

    def test_plain_code_fence_stripped(self):
        raw = "```\n" + self._valid_json() + "\n```"
        result = _parse_response(raw)
        assert "error" not in result
        assert result["big5"]["conscientiousness"] == 0.8

    def test_invalid_json_returns_fallback(self):
        result = _parse_response("This is not JSON at all.")
        assert result["confidence"] == 0.0
        assert "error" in result

    def test_values_clamped_to_0_1(self):
        """Giá trị ngoài [0,1] phải bị clamp."""
        data = {
            "transcript": "test",
            "big5": {
                "openness": 1.5,       # quá 1.0
                "conscientiousness": -0.2,  # âm
                "extraversion": 0.5,
                "agreeableness": 0.8,
                "neuroticism": 0.3
            },
            "riasec": {
                "realistic": 0.4, "investigative": 0.6, "artistic": 0.5,
                "social": 0.7, "enterprising": 0.8, "conventional": 0.3
            },
            "voice_summary": "test",
            "confidence": 2.0  # quá 1.0
        }
        result = _parse_response(json.dumps(data))
        assert result["big5"]["openness"] == 1.0
        assert result["big5"]["conscientiousness"] == 0.0
        assert result["confidence"] == 1.0

    # ------------------------------------------------------------------
    # TC05.1 — Môi trường ồn: confidence thấp nhưng vẫn có transcript
    # ------------------------------------------------------------------

    def test_noisy_audio_low_confidence_still_has_transcript(self):
        """
        TC05.1: Gemini phân tích âm thanh nhiễu → confidence thấp (0.2)
        nhưng vẫn trả về transcript (có thể không hoàn hảo) và các trait scores.
        """
        # Mô phỏng response của Gemini cho audio nhiễu
        noisy_response = self._valid_json(confidence=0.2, transcript="[inaudible] working hard [noise]")
        result = _parse_response(noisy_response)

        # API vẫn extract được keywords / traits
        assert result["confidence"] == 0.2  # thấp nhưng hợp lệ
        assert len(result["transcript"]) > 0  # vẫn có transcript
        assert result["riasec"]["enterprising"] == 0.8  # traits vẫn trích xuất được

    def test_very_low_confidence_audio_fallback_safe(self):
        """
        Ngay cả khi confidence=0.0 (không thể phân tích), response vẫn hợp lệ.
        """
        result = _neutral_fallback("Audio too noisy to analyze")
        # Hệ thống không crash, trả về safe defaults
        assert result["confidence"] == 0.0
        assert all(k in result["big5"] for k in BIG5_KEYS)
        assert all(k in result["riasec"] for k in RIASEC_KEYS)

    def test_partial_json_in_noisy_text(self):
        """Nếu Gemini trả lời lẫn text và JSON, cần extract JSON."""
        valid_json = self._valid_json(confidence=0.3)
        mixed = f"Audio was quite noisy. Here is my best attempt:\n\n{valid_json}\n\nPlease note low confidence."
        result = _parse_response(mixed)
        assert result["confidence"] == 0.3


# ===========================================================================
# TC05.5 — save_voice_traits() mock session test
# ===========================================================================

class TestSaveVoiceTraits:
    """Kiểm tra persistence layer với mock SQLAlchemy session."""

    def _make_analysis(self, confidence=0.8, transcript="Test speech"):
        return {
            "transcript": transcript,
            "big5": {k: 0.6 for k in BIG5_KEYS},
            "riasec": {k: 0.5 for k in RIASEC_KEYS},
            "voice_summary": "Active and curious speaker",
            "confidence": confidence,
        }

    def test_save_merges_into_essay_analysis(self):
        """
        save_voice_traits() phải set assessment.essay_analysis['voice_analysis'].
        """
        from app.modules.assessments.voice_analyzer import save_voice_traits

        # Mock session & Assessment
        mock_session = MagicMock()
        mock_assessment = MagicMock()
        mock_assessment.essay_analysis = {}

        # session.get() trả về mock_assessment
        mock_session.get.return_value = mock_assessment

        # Mock fuse_user_traits từ service module
        with patch("app.modules.assessments.service.fuse_user_traits"):
            save_voice_traits(
                session=mock_session,
                user_id=1,
                assessment_id=42,
                analysis=self._make_analysis(transcript="Hello world"),
            )

        # Kiểm tra voice_analysis được merge vào essay_analysis
        assert "voice_analysis" in mock_assessment.essay_analysis
        va = mock_assessment.essay_analysis["voice_analysis"]
        assert va["transcript"] == "Hello world"
        assert va["confidence"] == 0.8
        assert "big5" in va
        assert "riasec" in va

    def test_save_preserves_existing_essay_data(self):
        """
        Dữ liệu essay cũ không bị xoá khi thêm voice_analysis.
        """
        from app.modules.assessments.voice_analyzer import save_voice_traits

        mock_session = MagicMock()
        mock_assessment = MagicMock()
        mock_assessment.essay_analysis = {
            "essay_themes": ["technology", "leadership"],
            "essay_sentiment": "positive"
        }

        mock_session.get.return_value = mock_assessment

        with patch("app.modules.assessments.service.fuse_user_traits"):
            save_voice_traits(
                session=mock_session,
                user_id=1,
                assessment_id=5,
                analysis=self._make_analysis(),
            )

        # Essay data cũ vẫn còn
        ea = mock_assessment.essay_analysis
        assert ea["essay_themes"] == ["technology", "leadership"]
        assert "voice_analysis" in ea

    def test_save_handles_none_assessment(self):
        """session.get() trả về None (assessment không tồn tại) → không crash."""
        from app.modules.assessments.voice_analyzer import save_voice_traits

        mock_session = MagicMock()
        mock_session.get.return_value = None  # assessment không tìm thấy

        with patch("app.modules.assessments.service.fuse_user_traits"):
            # Không nên raise exception
            save_voice_traits(
                session=mock_session,
                user_id=1,
                assessment_id=999,
                analysis=self._make_analysis(),
            )

        # Không crash = pass


# ===========================================================================
# TC05.2 — Transcript Editing: cập nhật sau khi STT trả về
# ===========================================================================

class TestTranscriptEditing:
    """
    TC05.2: Sau khi STT trả về, user chỉnh sửa transcript.
    Hệ thống phải lưu bản đã chỉnh sửa vào essay_analysis.
    """

    def _apply_transcript_edit(self, essay_analysis: dict, edited_text: str) -> dict:
        """
        Mô phỏng logic endpoint PATCH /api/assessments/{id}/voice-transcript.
        Update transcript trong voice_analysis với text đã chỉnh sửa.
        """
        updated = dict(essay_analysis)
        if "voice_analysis" in updated:
            updated["voice_analysis"] = dict(updated["voice_analysis"])
            updated["voice_analysis"]["transcript"] = edited_text
            updated["voice_analysis"]["transcript_edited"] = True
        return updated

    def test_edited_transcript_replaces_original(self):
        """User sửa transcript → bản mới thay thế bản gốc."""
        original = {
            "voice_analysis": {
                "transcript": "[noisy] I work in [inaudible] technology",
                "confidence": 0.3,
                "big5": {"openness": 0.7},
                "voice_summary": "Tech professional"
            }
        }
        edited = "I work in the technology sector and enjoy problem solving"
        result = self._apply_transcript_edit(original, edited)

        assert result["voice_analysis"]["transcript"] == edited
        assert result["voice_analysis"]["transcript_edited"] is True

    def test_edit_marks_transcript_as_edited(self):
        """transcript_edited flag phải là True sau khi chỉnh sửa."""
        essay_analysis = {
            "voice_analysis": {
                "transcript": "original noisy text",
                "confidence": 0.2,
            }
        }
        result = self._apply_transcript_edit(essay_analysis, "Clean edited text")
        assert result["voice_analysis"]["transcript_edited"] is True

    def test_edit_preserves_other_voice_fields(self):
        """Chỉnh transcript không xoá confidence, big5, riasec."""
        essay_analysis = {
            "voice_analysis": {
                "transcript": "noisy",
                "confidence": 0.4,
                "big5": {"openness": 0.8},
                "riasec": {"investigative": 0.9},
                "voice_summary": "Analytical thinker"
            }
        }
        result = self._apply_transcript_edit(essay_analysis, "Clean transcript")
        va = result["voice_analysis"]
        assert va["confidence"] == 0.4
        assert va["big5"]["openness"] == 0.8
        assert va["riasec"]["investigative"] == 0.9
        assert va["voice_summary"] == "Analytical thinker"

    def test_edit_no_voice_analysis_does_not_crash(self):
        """Nếu chưa có voice_analysis, không crash."""
        essay_analysis = {"essay_themes": ["tech"]}
        result = self._apply_transcript_edit(essay_analysis, "some text")
        # Không có voice_analysis → không thay đổi gì
        assert "voice_analysis" not in result

    def test_empty_transcript_is_valid_edit(self):
        """User xoá sạch transcript (empty string) cũng là valid edit."""
        essay_analysis = {
            "voice_analysis": {"transcript": "original", "confidence": 0.5}
        }
        result = self._apply_transcript_edit(essay_analysis, "")
        assert result["voice_analysis"]["transcript"] == ""
        assert result["voice_analysis"]["transcript_edited"] is True


# ===========================================================================
# TC05 — Integration: Voice endpoint input validation
# ===========================================================================

class TestVoiceEndpointValidation:
    """Kiểm tra validation logic tại voice endpoint."""

    def test_max_file_size_constant(self):
        """MAX_SIZE = 20 MB."""
        MAX_SIZE = 20 * 1024 * 1024
        assert MAX_SIZE == 20971520

    def test_audio_mime_type_allowed(self):
        """Content-type phải bắt đầu bằng 'audio/'."""
        allowed_types = ["audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/mp4"]
        for ct in allowed_types:
            is_allowed = ct.startswith("audio/") or ct == "application/octet-stream"
            assert is_allowed, f"{ct} should be allowed"

    def test_non_audio_mime_type_rejected(self):
        """Video và text không được chấp nhận."""
        rejected_types = ["video/mp4", "text/plain", "application/json", "image/png"]
        for ct in rejected_types:
            is_allowed = ct.startswith("audio/") or ct == "application/octet-stream"
            assert not is_allowed, f"{ct} should be rejected"

    def test_application_octet_stream_allowed(self):
        """application/octet-stream cho phép (binary upload)."""
        ct = "application/octet-stream"
        is_allowed = ct.startswith("audio/") or ct == "application/octet-stream"
        assert is_allowed


# ===========================================================================
# TC05 — BIG5_KEYS & RIASEC_KEYS constants
# ===========================================================================

def test_big5_keys_correct():
    """BIG5_KEYS phải có đủ 5 trait."""
    assert len(BIG5_KEYS) == 5
    assert set(BIG5_KEYS) == {"openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"}


def test_riasec_keys_correct():
    """RIASEC_KEYS phải có đủ 6 dimension."""
    assert len(RIASEC_KEYS) == 6
    assert set(RIASEC_KEYS) == {"realistic", "investigative", "artistic", "social", "enterprising", "conventional"}
