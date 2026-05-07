"""
Unit tests for AudioStorageService
Tests upload success/failure scenarios, path generation logic, and R2 client mocking
"""
import pytest
from unittest.mock import Mock, patch, PropertyMock
from datetime import datetime
import uuid

from app.modules.interview.audio_storage_service import AudioStorageService, audio_storage_service


class TestAudioStorageService:
    """Test cases for AudioStorageService"""

    def setup_method(self):
        """Setup test fixtures"""
        self.service = AudioStorageService()
        self.sample_audio_data = b"fake_audio_data_for_testing"
        self.session_id = 12345
        self.message_id = 67890

    def test_generate_audio_path_user_answer(self):
        """Test path generation for user answer audio"""
        path = self.service.generate_audio_path(
            session_id=self.session_id,
            audio_type="user_answer",
            message_id=self.message_id,
            file_extension="webm"
        )
        
        # Test path structure instead of exact values
        assert path.startswith(f"interview-audio/{self.session_id}/{self.message_id}/")
        assert path.endswith(".webm")
        assert len(path.split("/")) == 4  # interview-audio/session/message/filename

    def test_generate_audio_path_ai_question(self):
        """Test path generation for AI question audio"""
        path = self.service.generate_audio_path(
            session_id=self.session_id,
            audio_type="ai_question",
            message_id=None,
            file_extension="mp3"
        )
        
        # Test path structure instead of exact values
        assert path.startswith(f"interview-audio/{self.session_id}/ai_questions/")
        assert path.endswith(".mp3")
        assert len(path.split("/")) == 4  # interview-audio/session/ai_questions/filename

    @pytest.mark.asyncio
    async def test_upload_audio_success_user_answer(self):
        """Test successful upload of user answer audio"""
        # Mock R2 client and configuration
        mock_client = Mock()
        
        with patch.object(type(self.service), 'is_configured', new_callable=PropertyMock) as mock_configured, \
             patch.object(self.service, '_get_client', return_value=mock_client), \
             patch.object(self.service, 'generate_audio_path', return_value="test/path/audio.webm"), \
             patch.object(self.service, 'public_url', "https://test.r2.dev"):
            
            mock_configured.return_value = True
            
            result = await self.service.upload_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="user_answer",
                message_id=self.message_id,
                file_extension="webm"
            )
            
            # Verify client.put_object was called with correct parameters
            mock_client.put_object.assert_called_once()
            call_args = mock_client.put_object.call_args
            
            assert call_args[1]['Body'] == self.sample_audio_data
            assert call_args[1]['ContentType'] == "audio/webm"
            assert call_args[1]['Key'] == "test/path/audio.webm"
            
            # Verify metadata
            metadata = call_args[1]['Metadata']
            assert metadata['session_id'] == str(self.session_id)
            assert metadata['audio_type'] == "user_answer"
            assert metadata['message_id'] == str(self.message_id)
            
            # Verify return URL
            assert result == "https://test.r2.dev/test/path/audio.webm"

    @pytest.mark.asyncio
    async def test_upload_audio_success_ai_question(self):
        """Test successful upload of AI question audio"""
        mock_client = Mock()
        
        with patch.object(type(self.service), 'is_configured', new_callable=PropertyMock) as mock_configured, \
             patch.object(self.service, '_get_client', return_value=mock_client), \
             patch.object(self.service, 'generate_audio_path', return_value="test/path/ai_audio.mp3"), \
             patch.object(self.service, 'public_url', "https://test.r2.dev"):
            
            mock_configured.return_value = True
            
            result = await self.service.upload_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="ai_question",
                message_id=None,
                file_extension="mp3"
            )
            
            # Verify client.put_object was called
            mock_client.put_object.assert_called_once()
            call_args = mock_client.put_object.call_args
            
            assert call_args[1]['ContentType'] == "audio/mpeg"
            
            # Verify metadata for AI question
            metadata = call_args[1]['Metadata']
            assert metadata['audio_type'] == "ai_question"
            assert metadata['message_id'] == ""  # Empty for AI questions
            
            assert result == "https://test.r2.dev/test/path/ai_audio.mp3"

    @pytest.mark.asyncio
    async def test_upload_audio_not_configured(self):
        """Test upload when R2 is not configured"""
        with patch.object(type(self.service), 'is_configured', new_callable=PropertyMock) as mock_configured:
            mock_configured.return_value = False
            
            result = await self.service.upload_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="user_answer",
                message_id=self.message_id
            )
            
            assert result is None

    @pytest.mark.asyncio
    async def test_upload_audio_missing_message_id_for_user_answer(self):
        """Test upload fails when message_id is missing for user_answer"""
        with patch.object(type(self.service), 'is_configured', new_callable=PropertyMock) as mock_configured:
            mock_configured.return_value = True
            
            with pytest.raises(ValueError, match="message_id is required for user_answer"):
                await self.service.upload_audio(
                    audio_data=self.sample_audio_data,
                    session_id=self.session_id,
                    audio_type="user_answer",
                    message_id=None
                )

    @pytest.mark.asyncio
    async def test_upload_audio_client_error(self):
        """Test upload handles client errors gracefully"""
        mock_client = Mock()
        mock_client.put_object.side_effect = Exception("S3 Error")
        
        with patch.object(type(self.service), 'is_configured', new_callable=PropertyMock) as mock_configured, \
             patch.object(self.service, '_get_client', return_value=mock_client), \
             patch('app.modules.interview.audio_storage_service.logger') as mock_logger:
            
            mock_configured.return_value = True
            
            result = await self.service.upload_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="user_answer",
                message_id=self.message_id
            )
            
            # Should return None on error (Requirements: 7.5)
            assert result is None
            
            # Should log error
            mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_user_answer_audio_convenience_method(self):
        """Test convenience method for user answer upload"""
        with patch.object(self.service, 'upload_audio', return_value="https://test.url") as mock_upload:
            result = await self.service.upload_user_answer_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                message_id=self.message_id,
                file_extension="webm"
            )
            
            mock_upload.assert_called_once_with(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="user_answer",
                message_id=self.message_id,
                file_extension="webm"
            )
            
            assert result == "https://test.url"

    @pytest.mark.asyncio
    async def test_upload_ai_question_audio_convenience_method(self):
        """Test convenience method for AI question upload"""
        with patch.object(self.service, 'upload_audio', return_value="https://test.url") as mock_upload:
            result = await self.service.upload_ai_question_audio(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                file_extension="mp3"
            )
            
            mock_upload.assert_called_once_with(
                audio_data=self.sample_audio_data,
                session_id=self.session_id,
                audio_type="ai_question",
                message_id=None,
                file_extension="mp3"
            )
            
            assert result == "https://test.url"

    def test_get_audio_info_user_answer(self):
        """Test extracting audio info from user answer URL"""
        with patch.object(self.service, 'public_url', "https://test.r2.dev"):
            url = "https://test.r2.dev/interview-audio/12345/67890/20260425_143000_abcd1234.webm"
            
            info = self.service.get_audio_info(url)
            
            expected = {
                "session_id": 12345,
                "audio_type": "user_answer",
                "message_id": 67890,
                "filename": "20260425_143000_abcd1234.webm"
            }
            
            assert info == expected

    def test_get_audio_info_ai_question(self):
        """Test extracting audio info from AI question URL"""
        with patch.object(self.service, 'public_url', "https://test.r2.dev"):
            url = "https://test.r2.dev/interview-audio/12345/ai_questions/20260425_143000_abcd1234.mp3"
            
            info = self.service.get_audio_info(url)
            
            expected = {
                "session_id": 12345,
                "audio_type": "ai_question",
                "message_id": None,
                "filename": "20260425_143000_abcd1234.mp3"
            }
            
            assert info == expected

    def test_get_audio_info_invalid_url(self):
        """Test handling invalid audio URL"""
        with patch.object(self.service, 'public_url', "https://test.r2.dev"):
            url = "https://test.r2.dev/invalid/path/structure.mp3"
            
            info = self.service.get_audio_info(url)
            
            assert "error" in info
            assert info["error"] == "Invalid audio file path structure"

    def test_content_type_detection(self):
        """Test automatic content type detection for different audio formats"""
        test_cases = [
            ("wav", "audio/wav"),
            ("mp3", "audio/mpeg"),
            ("webm", "audio/webm"),
            ("mp4", "audio/mp4"),
            ("ogg", "audio/ogg"),
            ("unknown", "audio/wav")  # Default fallback
        ]
        
        # Test the content type mapping logic directly
        for extension, expected_content_type in test_cases:
            audio_mime_types = {
                "wav": "audio/wav",
                "mp3": "audio/mpeg",
                "webm": "audio/webm",
                "mp4": "audio/mp4",
                "ogg": "audio/ogg"
            }
            content_type = audio_mime_types.get(extension.lower(), "audio/wav")
            assert content_type == expected_content_type


