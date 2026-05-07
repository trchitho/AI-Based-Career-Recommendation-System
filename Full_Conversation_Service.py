# =====================================================
# SERVICE: Full Conversation Management
# File: apps/backend/app/services/conversation_service.py
# Purpose: Lưu và replay full conversation với audio
# =====================================================

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from pydantic import BaseModel
import json
from datetime import datetime
import asyncio

from app.core.db import get_db
from app.core.logging import logger
# from app.core.r2_storage import R2StorageManager  # Comment out nếu chưa có

# =====================================================
# PYDANTIC MODELS
# =====================================================

class ConversationMessage(BaseModel):
    id: Optional[int] = None
    session_id: int
    role: str  # 'user' | 'assistant' | 'ai'
    content: str
    audio_url: Optional[str] = None
    order_index: int
    has_audio: bool = False
    audio_duration: Optional[float] = None
    word_timestamps: Optional[Dict[str, Any]] = None
    conversation_flow: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class FullConversation(BaseModel):
    session_id: int
    user_id: int
    job_title: str
    interview_mode: str
    voice_type: str
    started_at: datetime
    completed_at: Optional[datetime]
    messages: List[ConversationMessage]
    total_duration: Optional[float] = None
    audio_files_count: int = 0
    replay_metadata: Dict[str, Any] = {}

class ConversationReplayData(BaseModel):
    conversation: FullConversation
    audio_timeline: List[Dict[str, Any]]
    playback_instructions: Dict[str, Any]

# =====================================================
# CONVERSATION SERVICE
# =====================================================

