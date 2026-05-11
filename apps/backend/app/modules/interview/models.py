"""
Database models for AI Mock Interview feature
"""

from datetime import datetime
import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, BigInteger, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ...core.db import Base


class InterviewSession(Base):
    """Phiên phỏng vấn AI"""

    __tablename__ = "interview_sessions"
    __table_args__ = (
        CheckConstraint("question_count >= 1 AND question_count <= 25", name="chk_question_count_range"),
        CheckConstraint("interview_mode IN ('text', 'voice')", name="chk_interview_mode"),
        CheckConstraint("tab_switch_count >= 0 AND tab_switch_count <= 10", name="chk_tab_switch_count"),
        {"schema": "interview"},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)  # References core.users.id
    job_id = Column(String, nullable=False)  # O*NET code từ Neo4j
    job_title = Column(String, nullable=False)

    # Session configuration
    question_count = Column(Integer, default=5)  # Total number of questions
    question_distribution = Column(JSONB, nullable=True)  # Distribution by type

    # Session info
    status = Column(String, default="active")  # active, completed, abandoned
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Scores
    overall_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    logic_score = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    attitude_score = Column(Float, nullable=True)

    # Results
    recommendation = Column(String, nullable=True)  # PASS, CONDITIONAL_PASS, FAIL
    summary = Column(Text, nullable=True)
    key_strengths = Column(JSONB, nullable=True)
    key_weaknesses = Column(JSONB, nullable=True)
    skill_gaps = Column(JSONB, nullable=True)
    learning_recommendations = Column(JSONB, nullable=True)

    # Context data
    skills_context = Column(JSONB, nullable=True)  # Skills từ Neo4j
    market_context = Column(JSONB, nullable=True)  # Market demand info

    # Voice interview support
    tab_switch_count = Column(Integer, default=0)  # Số lần chuyển tab (voice interview rules)
    interview_mode = Column(String(10), default="text")  # 'text' hoặc 'voice'
    voice_type = Column(String(10), default="female")    # 'male' | 'female'
    voice_settings = Column(JSONB, nullable=True)        # Additional voice settings
    processing_metrics = Column(JSONB, nullable=True)    # Performance metrics
    conversation_metadata = Column(JSONB, nullable=True) # Extra metadata


class InterviewMessage(Base):
    """Tin nhắn trong phiên phỏng vấn"""

    __tablename__ = "interview_messages"
    __table_args__ = {"schema": "interview"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, nullable=False)  # References interview.interview_sessions.id

    # Message info
    role = Column(String, nullable=False)  # 'interviewer', 'candidate'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Question metadata (for interviewer messages)
    question_type = Column(String, nullable=True)  # warm_up, technical, behavioral, closing
    question_number = Column(Integer, nullable=True)
    skills_tested = Column(JSONB, nullable=True)  # List of skills being tested

    # Answer evaluation (for candidate messages)
    score = Column(Float, nullable=True)
    detailed_scores = Column(JSONB, nullable=True)
    feedback = Column(Text, nullable=True)
    strengths = Column(JSONB, nullable=True)
    weaknesses = Column(JSONB, nullable=True)
    suggestion = Column(Text, nullable=True)

    # Audio support
    has_audio = Column(Boolean, default=False)
    audio_duration = Column(Float, nullable=True)  # seconds
    voice_type = Column(String(10), nullable=True)   # 'male' | 'female'
    processing_time = Column(Float, nullable=True)   # TTS/STT processing time
    word_timestamps = Column(JSONB, nullable=True)   # Word-level timestamps for karaoke
    order_index = Column(Integer, default=0)         # Message order within session


class InterviewTemplate(Base):
    """Template câu hỏi phỏng vấn theo nghề nghiệp"""

    __tablename__ = "interview_templates"
    __table_args__ = {"schema": "interview"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, nullable=False)  # O*NET code
    job_title = Column(String, nullable=False)

    # Template info
    question_type = Column(String, nullable=False)  # technical, behavioral, situational
    skill_category = Column(String, nullable=False)  # specific skill being tested
    difficulty_level = Column(String, default="medium")  # easy, medium, hard

    # Question content
    question_template = Column(Text, nullable=False)
    expected_keywords = Column(JSONB, nullable=True)  # Keywords to look for in answers
    scoring_rubric = Column(JSONB, nullable=True)  # Detailed scoring criteria

    # Usage stats
    usage_count = Column(Integer, default=0)
    avg_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterviewFeedback(Base):
    """Feedback từ người dùng về chất lượng phỏng vấn"""

    __tablename__ = "interview_feedback"
    __table_args__ = {"schema": "interview"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview.interview_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)

    # Feedback ratings (1-5 scale)
    question_quality = Column(Integer, nullable=True)
    ai_accuracy = Column(Integer, nullable=True)
    overall_experience = Column(Integer, nullable=True)

    # Text feedback
    comments = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)


