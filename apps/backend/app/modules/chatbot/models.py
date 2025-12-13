from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

Base = declarative_base()

class ChatSession(Base):
    """Chat session model - một phiên chat của user"""
    __tablename__ = "chat_sessions"
    __table_args__ = {"schema": "chatbot"}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    title = Column(String(255), nullable=True)  # Tiêu đề tự động từ tin nhắn đầu
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    
    # Relationship
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    """Chat message model - tin nhắn trong phiên chat"""
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "chatbot"}
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chatbot.chat_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("core.users.id"), nullable=False)
    message = Column(Text, nullable=False)  # Tin nhắn của user
    response = Column(Text, nullable=True)  # Phản hồi của AI
    message_type = Column(String(50), default="text")  # text, career-advice, skill-plan, job-analysis
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    response_time_ms = Column(Integer, nullable=True)  # Thời gian phản hồi (ms)
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages")