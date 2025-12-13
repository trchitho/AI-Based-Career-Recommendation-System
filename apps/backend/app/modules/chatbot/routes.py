from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging
import time
from sqlalchemy.orm import Session

from .gemini_service import GeminiChatbotService
from .chat_service import ChatHistoryService
from ...core.jwt import require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

def _db(req: Request) -> Session:
    return req.state.db

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None
    session_id: Optional[int] = None

class NewSessionRequest(BaseModel):
    title: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    title: str

class CareerAdviceRequest(BaseModel):
    skills: List[str] = []
    interests: List[str] = []
    experience: str = ""
    education: str = ""

class SkillDevelopmentRequest(BaseModel):
    current_skills: List[str]
    target_job: str

class JobMarketAnalysisRequest(BaseModel):
    job_title: str
    location: str = "Việt Nam"

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    success: bool = True
    session_id: Optional[int] = None
    message_id: Optional[int] = None
    response_time_ms: Optional[int] = None

@router.post("/chat", response_model=ChatResponse)
def chat_with_bot(
    request: Request,
    chat_message: ChatMessage
):
    """Chat với Gemini chatbot và lưu lịch sử"""
    try:
        logger.info(f"Chat endpoint called with message: {chat_message.message[:50]}...")
        
        # Xác thực user
        try:
            user_id = require_user(request)
            logger.info(f"User authenticated: {user_id}")
        except Exception as auth_error:
            logger.error(f"Authentication failed: {str(auth_error)}")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get database session
        try:
            db = _db(request)
            logger.info("Database session obtained")
        except Exception as db_error:
            logger.error(f"Database session failed: {str(db_error)}")
            raise HTTPException(status_code=500, detail="Database connection error")
        
        # Đo thời gian phản hồi
        start_time = time.time()
        
        # Tạo services
        try:
            gemini_service = GeminiChatbotService()
            chat_service = ChatHistoryService(db)
            logger.info("Services created successfully")
        except Exception as service_error:
            logger.error(f"Service creation failed: {str(service_error)}")
            raise HTTPException(status_code=500, detail="Service initialization error")
        
        # Tạo phản hồi từ AI
        try:
            response = gemini_service.generate_response(
                chat_message.message, 
                chat_message.context
            )
            logger.info(f"AI response generated: {len(response)} characters")
        except Exception as ai_error:
            logger.error(f"AI response failed: {str(ai_error)}")
            # Use fallback response
            response = "Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau."
        
        # Tính thời gian phản hồi
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Lưu vào database
        try:
            saved_message = chat_service.save_message_and_response(
                user_id=user_id,
                message=chat_message.message,
                response=response,
                message_type="text",
                response_time_ms=response_time_ms,
                session_id=chat_message.session_id
            )
            logger.info(f"Message saved: session {saved_message['session_id']}, message {saved_message['id']}")
        except Exception as save_error:
            logger.error(f"Database save failed: {str(save_error)}")
            # Continue without saving to database
            saved_message = {"session_id": None, "id": None}
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat(),
            success=True,
            session_id=saved_message["session_id"],
            message_id=saved_message["id"],
            response_time_ms=response_time_ms
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Lỗi hệ thống, vui lòng thử lại sau")