class ConversationService:
    def __init__(self, db: Session):
        self.db = db
        # self.r2_storage = R2StorageManager()  # Comment out nếu chưa có
    
    async def save_message_with_audio(
        self,
        session_id: int,
        role: str,
        content: str,
        audio_file_path: Optional[str] = None,
        word_timestamps: Optional[Dict] = None,
        order_index: Optional[int] = None
    ) -> ConversationMessage:
        """
        Lưu message với audio vào database
        
        Flow:
        1. Upload audio file lên R2 (nếu có)
        2. Lưu message vào interview_messages với audio_url
        3. Lưu audio metadata vào interview_audio
        4. Update conversation_flow
        """
        try:
            # 1. Determine order_index if not provided
            if order_index is None:
                order_query = text("""
                    SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
                    FROM interview.interview_messages 
                    WHERE session_id = :session_id
                """)
                result = self.db.execute(order_query, {"session_id": session_id}).fetchone()
                order_index = result[0] if result else 1
            
            # 2. Upload audio file if provided
            audio_url = None
            audio_duration = None
            if audio_file_path:
                # TODO: Implement R2 upload when R2StorageManager is available
                # audio_url = await self.r2_storage.upload_audio_file(
                #     file_path=audio_file_path,
                #     folder=f"interviews/{session_id}/audio"
                # )
                # For now, use file path as placeholder
                audio_url = f"/audio/interviews/{session_id}/{audio_file_path}"
                audio_duration = await self._get_audio_duration(audio_file_path)
            
            # 3. Insert message
            insert_query = text("""
                INSERT INTO interview.interview_messages (
                    session_id, role, content, audio_url, order_index,
                    has_audio, audio_duration, word_timestamps, conversation_flow
                ) VALUES (
                    :session_id, :role, :content, :audio_url, :order_index,
                    :has_audio, :audio_duration, :word_timestamps::jsonb, :conversation_flow::jsonb
                ) RETURNING id, created_at
            """)
            
            # Determine conversation flow
            is_question = role in ['assistant', 'ai']
            conversation_flow = {
                "is_question": is_question,
                "is_answer": not is_question,
                "flow_position": order_index,
                "has_audio": bool(audio_url),
                "audio_type": "ai_question" if is_question else "user_answer"
            }
            
            result = self.db.execute(insert_query, {
                "session_id": session_id,
                "role": role,
                "content": content,
                "audio_url": audio_url,
                "order_index": order_index,
                "has_audio": bool(audio_url),
                "audio_duration": audio_duration,
                "word_timestamps": json.dumps(word_timestamps) if word_timestamps else None,
                "conversation_flow": json.dumps(conversation_flow)
            }).fetchone()
            
            message_id, created_at = result
            
            # 4. Insert audio metadata if audio exists
            if audio_url:
                await self._save_audio_metadata(
                    session_id=session_id,
                    message_id=message_id,
                    audio_url=audio_url,
                    audio_type="ai_question" if is_question else "user_answer",
                    duration=audio_duration
                )
            
            # 5. Update previous message's conversation_flow
            await self._update_conversation_links(session_id, message_id, order_index)
            
            self.db.commit()
            
            return ConversationMessage(
                id=message_id,
                session_id=session_id,
                role=role,
                content=content,
                audio_url=audio_url,
                order_index=order_index,
                has_audio=bool(audio_url),
                audio_duration=audio_duration,
                word_timestamps=word_timestamps,
                conversation_flow=conversation_flow,
                created_at=created_at
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error saving message with audio: {str(e)}")
            raise
    
    async def get_full_conversation(self, session_id: int, user_id: int) -> FullConversation:
        """
        Lấy full conversation để replay
        """
        try:
            # 1. Get session info
            session_query = text("""
                SELECT 
                    s.id, s.user_id, s.job_title, s.interview_mode, s.voice_type,
                    s.started_at, s.completed_at, s.replay_metadata
                FROM interview.interview_sessions s
                WHERE s.id = :session_id AND s.user_id = :user_id
            """)
            
            session_result = self.db.execute(session_query, {
                "session_id": session_id,
                "user_id": user_id
            }).fetchone()
            
            if not session_result:
                raise ValueError("Session not found or access denied")
            
            (session_id, user_id, job_title, interview_mode, voice_type,
             started_at, completed_at, replay_metadata) = session_result
            
            # 2. Get all messages with audio
            messages_query = text("""
                SELECT 
                    m.id, m.role, m.content, m.audio_url, m.order_index,
                    m.has_audio, m.audio_duration, m.word_timestamps, 
                    m.conversation_flow, m.created_at
                FROM interview.interview_messages m
                WHERE m.session_id = :session_id
                ORDER BY m.order_index ASC, m.created_at ASC
            """)
            
            messages_result = self.db.execute(messages_query, {
                "session_id": session_id
            }).fetchall()
            
            # 3. Build messages list
            messages = []
            total_duration = 0
            audio_files_count = 0
            
            for row in messages_result:
                (msg_id, role, content, audio_url, order_index, has_audio,
                 audio_duration, word_timestamps, conversation_flow, created_at) = row
                
                if audio_duration:
                    total_duration += audio_duration
                if audio_url:
                    audio_files_count += 1
                
                messages.append(ConversationMessage(
                    id=msg_id,
                    session_id=session_id,
                    role=role,
                    content=content,
                    audio_url=audio_url,
                    order_index=order_index,
                    has_audio=has_audio,
                    audio_duration=audio_duration,
                    word_timestamps=word_timestamps,
                    conversation_flow=conversation_flow,
                    created_at=created_at
                ))
            
            # 4. Update replay metadata
            if not replay_metadata:
                replay_metadata = {}
            
            replay_metadata.update({
                "total_duration": total_duration,
                "audio_files_count": audio_files_count,
                "messages_count": len(messages),
                "last_accessed": datetime.now().isoformat()
            })
            
            await self._update_replay_metadata(session_id, replay_metadata)
            
            return FullConversation(
                session_id=session_id,
                user_id=user_id,
                job_title=job_title,
                interview_mode=interview_mode,
                voice_type=voice_type,
                started_at=started_at,
                completed_at=completed_at,
                messages=messages,
                total_duration=total_duration,
                audio_files_count=audio_files_count,
                replay_metadata=replay_metadata
            )
            
        except Exception as e:
            logger.error(f"Error getting full conversation: {str(e)}")
            raise
    
    async def generate_replay_data(self, session_id: int, user_id: int) -> ConversationReplayData:
        """
        Tạo data để replay conversation với audio timeline
        """
        try:
            # 1. Get full conversation
            conversation = await self.get_full_conversation(session_id, user_id)
            
            # 2. Build audio timeline
            audio_timeline = []
            current_time = 0
            
            for message in conversation.messages:
                timeline_item = {
                    "message_id": message.id,
                    "start_time": current_time,
                    "duration": message.audio_duration or 0,
                    "end_time": current_time + (message.audio_duration or 0),
                    "role": message.role,
                    "content": message.content,
                    "audio_url": message.audio_url,
                    "has_audio": message.has_audio,
                    "word_timestamps": message.word_timestamps
                }
                
                audio_timeline.append(timeline_item)
                current_time += (message.audio_duration or 0)
            
            # 3. Generate playback instructions
            playback_instructions = {
                "total_duration": conversation.total_duration,
                "playback_speed": 1.0,
                "auto_play": True,
                "show_captions": True,
                "karaoke_mode": True,  # Highlight words as they're spoken
                "controls": {
                    "play_pause": True,
                    "seek": True,
                    "speed_control": True,
                    "volume": True
                }
            }
            
            return ConversationReplayData(
                conversation=conversation,
                audio_timeline=audio_timeline,
                playback_instructions=playback_instructions
            )
            
        except Exception as e:
            logger.error(f"Error generating replay data: {str(e)}")
            raise
    
    # =====================================================
    # PRIVATE HELPER METHODS
    # =====================================================
    
    async def _save_audio_metadata(
        self,
        session_id: int,
        message_id: int,
        audio_url: str,
        audio_type: str,
        duration: Optional[float] = None
    ):
        """Save audio metadata to interview_audio table"""
        insert_audio_query = text("""
            INSERT INTO interview.interview_audio (
                session_id, message_id, audio_type, file_url, duration_seconds
            ) VALUES (
                :session_id, :message_id, :audio_type, :file_url, :duration_seconds
            )
        """)
        
        self.db.execute(insert_audio_query, {
            "session_id": session_id,
            "message_id": message_id,
            "audio_type": audio_type,
            "file_url": audio_url,
            "duration_seconds": duration
        })
    
    async def _update_conversation_links(self, session_id: int, current_message_id: int, order_index: int):
        """Update conversation flow links between messages"""
        # Get previous message
        prev_query = text("""
            SELECT id FROM interview.interview_messages 
            WHERE session_id = :session_id AND order_index < :order_index
            ORDER BY order_index DESC LIMIT 1
        """)
        
        prev_result = self.db.execute(prev_query, {
            "session_id": session_id,
            "order_index": order_index
        }).fetchone()
        
        if prev_result:
            prev_message_id = prev_result[0]
            
            # Update current message with prev link
            update_current_query = text("""
                UPDATE interview.interview_messages 
                SET conversation_flow = conversation_flow || jsonb_build_object('prev_message_id', :prev_id)
                WHERE id = :current_id
            """)
            
            self.db.execute(update_current_query, {
                "prev_id": prev_message_id,
                "current_id": current_message_id
            })
            
            # Update previous message with next link
            update_prev_query = text("""
                UPDATE interview.interview_messages 
                SET conversation_flow = conversation_flow || jsonb_build_object('next_message_id', :next_id)
                WHERE id = :prev_id
            """)
            
            self.db.execute(update_prev_query, {
                "next_id": current_message_id,
                "prev_id": prev_message_id
            })
    
    async def _update_replay_metadata(self, session_id: int, metadata: Dict[str, Any]):
        """Update replay metadata in session"""
        update_query = text("""
            UPDATE interview.interview_sessions 
            SET replay_metadata = :metadata::jsonb
            WHERE id = :session_id
        """)
        
        self.db.execute(update_query, {
            "session_id": session_id,
            "metadata": json.dumps(metadata)
        })
        self.db.commit()
    
    async def _get_audio_duration(self, file_path: str) -> Optional[float]:
        """Get audio file duration (implement based on your audio processing library)"""
        # Placeholder - implement with librosa, pydub, or ffmpeg
        try:
            # Example with pydub:
            # from pydub import AudioSegment
            # audio = AudioSegment.from_file(file_path)
            # return len(audio) / 1000.0  # Convert to seconds
            
            # For now, return None - implement based on your setup
            return None
        except Exception:
            return None

# =====================================================
# USAGE EXAMPLE
# =====================================================

"""
# Usage in voice interview endpoint:

async def process_voice_message(session_id: int, audio_file: UploadFile, db: Session):
    conversation_service = ConversationService(db)
    
    # 1. Process STT
    transcript = await stt_service.transcribe(audio_file)
    
    # 2. Save user message with audio
    user_message = await conversation_service.save_message_with_audio(
        session_id=session_id,
        role="user",
        content=transcript,
        audio_file_path=audio_file.filename,
        word_timestamps=stt_result.word_timestamps
    )
    
    # 3. Generate AI response
    ai_response = await ai_service.generate_response(transcript)
    
    # 4. Generate TTS
    tts_audio_path = await tts_service.generate_audio(ai_response)
    
    # 5. Save AI message with audio
    ai_message = await conversation_service.save_message_with_audio(
        session_id=session_id,
        role="assistant",
        content=ai_response,
        audio_file_path=tts_audio_path,
        word_timestamps=tts_result.word_timestamps
    )
    
    return {
        "user_message": user_message,
        "ai_message": ai_message
    }

# Usage for replay:

async def get_conversation_replay(session_id: int, user_id: int, db: Session):
    conversation_service = ConversationService(db)
    
    replay_data = await conversation_service.generate_replay_data(session_id, user_id)
    
    return {
        "conversation": replay_data.conversation,
        "audio_timeline": replay_data.audio_timeline,
        "playback_instructions": replay_data.playback_instructions
    }
"""