# =====================================================
# ENHANCED VOICE INTERVIEW API - OPTIMIZED VERSION
# File: apps/backend/app/api/voice_interview_enhanced.py
# Purpose: Fix evaluation logic, performance, UI states
# =====================================================

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import json
import asyncio
from datetime import datetime
import uuid

from app.core.db import get_db
from app.core.auth_deps import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/api/interview/voice", tags=["Voice Interview Enhanced"])

# =====================================================
# PYDANTIC MODELS
# =====================================================

class VoiceInterviewMessage(BaseModel):
    role: str = Field(..., description="Role: user or assistant")
    content: str = Field(..., description="Message content")
    audio_url: Optional[str] = None
    processing_time: Optional[float] = None
    ui_state_duration: Optional[Dict[str, float]] = None

class EvaluationRequest(BaseModel):
    session_id: int
    evaluation_results: Dict[str, Any] = Field(..., description="Complete evaluation results")
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": 123,
                "evaluation_results": {
                    "final_score": 8.3,
                    "scores": {
                        "technical": 8.5,
                        "communication": 8.0,
                        "logic": 8.2,
                        "experience": 8.1,
                        "attitude": 8.4
                    },
                    "question_scores": [
                        {"question_id": 1, "score": 8, "feedback": "Good understanding"},
                        {"question_id": 2, "score": 7, "feedback": "Could be more detailed"}
                    ],
                    "overall_feedback": "Strong candidate with good technical skills"
                }
            }
        }

class UIStateRequest(BaseModel):
    session_id: int
    state_type: str = Field(..., description="UI state type")
    state_value: str = Field(..., description="UI state value")
    action: str = Field(..., description="start or end")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class PerformanceOptimizationRequest(BaseModel):
    session_id: int
    stage: str = Field(..., description="processing stage")
    optimization_type: str = Field(..., description="cache, async, compress, etc.")
    before_time: float
    after_time: float
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

# =====================================================
# EVALUATION LOGIC ENDPOINTS
# =====================================================

@router.post("/evaluation/start-deferred/{session_id}")
async def start_deferred_evaluation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Bắt đầu chấm điểm sau khi kết thúc interview (deferred evaluation)
    
    **Logic:**
    1. Kiểm tra session đã completed chưa
    2. Set evaluation_mode = 'deferred'  
    3. Set evaluation_status = 'in_progress'
    4. Return success để frontend bắt đầu evaluation process
    """
    try:
        # Validate session ownership
        session_query = text("""
            SELECT id, user_id, status, evaluation_status
            FROM interview.interview_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """)
        
        session_result = db.execute(session_query, {
            "session_id": session_id,
            "user_id": current_user.id
        }).fetchone()
        
        if not session_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied"
            )
        
        session_id, user_id, session_status, eval_status = session_result
        
        # Use database function to start deferred evaluation
        start_eval_query = text("""
            SELECT start_deferred_evaluation(:session_id) as result
        """)
        
        result = db.execute(start_eval_query, {
            "session_id": session_id
        }).fetchone()
        
        result_json = result[0]
        db.commit()
        
        logger.info(f"Started deferred evaluation for session {session_id}: {result_json}")
        
        return {
            "success": result_json['success'],
            "message": result_json['message'],
            "session_id": session_id,
            "evaluation_mode": "deferred",
            "next_step": "process_all_messages_for_evaluation"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting deferred evaluation: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start deferred evaluation"
        )

@router.post("/evaluation/complete")
async def complete_evaluation(
    request: EvaluationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Hoàn thành chấm điểm với kết quả chi tiết
    
    **Flow:**
    1. Validate evaluation results
    2. Save to database
    3. Update session scores
    4. Background task: generate insights
    """
    try:
        # Validate session ownership
        session_query = text("""
            SELECT id, user_id, evaluation_status
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
                detail="Session not found or access denied"
            )
        
        # Use database function to complete evaluation
        complete_eval_query = text("""
            SELECT complete_evaluation(:session_id, :evaluation_results::jsonb) as result
        """)
        
        result = db.execute(complete_eval_query, {
            "session_id": request.session_id,
            "evaluation_results": json.dumps(request.evaluation_results)
        }).fetchone()
        
        result_json = result[0]
        db.commit()
        
        # Background task: generate additional insights
        background_tasks.add_task(
            generate_evaluation_insights,
            request.session_id,
            request.evaluation_results
        )
        
        logger.info(f"Completed evaluation for session {request.session_id}: {result_json}")
        
        return {
            "success": result_json['success'],
            "message": result_json['message'],
            "session_id": request.session_id,
            "final_score": request.evaluation_results.get('final_score'),
            "evaluation_completed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing evaluation: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete evaluation"
        )

# =====================================================
# PERFORMANCE OPTIMIZATION ENDPOINTS
# =====================================================

@router.post("/ui-state/log")
async def log_ui_state(
    request: UIStateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Log UI state changes để track performance
    
    **States:**
    - processing_stt: "Đang xử lý giọng nói..."
    - processing_ai: "AI đang suy nghĩ..."  
    - processing_tts: "Đang tạo giọng nói..."
    - waiting_user: "Chờ người dùng..."
    - playing_audio: "Đang phát audio..."
    - recording_audio: "Đang ghi âm..."
    """
    try:
        if request.action == "start":
            # Start new UI state
            log_state_query = text("""
                SELECT log_ui_state(:session_id, :state_type, :state_value, :metadata::jsonb) as state_id
            """)
            
            result = db.execute(log_state_query, {
                "session_id": request.session_id,
                "state_type": request.state_type,
                "state_value": request.state_value,
                "metadata": json.dumps(request.metadata)
            }).fetchone()
            
            state_id = result[0]
            db.commit()
            
            return {
                "success": True,
                "message": f"Started logging UI state: {request.state_type}",
                "state_id": str(state_id),
                "state_type": request.state_type,
                "state_value": request.state_value
            }
            
        elif request.action == "end":
            # End UI state (requires state_id in metadata)
            state_id = request.metadata.get('state_id')
            if not state_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="state_id required in metadata for end action"
                )
            
            end_state_query = text("""
                SELECT end_ui_state(:state_id::uuid) as result
            """)
            
            result = db.execute(end_state_query, {
                "state_id": state_id
            }).fetchone()
            
            result_json = result[0]
            db.commit()
            
            return {
                "success": result_json['success'],
                "message": f"Ended UI state: {request.state_type}",
                "state_id": state_id,
                "duration_ms": result_json.get('duration_ms')
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be 'start' or 'end'"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging UI state: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log UI state"
        )