@router.post("/career-advice", response_model=ChatResponse)
def get_career_advice(
    request: Request,
    advice_request: CareerAdviceRequest
):
    """Lấy lời khuyên nghề nghiệp cá nhân hóa"""
    try:
        user_id = require_user(request)  # Xác thực user
        logger.info(f"User {user_id} requested career advice")
        
        gemini_service = GeminiChatbotService()
        user_profile = {
            'skills': advice_request.skills,
            'interests': advice_request.interests,
            'experience': advice_request.experience,
            'education': advice_request.education
        }
        
        advice = gemini_service.get_career_advice(user_profile)
        
        return ChatResponse(
            response=advice,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    except Exception as e:
        logger.error(f"Error in career advice endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống, vui lòng thử lại sau")

@router.post("/skill-development", response_model=ChatResponse)
def get_skill_development_plan(
    request: Request,
    skill_request: SkillDevelopmentRequest
):
    """Lấy kế hoạch phát triển kỹ năng"""
    try:
        user_id = require_user(request)  # Xác thực user
        logger.info(f"User {user_id} requested skill development plan for {skill_request.target_job}")
        
        gemini_service = GeminiChatbotService()
        plan = gemini_service.get_skill_development_plan(
            skill_request.current_skills,
            skill_request.target_job
        )
        
        return ChatResponse(
            response=plan,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    except Exception as e:
        logger.error(f"Error in skill development endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống, vui lòng thử lại sau")

@router.post("/job-market-analysis", response_model=ChatResponse)
def analyze_job_market(
    request: Request,
    market_request: JobMarketAnalysisRequest
):
    """Phân tích thị trường việc làm"""
    try:
        user_id = require_user(request)  # Xác thực user
        logger.info(f"User {user_id} requested job market analysis for {market_request.job_title}")
        
        gemini_service = GeminiChatbotService()
        analysis = gemini_service.analyze_job_market(
            market_request.job_title,
            market_request.location
        )
        
        return ChatResponse(
            response=analysis,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    except Exception as e:
        logger.error(f"Error in job market analysis endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống, vui lòng thử lại sau")

@router.post("/test-chat")
def test_chat_no_auth(chat_message: ChatMessage):
    """Test chat endpoint without authentication for debugging"""
    try:
        logger.info(f"Test message: {chat_message.message[:50]}...")
        
        gemini_service = GeminiChatbotService()
        response = gemini_service.generate_response(
            chat_message.message, 
            chat_message.context
        )
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    except Exception as e:
        logger.error(f"Error in test chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

# === CHAT HISTORY ENDPOINTS ===

@router.get("/sessions")
def get_chat_sessions(request: Request):
    """Lấy danh sách session chat của user"""
    try:
        user_id = require_user(request)
        db = _db(request)
        
        chat_service = ChatHistoryService(db)
        sessions = chat_service.get_user_sessions(user_id)
        
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi khi lấy lịch sử chat")

@router.post("/sessions/new")
def create_new_session(request: Request, session_request: NewSessionRequest):
    """Tạo session chat mới"""
    try:
        user_id = require_user(request)
        db = _db(request)
        
        chat_service = ChatHistoryService(db)
        session = chat_service.create_new_session(user_id, session_request.title)
        
        return {
            "session_id": session["id"],
            "title": session["title"],
            "created_at": session["created_at"].isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating new session: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi khi tạo cuộc trò chuyện mới")

@router.get("/sessions/{session_id}/messages")
def get_session_messages(request: Request, session_id: int):
    """Lấy tất cả tin nhắn trong một session"""
    try:
        user_id = require_user(request)
        db = _db(request)
        
        chat_service = ChatHistoryService(db)
        messages = chat_service.get_session_messages(session_id, user_id)
        
        return {
            "session_id": session_id,
            "messages": messages,
            "total": len(messages)
        }
    except Exception as e:
        logger.error(f"Error getting session messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi khi lấy tin nhắn")

@router.put("/sessions/{session_id}/title")
def update_session_title(request: Request, session_id: int, update_request: UpdateSessionRequest):
    """Cập nhật tiêu đề session"""
    try:
        user_id = require_user(request)
        db = _db(request)
        
        chat_service = ChatHistoryService(db)
        success = chat_service.update_session_title(session_id, user_id, update_request.title)
        
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")
        
        return {"success": True, "message": "Đã cập nhật tiêu đề"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session title: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi khi cập nhật tiêu đề")

@router.delete("/sessions/{session_id}")
def delete_session(request: Request, session_id: int):
    """Xóa một session chat"""
    try:
        user_id = require_user(request)
        db = _db(request)
        
        chat_service = ChatHistoryService(db)
        success = chat_service.delete_session(session_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")
        
        return {"success": True, "message": "Đã xóa cuộc trò chuyện"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi khi xóa cuộc trò chuyện")

@router.get("/health")
def chatbot_health_check():
    """Health check cho chatbot service"""
    try:
        # Test Gemini service
        gemini_service = GeminiChatbotService()
        test_response = gemini_service.generate_response("Hello")
        
        return {
            "status": "healthy",
            "gemini_api": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Chatbot health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }