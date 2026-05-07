# Voice Interview Streaming API Routes
# Add streaming response để cải thiện UX

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, AsyncGenerator
import logging
import json
import asyncio

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.modules.interview.audio_pipeline_service import AudioPipelineService
from app.modules.interview.ai_pipeline_service import AIPipelineService
from app.modules.interview.models import InterviewSession
from app.modules.interview.edge_tts_service import edge_tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview/voice", tags=["voice-interview-streaming"])


def get_audio_pipeline(db: Session = Depends(get_db)) -> AudioPipelineService:
    return AudioPipelineService(db)


def get_ai_pipeline(db: Session = Depends(get_db)) -> AIPipelineService:
    return AIPipelineService(db)


async def stream_voice_processing(
    session_id: int,
    audio_file: UploadFile,
    voice_preference: str,
    current_user: User,
    ai_pipeline: AIPipelineService,
    audio_pipeline: AudioPipelineService
) -> AsyncGenerator[str, None]:
    """
    Stream voice processing steps to client for better UX
    """
    try:
        # Step 1: STT Processing
        yield f"data: {json.dumps({'stage': 'stt', 'message': 'Đang chuyển đổi giọng nói thành văn bản...', 'progress': 10})}\n\n"
        
        # Read audio file
        audio_content = await audio_file.read()
        
        # Process STT
        stt_result = await audio_pipeline.process_audio_to_text(
            audio_content=audio_content,
            filename=audio_file.filename or "audio.webm"
        )
        
        if not stt_result.get("success"):
            error_msg = f'Lỗi STT: {stt_result.get("error", "Unknown error")}'
            yield f"data: {json.dumps({'stage': 'error', 'message': error_msg, 'progress': 0})}\n\n"
            return
        
        transcript = stt_result.get("transcript", "")
        transcript_preview = f'Đã nhận diện: "{transcript[:50]}..."'
        yield f"data: {json.dumps({'stage': 'stt_complete', 'message': transcript_preview, 'progress': 30})}\n\n"
        
        # Step 2: AI Processing
        yield f"data: {json.dumps({'stage': 'ai', 'message': 'AI đang phân tích và tạo phản hồi...', 'progress': 40})}\n\n"
        
        # Submit to AI pipeline
        ai_result = await ai_pipeline.submit_answer(session_id, transcript)
        
        if not ai_result.get("success"):
            error_msg = f'Lỗi AI: {ai_result.get("error", "Unknown error")}'
            yield f"data: {json.dumps({'stage': 'error', 'message': error_msg, 'progress': 0})}\n\n"
            return
        
        next_question = ai_result.get("next_question", "")
        yield f"data: {json.dumps({'stage': 'ai_complete', 'message': 'AI đã tạo câu hỏi tiếp theo', 'progress': 70})}\n\n"
        
        # Step 3: TTS Processing
        yield f"data: {json.dumps({'stage': 'tts', 'message': 'Đang tạo âm thanh phản hồi...', 'progress': 80})}\n\n"
        
        # Generate TTS with enhanced error handling
        try:
            tts_result = await edge_tts_service.synthesize_text(
                text=next_question,
                voice_preference=voice_preference,
                session_id=str(current_user.id)
            )
            
            tts_success = tts_result.get("success", True)
            if tts_success:
                yield f"data: {json.dumps({'stage': 'tts_complete', 'message': 'Đã tạo âm thanh thành công', 'progress': 95})}\n\n"
            else:
                fallback_reason = tts_result.get("fallback_reason", "TTS failed")
                yield f"data: {json.dumps({'stage': 'tts_fallback', 'message': f'TTS fallback: {fallback_reason}', 'progress': 95})}\n\n"
                
        except Exception as e:
            logger.error(f"[Streaming] TTS failed: {str(e)}")
            tts_result = {
                "audio_url": None,
                "duration_seconds": 0.0,
                "success": False,
                "fallback_reason": f"TTS error: {str(e)[:50]}"
            }
            yield f"data: {json.dumps({'stage': 'tts_error', 'message': 'TTS failed, continuing with text-only', 'progress': 95})}\n\n"
        
        # Step 4: Complete
        response_data = {
            "success": True,
            "transcript": transcript,
            "next_question": next_question,
            "audio_url": tts_result.get("audio_url"),
            "voice_type": voice_preference,
            "processing_time": tts_result.get("duration_seconds", 0),
            "tts_success": tts_result.get("success", True),
            "fallback_reason": tts_result.get("fallback_reason"),
            "metadata": {
                "stt_confidence": stt_result.get("confidence", 0),
                "tts_metadata": tts_result,
                "ai_metadata": ai_result.get("metadata", {})
            }
        }
        
        yield f"data: {json.dumps({'stage': 'complete', 'message': 'Hoàn tất xử lý!', 'progress': 100, 'result': response_data})}\n\n"
        
    except Exception as e:
        logger.error(f"Streaming voice processing error: {str(e)}")
        error_msg = f'Lỗi xử lý: {str(e)}'
        yield f"data: {json.dumps({'stage': 'error', 'message': error_msg, 'progress': 0})}\n\n"


@router.post("/answer-stream")
async def submit_voice_answer_stream(
    session_id: int = Form(...),
    audio_file: UploadFile = File(...),
    voice_preference: str = Form("female"),
    tab_switch_count: int = Form(0),
    current_user: User = Depends(get_current_user_from_token),
    ai_pipeline: AIPipelineService = Depends(get_ai_pipeline),
    audio_pipeline: AudioPipelineService = Depends(get_audio_pipeline),
):
    """
    Streaming version of voice answer submission for better UX
    Returns Server-Sent Events (SSE) stream
    """
    # Validate tab switch count
    if tab_switch_count >= 10:
        raise HTTPException(
            status_code=403,
            detail="Phiên phỏng vấn đã bị hủy do vi phạm quy tắc (chuyển tab >= 10 lần).",
        )

    # Validate session access
    session = ai_pipeline.db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên phỏng vấn này")

    if session.status == "abandoned":
        raise HTTPException(status_code=403, detail="Phiên phỏng vấn đã bị hủy")

    # Update tab switch count
    if tab_switch_count > 0:
        try:
            session.tab_switch_count = max(0, min(tab_switch_count, 10))
            ai_pipeline.db.commit()
        except Exception as e:
            logger.warning(f"Failed to update tab_switch_count: {e}")

    # Return streaming response
    return StreamingResponse(
        stream_voice_processing(
            session_id=session_id,
            audio_file=audio_file,
            voice_preference=voice_preference,
            current_user=current_user,
            ai_pipeline=ai_pipeline,
            audio_pipeline=audio_pipeline
        ),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@router.get("/processing-status/{session_id}")
async def get_processing_status(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    ai_pipeline: AIPipelineService = Depends(get_ai_pipeline),
):
    """
    Get current processing status for a session
    """
    session = ai_pipeline.db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
    ).first()
    
    if not session:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phiên phỏng vấn này")
    
    # Get TTS cache stats
    try:
        cache_stats = {"status": "not_available"}  # Edge TTS service doesn't have cache stats
    except:
        cache_stats = {"status": "error"}
    
    return {
        "session_id": session_id,
        "status": session.status,
        "tab_switch_count": session.tab_switch_count,
        "cache_performance": cache_stats,
        "ai_pipeline_status": ai_pipeline.get_pipeline_status()
    }