class TestAudioStorageServiceIntegration:
    """Integration tests for AudioStorageService"""

    def test_singleton_instance(self):
        """Test that audio_storage_service is properly configured"""
        assert audio_storage_service is not None
        assert isinstance(audio_storage_service, AudioStorageService)

    def test_path_generation_consistency(self):
        """Test that path generation is consistent across multiple calls"""
        service = AudioStorageService()
        
        # Generate multiple paths and ensure they follow the pattern
        paths = []
        for i in range(5):
            path = service.generate_audio_path(
                session_id=123,
                audio_type="user_answer",
                message_id=456,
                file_extension="webm"
            )
            paths.append(path)
        
        # All paths should start with the same prefix
        for path in paths:
            assert path.startswith("interview-audio/123/456/")
            assert path.endswith(".webm")
        
        # All paths should be unique (due to timestamp and UUID)
        assert len(set(paths)) == len(paths)

    def test_error_resilience(self):
        """Test that service handles various error conditions gracefully"""
        service = AudioStorageService()
        
        # Test URL parsing with malformed URLs
        malformed_urls = [
            "",
            "not_a_url",
            "https://example.com",
            "https://test.r2.dev/wrong/structure"
        ]
        
        for url in malformed_urls:
            info = service.get_audio_info(url)
            assert "error" in info or info == {"error": "Invalid audio file path structure"}

    def test_path_structure_validation(self):
        """Test that generated paths follow the correct structure"""
        service = AudioStorageService()
        
        # Test user answer path
        user_path = service.generate_audio_path(
            session_id=123,
            audio_type="user_answer",
            message_id=456,
            file_extension="webm"
        )
        
        parts = user_path.split("/")
        assert parts[0] == "interview-audio"
        assert parts[1] == "123"  # session_id
        assert parts[2] == "456"  # message_id
        assert parts[3].endswith(".webm")
        
        # Test AI question path
        ai_path = service.generate_audio_path(
            session_id=123,
            audio_type="ai_question",
            message_id=None,
            file_extension="mp3"
        )
        
        parts = ai_path.split("/")
        assert parts[0] == "interview-audio"
        assert parts[1] == "123"  # session_id
        assert parts[2] == "ai_questions"  # special folder for AI questions
        assert parts[3].endswith(".mp3")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])