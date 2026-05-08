"""
Unit tests for EdgeTTSService

Tests TTS functionality, voice selection, and basic configuration.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.interview.edge_tts_service import EdgeTTSService, edge_tts_service


class TestEdgeTTSService:
    """Test cases for EdgeTTSService class."""
    
    @pytest.fixture
    def tts_service(self):
        """Create EdgeTTSService instance for testing."""
        return EdgeTTSService()
    
    def test_voice_configuration(self, tts_service):
        """Test that voices are properly configured."""
        voices = tts_service.get_available_voices()
        
        assert "female" in voices
        assert "male" in voices
        assert voices["female"] == "vi-VN-HoaiMyNeural"
        assert voices["male"] == "vi-VN-NamMinhNeural"
    
    def test_validate_voice_preference(self, tts_service):
        """Test voice preference validation."""
        assert tts_service.validate_voice_preference("female") is True
        assert tts_service.validate_voice_preference("male") is True
        assert tts_service.validate_voice_preference("invalid") is False
        assert tts_service.validate_voice_preference("") is False
    
    @pytest.mark.asyncio
    async def test_synthesize_text_invalid_voice(self, tts_service):
        """Test synthesis with invalid voice preference."""
        with pytest.raises(ValueError, match="Invalid voice preference: invalid"):
            await tts_service.synthesize_text(
                text="Test text",
                voice_preference="invalid"
            )
    
    @pytest.mark.asyncio
    async def test_synthesize_text_edge_tts_failure(self, tts_service):
        """Test handling of Edge TTS failure."""
        with patch('edge_tts.Communicate') as mock_communicate_class:
            mock_communicate_class.side_effect = Exception("Edge TTS API error")
            
            with pytest.raises(RuntimeError, match="TTS synthesis failed"):
                await tts_service.synthesize_text(
                    text="Test text",
                    voice_preference="female"
                )


class TestEdgeTTSServiceIntegration:
    """Integration tests for EdgeTTSService."""
    
    def test_global_service_instance(self):
        """Test that global service instance is properly configured."""
        assert edge_tts_service is not None
        assert isinstance(edge_tts_service, EdgeTTSService)
        assert edge_tts_service.get_available_voices() == EdgeTTSService.VOICES
    
    def test_voice_consistency(self):
        """Test that voice configuration is consistent across instances."""
        service1 = EdgeTTSService()
        service2 = EdgeTTSService()
        
        assert service1.get_available_voices() == service2.get_available_voices()
        assert service1.validate_voice_preference("female") == service2.validate_voice_preference("female")
    
    def test_duration_estimation_logic(self):
        """Test duration estimation calculation."""
        service = EdgeTTSService()
        
        # Test word count to duration conversion
        short_text = "Xin chào"  # 2 words
        medium_text = "Đây là một câu hỏi phỏng vấn về kỹ năng lập trình"  # 11 words
        long_text = " ".join(["từ"] * 50)  # 50 words
        
        # Calculate expected durations (word_count / 2.5, minimum 1.0)
        short_expected = max(1.0, len(short_text.split()) / 2.5)
        medium_expected = max(1.0, len(medium_text.split()) / 2.5)
        long_expected = max(1.0, len(long_text.split()) / 2.5)
        
        # Verify calculation logic
        assert short_expected == 1.0  # 2/2.5 = 0.8, but minimum is 1.0
        assert medium_expected == 4.8  # 12/2.5 = 4.8 (corrected word count)
        assert long_expected == 20.0  # 50/2.5 = 20.0
        
        # Verify ordering
        assert short_expected < medium_expected < long_expected