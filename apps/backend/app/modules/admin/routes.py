"""
Admin routes for monitoring system status
"""
from fastapi import APIRouter
from app.core.gemini_manager import multi_stream_manager

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/gemini-status")
async def get_gemini_status():
    """
    Get detailed status of all Gemini streams including active models
    """
    try:
        status = multi_stream_manager.check_all_streams_status()
        
        return {
            "success": True,
            "streams": status,
            "summary": {
                "total_streams": len(status),
                "active_streams": sum(1 for s in status.values() if s['available']),
                "models_in_use": [s['model'] for s in status.values() if s['model']]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "streams": {}
        }

@router.post("/gemini-reinit")
async def reinitialize_gemini_streams():
    """
    Force reinitialize all Gemini streams (useful when models are updated)
    """
    try:
        # Reinitialize all streams
        multi_stream_manager.chatbot_stream._initialize_with_fallback()
        multi_stream_manager.assessment_stream._initialize_with_fallback()
        multi_stream_manager.cv_stream._initialize_with_fallback()
        
        # Get new status
        status = multi_stream_manager.check_all_streams_status()
        
        return {
            "success": True,
            "message": "All streams reinitialized",
            "streams": status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/health")
async def admin_health_check():
    """
    Simple health check for admin endpoints
    """
    return {
        "status": "healthy",
        "service": "admin-api"
    }