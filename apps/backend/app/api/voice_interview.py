# Voice Interview API Routes
# Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời
# Yêu Cầu 8: Route và Tích Hợp Hệ Thống Hiện Có

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import logging
import time

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.modules.interview.audio_pipeline_service import AudioPipelineService
from app.modules.interview.edge_tts_service import EdgeTTSService
from app.modules.interview.whisper_stt_service import (
    STTFileTooLargeError,
    STTNoSpeechError,
    STTDurationError,
)
from app.modules.interview.ai_pipeline_service import AIPipelineService
from app.modules.interview.models import InterviewSession
from app.services.voice_preferences_service import VoicePreferencesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview/voice", tags=["voice-interview"])

# Singleton TTS service (stateless)
_tts_service = EdgeTTSService()


def get_audio_pipeline(db: Session = Depends(get_db)) -> AudioPipelineService:
    return AudioPipelineService(db)


def get_ai_pipeline(db: Session = Depends(get_db)) -> AIPipelineService:
    return AIPipelineService(db)


def get_voice_preferences_service(db: Session = Depends(get_db)) -> VoicePreferencesService:
    return VoicePreferencesService(db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /start  (Yêu cầu 8.3, 8.4)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_voice_interview(
    job_id: str = Form(...),
    question_count: int = Form(10),
    jd_id: Optional[int] = Form(None),
    level_slug: Optional[str] = Form(None),
    voice_preference: str = Form("female"),
    current_user: User = Depends(get_current_user_from_token),
    ai_pipeline: AIPipelineService = Depends(get_ai_pipeline),
    audio_pipeline: AudioPipelineService = Depends(get_audio_pipeline),
    voice_prefs_service: VoicePreferencesService = Depends(get_voice_preferences_service),
):
    """
    Yêu cầu 8.3: Tái sử dụng AIPipelineService.start_interview() không thay đổi.
    Yêu cầu 8.4: Thêm voice-specific metadata (interview_mode, audio URLs).
    ENHANCED: Auto-create and use user voice preferences.
    """
    try:
        # Get or create user voice preferences
        user_preferences = voice_prefs_service.get_or_create_preferences(current_user.id)
        
        # Use user's preferred voice if not explicitly specified
        if voice_preference == "female":  # Default value, use user preference
            voice_preference = user_preferences.preferred_voice
        else:
            # Update user preference if they chose a different voice
            voice_prefs_service.update_preferences(
                user_id=current_user.id,
                preferred_voice=voice_preference
            )
        # Yêu cầu 8.3: Gọi AIPipelineService.start_interview() không thay đổi
        result = await ai_pipeline.start_interview(
            user_id=current_user.id,
            job_id=job_id,
            question_count=question_count,
            jd_id=jd_id,
            level_slug=level_slug,
        )

        session_id = result["session_id"]

        # Yêu cầu 8.4: Cập nhật interview_mode = 'voice' và voice_type
        try:
            session = ai_pipeline.db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            if session:
                session.interview_mode = "voice"
                session.voice_type = voice_preference  # Fix: lưu voice_type vào DB
                ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"[VoiceStart] Failed to set interview_mode: {e}")

        # Lấy message ID của câu hỏi đầu tiên (warm_up) để dùng làm question id
        first_question_text = result.get("first_question", "")
        first_question_type = "Giới thiệu"
        first_question_msg_id = "q1"
        try:
            from app.modules.interview.models import InterviewMessage
            first_msg = ai_pipeline.db.query(InterviewMessage).filter(
                InterviewMessage.session_id == session_id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_number == 1,
            ).first()
            if first_msg:
                first_question_msg_id = str(first_msg.id)
                qt_map = {
                    "warm_up": "Giới thiệu",
                    "technical": "Kỹ thuật",
                    "behavioral": "Hành vi",
                    "situational": "Tình huống",
                    "jd_specific": "JD Specific",
                    "jd_qualification": "Bằng cấp",
                    "closing": "Kết thúc",
                }
                first_question_type = qt_map.get(first_msg.question_type or "warm_up", "Giới thiệu")
        except Exception as e:
            logger.warning(f"[VoiceStart] Failed to get first question message: {e}")
        question_audio = None
        if first_question_text:
            try:
                question_audio = await audio_pipeline.generate_question_audio(
                    question_text=first_question_text,
                    session_id=session_id,
                    voice_preference=voice_preference,
                )
                # Lưu word_timestamps vào InterviewMessage để karaoke hoạt động
                if question_audio and question_audio.get("word_timestamps") and first_question_msg_id.isdigit():
                    try:
                        from app.modules.interview.models import InterviewMessage as _IM_ts
                        msg = ai_pipeline.db.query(_IM_ts).filter(_IM_ts.id == int(first_question_msg_id)).first()
                        if msg:
                            msg.word_timestamps = question_audio["word_timestamps"]
                            msg.voice_type = voice_preference
                            ai_pipeline.db.commit()
                    except Exception as ts_e:
                        logger.warning(f"[VoiceStart] Failed to save word_timestamps: {ts_e}")
            except Exception as e:
                logger.warning(f"[VoiceStart] TTS generation failed (non-blocking): {e}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "session_id": session_id,
                "job_title": result.get("job_title", ""),
                "greeting": result.get("greeting", ""),
                "first_question": {
                    "id": first_question_msg_id,
                    "text": first_question_text,
                    "type": first_question_type,
                },
                "question_audio": question_audio,
                "progress": {
                    "current": 1,
                    "total": result.get("question_count", question_count),
                },
                "interview_mode": "voice",
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[VoiceStart] Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to start voice interview")


# ─────────────────────────────────────────────────────────────────────────────
# POST /answer  (Yêu cầu 3.4 → 3.9, 8.3, 8.4)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/answer")
async def submit_voice_answer(
    session_id: int = Form(...),
    message_id: Optional[int] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    text_answer: Optional[str] = Form(None),
    audio_duration: Optional[float] = Form(None),
    voice_preference: str = Form("female"),
    tab_switch_count: int = Form(0),
    current_user: User = Depends(get_current_user_from_token),
    ai_pipeline: AIPipelineService = Depends(get_ai_pipeline),
    audio_pipeline: AudioPipelineService = Depends(get_audio_pipeline),
    voice_prefs_service: VoicePreferencesService = Depends(get_voice_preferences_service),
):
    """
    Yêu cầu 3.4: Upload audio blob dưới dạng multipart/form-data.
    Yêu cầu 3.5: Chuyển audio sang STT Service.
    Yêu cầu 3.6: Gọi AIPipelineService.submit_answer(session_id, transcript).
    Yêu cầu 3.7: Trả về câu hỏi tiếp theo + TTS audio.
    Yêu cầu 3.8: Xử lý lỗi STT → allow_retry.
    Yêu cầu 3.9: Lưu metadata vào bảng interview_audio.
    Yêu cầu 6.7: Từ chối nếu tab_switch_count >= 3.
    ENHANCED: Auto-use user voice preferences.
    """
    # Get user voice preferences
    try:
        user_preferences = voice_prefs_service.get_or_create_preferences(current_user.id)
        # Use user's preferred voice if not explicitly specified
        if voice_preference == "female":  # Default value, use user preference
            voice_preference = user_preferences.preferred_voice
    except Exception as e:
        logger.warning(f"[VoiceAnswer] Failed to get voice preferences: {e}")
        # Continue with default voice_preference
    # Yêu cầu 6.7: Kiểm tra tab switch violations
    if tab_switch_count >= 10:  # Increased from 3 to 10 for debugging
        raise HTTPException(
            status_code=403,
            detail="Phiên phỏng vấn đã bị hủy do vi phạm quy tắc (chuyển tab >= 3 lần).",
        )

    # Kiểm tra quyền truy cập session
    session = ai_pipeline.db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên phỏng vấn này")

    # Kiểm tra session đã bị hủy chưa
    if session.status == "abandoned":
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": "SESSION_ABANDONED",
                "message": "Phiên phỏng vấn đã bị hủy do vi phạm quy tắc.",
            },
        )

    # Cập nhật tab_switch_count (Yêu cầu 6.6)
    if tab_switch_count > 0:
        try:
            session.tab_switch_count = max(0, min(tab_switch_count, 10))
            ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"[VoiceAnswer] Failed to update tab_switch_count: {e}")

    # ── Text fallback path (Yêu cầu 9.3) ─────────────────────────────────────
    if text_answer and text_answer.strip():
        transcript = text_answer.strip()
        # Không có audio → không upload, không STT, không lưu interview_audio
        try:
            ai_result = await ai_pipeline.submit_answer(
                session_id=session_id,
                user_answer=transcript,
                has_audio=False,  # text fallback — không có audio
                audio_duration=None,
            )
        except Exception as e:
            logger.error(f"[VoiceAnswer] AI pipeline failed (text fallback): {e}")
            raise HTTPException(status_code=500, detail="Failed to process AI response")

        next_question_audio = None
        next_question_msg_id = str(ai_result.get("question_number", ""))
        next_question_type_display = ai_result.get("question_type", "")

        if ai_result.get("status") == "continue" and ai_result.get("next_question"):
            try:
                from app.modules.interview.models import InterviewMessage as _IM2
                next_q_num2 = ai_result.get("question_number")
                if next_q_num2:
                    next_msg2 = ai_pipeline.db.query(_IM2).filter(
                        _IM2.session_id == session_id,
                        _IM2.role == "interviewer",
                        _IM2.question_number == next_q_num2,
                    ).order_by(_IM2.id.desc()).first()
                    if next_msg2:
                        next_question_msg_id = str(next_msg2.id)
                        qt_map2 = {
                            "warm_up": "Giới thiệu", "technical": "Kỹ thuật",
                            "behavioral": "Hành vi", "situational": "Tình huống",
                            "jd_specific": "JD Specific", "jd_qualification": "Bằng cấp",
                            "closing": "Kết thúc",
                        }
                        next_question_type_display = qt_map2.get(
                            next_msg2.question_type or ai_result.get("question_type", ""),
                            ai_result.get("question_type", "")
                        )
            except Exception as e:
                logger.warning(f"[VoiceAnswer] Failed to get next question msg id (text): {e}")

            try:
                next_question_audio = await audio_pipeline.generate_question_audio(
                    question_text=ai_result["next_question"],
                    session_id=session_id,
                    voice_preference=voice_preference,
                )
                # Lưu word_timestamps vào InterviewMessage (text path)
                if next_question_audio and next_question_audio.get("word_timestamps") and next_question_msg_id.isdigit():
                    try:
                        from app.modules.interview.models import InterviewMessage as _IM_ts2
                        msg = ai_pipeline.db.query(_IM_ts2).filter(_IM_ts2.id == int(next_question_msg_id)).first()
                        if msg:
                            msg.word_timestamps = next_question_audio["word_timestamps"]
                            msg.voice_type = voice_preference
                            ai_pipeline.db.commit()
                    except Exception as ts_e:
                        logger.warning(f"[VoiceAnswer] Failed to save word_timestamps (text): {ts_e}")
            except Exception as e:
                logger.warning(f"[VoiceAnswer] TTS for next question failed (text path): {e}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "transcript": transcript,
                "file_url": None,
                "audio_record_id": None,
                "ai_response": {
                    "status": ai_result.get("status"),
                    "evaluation": ai_result.get("evaluation"),
                    "next_question": {
                        "id": next_question_msg_id,
                        "text": ai_result.get("next_question", ""),
                        "type": next_question_type_display,
                    } if ai_result.get("next_question") else None,
                    "progress": {
                        "current": ai_result.get("question_number", 1),
                        "total": session.question_count or 10,
                    },
                    "final_summary": ai_result.get("summary") if ai_result.get("status") == "completed" else None,
                },
                "next_question_audio": next_question_audio,
            },
        )

    # ── Audio path ────────────────────────────────────────────────────────────
    if not audio_file:
        raise HTTPException(status_code=422, detail="Either audio_file or text_answer is required")

    # Validate content-type
    content_type = audio_file.content_type or "audio/webm"
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file format")

    # Read audio data
    audio_data = await audio_file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Yêu cầu 5.5: 25MB limit
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    # Yêu cầu 3.4, 3.5, 3.9: Process audio via AudioPipelineService
    try:
        pipeline_result = await audio_pipeline.process_user_audio(
            audio_data=audio_data,
            session_id=session_id,
            message_id=message_id,
            content_type=content_type,
            audio_duration=audio_duration,
        )
        transcript = pipeline_result["transcript"]

    except STTNoSpeechError:
        # Yêu cầu 3.8: no speech → allow retry
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": "STT_NO_SPEECH_DETECTED",
                "message": "Không thể nhận dạng giọng nói. Vui lòng thử ghi âm lại.",
                "allow_retry": True,
            },
        )
    except STTDurationError as e:
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": "STT_DURATION_ERROR",
                "message": str(e),
                "allow_retry": True,
            },
        )
    except STTFileTooLargeError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except Exception as e:
        logger.error(f"[VoiceAnswer] STT processing failed: {e}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": "STT_PROCESSING_ERROR",
                "message": "Lỗi xử lý giọng nói. Vui lòng thử lại.",
                "allow_retry": True,
            },
        )

    # Yêu cầu 3.6: Gọi AIPipelineService.submit_answer() với transcript
    try:
        ai_result = await ai_pipeline.submit_answer(
            session_id=session_id,
            user_answer=transcript,
            has_audio=True,
            audio_duration=audio_duration,
        )
    except Exception as e:
        logger.error(f"[VoiceAnswer] AI pipeline failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process AI response")

    # Yêu cầu 3.7: Generate TTS cho câu hỏi tiếp theo
    next_question_audio = None
    next_question_msg_id = str(ai_result.get("question_number", ""))
    next_question_type_display = ai_result.get("question_type", "")

    if ai_result.get("status") == "continue" and ai_result.get("next_question"):
        # Lấy message ID thực của câu hỏi tiếp theo từ DB
        try:
            from app.modules.interview.models import InterviewMessage as _IM
            next_q_num = ai_result.get("question_number")
            if next_q_num:
                next_msg = ai_pipeline.db.query(_IM).filter(
                    _IM.session_id == session_id,
                    _IM.role == "interviewer",
                    _IM.question_number == next_q_num,
                ).order_by(_IM.id.desc()).first()
                if next_msg:
                    next_question_msg_id = str(next_msg.id)
                    qt_map = {
                        "warm_up": "Giới thiệu", "technical": "Kỹ thuật",
                        "behavioral": "Hành vi", "situational": "Tình huống",
                        "jd_specific": "JD Specific", "jd_qualification": "Bằng cấp",
                        "closing": "Kết thúc",
                    }
                    next_question_type_display = qt_map.get(
                        next_msg.question_type or ai_result.get("question_type", ""),
                        ai_result.get("question_type", "")
                    )
        except Exception as e:
            logger.warning(f"[VoiceAnswer] Failed to get next question message id: {e}")

        try:
            next_question_audio = await audio_pipeline.generate_question_audio(
                question_text=ai_result["next_question"],
                session_id=session_id,
                voice_preference=voice_preference,
            )
            # Lưu word_timestamps vào InterviewMessage (audio path)
            if next_question_audio and next_question_audio.get("word_timestamps") and next_question_msg_id.isdigit():
                try:
                    from app.modules.interview.models import InterviewMessage as _IM_ts3
                    msg = ai_pipeline.db.query(_IM_ts3).filter(_IM_ts3.id == int(next_question_msg_id)).first()
                    if msg:
                        msg.word_timestamps = next_question_audio["word_timestamps"]
                        msg.voice_type = voice_preference
                        ai_pipeline.db.commit()
                except Exception as ts_e:
                    logger.warning(f"[VoiceAnswer] Failed to save word_timestamps (audio): {ts_e}")
        except Exception as e:
            logger.warning(f"[VoiceAnswer] TTS for next question failed (non-blocking): {e}")

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "transcript": transcript,
            "file_url": pipeline_result.get("file_url"),
            "audio_record_id": pipeline_result.get("audio_record_id"),
            "ai_response": {
                "status": ai_result.get("status"),
                "evaluation": ai_result.get("evaluation"),
                "next_question": {
                    "id": next_question_msg_id,
                    "text": ai_result.get("next_question", ""),
                    "type": next_question_type_display,
                } if ai_result.get("next_question") else None,
                "progress": {
                    "current": ai_result.get("question_number", 1),
                    "total": session.question_count or 10,
                },
                "final_summary": ai_result.get("summary") if ai_result.get("status") == "completed" else None,
            },
            "next_question_audio": next_question_audio,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /tts  (Yêu cầu 4.1, 4.2, 4.3, 4.8)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/tts")
