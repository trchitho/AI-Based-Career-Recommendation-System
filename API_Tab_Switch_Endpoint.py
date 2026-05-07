# =====================================================
# API ENDPOINT: Tab Switch Tracking với Debug Mode
# File: apps/backend/app/api/voice_interview_tab_switch.py
# =====================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import json
from datetime import datetime

from app.core.db import get_db
from app.core.auth_deps import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/api/interview/voice", tags=["Voice Interview"])

# =====================================================
# PYDANTIC MODELS
# =====================================================

class TabSwitchRequest(BaseModel):
    session_id: int = Field(..., description="ID của interview session")
    debug_info: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Debug information: page, timestamp, user_agent, etc."
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": 123,
                "debug_info": {
                    "page": "interview",
                    "timestamp": "2026-01-26T10:00:00Z",
                    "user_agent": "Mozilla/5.0...",
                    "previous_tab": "linkedin.com",
                    "action": "tab_focus_lost"
                }
            }
        }

class TabSwitchResponse(BaseModel):
    success: bool
    message: str
    current_count: int
    remaining_switches: int
    limit_reached: bool
    debug_info: Dict[str, Any]
    session_status: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Tab switch tracked successfully",
                "current_count": 3,
                "remaining_switches": 7,
                "limit_reached": False,
                "debug_info": {
                    "page": "interview",
                    "timestamp": "2026-01-26T10:00:00Z"
                },
                "session_status": "active"
            }
        }

class TabSwitchStatusResponse(BaseModel):
    session_id: int
    current_count: int
    max_limit: int
    remaining_switches: int
    limit_reached: bool
    session_status: str
    last_switch_time: Optional[datetime]
    debug_history: list

# =====================================================
# API ENDPOINTS
# =====================================================

@router.post("/tab-switch", response_model=TabSwitchResponse)
async def track_tab_switch(
    request: TabSwitchRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Track tab switch event với debug mode (limit = 10)
    
    **Flow:**
    1. Validate session thuộc về user
    2. Check current tab_switch_count
    3. Update counter nếu chưa đạt limit
    4. Log debug info
    5. Return status
    """
    try:
        # 1. Validate session ownership
        session_query = text("""
            SELECT id, user_id, status, tab_switch_count, interview_mode
            FROM interview.interview_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """)
        
        session_result = db.execute(session_query, {
            "session_id": request.session_id,
            "user_id": current_user.id
        }).fetchone()
        
        if not session_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found or access denied"
            )
        
        session_id, user_id, session_status, current_count, interview_mode = session_result
        
        # 2. Check if session is active
        if session_status != 'active':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot track tab switch for {session_status} session"
            )
        
        # 3. Check if voice interview (tab switch chỉ áp dụng cho voice)
        if interview_mode != 'voice':
            return TabSwitchResponse(
                success=True,
                message="Tab switch tracking not required for text interview",
                current_count=current_count,
                remaining_switches=10,
                limit_reached=False,
                debug_info=request.debug_info,
                session_status=session_status
            )
        
        # 4. Use database function để track tab switch
        track_query = text("""
            SELECT track_tab_switch(:session_id, :debug_info::jsonb) as result
        """)
        
        track_result = db.execute(track_query, {
            "session_id": request.session_id,
            "debug_info": json.dumps(request.debug_info)
        }).fetchone()
        
        result_json = track_result[0]
        
        # 5. Log for debugging
        logger.info(f"Tab switch tracked for session {request.session_id}: {result_json}")
        
        # 6. Prepare response
        new_count = result_json.get('new_count', current_count)
        remaining = result_json.get('remaining', 0)
        
        return TabSwitchResponse(
            success=result_json['success'],
            message=result_json['message'],
            current_count=new_count,
            remaining_switches=remaining,
            limit_reached=(new_count >= 10),
            debug_info=result_json.get('debug_info', {}),
            session_status=session_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking tab switch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track tab switch"
        )

@router.get("/tab-switch/status/{session_id}", response_model=TabSwitchStatusResponse)
async def get_tab_switch_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lấy trạng thái tab switch của session
    """
    try:
        # Query session info
        status_query = text("""
            SELECT 
                s.id,
                s.user_id,
                s.status,
                s.tab_switch_count,
                s.interview_mode,
                s.conversation_metadata,
                s.started_at
            FROM interview.interview_sessions s
            WHERE s.id = :session_id AND s.user_id = :user_id
        """)
        
        result = db.execute(status_query, {
            "session_id": session_id,
            "user_id": current_user.id
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        (session_id, user_id, session_status, tab_count, 
         interview_mode, conversation_metadata, started_at) = result
        
        # Parse debug history from conversation_metadata
        debug_history = []
        if conversation_metadata:
            tab_switch_debug = conversation_metadata.get('tab_switch_debug', {})
            last_switch_time = conversation_metadata.get('last_tab_switch')
            if tab_switch_debug:
                debug_history.append(tab_switch_debug)
        else:
            last_switch_time = None
        
        return TabSwitchStatusResponse(
            session_id=session_id,
            current_count=tab_count,
            max_limit=10,
            remaining_switches=max(0, 10 - tab_count),
            limit_reached=(tab_count >= 10),
            session_status=session_status,
            last_switch_time=last_switch_time,
            debug_history=debug_history
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tab switch status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tab switch status"
        )

@router.post("/tab-switch/reset/{session_id}")
async def reset_tab_switch_count(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Reset tab switch count (chỉ dành cho debug/admin)
    """
    try:
        # Validate session ownership
        reset_query = text("""
            UPDATE interview.interview_sessions 
            SET 
                tab_switch_count = 0,
                conversation_metadata = conversation_metadata || jsonb_build_object(
                    'tab_switch_reset_at', NOW(),
                    'reset_by_user', :user_id
                )
            WHERE id = :session_id AND user_id = :user_id
            RETURNING tab_switch_count
        """)
        
        result = db.execute(reset_query, {
            "session_id": session_id,
            "user_id": current_user.id
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied"
            )
        
        db.commit()
        
        logger.info(f"Tab switch count reset for session {session_id} by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Tab switch count reset successfully",
            "session_id": session_id,
            "new_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting tab switch count: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset tab switch count"
        )

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

def validate_debug_info(debug_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate và clean debug info
    """
    allowed_fields = {
        'page', 'timestamp', 'user_agent', 'previous_tab', 
        'action', 'window_focus', 'visibility_state'
    }
    
    cleaned = {}
    for key, value in debug_info.items():
        if key in allowed_fields:
            cleaned[key] = str(value)[:500]  # Limit length
    
    return cleaned

# =====================================================
# INTEGRATION EXAMPLE
# =====================================================

"""
Frontend JavaScript Integration:

// Detect tab switch
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Tab lost focus
        trackTabSwitch({
            action: 'tab_focus_lost',
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            previous_tab: document.referrer
        });
    }
});

// Track tab switch function
async function trackTabSwitch(debugInfo) {
    try {
        const response = await fetch('/api/interview/voice/tab-switch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                debug_info: debugInfo
            })
        });
        
        const result = await response.json();
        
        if (result.limit_reached) {
            // Show warning or end interview
            showTabSwitchWarning(result);
        }
        
        updateTabSwitchUI(result);
        
    } catch (error) {
        console.error('Failed to track tab switch:', error);
    }
}
"""