class JobDescription(Base):
    """JD do user upload hoặc nhập tay trước phỏng vấn"""
    __tablename__ = "job_descriptions"
    __table_args__ = {"schema": "interview"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    career_id = Column(String, nullable=True)   # onet_code, nullable vì user có thể chưa chọn
    raw_text = Column(Text, nullable=False)
    extracted_data = Column(JSONB, nullable=True)  # parsed JSON từ AI
    source = Column(String, default="manual")     # "manual" | "pdf" | "docx"
    created_at = Column(DateTime, default=datetime.utcnow)


class InterviewAudio(Base):
    """Audio files cho voice interview"""
    
    __tablename__ = "interview_audio"
    __table_args__ = (
        CheckConstraint("audio_type IN ('user_answer', 'ai_question')", name="chk_audio_type"),
        {"schema": "interview"},
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(Integer, ForeignKey("interview.interview_sessions.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(Integer, ForeignKey("interview.interview_messages.id", ondelete="SET NULL"), nullable=True)
    
    # Audio metadata
    audio_type = Column(String(20), nullable=False)  # 'user_answer' | 'ai_question'
    file_url = Column(Text, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    transcript = Column(Text, nullable=True)  # Chỉ cho user_answer
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


# SQL để tạo schema và tables
CREATE_SCHEMA_SQL = """
-- Tạo schema interview nếu chưa có
CREATE SCHEMA IF NOT EXISTS interview;

-- Tạo bảng interview_sessions
CREATE TABLE IF NOT EXISTS interview.interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id),
    job_id VARCHAR NOT NULL,
    job_title VARCHAR NOT NULL,
    
    question_count INTEGER DEFAULT 5,
    question_distribution JSONB,
    
    status VARCHAR DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    overall_score FLOAT,
    technical_score FLOAT,
    communication_score FLOAT,
    logic_score FLOAT,
    experience_score FLOAT,
    attitude_score FLOAT,
    
    recommendation VARCHAR,
    summary TEXT,
    key_strengths JSONB,
    key_weaknesses JSONB,
    skill_gaps JSONB,
    learning_recommendations JSONB,
    
    skills_context JSONB,
    market_context JSONB,
    
    -- Voice interview support
    tab_switch_count INTEGER DEFAULT 0,
    interview_mode VARCHAR(10) DEFAULT 'text',
    
    CONSTRAINT chk_interview_mode CHECK (interview_mode IN ('text', 'voice')),
    CONSTRAINT chk_tab_switch_count CHECK (tab_switch_count >= 0 AND tab_switch_count <= 10)
);

-- Tạo bảng interview_messages
CREATE TABLE IF NOT EXISTS interview.interview_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES interview.interview_sessions(id) ON DELETE CASCADE,
    
    role VARCHAR NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    question_type VARCHAR,
    question_number INTEGER,
    skills_tested JSONB,
    
    score FLOAT,
    detailed_scores JSONB,
    feedback TEXT,
    strengths JSONB,
    weaknesses JSONB,
    suggestion TEXT,
    
    has_audio BOOLEAN DEFAULT FALSE,
    audio_duration FLOAT
);

-- Tạo bảng interview_audio cho voice interview
CREATE TABLE IF NOT EXISTS interview.interview_audio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id INTEGER NOT NULL REFERENCES interview.interview_sessions(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES interview.interview_messages(id) ON DELETE SET NULL,
    
    audio_type VARCHAR(20) NOT NULL CHECK (audio_type IN ('user_answer', 'ai_question')),
    file_url TEXT NOT NULL,
    duration_seconds FLOAT,
    file_size_bytes BIGINT,
    transcript TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng interview_templates
CREATE TABLE IF NOT EXISTS interview.interview_templates (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR NOT NULL,
    job_title VARCHAR NOT NULL,
    
    question_type VARCHAR NOT NULL,
    skill_category VARCHAR NOT NULL,
    difficulty_level VARCHAR DEFAULT 'medium',
    
    question_template TEXT NOT NULL,
    expected_keywords JSONB,
    scoring_rubric JSONB,
    
    usage_count INTEGER DEFAULT 0,
    avg_score FLOAT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng interview_feedback
CREATE TABLE IF NOT EXISTS interview.interview_feedback (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES interview.interview_sessions(id),
    user_id INTEGER NOT NULL REFERENCES core.users(id),
    
    question_quality INTEGER,
    ai_accuracy INTEGER,
    overall_experience INTEGER,
    
    comments TEXT,
    suggestions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng job_descriptions
CREATE TABLE IF NOT EXISTS interview.job_descriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    career_id VARCHAR,
    raw_text TEXT NOT NULL,
    extracted_data JSONB,
    source VARCHAR DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_job_id ON interview.interview_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_mode ON interview.interview_sessions(interview_mode);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_tab_switch ON interview.interview_sessions(tab_switch_count);

CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id ON interview.interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_messages_role ON interview.interview_messages(role);

CREATE INDEX IF NOT EXISTS idx_interview_audio_session_id ON interview.interview_audio(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_audio_type ON interview.interview_audio(audio_type);
CREATE INDEX IF NOT EXISTS idx_interview_audio_created_at ON interview.interview_audio(created_at);

CREATE INDEX IF NOT EXISTS idx_interview_templates_job_id ON interview.interview_templates(job_id);
CREATE INDEX IF NOT EXISTS idx_jd_user_id ON interview.job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_career_id ON interview.job_descriptions(career_id);
"""
