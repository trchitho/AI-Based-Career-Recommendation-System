"""
Pydantic schemas for AI Mock Interview API
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InterviewStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    TERMINATED = "terminated"


class QuestionType(str, Enum):
    GREETING = "greeting"
    WARM_UP = "warm_up"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SITUATIONAL = "situational"
    CLOSING = "closing"
    JD_SPECIFIC = "jd_specific"
    JD_QUALIFICATION = "jd_qualification"


class MessageRole(str, Enum):
    INTERVIEWER = "interviewer"
    CANDIDATE = "candidate"


class Recommendation(str, Enum):
    PASS = "PASS"
    CONDITIONAL_PASS = "CONDITIONAL_PASS"
    FAIL = "FAIL"


# Request Schemas
class StartInterviewRequest(BaseModel):
    job_id: str = Field(..., description="O*NET code của nghề nghiệp")
    question_count: int = Field(default=5, ge=5, le=12, description="Số lượng câu hỏi phỏng vấn (5, 7, 8, 10, 12)")
    jd_id: Optional[int] = Field(None, description="ID của JD đã upload (tùy chọn)")
    level_slug: Optional[str] = Field(None, description="Cấp bậc nghề nghiệp (fresher, junior, middle, senior, lead)")
    # CV-based personalized interview
    skill_gap_analysis_id: Optional[int] = Field(None, description="ID của phân tích CV (skill gap) để tạo phỏng vấn dựa trên CV")

    model_config = {"json_schema_extra": {"example": {"job_id": "15-1252.00", "question_count": 7, "level_slug": "junior"}}}


class SubmitAnswerRequest(BaseModel):
    session_id: int = Field(..., description="ID của phiên phỏng vấn")
    answer: str = Field(default="", description="Câu trả lời của ứng viên")
    has_audio: bool = Field(default=False)
    audio_duration: Optional[float] = Field(None)
    is_skipped: bool = Field(default=False, description="True khi hết giờ tự động bỏ qua")


class InterviewFeedbackRequest(BaseModel):
    session_id: int
    question_quality: int = Field(..., ge=1, le=5, description="Chất lượng câu hỏi (1-5)")
    ai_accuracy: int = Field(..., ge=1, le=5, description="Độ chính xác AI (1-5)")
    overall_experience: int = Field(..., ge=1, le=5, description="Trải nghiệm tổng thể (1-5)")
    comments: Optional[str] = Field(None, description="Nhận xét chi tiết")
    suggestions: Optional[str] = Field(None, description="Đề xuất cải thiện")


# Response Schemas
class DetailedScores(BaseModel):
    technical: Optional[float] = None
    logic: Optional[float] = None
    communication: Optional[float] = None
    experience: Optional[float] = None
    attitude: Optional[float] = None


class LearningRecommendation(BaseModel):
    skill: str = Field(..., description="Tên kỹ năng cần học")
    priority: str = Field(..., description="Mức độ ưu tiên: HIGH/MEDIUM/LOW")
    suggested_courses: List[str] = Field(..., description="Danh sách khóa học đề xuất")
    estimated_time: str = Field(..., description="Thời gian ước tính")


class InterviewMessage(BaseModel):
    id: int
    role: MessageRole
    content: str
    timestamp: datetime
    question_type: Optional[str] = None  # str not enum - allows answer_* values
    question_number: Optional[int] = None
    score: Optional[float] = None
    detailed_scores: Optional[DetailedScores] = None
    feedback: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    suggestion: Optional[str] = None
    skills_tested: Optional[List[str]] = None
    has_audio: bool = False
    audio_duration: Optional[float] = None


class InterviewSessionSummary(BaseModel):
    id: int
    job_title: str
    status: InterviewStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    overall_score: Optional[float] = None
    recommendation: Optional[Recommendation] = None


class InterviewSessionDetail(InterviewSessionSummary):
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    logic_score: Optional[float] = None
    experience_score: Optional[float] = None
    attitude_score: Optional[float] = None
    summary: Optional[str] = None
    key_strengths: Optional[List[str]] = None
    key_weaknesses: Optional[List[str]] = None
    skill_gaps: Optional[List[str]] = None
    # learning_recommendations có thể là List[str] (từ ai_pipeline) hoặc List[LearningRecommendation] (từ services)
    learning_recommendations: Optional[List[Any]] = None
    skills_context: Optional[List[Dict[str, Any]]] = None
    question_count: Optional[int] = None
    question_distribution: Optional[Dict[str, Any]] = None


class StartInterviewResponse(BaseModel):
    session_id: int
    job_title: str
    greeting: str
    first_question: str
    skills_context: List[Dict[str, Any]]
    question_count: int = Field(..., description="Tổng số câu hỏi trong phiên phỏng vấn")
    question_distribution: Dict[str, int] = Field(..., description="Phân bố loại câu hỏi")

    model_config = {
        "json_schema_extra": {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "job_title": "Software Developer",
                "greeting": "Xin chào! Tôi là HR Manager và sẽ phỏng vấn bạn cho vị trí Software Developer...",
                "first_question": "Trước tiên, bạn có thể chia sẻ lý do tại sao bạn quan tâm đến vị trí này không?",
                "skills_context": [
                    {"skill_name": "Python Programming", "skill_type": "Knowledge", "importance": 4.5, "level": 4.0}
                ],
                "question_count": 7,
                "question_distribution": {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 1},
            }
        }
    }


class SubmitAnswerResponse(BaseModel):
    status: str  # "continue", "completed", "guidance_needed", "skipped_guidance"
    evaluation: Optional[Dict[str, Any]] = None  # Đánh giá câu trả lời hiện tại
    next_question: Optional[str] = None
    question_number: Optional[int] = None
    question_type: Optional[QuestionType] = None
    final_summary: Optional[Dict[str, Any]] = None
    
    # New fields for guidance functionality
    message: Optional[str] = None  # Message for guidance cases
    guidance: Optional[Any] = None  # Guidance data (can be string or dict)
    original_question: Optional[str] = None  # Original question for guidance
    can_retry: Optional[bool] = None  # Whether user can retry
    skip_count: Optional[int] = None  # Number of skipped questions
    
    # New fields for skills information
    skills_tested: Optional[List[str]] = None  # Tên các skills được test trong câu hỏi này
    skills_type: Optional[str] = None  # "soft" hoặc "hard" - loại skills được test
    skills_details: Optional[List[Dict[str, Any]]] = None  # Chi tiết đầy đủ về skills
    
    # HR acknowledgment cho jd_qualification và closing
    hr_acknowledgment: Optional[str] = None  # HR phản hồi câu trả lời (jd_qualification) hoặc trả lời câu hỏi (closing)


class InterviewHistoryResponse(BaseModel):
    session: InterviewSessionDetail
    messages: List[InterviewMessage]


class UserInterviewsResponse(BaseModel):
    interviews: List[InterviewSessionSummary]
    total: int
    limit: int
    offset: int
    has_more: bool


class SkillContext(BaseModel):
    skill_name: str
    skill_type: str
    importance: float
    level: float
    is_hard_skill: bool = False


class JobInfo(BaseModel):
    id: str
    title: str
    soft_skills: List[SkillContext] = []
    hard_skills: List[SkillContext] = []
    hard_skills_total: int = 0  # tổng số hard skills trong DB (để biết còn bao nhiêu khi xem thêm)
    soft_skills_total: int = 0  # tổng số soft skills trong DB


# Error Schemas
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "INVALID_SESSION",
                "message": "Phiên phỏng vấn không hợp lệ hoặc đã kết thúc",
                "details": {"session_id": "invalid-id"},
            }
        }
    }


# Statistics Schemas (for admin)
class InterviewStats(BaseModel):
    total_interviews: int
    completed_interviews: int
    average_score: float
    pass_rate: float
    popular_jobs: List[Dict[str, Any]]


class DailyStats(BaseModel):
    date: str
    interviews_count: int
    average_score: float
    completion_rate: float


# ── JD Schemas ──────────────────────────────────────────────────────────────

class JDManualRequest(BaseModel):
    career_id: Optional[str] = Field(None, description="O*NET code (tùy chọn)")
    content: str = Field(..., min_length=50, description="Nội dung JD")

class JDResponse(BaseModel):
    jd_id: int
    career_id: Optional[str]
    extracted_data: Dict[str, Any]
    jd_questions_count: int  # Số câu hỏi về JD (tính động)
    source: str
    created_at: datetime
    skills_context: Optional[List[Dict[str, Any]]] = Field(None, description="Skills context (soft skills từ nghề + hard skills từ JD)")
