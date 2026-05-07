"""
Audio Storage Service for Voice Interview System
Specialized service for storing interview audio files with structured paths
"""
import logging
import os
import uuid
from datetime import datetime
from typing import Optional, Literal
from pathlib import Path

from app.core.r2_storage import R2StorageService

logger = logging.getLogger(__name__)

AudioType = Literal["user_answer", "ai_question"]


class AudioStorageService(R2StorageService):
    """
    Specialized storage service for interview audio files.
    Extends R2StorageService with audio-specific functionality.
    
    Requirements: 7.1, 7.5
    """

    def __init__(self):
        super().__init__()
        # Override bucket name for audio files if specified
        # FALLBACK: Use main bucket if audio bucket doesn't exist
        self.audio_bucket_name = os.getenv("CF_R2_AUDIO_BUCKET_NAME", self.bucket_name)
        self._bucket_verified = False
        
    async def _verify_bucket(self) -> str:
        """
        Verify audio bucket exists, fallback to main bucket if not.
        
        Returns:
            The bucket name to use for audio storage
        """
        if self._bucket_verified:
            return self.audio_bucket_name
            
        try:
            client = self._get_client()
            
            # Try to access the audio bucket
            try:
                client.head_bucket(Bucket=self.audio_bucket_name)
                logger.info(f"[AudioStorage] Using audio bucket: {self.audio_bucket_name}")
                self._bucket_verified = True
                return self.audio_bucket_name
            except Exception as e:
                # Audio bucket doesn't exist or no access, use main bucket
                logger.warning(f"[AudioStorage] Audio bucket '{self.audio_bucket_name}' not accessible: {e}")
                logger.info(f"[AudioStorage] Falling back to main bucket: {self.bucket_name}")
                self.audio_bucket_name = self.bucket_name
                self._bucket_verified = True
                return self.bucket_name
                
        except Exception as e:
            logger.error(f"[AudioStorage] Bucket verification failed: {e}")
            # Use main bucket as ultimate fallback
            self.audio_bucket_name = self.bucket_name
            self._bucket_verified = True
            return self.bucket_name
        
    def generate_audio_path(
        self,
        session_id: int,
        audio_type: AudioType,
        message_id: Optional[int] = None,
        file_extension: str = "wav"
    ) -> str:
        """
        Generate structured path for audio files.
        
        Path structure: interview-audio/{session_id}/{message_id}/{timestamp}.{ext}
        For AI questions: interview-audio/{session_id}/ai_questions/{timestamp}.{ext}
        
        Requirements: 7.1
        
        Args:
            session_id: Interview session ID
            audio_type: Type of audio ('user_answer' or 'ai_question')
            message_id: Message ID (nullable for AI questions)
            file_extension: File extension without dot
            
        Returns:
            Structured path string
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        file_id = str(uuid.uuid4())[:8]
        
        if audio_type == "user_answer" and message_id:
            path = f"interview-audio/{session_id}/{message_id}/{timestamp}_{file_id}.{file_extension}"
        else:
            # AI questions don't have message_id
            path = f"interview-audio/{session_id}/ai_questions/{timestamp}_{file_id}.{file_extension}"
            
        return path

    async def upload_audio(
        self,
        audio_data: bytes,
        session_id: int,
        audio_type: AudioType,
        message_id: Optional[int] = None,
        file_extension: str = "wav",
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload audio file to R2 storage with structured path.
        
        Requirements: 7.1, 7.5
        
        Args:
            audio_data: Audio file content as bytes
            session_id: Interview session ID
            audio_type: Type of audio ('user_answer' or 'ai_question')
            message_id: Message ID (required for user_answer, optional for ai_question)
            file_extension: File extension without dot (default: wav)
            content_type: MIME type (auto-detected if not provided)
            
        Returns:
            Public URL of uploaded file or None if upload failed
            
        Raises:
            ValueError: If message_id is required but not provided
        """
        if not self.is_configured:
            logger.warning("[AudioStorage] R2 not configured — skipping upload")
            return None
            
        # Validate message_id requirement for user answers
        if audio_type == "user_answer" and not message_id:
            raise ValueError("message_id is required for user_answer audio type")
            
        try:
            # Verify bucket and get the correct bucket name to use
            bucket_name = await self._verify_bucket()
            
            # Generate structured path
            object_key = self.generate_audio_path(
                session_id=session_id,
                audio_type=audio_type,
                message_id=message_id,
                file_extension=file_extension
            )
            
            # Auto-detect content type if not provided
            if not content_type:
                audio_mime_types = {
                    "wav": "audio/wav",
                    "mp3": "audio/mpeg",
                    "webm": "audio/webm",
                    "mp4": "audio/mp4",
                    "ogg": "audio/ogg"
                }
                content_type = audio_mime_types.get(file_extension.lower(), "audio/wav")
            
            # Upload to R2
            client = self._get_client()
            client.put_object(
                Bucket=bucket_name,
                Key=object_key,
                Body=audio_data,
                ContentType=content_type,
                # Add metadata for audio files
                Metadata={
                    "session_id": str(session_id),
                    "audio_type": audio_type,
                    "message_id": str(message_id) if message_id else "",
                    "upload_timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Generate public URL
            if self.public_url:
                file_url = f"{self.public_url}/{object_key}"
            else:
                file_url = f"https://{self.account_id}.r2.cloudflarestorage.com/{bucket_name}/{object_key}"
                
            logger.info(f"[AudioStorage] Uploaded {audio_type} audio: {object_key}")
            return file_url
            
        except Exception as e:
            logger.error(f"[AudioStorage] Upload failed for session {session_id}: {e}")
            # Requirements: 7.5 - Continue processing even if storage fails
            return None
    
    async def upload_user_answer_audio(
        self,
        audio_data: bytes,
        session_id: int,
        message_id: int,
        file_extension: str = "webm"
    ) -> Optional[str]:
        """
        Convenience method for uploading user answer audio.
        
        Args:
            audio_data: Audio file content as bytes
            session_id: Interview session ID
            message_id: Message ID from interview_messages table
            file_extension: File extension (default: webm for browser recordings)
            
        Returns:
            Public URL of uploaded file or None if upload failed
        """
        return await self.upload_audio(
            audio_data=audio_data,
            session_id=session_id,
            audio_type="user_answer",
            message_id=message_id,
            file_extension=file_extension
        )
    
    async def upload_ai_question_audio(
        self,
        audio_data: bytes,
        session_id: int,
        file_extension: str = "mp3"
    ) -> Optional[str]:
        """
        Convenience method for uploading AI question audio (TTS generated).
        
        Args:
            audio_data: Audio file content as bytes
            session_id: Interview session ID
            file_extension: File extension (default: mp3 for TTS output)
            
        Returns:
            Public URL of uploaded file or None if upload failed
        """
        return await self.upload_audio(
            audio_data=audio_data,
            session_id=session_id,
            audio_type="ai_question",
            message_id=None,
            file_extension=file_extension
        )
    
    def get_audio_info(self, file_url: str) -> dict:
        """
        Extract audio metadata from file URL.
        
        Args:
            file_url: Public URL of the audio file
            
        Returns:
            Dictionary with extracted metadata
        """
        try:
            # Extract object key from URL
            if self.public_url in file_url:
                object_key = file_url.replace(f"{self.public_url}/", "")
            else:
                # Fallback parsing
                parts = file_url.split("/")
                object_key = "/".join(parts[4:])  # Skip domain parts
            
            # Parse path structure: interview-audio/{session_id}/{message_id|ai_questions}/{filename}
            path_parts = Path(object_key).parts
            
            if len(path_parts) >= 4 and path_parts[0] == "interview-audio":
                session_id = int(path_parts[1])
                
                if path_parts[2] == "ai_questions":
                    return {
                        "session_id": session_id,
                        "audio_type": "ai_question",
                        "message_id": None,
                        "filename": path_parts[3]
                    }
                else:
                    message_id = int(path_parts[2])
                    return {
                        "session_id": session_id,
                        "audio_type": "user_answer", 
                        "message_id": message_id,
                        "filename": path_parts[3]
                    }
            
            return {"error": "Invalid audio file path structure"}
            
        except Exception as e:
            logger.error(f"[AudioStorage] Failed to parse audio info from URL {file_url}: {e}")
            return {"error": str(e)}


# Singleton instance
audio_storage_service = AudioStorageService()