"""
Voice Preferences API - Quản lý cài đặt giọng nói của user
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from loguru import logger

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from app.services.voice_preferences_service import VoicePreferencesService
from app.services.audio_cache_service import AudioCacheService
from app.services.voice_performance_service import VoicePerformanceService

router = APIRouter(prefix="/api/voice", tags=["Voice Preferences"])


# Pydantic models
class VoicePreferencesUpdate(BaseModel):
    preferred_voice: str = Field(None, pattern="^(male|female)$", description="Voice type: male or female")
    voice_rate: str = Field(None, pattern="^[+-]\d+%$", description="Voice rate: +/-20%")
    voice_pitch: str = Field(None, pattern="^[+-]\d+Hz$", description="Voice pitch: +/-50Hz")
    voice_volume: float = Field(None, ge=0.0, le=2.0, description="Voice volume: 0.0-2.0")
    language: str = Field(None, pattern="^(vi-VN|en-US)$", description="Language: vi-VN or en-US")


class VoicePreferencesResponse(BaseModel):
    id: str
    user_id: int
    preferred_voice: str
    voice_rate: str
    voice_pitch: str
    voice_volume: float
    language: str
    created_at: str
    updated_at: str


# API Endpoints
@router.get("/preferences", response_model=VoicePreferencesResponse)
async def get_voice_preferences(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lấy voice preferences của user hiện tại
    """
    service = VoicePreferencesService(db)
    preferences = service.get_or_create_preferences(current_user.id)
    return preferences.to_dict()


@router.put("/preferences", response_model=VoicePreferencesResponse)
async def update_voice_preferences(
    preferences_update: VoicePreferencesUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Cập nhật voice preferences của user hiện tại
    """
    service = VoicePreferencesService(db)
    
    # Validate input
    update_data = preferences_update.dict(exclude_unset=True)
    errors = service.validate_voice_settings(update_data)
    
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid voice settings", "errors": errors}
        )
    
    # Update preferences
    preferences = service.update_preferences(
        user_id=current_user.id,
        **update_data
    )
    
    return preferences.to_dict()


@router.delete("/preferences")
async def delete_voice_preferences(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Xóa voice preferences của user hiện tại (reset về default)
    """
    service = VoicePreferencesService(db)
    success = service.delete_preferences(current_user.id)
    
    if success:
        return {"message": "Voice preferences deleted successfully"}
    else:
        return {"message": "No voice preferences found to delete"}


@router.get("/preferences/settings")
async def get_voice_settings_for_tts(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lấy voice settings trong format phù hợp cho TTS services
    """
    service = VoicePreferencesService(db)
    settings = service.get_voice_settings_for_tts(current_user.id)
    return {"voice_settings": settings}


@router.get("/cache/stats")
async def get_audio_cache_stats(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê audio cache (admin only)
    """
    # TODO: Add admin check
    service = AudioCacheService(db)
    stats = service.get_cache_stats()
    return {"cache_stats": stats}


@router.post("/cache/cleanup")
async def cleanup_audio_cache(
    ttl_hours: int = 24,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Dọn dẹp audio cache đã hết hạn (admin only)
    """
    # Validate ttl_hours
    if ttl_hours < 1 or ttl_hours > 168:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ttl_hours must be between 1 and 168"
        )
    
    # TODO: Add admin check
    service = AudioCacheService(db)
    deleted_count = service.cleanup_expired_cache(ttl_hours)
    return {
        "message": f"Cleaned up {deleted_count} expired cache entries",
        "deleted_count": deleted_count
    }


@router.delete("/cache/clear-all")
async def clear_all_audio_cache(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    DANGER: Clear ALL audio cache entries (for debugging only)
    Use this to force fresh TTS synthesis for all requests
    """
    try:
        # Delete all cache entries
        from app.models.audio_cache import AudioCache
        deleted_count = db.query(AudioCache).delete()
        db.commit()
        
        logger.warning(f"[VoicePreferences] ALL audio cache cleared by user {current_user.id}: {deleted_count} entries deleted")
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": "All audio cache entries have been cleared. Fresh TTS synthesis will be used for all requests."
        }
    except Exception as e:
        logger.error(f"[VoicePreferences] Clear all cache failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/stats")
async def get_voice_performance_stats(
    hours_back: int = 24,
    stage: str = None,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lấy thống kê performance của voice processing (admin only)
    """
    # Validate parameters
    if hours_back < 1 or hours_back > 168:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hours_back must be between 1 and 168"
        )
    
    if stage and stage not in ["stt", "ai", "tts", "total"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="stage must be one of: stt, ai, tts, total"
        )
    
    # TODO: Add admin check
    service = VoicePerformanceService(db)
    stats = service.get_system_performance_stats(hours_back, stage)
    return {"performance_stats": stats}


@router.get("/performance/errors")
async def get_voice_error_analysis(
    hours_back: int = 24,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Phân tích lỗi voice processing (admin only)
    """
    # Validate parameters
    if hours_back < 1 or hours_back > 168:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hours_back must be between 1 and 168"
        )
    
    # TODO: Add admin check
    service = VoicePerformanceService(db)
    analysis = service.get_error_analysis(hours_back)
    return {"error_analysis": analysis}


@router.get("/performance/slow")
async def get_slow_voice_requests(
    threshold_seconds: float = 10.0,
    limit: int = 10,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lấy các voice requests chậm nhất (admin only)
    """
    # Validate parameters
    if threshold_seconds < 1.0 or threshold_seconds > 60.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="threshold_seconds must be between 1.0 and 60.0"
        )
    
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100"
        )
    
    # TODO: Add admin check
    service = VoicePerformanceService(db)
    slow_requests = service.get_slow_requests(threshold_seconds, limit)
    return {"slow_requests": slow_requests}


@router.get("/health")
async def voice_system_health():
    """
    Kiểm tra tình trạng hệ thống voice
    """
    try:
        from app.modules.interview.edge_tts_service import edge_tts_service
        from app.modules.interview.fallback_tts_service import fallback_tts_service
        
        # Test basic TTS functionality
        test_text = "Xin chào, đây là test hệ thống TTS."
        
        # Quick test with fallback service
        result = await fallback_tts_service.synthesize_text_fallback(
            text=test_text,
            voice_preference="female",
            language="vi"
        )
        
        tts_status = "healthy" if result.get("success") else "degraded"
        
        return {
            "status": "healthy",
            "tts_status": tts_status,
            "fallback_method": result.get("method_used", "unknown"),
            "services": {
                "edge_tts": "available",
                "fallback_tts": "available",
                "audio_cache": "available",
                "performance_metrics": "available"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "edge_tts": "unknown",
                "fallback_tts": "unknown",
                "audio_cache": "unknown",
                "performance_metrics": "unknown"
            }
        }