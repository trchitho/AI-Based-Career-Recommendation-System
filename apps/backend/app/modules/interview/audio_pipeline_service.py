"""
Audio Pipeline Service - Yêu Cầu 3.4, 3.5, 3.6, 7.2, 7.6

Orchestrator tích hợp TTS, STT và Audio Storage services.
Lưu metadata vào bảng interview.interview_audio.
"""

import logging
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.interview.edge_tts_service import edge_tts_service
from app.modules.interview.whisper_stt_service import whisper_stt_service
from app.modules.interview.audio_storage_service import audio_storage_service
from app.modules.interview.models import InterviewAudio

logger = logging.getLogger(__name__)


class AudioPipelineService:
    """
    Orchestrator cho audio pipeline trong voice interview.

    Tích hợp:
    - EdgeTTSService: chuyển text → audio (Yêu cầu 3.5)
    - WhisperSTTService: chuyển audio → text (Yêu cầu 3.4)
    - AudioStorageService: lưu audio files (Yêu cầu 7.2)
    - InterviewAudio model: lưu metadata (Yêu cầu 7.6)

    Yêu cầu 7.5: Storage failures không block interview flow.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    async def process_audio_to_text(
        self,
        audio_content: bytes,
        filename: str,
        content_type: str = "audio/webm"
    ) -> dict:
        """
        Process audio to text using STT pipeline
        
        Args:
            audio_content: Raw audio bytes
            filename: Original filename
            content_type: MIME type
            
        Returns:
            {
                "success": bool,
                "transcript": str,
                "confidence": float,
                "error": str | None
            }
        """
        try:
            # Use Whisper STT service
            transcript = await whisper_stt_service.transcribe(
                audio_data=audio_content,
                language="vi",
                content_type=content_type,
            )
            
            return {
                "success": True,
                "transcript": transcript,
                "confidence": 0.95,  # Default confidence
                "error": None
            }
            
        except Exception as e:
            logger.error(f"[AudioPipeline] STT processing failed: {str(e)}")
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": str(e)
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def process_user_audio(
        self,
        audio_data: bytes,
        session_id: int,
        message_id: Optional[int],
        content_type: str,
        audio_duration: Optional[float] = None,
    ) -> dict:
        """
        Xử lý audio từ user: upload → transcribe → lưu metadata.

        Yêu cầu 3.4: STT pipeline cho user answer.
        Yêu cầu 7.2: Lưu metadata vào interview_audio.
        Yêu cầu 7.5: Storage failure không block STT.

        Args:
            audio_data: Raw audio bytes từ user
            session_id: ID phiên phỏng vấn
            message_id: ID tin nhắn (nullable)
            content_type: MIME type của audio

        Returns:
            {
                "transcript": str,
                "file_url": str | None,
                "audio_record_id": str | None,
            }
        """
        # 1. Upload audio to storage (non-blocking on failure)
        file_url: Optional[str] = None
        try:
            ext = self._content_type_to_ext(content_type)
            # Luôn dùng "user_answer" — audio_storage_service xử lý path khi message_id=None
            file_url = await audio_storage_service.upload_audio(
                audio_data=audio_data,
                session_id=session_id,
                audio_type="user_answer",
                message_id=message_id,
                file_extension=ext,
                content_type=content_type,
            )
        except Exception as exc:
            # Yêu cầu 7.5: storage failure không block flow
            logger.warning(f"[AudioPipeline] Storage upload failed (non-blocking): {exc}")

        # 2. Transcribe via Whisper STT
        transcript = await whisper_stt_service.transcribe(
            audio_data=audio_data,
            language="vi",
            content_type=content_type,
        )

        # 3. Save metadata to interview_audio
        audio_record_id: Optional[str] = None
        try:
            record = await self._save_audio_metadata(
                session_id=session_id,
                message_id=message_id,
                audio_type="user_answer",
                file_url=file_url or "pending://upload-failed",
                duration_seconds=audio_duration,  # từ frontend hoặc None
                file_size_bytes=len(audio_data),
                transcript=transcript,
            )
            audio_record_id = str(record.id) if record else None
        except Exception as exc:
            logger.warning(f"[AudioPipeline] Metadata save failed (non-blocking): {exc}")

        return {
            "transcript": transcript,
            "file_url": file_url,
            "audio_record_id": audio_record_id,
        }

    async def generate_question_audio(
        self,
        question_text: str,
        session_id: int,
        voice_preference: str = "female",
    ) -> dict:
        """
        Tạo TTS audio cho câu hỏi AI: synthesize → upload → lưu metadata.

        Yêu cầu 3.5: TTS pipeline cho AI question.
        Yêu cầu 3.6: Trả về audio_url + question_text.
        Yêu cầu 7.2: Lưu metadata vào interview_audio.
        Yêu cầu 7.5: Storage failure không block flow.
        
        CRITICAL FIX: Enhanced TTS error handling with graceful fallback

        Args:
            question_text: Nội dung câu hỏi cần chuyển thành audio
            session_id: ID phiên phỏng vấn
            voice_preference: 'female' hoặc 'male'

        Returns:
            {
                "audio_url": str | None,
                "duration_seconds": float,
                "word_timestamps": list,
                "question_text": str,
                "success": bool,
                "fallback_reason": str | None,
            }
        """
        # 1. Generate TTS audio with enhanced error handling
        try:
            tts_result = await edge_tts_service.synthesize_text(
                text=question_text,
                voice_preference=voice_preference,
                session_id=str(session_id),  # TTS service tự upload R2
            )
        except Exception as e:
            logger.error(f"[AudioPipeline] TTS synthesis failed: {str(e)}")
            # Return graceful fallback
            return {
                "audio_url": None,
                "duration_seconds": 0.0,
                "word_timestamps": [],
                "question_text": question_text,
                "success": False,
                "fallback_reason": f"TTS synthesis failed: {str(e)[:100]}",
            }

        audio_data: bytes = tts_result.get("audio_data", b"")
        audio_url: Optional[str] = tts_result.get("audio_url")
        duration_seconds: float = tts_result.get("duration_seconds", 0.0)
        word_timestamps: list = tts_result.get("word_timestamps", [])
        tts_success: bool = tts_result.get("success", True)
        fallback_reason: Optional[str] = tts_result.get("fallback_reason")

        # 2. Upload to storage ONLY if TTS service did not already upload AND we have audio data
        if not audio_url and audio_data:
            try:
                audio_url = await audio_storage_service.upload_ai_question_audio(
                    audio_data=audio_data,
                    session_id=session_id,
                    file_extension="mp3",
                )
            except Exception as exc:
                logger.warning(f"[AudioPipeline] TTS storage upload failed (non-blocking): {exc}")

        # 3. Save metadata to interview_audio ONLY if we have a valid URL or audio data
        try:
            # Don't save records with no audio at all (tts completely failed)
            if audio_url or (audio_data and len(audio_data) > 0):
                await self._save_audio_metadata(
                    session_id=session_id,
                    message_id=None,
                    audio_type="ai_question",
                    file_url=audio_url or "error://tts-failed",
                    duration_seconds=duration_seconds,
                    file_size_bytes=len(audio_data) if audio_data else 0,
                    transcript=None,
                )
        except Exception as exc:
            logger.warning(f"[AudioPipeline] Metadata save failed (non-blocking): {exc}")

        return {
            "audio_url": audio_url,
            "duration_seconds": duration_seconds,
            "word_timestamps": word_timestamps,
            "question_text": question_text,
            "success": tts_success,
            "fallback_reason": fallback_reason,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _save_audio_metadata(
        self,
        session_id: int,
        message_id: Optional[int],
        audio_type: str,
        file_url: str,
        duration_seconds: Optional[float],
        file_size_bytes: Optional[int],
        transcript: Optional[str],
    ) -> Optional[InterviewAudio]:
        """
        Lưu metadata vào bảng interview.interview_audio.

        Yêu cầu 7.6: Persist audio metadata với SQLAlchemy.

        Returns:
            InterviewAudio record hoặc None nếu lỗi
        """
        record = InterviewAudio(
            id=uuid.uuid4(),
            session_id=session_id,
            message_id=message_id,
            audio_type=audio_type,
            file_url=file_url,
            duration_seconds=duration_seconds,
            file_size_bytes=file_size_bytes,
            transcript=transcript,
        )
        self._db.add(record)
        self._db.commit()
        self._db.refresh(record)
        logger.info(
            f"[AudioPipeline] Saved audio metadata: id={record.id}, "
            f"type={audio_type}, session={session_id}"
        )
        return record

    @staticmethod
    def _content_type_to_ext(content_type: str) -> str:
        """Map MIME type sang file extension."""
        mapping = {
            "audio/webm": "webm",
            "audio/mp4": "mp4",
            "audio/wav": "wav",
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/ogg": "ogg",
            "audio/x-m4a": "m4a",
            "audio/m4a": "m4a",
        }
        base = content_type.lower().split(";")[0].strip()
        return mapping.get(base, "webm")
