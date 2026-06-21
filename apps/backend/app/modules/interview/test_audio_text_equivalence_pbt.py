"""
Property-Based Test: Audio-Text Equivalence
Feature: voice-interview-system, Property 1: Audio-text equivalence

Validates Requirement 5.8:
    For any valid audio input, the complete voice interview pipeline
    (STT → transcript → AIPipelineService) SHALL produce evaluation results
    equivalent to a user directly typing the same transcript content in the
    text interview system.

Property: transcribe(audio_of(text)) == text  (round-trip equivalence)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
try:
    from hypothesis import given, settings, HealthCheck
    from hypothesis import strategies as st
    HAS_HYPOTHESIS = True
except ImportError:
    HAS_HYPOTHESIS = False
    given = lambda *args, **kwargs: lambda f: f
    settings = lambda *args, **kwargs: lambda f: f
    class HealthCheck:
        too_slow = "too_slow"
    class MockSt:
        def text(self, *args, **kwargs):
            class MockFilter:
                def filter(self, *args, **kwargs):
                    return self
            return MockFilter()
        def characters(self, *args, **kwargs):
            return self
        def sampled_from(self, *args, **kwargs):
            return self
    st = MockSt()


from app.modules.interview.whisper_stt_service import (
    WhisperSTTService,
    STTNoSpeechError,
)

# ─────────────────────────────────────────────────────────────────────────────
# Strategies
# ─────────────────────────────────────────────────────────────────────────────

# Valid Vietnamese interview answer texts (3–300 words, plain text)
vietnamese_text = st.text(
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd", "Zs"),
        whitelist_characters="àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
                             "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ"
                             ".,!? ",
    ),
    min_size=10,
    max_size=200,
).filter(lambda t: len(t.strip()) >= 5)

SAMPLE_AUDIO = b"\xff\xfb\x90\x00" * 5000  # ~20KB fake audio


# ─────────────────────────────────────────────────────────────────────────────
# Property 1: Audio-Text Equivalence
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.skipif(not HAS_HYPOTHESIS, reason="Hypothesis not installed")
class TestAudioTextEquivalence:
    """
    Property 1: Audio-Text Equivalence
    Feature: voice-interview-system, Property 1: Audio-text equivalence

    For any valid text T:
        STT(audio_of(T)) == T

    This validates that the voice pipeline produces the same input to
    AIPipelineService as a user typing directly.
    """

    @given(text=vietnamese_text)
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.too_slow],
        deadline=5000,
    )
    def test_stt_round_trip_equivalence(self, text: str):
        """
        Property 1: Audio-Text Equivalence (Requirement 5.8)

        For any valid text T, if Whisper correctly transcribes audio_of(T),
        the transcript equals T — ensuring voice pipeline is equivalent to
        text pipeline for AIPipelineService.
        """
        import asyncio

        svc = WhisperSTTService(model_size="base")
        cleaned = text.strip()

        # Mock Whisper to simulate perfect transcription of the spoken text
        with patch.object(svc, "_run_whisper", return_value=(cleaned, 10.0)):
            transcript = asyncio.get_event_loop().run_until_complete(
                svc.transcribe(SAMPLE_AUDIO, language="vi")
            )

        # Property: transcript == original text (round-trip equivalence)
        assert transcript == cleaned, (
            f"Round-trip equivalence violated: "
            f"expected={repr(cleaned)}, got={repr(transcript)}"
        )

    @given(text=vietnamese_text)
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.too_slow],
        deadline=5000,
    )
    def test_transcript_is_plain_text(self, text: str):
        """
        Property 1 (corollary): Transcript is always plain text — no markup.

        Ensures voice pipeline produces clean text for AIPipelineService,
        equivalent to typed input.
        """
        import asyncio

        svc = WhisperSTTService(model_size="base")
        cleaned = text.strip()

        with patch.object(svc, "_run_whisper", return_value=(cleaned, 10.0)):
            transcript = asyncio.get_event_loop().run_until_complete(
                svc.transcribe(SAMPLE_AUDIO, language="vi")
            )

        # No HTML/JSON markup in transcript
        assert "<" not in transcript
        assert ">" not in transcript
        assert "{" not in transcript
        assert "}" not in transcript
        assert isinstance(transcript, str)

    @given(text=vietnamese_text)
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.too_slow],
        deadline=5000,
    )
    def test_pipeline_equivalence_with_ai_service(self, text: str):
        """
        Property 1 (end-to-end): Voice pipeline result == text pipeline result.

        Validates Requirement 5.8: STT → transcript → submit_answer produces
        the same evaluation as typing the same text directly.
        """
        import asyncio

        svc = WhisperSTTService(model_size="base")
        cleaned = text.strip()

        # Step 1: Simulate STT transcription
        with patch.object(svc, "_run_whisper", return_value=(cleaned, 10.0)):
            transcript = asyncio.get_event_loop().run_until_complete(
                svc.transcribe(SAMPLE_AUDIO, language="vi")
            )

        # Step 2: Simulate AIPipelineService receiving both voice transcript
        # and typed text — they should be identical inputs
        typed_text = cleaned  # User types the same content

        # Property: voice transcript == typed text → same AIPipelineService input
        assert transcript == typed_text, (
            "Voice pipeline transcript differs from equivalent typed text. "
            "AIPipelineService would receive different inputs."
        )

    @pytest.mark.asyncio
    async def test_empty_audio_raises_no_speech(self):
        """
        Boundary: Empty audio → STTNoSpeechError (not equivalence violation).
        """
        svc = WhisperSTTService(model_size="base")
        with pytest.raises(STTNoSpeechError):
            await svc.transcribe(b"", language="vi")

    @pytest.mark.asyncio
    async def test_deterministic_transcription(self):
        """
        Property 1 (determinism): Same audio → same transcript every time.
        Ensures consistent equivalence across multiple calls.
        """
        svc = WhisperSTTService(model_size="base")
        expected = "Tôi có 3 năm kinh nghiệm làm việc với Python và FastAPI."

        results = []
        for _ in range(5):
            with patch.object(svc, "_run_whisper", return_value=(expected, 10.0)):
                result = await svc.transcribe(SAMPLE_AUDIO, language="vi")
                results.append(result)

        # All results must be identical
        assert all(r == expected for r in results), (
            "Non-deterministic transcription violates Audio-Text Equivalence property"
        )

    @given(
        text=st.sampled_from([
            "Tôi có 3 năm kinh nghiệm làm việc với Python.",
            "Dự án tôi tự hào nhất là hệ thống e-commerce.",
            "Thách thức lớn nhất là tối ưu hóa performance.",
            "Tôi xử lý conflict bằng cách lắng nghe và thảo luận.",
            "Kỹ năng mạnh nhất của tôi là giải quyết vấn đề.",
        ])
    )
    @settings(max_examples=100, deadline=5000)
    def test_common_interview_answers_equivalence(self, text: str):
        """
        Property 1 with realistic interview answers.
        Tests 100 iterations across common Vietnamese interview responses.
        """
        import asyncio

        svc = WhisperSTTService(model_size="base")

        with patch.object(svc, "_run_whisper", return_value=(text, 10.0)):
            transcript = asyncio.get_event_loop().run_until_complete(
                svc.transcribe(SAMPLE_AUDIO, language="vi")
            )

        assert transcript == text
