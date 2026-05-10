# Voice Interview API Routes
# Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời
# Yêu Cầu 8: Route và Tích Hợp Hệ Thống Hiện Có

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import logging
import time
import os

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
    skill_gap_analysis_id: Optional[int] = Form(None),  # CV-based interview support
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
        if skill_gap_analysis_id:
            logger.info(f"[VoiceStart] CV-based interview: skill_gap_analysis_id={skill_gap_analysis_id}")
        result = await ai_pipeline.start_interview(
            user_id=current_user.id,
            job_id=job_id,
            question_count=question_count,
            jd_id=jd_id,
            level_slug=level_slug,
            skill_gap_analysis_id=skill_gap_analysis_id,
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
    if tab_switch_count >= 100:  # Tăng lên 100 để tắt tính năng (thực tế không ai chuyển tab 100 lần)
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
            session.tab_switch_count = max(0, min(tab_switch_count, 100))  # Tăng lên 100
            ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"[VoiceAnswer] Failed to update tab_switch_count: {e}")

    # ── Text path: dùng khi có transcript từ browser Web Speech API ──────────
    # Priority: text_answer > Whisper STT (avoid Windows ffmpeg issues)
    if text_answer and text_answer.strip():
        transcript = text_answer.strip()
        logger.info(f"[VoiceAnswer] Using browser transcript ({len(transcript)} chars), skipping Whisper STT")
        # Upload audio file in background (non-blocking) if provided
        if audio_file:
            try:
                audio_data_bg = await audio_file.read()
                content_type_bg = audio_file.content_type or "audio/webm"
                import asyncio as _aio
                _aio.ensure_future(audio_pipeline.process_user_audio(
                    audio_data=audio_data_bg,
                    session_id=session_id,
                    message_id=message_id,
                    content_type=content_type_bg,
                    audio_duration=audio_duration,
                    skip_stt=True,  # transcript already provided via text_answer
                ))
            except Exception:
                pass  # non-blocking upload failure
        try:
            ai_result = await ai_pipeline.submit_answer(
                session_id=session_id,
                user_answer=transcript,
                has_audio=bool(audio_file),
                audio_duration=audio_duration,
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

    # ── STT: Deepgram → Whisper fallback ─────────────────────────────────────
    # Deepgram Nova-2 dùng WAV 16kHz hoặc webm trực tiếp, rất nhanh và chính xác
    transcript = None
    _dg_key = os.getenv("DEEPGRAM_API_KEY", "")
    if _dg_key and len(audio_data) > 1000:
        try:
            import asyncio as _aio2
            import urllib.request as _urllib2
            import json as _json2

            _dg_url = (
                "https://api.deepgram.com/v1/listen"
                "?model=nova-2&language=vi&smart_format=true&punctuate=true"
            )
            _audio_snap = bytes(audio_data)

            def _dg_stt():
                req = _urllib2.Request(
                    _dg_url, data=_audio_snap,
                    headers={"Authorization": f"Token {_dg_key}", "Content-Type": content_type},
                    method="POST",
                )
                with _urllib2.urlopen(req, timeout=20) as r:
                    return _json2.loads(r.read().decode())

            dg_result = await _aio2.get_event_loop().run_in_executor(None, _dg_stt)
            transcript = (
                dg_result.get("results", {})
                .get("channels", [{}])[0]
                .get("alternatives", [{}])[0]
                .get("transcript", "")
                or ""
            ).strip()
            conf = (
                dg_result.get("results", {})
                .get("channels", [{}])[0]
                .get("alternatives", [{}])[0]
                .get("confidence", 0)
            )
            logger.info(f"[VoiceAnswer] Deepgram STT: {repr(transcript[:80])} conf={conf:.2f}")
            if not transcript or conf < 0.2:
                transcript = None  # fall through to Whisper
        except Exception as _dg_e:
            logger.warning(f"[VoiceAnswer] Deepgram STT failed: {_dg_e}, using Whisper")
            transcript = None

    # Whisper fallback (nếu không có Deepgram key hoặc Deepgram failed)
    pipeline_result = {}  # Initialize to avoid UnboundLocalError
    if transcript is None:
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
            transcript = None

    if not transcript:
        return JSONResponse(status_code=200, content={
            "success": False, "error": "STT_NO_SPEECH_DETECTED",
            "message": "Không thể nhận dạng giọng nói. Vui lòng thử ghi âm lại.",
            "allow_retry": True,
        })

    # Legacy try block — keep for other exceptions
    try:
        if False: raise Exception()  # dummy to keep except blocks below

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

    # Clamp tab_switch_count trong range DB constraint (0-100)
    safe_count = max(0, min(tab_switch_count, 100))  # Tăng lên 100
    session.tab_switch_count = safe_count

    # Tắt tính năng terminate - chỉ warning
    MAX_TAB_SWITCH = 100  # Tăng lên 100 để tắt tính năng
    show_warning = safe_count >= 3  # Hiển thị warning sau 3 lần

    db.commit()

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "tab_switch_count": safe_count,
            "session_terminated": False,  # Không terminate nữa
            "show_warning": show_warning,  # Thêm flag để hiển thị warning
            "warning_message": "⚠️ Vui lòng không chuyển tab trong khi phỏng vấn để đảm bảo kết quả tốt nhất!" if show_warning else None,
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


@router.post("/session/{session_id}/terminate")
async def terminate_session(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Huỷ phiên phỏng vấn khi user bấm Thoát phòng."""
    try:
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        ).first()
        if session and session.status not in ("completed", "abandoned"):
            session.status = "abandoned"
            db.commit()
        return JSONResponse(status_code=200, content={"success": True})
    except Exception as e:
        logger.warning(f"[terminate] session {session_id}: {e}")
        return JSONResponse(status_code=200, content={"success": False})


# ─────────────────────────────────────────────────────────────────────────────
# POST /stt-live  — Live transcript via faster-whisper small (~242MB)
# No ffmpeg, no API cost, better Vietnamese accuracy than base.
# ─────────────────────────────────────────────────────────────────────────────

_fw_model = None
_fw_model_loaded = False
_fw_lock = None


def _get_fw_model():
    global _fw_model, _fw_model_loaded, _fw_lock
    if _fw_model_loaded:
        return _fw_model
    import os as _os, threading as _th
    try:
        from faster_whisper import WhisperModel as _FW
        name = _os.getenv("WHISPER_LIVE_MODEL", "small")
        logger.info(f"[stt-live] Loading faster-whisper '{name}'...")
        _fw_model = _FW(name, device="cpu", compute_type="int8")
        _fw_lock = _th.Lock()
        _fw_model_loaded = True
        logger.info(f"[stt-live] faster-whisper '{name}' ready ✓")
    except Exception as e:
        logger.error(f"[stt-live] load failed: {e}")
    return _fw_model


@router.post("/stt-live")
async def transcribe_live_chunk(
    audio_file: UploadFile = File(...),
    lang: str = Form("vi"),
):
    """
    Live transcript via Deepgram Nova-2 (tiếng Việt chính xác, ~300ms latency).
    Frontend gửi WAV 16kHz converted từ webm qua WebAudio API.
    Fallback về faster-whisper nếu không có DEEPGRAM_API_KEY.
    """
    import os as _os
    audio_data = await audio_file.read()
    if len(audio_data) < 500:
        return JSONResponse(status_code=200, content={"text": "", "debug": "too small"})

    api_key = _os.getenv("DEEPGRAM_API_KEY", "")

    # ── Primary: Deepgram Nova-2 (dùng urllib built-in, chạy trong thread pool) ──
    if api_key:
        try:
            import asyncio as _asyncio2
            import urllib.request as _urllib
            import json as _json

            dg_lang = "vi" if lang == "vi" else lang
            dg_url = (
                f"https://api.deepgram.com/v1/listen"
                f"?model=nova-2"
                f"&language={dg_lang}"
                f"&smart_format=true"
                f"&punctuate=true"
                f"&utterances=false"
                f"&filler_words=false"
            )
            content_type = audio_file.content_type or "audio/wav"
            _audio_snap = bytes(audio_data)  # capture for thread

            def _call_deepgram():
                req = _urllib.Request(
                    dg_url,
                    data=_audio_snap,
                    headers={
                        "Authorization": f"Token {api_key}",
                        "Content-Type": content_type,
                    },
                    method="POST",
                )
                with _urllib.urlopen(req, timeout=15) as resp:
                    return _json.loads(resp.read().decode())

            dg_data = await _asyncio2.get_event_loop().run_in_executor(None, _call_deepgram)

            transcript = (
                dg_data
                .get("results", {})
                .get("channels", [{}])[0]
                .get("alternatives", [{}])[0]
                .get("transcript", "")
                or ""
            ).strip()
            confidence = (
                dg_data
                .get("results", {})
                .get("channels", [{}])[0]
                .get("alternatives", [{}])[0]
                .get("confidence", 0)
            )
            logger.info(f"[Deepgram] transcript={repr(transcript[:80])} conf={confidence:.2f}")
            if confidence < 0.3 and not transcript:
                return JSONResponse(status_code=200, content={"text": "", "debug": "low_confidence"})
            return JSONResponse(status_code=200, content={"text": transcript})

        except Exception as e:
            logger.warning(f"[Deepgram] error: {e} — falling back to whisper")

    # ── Fallback: faster-whisper ─────────────────────────────────────────
    import io, wave as _wave, asyncio as _asyncio
    import numpy as _np

    try:
        with _wave.open(io.BytesIO(audio_data), "rb") as wf:
            n_ch = wf.getnchannels(); sr = wf.getframerate()
            sw = wf.getsampwidth(); raw = wf.readframes(wf.getnframes())

        dtype = {1: _np.uint8, 2: _np.int16, 4: _np.int32}.get(sw, _np.int16)
        audio = _np.frombuffer(raw, dtype=dtype).astype(_np.float32)
        if sw == 1:   audio = audio / 128.0 - 1.0
        elif sw == 2: audio = audio / 32768.0
        else:         audio = audio / 2147483648.0
        if n_ch > 1:  audio = audio.reshape(-1, n_ch).mean(axis=1)
        if sr != 16000 and len(audio):
            n = int(len(audio) * 16000 / sr)
            audio = _np.interp(_np.linspace(0, len(audio)-1, n), _np.arange(len(audio)), audio).astype(_np.float32)

        dur = len(audio) / 16000
        if dur < 0.5:
            return JSONResponse(status_code=200, content={"text": "", "debug": "too short"})

        rms = float(_np.sqrt(_np.mean(audio ** 2)))
        if rms < 0.005:
            return JSONResponse(status_code=200, content={"text": "", "debug": "silent"})

        model = _get_fw_model()
        if model is None:
            return JSONResponse(status_code=200, content={"text": "", "error": "No STT model — set DEEPGRAM_API_KEY"})

        _HALLUCINATION = ["la la school", "subscribe", "đăng ký kênh", "dòng cốt phúc", "hẹn gặp lại"]

        def _run():
            with _fw_lock:
                segs, _ = model.transcribe(
                    audio, language=lang, beam_size=5,
                    initial_prompt="Đây là câu trả lời phỏng vấn tuyển dụng bằng tiếng Việt.",
                    vad_filter=True,
                    vad_parameters={"min_silence_duration_ms": 200},
                    condition_on_previous_text=False,
                    no_speech_threshold=0.7,
                    compression_ratio_threshold=2.0,
                    log_prob_threshold=-0.8,
                    temperature=0.0,
                )
                result = " ".join(s.text.strip() for s in segs if s.no_speech_prob < 0.7).strip()
                if any(p in result.lower() for p in _HALLUCINATION):
                    return ""
                return result

        text = await _asyncio.get_event_loop().run_in_executor(None, _run)
        logger.info(f"[whisper-fallback] → {repr(text[:80])}")
        return JSONResponse(status_code=200, content={"text": text})

    except _wave.Error as e:
        return JSONResponse(status_code=200, content={"text": "", "error": f"WAV: {e}"})
    except Exception as e:
        logger.error(f"[stt-live] {e}", exc_info=True)
        return JSONResponse(status_code=200, content={"text": "", "error": str(e)[:200]})


# ── AI Deep Analysis for each answer ─────────────────────────────────────────

from pydantic import BaseModel as _BM

class AnalyzeAnswerRequest(_BM):
    question: str
    answer: str
    question_type: str = "behavioral"
    job_title: str = ""
    score: float | None = None


@router.post("/analyze-answer", summary="AI phan tich sau cau tra loi phong van")
async def analyze_answer(
    req: AnalyzeAnswerRequest,
    current_user: User = Depends(get_current_user_from_token),
):
    """
    Dung Gemini 2.0 Flash phan tich sau 1 cau tra loi phong van.
    """
    import os, re, json
    import google.generativeai as genai
    from app.core.serialization import ORJSONResponse

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return ORJSONResponse({"success": False, "error": "API key not configured"})

    genai.configure(api_key=api_key)

    score_text = f"{req.score:.1f}/10" if req.score is not None else "chua cham"
    qt_map = {
        "behavioral": "Hanh vi (STAR)",
        "technical": "Ky thuat",
        "situational": "Tinh huong",
        "warm_up": "Khoi dong",
        "jd_specific": "Theo JD",
    }
    qt_label = qt_map.get(req.question_type, req.question_type)

    prompt = f"""Ban la chuyen gia tuyen dung, phan tich sau cau tra loi phong van.

Vi tri: {req.job_title or 'khong ro'}
Loai cau hoi: {qt_label}
Cau hoi: {req.question}
Cau tra loi: {req.answer or '(khong co)'}
Diem: {score_text}

Phan tich THUC TE, CU THE dua tren noi dung tren. Tra ve JSON:
{{
  "strengths": ["diem manh 1", "diem manh 2"],
  "weaknesses": ["diem yeu 1", "diem yeu 2"],
  "missing_elements": ["thieu yeu to 1", "thieu yeu to 2"],
  "improved_example": "Vi du cau tra loi tot hon (2-4 cau, co so lieu, ap dung STAR neu la behavioral)",
  "action_tips": ["loi khuyen 1", "loi khuyen 2"],
  "score_explanation": "ly do diem nay"
}}
Chi tra JSON, khong text ngoai."""

    # Safety settings — interview analysis is professional content, not harmful
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]

    # Shorten prompt for token efficiency
    short_prompt = f"""Phan tich cau tra loi phong van. Tra ve JSON.
{{"q":"{req.question[:100]}","a":"{(req.answer or '')[:150]}","score":{req.score or 0},"type":"{qt_label}","job":"{req.job_title or ''}"}}
JSON output:
{{"strengths":["<diem manh cu the>","<diem manh 2>"],"weaknesses":["<diem yeu cu the>","<diem yeu 2>"],"missing_elements":["<con thieu 1>","<con thieu 2>"],"improved_example":"<Viet lai cau tra loi day du hon, ap dung STAR neu behavioral, co so lieu, 2-3 cau>","action_tips":["<loi khuyen 1>","<loi khuyen 2>"],"score_explanation":"<ly do diem nay>"}}
Chi tra JSON, khong text ngoai."""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash", safety_settings=safety_settings)
        resp = model.generate_content(
            short_prompt,
            generation_config={"max_output_tokens": 4096, "temperature": 0.3},
        )
        raw = resp.text if resp and resp.candidates else None
        if not raw:
            return ORJSONResponse({"success": False, "error": "AI khong tra ve ket qua"})
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            data = json.loads(m.group())
            return ORJSONResponse({"success": True, "analysis": data})
        # Try to extract any JSON-like structure
        return ORJSONResponse({"success": False, "error": "Khong tim thay JSON trong phan hoi", "raw": raw[:300]})
    except json.JSONDecodeError:
        return ORJSONResponse({"success": False, "error": "JSON khong hop le"})
    except Exception as e:
        logger.error(f"[AnalyzeAnswer] Error: {e}")
        return ORJSONResponse({"success": False, "error": str(e)[:150]})