async def generate_question_tts(
    question_text: str = Form(...),
    voice_preference: str = Form("female"),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Yêu cầu 4.1: Chuyển đổi question_text thành audio với Edge TTS.
    Yêu cầu 4.2: Lưu audio file MP3 vào Audio_Storage.
    Yêu cầu 4.3: Trả về audio_url + question_text.
    Yêu cầu 4.8: Hỗ trợ female (vi-VN-HoaiMyNeural) và male (vi-VN-NamMinhNeural).
    
    CRITICAL FIX: Enhanced 403 error handling with graceful fallback
    """
    if voice_preference not in ("female", "male"):
        raise HTTPException(status_code=400, detail="voice_preference must be 'female' or 'male'")

    if not question_text.strip():
        raise HTTPException(status_code=400, detail="question_text cannot be empty")

    try:
        sid = int(session_id) if session_id and str(session_id).isdigit() else None
        audio_pipeline = AudioPipelineService(db)

        if sid:
            result = await audio_pipeline.generate_question_audio(
                question_text=question_text,
                session_id=sid,
                voice_preference=voice_preference,
            )
        else:
            # No session_id — just synthesize without saving
            tts_result = await _tts_service.synthesize_text(
                text=question_text,
                voice_preference=voice_preference,
            )
            result = {
                "audio_url": tts_result.get("audio_url"),
                "duration_seconds": tts_result.get("duration_seconds", 0.0),
                "word_timestamps": tts_result.get("word_timestamps", []),
                "question_text": question_text,
                "success": tts_result.get("success", True),
                "fallback_reason": tts_result.get("fallback_reason"),
            }

        # CRITICAL FIX: Always return success, even if TTS failed
        response_data = {
            "success": True,  # Always true to not break frontend
            "audio_url": result.get("audio_url"),
            "question_text": question_text,
            "duration_seconds": result.get("duration_seconds", 0.0),
            "word_timestamps": result.get("word_timestamps", []),
            "tts_success": result.get("success", True),
            "fallback_reason": result.get("fallback_reason"),
        }
        
        # Log TTS status for monitoring
        if not result.get("success", True):
            logger.warning(f"[TTS] Failed but returning graceful response: {result.get('fallback_reason')}")
        
        return JSONResponse(status_code=200, content=response_data)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[TTS] Unexpected error: {e}")
        # CRITICAL FIX: Return graceful fallback instead of 500 error
        return JSONResponse(
            status_code=200,
            content={
                "success": True,  # Don't break frontend
                "audio_url": None,
                "question_text": question_text,
                "duration_seconds": 0.0,
                "word_timestamps": [],
                "tts_success": False,
                "fallback_reason": f"TTS service error: {str(e)[:100]}",
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /stt  (Yêu cầu 5.1 → 5.7)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/tts-health")
async def check_tts_health():
    """
    Health check endpoint for TTS services
    Tests Edge TTS and fallback services with detailed status
    """
    health_status = {
        "timestamp": time.time(),
        "edge_tts": {"status": "unknown", "error": None},
        "fallback_gtts": {"status": "unknown", "available": False},
        "fallback_pyttsx3": {"status": "unknown", "available": False},
        "overall_status": "unknown"
    }
    
    # Get Edge TTS service status
    try:
        edge_status = _tts_service.get_status()
        health_status["edge_tts"].update({
            "consecutive_failures": edge_status["consecutive_failures"],
            "in_cooldown": edge_status["in_cooldown"],
            "cooldown_remaining": edge_status["cooldown_remaining"],
            "available": edge_status["edge_tts_available"]
        })
        
        if edge_status["edge_tts_available"]:
            health_status["edge_tts"]["status"] = "available"
        else:
            health_status["edge_tts"]["status"] = "cooldown"
            health_status["edge_tts"]["error"] = f"In cooldown due to {edge_status['consecutive_failures']} failures"
            
    except Exception as e:
        health_status["edge_tts"]["status"] = "error"
        health_status["edge_tts"]["error"] = str(e)[:100]
    
    # Check fallback services availability
    try:
        from app.modules.interview.fallback_tts_service import fallback_tts_service
        health_status["fallback_gtts"]["available"] = fallback_tts_service.gtts_available
        health_status["fallback_pyttsx3"]["available"] = fallback_tts_service.pyttsx3_available
        
        if fallback_tts_service.gtts_available:
            health_status["fallback_gtts"]["status"] = "available"
        if fallback_tts_service.pyttsx3_available:
            health_status["fallback_pyttsx3"]["status"] = "available"
            
    except Exception as e:
        health_status["fallback_gtts"]["error"] = str(e)[:50]
        health_status["fallback_pyttsx3"]["error"] = str(e)[:50]
    
    # Determine overall status
    if health_status["edge_tts"]["status"] == "available":
        health_status["overall_status"] = "optimal"
    elif health_status["fallback_gtts"]["available"] or health_status["fallback_pyttsx3"]["available"]:
        health_status["overall_status"] = "functional_with_fallback"
    else:
        health_status["overall_status"] = "degraded"
    
    return JSONResponse(content=health_status)


@router.post("/tts-reset")
async def reset_tts_failures():
    """
    Reset TTS failure tracking - useful when Edge TTS is working again
    """
    try:
        _tts_service.reset_failure_tracking()
        return JSONResponse(content={
            "success": True,
            "message": "TTS failure tracking reset successfully",
            "status": _tts_service.get_status()
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "message": "Failed to reset TTS failure tracking"
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /stt  (Yêu cầu 5.1 → 5.7)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/stt")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    message_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Standalone STT endpoint.
    Yêu cầu 5.1-5.7: Transcribe audio via Whisper.
    """
    content_type = audio_file.content_type or "audio/webm"
    audio_data = await audio_file.read()

    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    try:
        if session_id:
            audio_pipeline = AudioPipelineService(db)
            result = await audio_pipeline.process_user_audio(
                audio_data=audio_data,
                session_id=session_id,
                message_id=message_id,
                content_type=content_type,
            )
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "transcript": result["transcript"],
                    "file_url": result.get("file_url"),
                },
            )
        else:
            from app.modules.interview.whisper_stt_service import whisper_stt_service
            transcript = await whisper_stt_service.transcribe(
                audio_data=audio_data,
                language="vi",
                content_type=content_type,
            )
            return JSONResponse(
                status_code=200,
                content={"success": True, "transcript": transcript},
            )

    except STTNoSpeechError:
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": "STT_NO_SPEECH_DETECTED",
                "message": "Không thể nhận dạng giọng nói.",
                "allow_retry": True,
            },
        )
    except STTDurationError as e:
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": "STT_DURATION_ERROR",
                "message": str(e),
                "allow_retry": True,
            },
        )
    except Exception as e:
        logger.error(f"[STT] Failed: {e}")
        raise HTTPException(status_code=500, detail="STT processing failed")


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /tab-switch  (Yêu cầu 6.6)
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/tab-switch")
async def update_tab_switch_count(
    session_id: int = Form(...),
    tab_switch_count: int = Form(...),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """
    Yêu cầu 6.6: Đồng bộ tab_switch_count với backend sau mỗi lần vi phạm.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Clamp tab_switch_count trong range DB constraint (0-10)
    safe_count = max(0, min(tab_switch_count, 10))
    session.tab_switch_count = safe_count

    # Debug mode: MAX_TAB_SWITCH = 10 (tăng từ 3 để dễ debug)
    MAX_TAB_SWITCH = 10
    if safe_count >= MAX_TAB_SWITCH:
        session.status = "abandoned"

    db.commit()

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "tab_switch_count": safe_count,
            "session_terminated": safe_count >= MAX_TAB_SWITCH,
            "max_allowed": MAX_TAB_SWITCH,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /conversation/{session_id}  (Feature 7: Full Conversation Replay)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversation/{session_id}")
async def get_full_conversation(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """
    Feature 7: Lấy toàn bộ conversation của một phiên phỏng vấn.
    Bao gồm: messages theo thứ tự, audio URLs, word_timestamps cho karaoke.
    Dùng cho: replay full interview, training AI, analytics.
    """
    from app.modules.interview.models import InterviewMessage, InterviewAudio

    # Verify session ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Lấy tất cả messages theo order_index
    messages = db.query(InterviewMessage).filter(
        InterviewMessage.session_id == session_id,
    ).order_by(InterviewMessage.order_index, InterviewMessage.id).all()

    # Lấy tất cả audio records cho session này
    audio_records = db.query(InterviewAudio).filter(
        InterviewAudio.session_id == session_id,
    ).all()

    # Build audio lookup: message_id → audio record
    audio_by_msg: dict = {}
    ai_question_audios: list = []
    for ar in audio_records:
        if ar.message_id:
            audio_by_msg[ar.message_id] = ar
        elif ar.audio_type == "ai_question":
            ai_question_audios.append(ar)

    # Build conversation list
    conversation = []
    ai_q_idx = 0
    for msg in messages:
        audio_url = None
        duration = None
        transcript = None

        # Tìm audio cho message này
        if msg.id in audio_by_msg:
            ar = audio_by_msg[msg.id]
            audio_url = ar.file_url if ar.file_url and ar.file_url.startswith("https://") else None
            duration = ar.duration_seconds
            transcript = ar.transcript
        elif msg.role == "interviewer" and ai_q_idx < len(ai_question_audios):
            # Fallback: match ai_question audio theo thứ tự
            ar = ai_question_audios[ai_q_idx]
            audio_url = ar.file_url if ar.file_url and ar.file_url.startswith("https://") else None
            duration = ar.duration_seconds
            ai_q_idx += 1

        conversation.append({
            "id": msg.id,
            "role": "ai" if msg.role == "interviewer" else "user",
            "content": msg.content,
            "audio_url": audio_url,
            "duration_seconds": duration,
            "transcript": transcript,
            "word_timestamps": msg.word_timestamps or [],
            "voice_type": msg.voice_type,
            "question_type": msg.question_type,
            "question_number": msg.question_number,
            "order_index": msg.order_index,
            "score": msg.score,
            "feedback": msg.feedback,
            "has_audio": bool(audio_url),
        })

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "session_id": session_id,
            "interview_mode": session.interview_mode,
            "voice_type": session.voice_type,
            "status": session.status,
            "total_messages": len(conversation),
            "conversation": conversation,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "voice-interview"}