@router.get("/performance/summary/{session_id}")
async def get_performance_summary(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lấy tổng kết performance của session
    """
    try:
        # Validate session ownership
        session_query = text("""
            SELECT id FROM interview.interview_sessions 
            WHERE id = :session_id AND user_id = :user_id
        """)
        
        session_result = db.execute(session_query, {
            "session_id": session_id,
            "user_id": current_user.id
        }).fetchone()
        
        if not session_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied"
            )
        
        # Get performance summary
        summary_query = text("""
            SELECT get_performance_summary(:session_id) as summary
        """)
        
        result = db.execute(summary_query, {
            "session_id": session_id
        }).fetchone()
        
        summary = result[0]
        
        return {
            "success": True,
            "session_id": session_id,
            "performance_summary": summary,
            "recommendations": generate_performance_recommendations(summary)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get performance summary"
        )

@router.post("/optimization/apply")
async def apply_performance_optimization(
    request: PerformanceOptimizationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Apply và track performance optimizations
    """
    try:
        # Log optimization result
        optimization_query = text("""
            INSERT INTO interview.voice_performance_metrics (
                session_id, stage, processing_time, success, metadata_json, stage_details
            ) VALUES (
                :session_id, :stage, :after_time, true, :metadata::jsonb, :stage_details::jsonb
            ) RETURNING id
        """)
        
        stage_details = {
            "optimization_type": request.optimization_type,
            "before_time": request.before_time,
            "after_time": request.after_time,
            "improvement_percent": ((request.before_time - request.after_time) / request.before_time) * 100,
            "applied_at": datetime.now().isoformat()
        }
        
        result = db.execute(optimization_query, {
            "session_id": request.session_id,
            "stage": request.stage,
            "after_time": request.after_time,
            "metadata": json.dumps(request.metadata),
            "stage_details": json.dumps(stage_details)
        }).fetchone()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Applied {request.optimization_type} optimization to {request.stage}",
            "improvement_percent": stage_details["improvement_percent"],
            "before_time": request.before_time,
            "after_time": request.after_time
        }
        
    except Exception as e:
        logger.error(f"Error applying optimization: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply optimization"
        )

# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def generate_evaluation_insights(session_id: int, evaluation_results: Dict[str, Any]):
    """
    Background task để generate additional insights từ evaluation results
    """
    try:
        # TODO: Implement AI-powered insights generation
        # - Compare với historical data
        # - Generate personalized recommendations
        # - Identify skill gaps
        # - Suggest learning paths
        
        logger.info(f"Generated evaluation insights for session {session_id}")
        
    except Exception as e:
        logger.error(f"Error generating evaluation insights: {str(e)}")

def generate_performance_recommendations(performance_summary: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Generate performance optimization recommendations
    """
    recommendations = []
    
    ui_states = performance_summary.get('ui_states', {})
    voice_metrics = performance_summary.get('voice_metrics', {})
    
    # Check STT performance
    if 'stt' in voice_metrics:
        stt_avg_time = voice_metrics['stt'].get('avg_processing_time', 0)
        if stt_avg_time > 3.0:  # > 3 seconds
            recommendations.append({
                "type": "stt_optimization",
                "priority": "high",
                "message": "STT processing time is high. Consider audio compression or shorter chunks.",
                "action": "compress_audio"
            })
    
    # Check AI processing
    if 'ai' in voice_metrics:
        ai_avg_time = voice_metrics['ai'].get('avg_processing_time', 0)
        if ai_avg_time > 5.0:  # > 5 seconds
            recommendations.append({
                "type": "ai_optimization", 
                "priority": "high",
                "message": "AI processing time is high. Consider using Gemini Flash or caching.",
                "action": "use_gemini_flash"
            })
    
    # Check TTS performance
    if 'tts' in voice_metrics:
        tts_avg_time = voice_metrics['tts'].get('avg_processing_time', 0)
        if tts_avg_time > 2.0:  # > 2 seconds
            recommendations.append({
                "type": "tts_optimization",
                "priority": "medium", 
                "message": "TTS processing time is high. Consider async processing or caching.",
                "action": "async_tts"
            })
    
    # Check UI state durations
    if 'processing_stt' in ui_states:
        stt_ui_time = ui_states['processing_stt'].get('avg_duration_ms', 0)
        if stt_ui_time > 4000:  # > 4 seconds
            recommendations.append({
                "type": "ui_optimization",
                "priority": "medium",
                "message": "Users wait too long during STT processing. Add progress indicators.",
                "action": "add_progress_indicator"
            })
    
    return recommendations

# =====================================================
# FRONTEND INTEGRATION EXAMPLES
# =====================================================

"""
Frontend JavaScript Integration Examples:

// 1. UI State Tracking
class VoiceInterviewUI {
    async startUIState(stateType, stateValue, metadata = {}) {
        const response = await fetch('/api/interview/voice/ui-state/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: this.sessionId,
                state_type: stateType,
                state_value: stateValue,
                action: 'start',
                metadata: metadata
            })
        });
        
        const result = await response.json();
        return result.state_id;
    }
    
    async endUIState(stateType, stateId) {
        await fetch('/api/interview/voice/ui-state/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: this.sessionId,
                state_type: stateType,
                state_value: 'ended',
                action: 'end',
                metadata: { state_id: stateId }
            })
        });
    }
    
    async processVoiceMessage(audioBlob) {
        // 1. Start STT processing UI
        const sttStateId = await this.startUIState('processing_stt', 'Đang xử lý giọng nói...');
        
        try {
            // 2. Send audio for STT
            const transcript = await this.sendAudioForSTT(audioBlob);
            
            // 3. End STT, start AI processing
            await this.endUIState('processing_stt', sttStateId);
            const aiStateId = await this.startUIState('processing_ai', 'AI đang suy nghĩ...');
            
            // 4. Send to AI for response
            const aiResponse = await this.sendToAI(transcript);
            
            // 5. End AI, start TTS
            await this.endUIState('processing_ai', aiStateId);
            const ttsStateId = await this.startUIState('processing_tts', 'Đang tạo giọng nói...');
            
            // 6. Generate TTS
            const audioUrl = await this.generateTTS(aiResponse);
            
            // 7. End TTS, start playing
            await this.endUIState('processing_tts', ttsStateId);
            const playStateId = await this.startUIState('playing_audio', 'Đang phát câu trả lời...');
            
            // 8. Play audio
            await this.playAudio(audioUrl);
            
            // 9. End playing
            await this.endUIState('playing_audio', playStateId);
            
        } catch (error) {
            console.error('Voice processing error:', error);
        }
    }
}

// 2. Deferred Evaluation
class InterviewEvaluation {
    async startDeferredEvaluation(sessionId) {
        const response = await fetch(`/api/interview/voice/evaluation/start-deferred/${sessionId}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show evaluation UI
            this.showEvaluationInterface();
            
            // Process all messages for evaluation
            await this.processAllMessagesForEvaluation(sessionId);
        }
    }
    
    async completeEvaluation(sessionId, evaluationResults) {
        const response = await fetch('/api/interview/voice/evaluation/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                evaluation_results: evaluationResults
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show final results
            this.showFinalResults(result);
        }
    }
}

// 3. Hide Chatbot in Voice Mode
class InterviewModeManager {
    setMode(mode) {
        const chatbotComponent = document.getElementById('ai-chatbot');
        
        if (mode === 'voice') {
            // Hide chatbot in voice mode
            chatbotComponent.style.display = 'none';
            
            // Show voice-specific UI
            this.showVoiceInterface();
            
        } else if (mode === 'text') {
            // Show chatbot in text mode
            chatbotComponent.style.display = 'block';
            
            // Hide voice-specific UI
            this.hideVoiceInterface();
        }
    }
}
"""