"""
Voice Interview API Routes
Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời
Yêu Cầu 8: Route và Tích Hợp Hệ Thống Hiện Có
"""

import asyncio
import io
import json
import logging
import os
import threading
import time
import urllib.request
import wave
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user_from_token
from app.core.db import get_db
from app.modules.auth.models import User
from app.modules.interview.ai_pipeline_service import AIPipelineService
from app.modules.interview.audio_pipeline_service import AudioPipelineService
from app.modules.interview.edge_tts_service import EdgeTTSService
from app.modules.interview.models import InterviewMessage, InterviewSession
from app.modules.interview.whisper_stt_service import (
    STTDurationError,
    STTFileTooLargeError,
    STTNoSpeechError,
)
from app.services.voice_preferences_service import VoicePreferencesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview/voice", tags=["voice-interview"])

# ── Module-level singletons ───────────────────────────────────────────────────
_tts_service = EdgeTTSService()

# Faster-whisper singleton (fallback STT when no Deepgram key)
_fw_model = None
_fw_model_loaded = False
_fw_lock: Optional[threading.Lock] = None

# ── Constants ─────────────────────────────────────────────────────────────────
QUESTION_TYPE_LABELS = {
    "warm_up": "Giới thiệu",
    "technical": "Kỹ thuật",
    "behavioral": "Hành vi",
    "situational": "Tình huống",
    "jd_specific": "JD Specific",
    "jd_qualification": "Bằng cấp",
    "closing": "Kết thúc",
}

WHISPER_HALLUCINATION_PHRASES = [
    "la la school", "subscribe", "đăng ký kênh",
    "dòng cốt phúc", "hẹn gặp lại",
]


# ── Dependency factories ──────────────────────────────────────────────────────

def get_audio_pipeline(db: Session = Depends(get_db)) -> AudioPipelineService:
    return AudioPipelineService(db)


def get_ai_pipeline(db: Session = Depends(get_db)) -> AIPipelineService:
    return AIPipelineService(db)


def get_voice_preferences_service(db: Session = Depends(get_db)) -> VoicePreferencesService:
    return VoicePreferencesService(db)


# ── Helper: faster-whisper lazy loader ───────────────────────────────────────

def _get_fw_model():
    global _fw_model, _fw_model_loaded, _fw_lock
    if _fw_model_loaded:
        return _fw_model
    try:
        from faster_whisper import WhisperModel
        name = os.getenv("WHISPER_LIVE_MODEL", "small")
        logger.info(f"[stt-live] Loading faster-whisper '{name}'...")
        _fw_model = WhisperModel(name, device="cpu", compute_type="int8")
        _fw_lock = threading.Lock()
        _fw_model_loaded = True
        logger.info(f"[stt-live] faster-whisper '{name}' ready ✓")
    except Exception as e:
        logger.error(f"[stt-live] load failed: {e}")
    return _fw_model


# ── Helper: Deepgram HTTP STT ─────────────────────────────────────────────────

async def _deepgram_transcribe(audio_bytes: bytes, content_type: str, lang: str = "vi") -> Optional[str]:
    """
    Call Deepgram Nova-2 REST API to transcribe audio.
    Returns transcript string or None on failure / low confidence.
    """
    api_key = os.getenv("DEEPGRAM_API_KEY", "")
    if not api_key or len(audio_bytes) < 1000:
        return None

    url = (
        f"https://api.deepgram.com/v1/listen"
        f"?model=nova-2&language={lang}&smart_format=true&punctuate=true"
    )
    audio_snap = bytes(audio_bytes)

    def _call():
        req = urllib.request.Request(
            url, data=audio_snap,
            headers={"Authorization": f"Token {api_key}", "Content-Type": content_type},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())

    try:
        data = await asyncio.get_event_loop().run_in_executor(None, _call)
        alt = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0]
        transcript = (alt.get("transcript") or "").strip()
        confidence = alt.get("confidence", 0)
        logger.info(f"[Deepgram] {repr(transcript[:80])} conf={confidence:.2f}")
        return transcript if transcript and confidence >= 0.2 else None
    except Exception as e:
        logger.warning(f"[Deepgram] STT failed: {e}")
        return None


