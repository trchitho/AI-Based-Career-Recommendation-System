"""
Database models for AI Mock Interview feature
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from ...core.db import Base


class InterviewSession(Base):
    """Phiên phỏng vấn AI"""

    __tablename__ = "interview_sessions"
    __table_args__ = {"schema": "interview"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)  # References core.users.id
    job_id = Column(String, nullable=False)  # O*NET code từ Neo4j
    job_title = Column(String, nullable=False)

    # Session configuration
    question_count = Column(Integer, default=5)  # Total number of questions
    question_distribution = Column(JSON, nullable=True)  # Distribution by type

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
    key_strengths = Column(JSON, nullable=True)
    key_weaknesses = Column(JSON, nullable=True)
    skill_gaps = Column(JSON, nullable=True)
    learning_recommendations = Column(JSON, nullable=True)

    # Context data
    skills_context = Column(JSON, nullable=True)  # Skills từ Neo4j
    market_context = Column(JSON, nullable=True)  # Market demand info


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
    skills_tested = Column(JSON, nullable=True)  # List of skills being tested

    # Answer evaluation (for candidate messages)
    score = Column(Float, nullable=True)
    detailed_scores = Column(JSON, nullable=True)
    feedback = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    suggestion = Column(Text, nullable=True)

    # Audio support
    has_audio = Column(Boolean, default=False)
    audio_duration = Column(Float, nullable=True)  # seconds


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
    expected_keywords = Column(JSON, nullable=True)  # Keywords to look for in answers
    scoring_rubric = Column(JSON, nullable=True)  # Detailed scoring criteria

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
    user_id = Column(Integer, nullable=False)  # References core.users.id

    # Feedback ratings (1-5 scale)
    question_quality = Column(Integer, nullable=True)
    ai_accuracy = Column(Integer, nullable=True)
    overall_experience = Column(Integer, nullable=True)

    # Text feedback
    comments = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)

    # Metadata
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
    market_context JSONB
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

-- Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_job_id ON interview.interview_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id ON interview.interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_messages_role ON interview.interview_messages(role);
CREATE INDEX IF NOT EXISTS idx_interview_templates_job_id ON interview.interview_templates(job_id);
"""