# ── Helper: lookup next question message + save timestamps ────────────────────

def _get_next_question_msg(
    db, session_id: int, question_number: int
) -> Optional[InterviewMessage]:
    """Lookup the InterviewMessage for the next question by question_number."""
    return (
        db.query(InterviewMessage)
        .filter(
            InterviewMessage.session_id == session_id,
            InterviewMessage.role == "interviewer",
            InterviewMessage.question_number == question_number,
        )
        .order_by(InterviewMessage.id.desc())
        .first()
    )


def _save_word_timestamps(db, msg_id: int, timestamps: list, voice_type: str) -> None:
    try:
        msg = db.query(InterviewMessage).filter(InterviewMessage.id == msg_id).first()
        if msg:
            msg.word_timestamps = timestamps
            msg.voice_type = voice_type
            db.commit()
    except Exception as e:
        logger.warning(f"[VoiceAnswer] Failed to save word_timestamps: {e}")


def _build_next_question_response(ai_result: dict, session_id: int, db, voice_preference: str, audio_pipeline) -> tuple:
    """
    Resolve next question msg id, type label, and generate TTS audio.
    Returns (msg_id_str, type_label_str, audio_or_None).
    """
    msg_id = str(ai_result.get("question_number", ""))
    type_label = ai_result.get("question_type", "")
    audio = None

    q_num = ai_result.get("question_number")
    if q_num:
        msg = _get_next_question_msg(db, session_id, q_num)
        if msg:
            msg_id = str(msg.id)
            type_label = QUESTION_TYPE_LABELS.get(
                msg.question_type or ai_result.get("question_type", ""),
                ai_result.get("question_type", "")
            )

    return msg_id, type_label, audio


# ── Shared response builder ───────────────────────────────────────────────────

def _voice_answer_response(
    *,
    transcript: str,
    ai_result: dict,
    session: InterviewSession,
    next_question_audio,
    next_question_msg_id: str,
    next_question_type_display: str,
    file_url: Optional[str] = None,
    audio_record_id=None,
) -> dict:
    return {
        "success": True,
        "transcript": transcript,
        "file_url": file_url,
        "audio_record_id": audio_record_id,
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
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /start
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_voice_interview(
    job_id: str = Form(...),
    question_count: int = Form(10),
    jd_id: Optional[int] = Form(None),
    level_slug: Optional[str] = Form(None),
    voice_preference: str = Form("female"),
    skill_gap_analysis_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user_from_token),
    ai_pipeline: AIPipelineService = Depends(get_ai_pipeline),
    audio_pipeline: AudioPipelineService = Depends(get_audio_pipeline),
    voice_prefs_service: VoicePreferencesService = Depends(get_voice_preferences_service),
):
    try:
        # Resolve voice preference
        user_prefs = voice_prefs_service.get_or_create_preferences(current_user.id)
        if voice_preference == "female":
            voice_preference = user_prefs.preferred_voice
        else:
            voice_prefs_service.update_preferences(
                user_id=current_user.id, preferred_voice=voice_preference
            )

        if skill_gap_analysis_id:
            logger.info(f"[VoiceStart] CV-based: skill_gap_analysis_id={skill_gap_analysis_id}")

        result = await ai_pipeline.start_interview(
            user_id=current_user.id,
            job_id=job_id,
            question_count=question_count,
            jd_id=jd_id,
            level_slug=level_slug,
            skill_gap_analysis_id=skill_gap_analysis_id,
        )

        session_id = result["session_id"]

        # Mark session as voice interview
        try:
            session = ai_pipeline.db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            if session:
                session.interview_mode = "voice"
                session.voice_type = voice_preference
                ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"[VoiceStart] Failed to set interview_mode: {e}")

        # Lookup first question message
        first_question_text = result.get("first_question", "")
        first_question_type = "Giới thiệu"
        first_question_msg_id = "q1"
        try:
            first_msg = ai_pipeline.db.query(InterviewMessage).filter(
                InterviewMessage.session_id == session_id,
                InterviewMessage.role == "interviewer",
                InterviewMessage.question_number == 1,
            ).first()
            if first_msg:
                first_question_msg_id = str(first_msg.id)
                first_question_type = QUESTION_TYPE_LABELS.get(
                    first_msg.question_type or "warm_up", "Giới thiệu"
                )
        except Exception as e:
            logger.warning(f"[VoiceStart] Failed to get first question message: {e}")

        # Generate TTS for first question
        question_audio = None
        if first_question_text:
            try:
                question_audio = await audio_pipeline.generate_question_audio(
                    question_text=first_question_text,
                    session_id=session_id,
                    voice_preference=voice_preference,
                )
                if (
                    question_audio
                    and question_audio.get("word_timestamps")
                    and first_question_msg_id.isdigit()
                ):
                    _save_word_timestamps(
                        ai_pipeline.db,
                        int(first_question_msg_id),
                        question_audio["word_timestamps"],
                        voice_preference,
                    )
            except Exception as e:
                logger.warning(f"[VoiceStart] TTS failed (non-blocking): {e}")

        return JSONResponse(status_code=200, content={
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
            "progress": {"current": 1, "total": result.get("question_count", question_count)},
            "interview_mode": "voice",
        })

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[VoiceStart] Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to start voice interview")


# ─────────────────────────────────────────────────────────────────────────────
# POST /answer
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
    # Resolve voice preference
    try:
        user_prefs = voice_prefs_service.get_or_create_preferences(current_user.id)
        if voice_preference == "female":
            voice_preference = user_prefs.preferred_voice
    except Exception as e:
        logger.warning(f"[VoiceAnswer] Failed to get voice preferences: {e}")

    # Verify session ownership
    session = ai_pipeline.db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên phỏng vấn này")

    if session.status == "abandoned":
        return JSONResponse(status_code=403, content={
            "success": False,
            "error": "SESSION_ABANDONED",
            "message": "Phiên phỏng vấn đã bị hủy.",
        })

    # Update tab switch count
    if tab_switch_count > 0:
        try:
            session.tab_switch_count = max(0, min(tab_switch_count, 100))
            ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"[VoiceAnswer] Failed to update tab_switch_count: {e}")

    # ── Path 1: text transcript already provided (from Deepgram live STT) ────
    if text_answer and text_answer.strip():
        transcript = text_answer.strip()
        logger.info(f"[VoiceAnswer] Using provided transcript ({len(transcript)} chars)")

        # Upload audio non-blocking
        if audio_file:
            try:
                bg_audio = await audio_file.read()
                asyncio.ensure_future(audio_pipeline.process_user_audio(
                    audio_data=bg_audio,
                    session_id=session_id,
                    message_id=message_id,
                    content_type=audio_file.content_type or "audio/webm",
                    audio_duration=audio_duration,
                    skip_stt=True,
                ))
            except Exception:
                pass

        try:
            ai_result = await ai_pipeline.submit_answer(
                session_id=session_id,
                user_answer=transcript,
                has_audio=bool(audio_file),
                audio_duration=audio_duration,
            )
        except Exception as e:
            logger.error(f"[VoiceAnswer] AI pipeline failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to process AI response")

        next_question_audio, next_question_msg_id, next_question_type = (
            None, str(ai_result.get("question_number", "")), ai_result.get("question_type", "")
        )
        if ai_result.get("status") == "continue" and ai_result.get("next_question"):
            q_num = ai_result.get("question_number")
            if q_num:
                msg = _get_next_question_msg(ai_pipeline.db, session_id, q_num)
                if msg:
                    next_question_msg_id = str(msg.id)
                    next_question_type = QUESTION_TYPE_LABELS.get(
                        msg.question_type or ai_result.get("question_type", ""),
                        ai_result.get("question_type", ""),
                    )
            try:
                next_question_audio = await audio_pipeline.generate_question_audio(
                    question_text=ai_result["next_question"],
                    session_id=session_id,
                    voice_preference=voice_preference,
                )
                if (
                    next_question_audio
                    and next_question_audio.get("word_timestamps")
                    and next_question_msg_id.isdigit()
                ):
                    _save_word_timestamps(
                        ai_pipeline.db, int(next_question_msg_id),
                        next_question_audio["word_timestamps"], voice_preference,
                    )
            except Exception as e:
                logger.warning(f"[VoiceAnswer] TTS failed: {e}")

        return JSONResponse(status_code=200, content=_voice_answer_response(
            transcript=transcript,
            ai_result=ai_result,
            session=session,
            next_question_audio=next_question_audio,
            next_question_msg_id=next_question_msg_id,
            next_question_type_display=next_question_type,
        ))

    # ── Path 2: audio file → STT → AI ────────────────────────────────────────
    if not audio_file:
        raise HTTPException(status_code=422, detail="Either audio_file or text_answer is required")

    content_type = audio_file.content_type or "audio/webm"
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file format")

    audio_data = await audio_file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    # STT: Deepgram first, Whisper fallback
    transcript = await _deepgram_transcribe(audio_data, content_type)

    if transcript is None:
        try:
            pipeline_result = await audio_pipeline.process_user_audio(
                audio_data=audio_data,
                session_id=session_id,
                message_id=message_id,
                content_type=content_type,
                audio_duration=audio_duration,
            )
            transcript = pipeline_result.get("transcript")
        except STTNoSpeechError:
            transcript = None
        except (STTDurationError, STTFileTooLargeError) as e:
            return JSONResponse(status_code=200, content={
                "success": False, "error": "STT_ERROR",
                "message": str(e), "allow_retry": True,
            })
        except Exception as e:
            logger.error(f"[VoiceAnswer] STT failed: {e}")
            return JSONResponse(status_code=200, content={
                "success": False, "error": "STT_PROCESSING_ERROR",
                "message": "Lỗi xử lý giọng nói. Vui lòng thử lại.", "allow_retry": True,
            })

    if not transcript:
        return JSONResponse(status_code=200, content={
            "success": False, "error": "STT_NO_SPEECH_DETECTED",
            "message": "Không thể nhận dạng giọng nói. Vui lòng thử ghi âm lại.",
            "allow_retry": True,
        })

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

    next_question_audio = None
    next_question_msg_id = str(ai_result.get("question_number", ""))
    next_question_type = ai_result.get("question_type", "")

    if ai_result.get("status") == "continue" and ai_result.get("next_question"):
        q_num = ai_result.get("question_number")
        if q_num:
            msg = _get_next_question_msg(ai_pipeline.db, session_id, q_num)
            if msg:
                next_question_msg_id = str(msg.id)
                next_question_type = QUESTION_TYPE_LABELS.get(
                    msg.question_type or ai_result.get("question_type", ""),
                    ai_result.get("question_type", ""),
                )
        try:
            next_question_audio = await audio_pipeline.generate_question_audio(
                question_text=ai_result["next_question"],
                session_id=session_id,
                voice_preference=voice_preference,
            )
            if (
                next_question_audio
                and next_question_audio.get("word_timestamps")
                and next_question_msg_id.isdigit()
            ):
                _save_word_timestamps(
                    ai_pipeline.db, int(next_question_msg_id),
                    next_question_audio["word_timestamps"], voice_preference,
                )
        except Exception as e:
            logger.warning(f"[VoiceAnswer] TTS failed: {e}")

    # Get file_url from pipeline_result if available
    file_url = locals().get("pipeline_result", {}).get("file_url") if "pipeline_result" in dir() else None

    return JSONResponse(status_code=200, content=_voice_answer_response(
        transcript=transcript,
        ai_result=ai_result,
        session=session,
        next_question_audio=next_question_audio,
        next_question_msg_id=next_question_msg_id,
        next_question_type_display=next_question_type,
        file_url=file_url,
    ))


# ─────────────────────────────────────────────────────────────────────────────
# POST /tts
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/tts")
async def generate_question_tts(
    question_text: str = Form(...),
    voice_preference: str = Form("female"),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
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
            tts_result = await _tts_service.synthesize_text(
                text=question_text, voice_preference=voice_preference,
            )
            result = {
                "audio_url": tts_result.get("audio_url"),
                "duration_seconds": tts_result.get("duration_seconds", 0.0),
                "word_timestamps": tts_result.get("word_timestamps", []),
                "question_text": question_text,
                "success": tts_result.get("success", True),
                "fallback_reason": tts_result.get("fallback_reason"),
            }

        if not result.get("success", True):
            logger.warning(f"[TTS] Graceful fallback: {result.get('fallback_reason')}")

        return JSONResponse(status_code=200, content={
            "success": True,
            "audio_url": result.get("audio_url"),
            "question_text": question_text,
            "duration_seconds": result.get("duration_seconds", 0.0),
            "word_timestamps": result.get("word_timestamps", []),
            "tts_success": result.get("success", True),
            "fallback_reason": result.get("fallback_reason"),
        })

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[TTS] Unexpected error: {e}")
        return JSONResponse(status_code=200, content={
            "success": True,
            "audio_url": None,
            "question_text": question_text,
            "duration_seconds": 0.0,
            "word_timestamps": [],
            "tts_success": False,
            "fallback_reason": f"TTS error: {str(e)[:100]}",
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /tts-health  /  POST /tts-reset
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/tts-health")
async def check_tts_health():
    status = {
        "timestamp": time.time(),
        "edge_tts": {"status": "unknown"},
        "fallback_gtts": {"available": False},
        "overall_status": "unknown",
    }
    try:
        s = _tts_service.get_status()
        status["edge_tts"] = {
            "status": "available" if s["edge_tts_available"] else "cooldown",
            "consecutive_failures": s["consecutive_failures"],
            "cooldown_remaining": s["cooldown_remaining"],
        }
    except Exception as e:
        status["edge_tts"] = {"status": "error", "error": str(e)[:100]}

    try:
        from app.modules.interview.fallback_tts_service import fallback_tts_service
        status["fallback_gtts"]["available"] = fallback_tts_service.gtts_available
    except Exception:
        pass

    if status["edge_tts"].get("status") == "available":
        status["overall_status"] = "optimal"
    elif status["fallback_gtts"]["available"]:
        status["overall_status"] = "functional_with_fallback"
    else:
        status["overall_status"] = "degraded"

    return JSONResponse(content=status)


@router.post("/tts-reset")
async def reset_tts_failures():
    try:
        _tts_service.reset_failure_tracking()
        return JSONResponse(content={"success": True, "status": _tts_service.get_status()})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# POST /stt  (standalone transcription)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/stt")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    message_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    content_type = audio_file.content_type or "audio/webm"
    audio_data = await audio_file.read()

    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    try:
        if session_id:
            result = await AudioPipelineService(db).process_user_audio(
                audio_data=audio_data,
                session_id=session_id,
                message_id=message_id,
                content_type=content_type,
            )
            return JSONResponse(status_code=200, content={
                "success": True, "transcript": result["transcript"],
                "file_url": result.get("file_url"),
            })
        else:
            from app.modules.interview.whisper_stt_service import whisper_stt_service
            transcript = await whisper_stt_service.transcribe(
                audio_data=audio_data, language="vi", content_type=content_type,
            )
            return JSONResponse(status_code=200, content={"success": True, "transcript": transcript})

    except STTNoSpeechError:
        return JSONResponse(status_code=200, content={
            "success": False, "error": "STT_NO_SPEECH_DETECTED",
            "message": "Không thể nhận dạng giọng nói.", "allow_retry": True,
        })
    except STTDurationError as e:
        return JSONResponse(status_code=200, content={
            "success": False, "error": "STT_DURATION_ERROR",
            "message": str(e), "allow_retry": True,
        })
    except Exception as e:
        logger.error(f"[STT] Failed: {e}")
        raise HTTPException(status_code=500, detail="STT processing failed")


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /tab-switch
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/tab-switch")
async def update_tab_switch_count(
    session_id: int = Form(...),
    tab_switch_count: int = Form(...),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    safe_count = max(0, min(tab_switch_count, 100))
    session.tab_switch_count = safe_count
    db.commit()

    return JSONResponse(status_code=200, content={
        "success": True,
        "tab_switch_count": safe_count,
        "session_terminated": False,
        "show_warning": safe_count >= 3,
        "warning_message": "⚠️ Vui lòng không chuyển tab trong khi phỏng vấn!" if safe_count >= 3 else None,
    })


# ─────────────────────────────────────────────────────────────────────────────
# GET /conversation/{session_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversation/{session_id}")
async def get_full_conversation(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    from app.modules.interview.models import InterviewAudio

    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(InterviewMessage)
        .filter(InterviewMessage.session_id == session_id)
        .order_by(InterviewMessage.order_index, InterviewMessage.id)
        .all()
    )

    audio_records = (
        db.query(InterviewAudio)
        .filter(InterviewAudio.session_id == session_id)
        .all()
    )

    candidate_msg_ids = {m.id for m in messages if m.role == "candidate"}
    interviewer_msg_ids = {m.id for m in messages if m.role == "interviewer"}

    # Direct map: message_id → audio (for correctly linked records)
    audio_by_msg = {ar.message_id: ar for ar in audio_records if ar.message_id}

    # User answer audios linked to wrong (interviewer) message_id — collect unmatched ones
    unmatched_user_audio = sorted(
        [ar for ar in audio_records
         if ar.audio_type == "user_answer"
         and ar.message_id not in candidate_msg_ids],
        key=lambda a: a.created_at or 0,
    )
    ai_audios = [ar for ar in audio_records if ar.audio_type == "ai_question" and not ar.message_id]

    # Build positional map: Nth unmatched user_answer → Nth candidate message without audio
    candidate_msgs_ordered = [m for m in messages if m.role == "candidate"]
    positional_user_audio: dict = {}
    unmatched_candidates = [m for m in candidate_msgs_ordered if m.id not in audio_by_msg or audio_by_msg[m.id].audio_type != "user_answer"]
    for audio_rec, cand_msg in zip(unmatched_user_audio, unmatched_candidates):
        positional_user_audio[cand_msg.id] = audio_rec

    conversation = []
    ai_idx = 0
    for msg in messages:
        audio_url = duration = transcript = None
        ar = audio_by_msg.get(msg.id) or positional_user_audio.get(msg.id)
        if ar:
            audio_url = ar.file_url if ar.file_url and ar.file_url.startswith("https://") else None
            duration = ar.duration_seconds
            transcript = getattr(ar, "transcript", None)
        elif msg.role == "interviewer" and ai_idx < len(ai_audios):
            ar = ai_audios[ai_idx]
            audio_url = ar.file_url if ar.file_url and ar.file_url.startswith("https://") else None
            duration = ar.duration_seconds
            ai_idx += 1

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

    return JSONResponse(status_code=200, content={
        "success": True,
        "session_id": session_id,
        "interview_mode": session.interview_mode,
        "voice_type": session.voice_type,
        "status": session.status,
        "total_messages": len(conversation),
        "conversation": conversation,
    })


# ─────────────────────────────────────────────────────────────────────────────
# GET /health  /  POST /session/{id}/terminate
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
# POST /stt-live  — live transcript (Deepgram → faster-whisper fallback)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/stt-live")
async def transcribe_live_chunk(
    audio_file: UploadFile = File(...),
    lang: str = Form("vi"),
):
    """Live transcript: Deepgram Nova-2 primary, faster-whisper fallback."""
    audio_data = await audio_file.read()
    if len(audio_data) < 500:
        return JSONResponse(status_code=200, content={"text": "", "debug": "too small"})

    # Primary: Deepgram
    content_type = audio_file.content_type or "audio/wav"
    transcript = await _deepgram_transcribe(audio_data, content_type, lang)
    if transcript is not None:
        return JSONResponse(status_code=200, content={"text": transcript})

    # Fallback: faster-whisper
    try:
        with wave.open(io.BytesIO(audio_data), "rb") as wf:
            n_ch, sr, sw = wf.getnchannels(), wf.getframerate(), wf.getsampwidth()
            raw = wf.readframes(wf.getnframes())

        dtype = {1: np.uint8, 2: np.int16, 4: np.int32}.get(sw, np.int16)
        audio = np.frombuffer(raw, dtype=dtype).astype(np.float32)
        if sw == 1:   audio = audio / 128.0 - 1.0
        elif sw == 2: audio = audio / 32768.0
        else:         audio = audio / 2147483648.0
        if n_ch > 1:
            audio = audio.reshape(-1, n_ch).mean(axis=1)
        if sr != 16000 and len(audio):
            n = int(len(audio) * 16000 / sr)
            audio = np.interp(np.linspace(0, len(audio)-1, n), np.arange(len(audio)), audio).astype(np.float32)

        if len(audio) / 16000 < 0.5:
            return JSONResponse(status_code=200, content={"text": "", "debug": "too short"})
        if float(np.sqrt(np.mean(audio ** 2))) < 0.005:
            return JSONResponse(status_code=200, content={"text": "", "debug": "silent"})

        model = _get_fw_model()
        if model is None:
            return JSONResponse(status_code=200, content={
                "text": "", "error": "No STT model available — set DEEPGRAM_API_KEY"
            })

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
                if any(p in result.lower() for p in WHISPER_HALLUCINATION_PHRASES):
                    return ""
                return result

        text = await asyncio.get_event_loop().run_in_executor(None, _run)
        logger.info(f"[whisper-fallback] → {repr(text[:80])}")
        return JSONResponse(status_code=200, content={"text": text})

    except wave.Error as e:
        return JSONResponse(status_code=200, content={"text": "", "error": f"WAV error: {e}"})
    except Exception as e:
        logger.error(f"[stt-live] {e}", exc_info=True)
        return JSONResponse(status_code=200, content={"text": "", "error": str(e)[:200]})


# ─────────────────────────────────────────────────────────────────────────────
# POST /analyze-answer  — deep AI analysis of a single answer
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeAnswerRequest(BaseModel):
    question: str
    answer: str
    question_type: str = "behavioral"
    job_title: str = ""
    score: Optional[float] = None


@router.post("/analyze-answer")
async def analyze_answer(
    req: AnalyzeAnswerRequest,
    current_user: User = Depends(get_current_user_from_token),
):
    """Deep AI analysis of a single interview answer using Gemini."""
    import re
    import google.generativeai as genai
    from app.core.serialization import ORJSONResponse

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return ORJSONResponse({"success": False, "error": "API key not configured"})

    genai.configure(api_key=api_key)

    qt_labels = {
        "behavioral": "Hanh vi (STAR)", "technical": "Ky thuat",
        "situational": "Tinh huong", "warm_up": "Khoi dong", "jd_specific": "Theo JD",
    }
    score_text = f"{req.score:.1f}/10" if req.score is not None else "chua cham"
    qt_label = qt_labels.get(req.question_type, req.question_type)

    prompt = f"""Phan tich cau tra loi phong van. Tra ve JSON.
{{"q":"{req.question[:100]}","a":"{(req.answer or '')[:150]}","score":{req.score or 0},"type":"{qt_label}","job":"{req.job_title or ''}"}}
JSON output:
{{"strengths":["<diem manh cu the>","<diem manh 2>"],"weaknesses":["<diem yeu cu the>","<diem yeu 2>"],"missing_elements":["<con thieu 1>","<con thieu 2>"],"improved_example":"<Viet lai cau tra loi day du hon, ap dung STAR neu behavioral, co so lieu, 2-3 cau>","action_tips":["<loi khuyen 1>","<loi khuyen 2>"],"score_explanation":"<ly do diem nay>"}}
Chi tra JSON, khong text ngoai."""

    safety_settings = [
        {"category": c, "threshold": "BLOCK_NONE"}
        for c in [
            "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
        ]
    ]

    try:
        model = genai.GenerativeModel("gemini-2.5-flash", safety_settings=safety_settings)
        resp = model.generate_content(
            prompt, generation_config={"max_output_tokens": 4096, "temperature": 0.3},
        )
        raw = resp.text if resp and resp.candidates else None
        if not raw:
            return ORJSONResponse({"success": False, "error": "AI khong tra ve ket qua"})
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            return ORJSONResponse({"success": True, "analysis": json.loads(m.group())})
        return ORJSONResponse({"success": False, "error": "Khong tim thay JSON", "raw": raw[:300]})
    except json.JSONDecodeError:
        return ORJSONResponse({"success": False, "error": "JSON khong hop le"})
    except Exception as e:
        logger.error(f"[AnalyzeAnswer] Error: {e}")
        return ORJSONResponse({"success": False, "error": str(e)[:150]})
