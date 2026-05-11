"""
Voice Performance Metrics Model - Theo dõi hiệu suất xử lý voice
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.db import Base


class VoicePerformanceMetrics(Base):
    """
    Model cho bảng interview.voice_performance_metrics
    Theo dõi hiệu suất các giai đoạn xử lý voice (STT, AI, TTS)
    """
    __tablename__ = "voice_performance_metrics"
    __table_args__ = {"schema": "interview"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(Integer, ForeignKey("interview.interview_sessions.id", ondelete="CASCADE"))
    stage = Column(String(20), nullable=False)  # stt, ai, tts, total
    processing_time = Column(Float, nullable=False)  # Processing time in seconds
    input_size = Column(Integer)  # Input size (bytes for audio, characters for text)
    output_size = Column(Integer)  # Output size (bytes for audio, characters for text)
    success = Column(Boolean, nullable=False, default=True)  # Whether processing succeeded
    error_message = Column(Text)  # Error message if failed
    metadata_json = Column(JSONB, nullable=False, default=dict)  # Additional metadata
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())

    # Relationships
    # session = relationship("InterviewSession", back_populates="performance_metrics")

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "session_id": self.session_id,
            "stage": self.stage,
            "processing_time": self.processing_time,
            "input_size": self.input_size,
            "output_size": self.output_size,
            "success": self.success,
            "error_message": self.error_message,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def create_metric(
        cls,
        session_id: int,
        stage: str,
        processing_time: float,
        input_size: int = None,
        output_size: int = None,
        success: bool = True,
        error_message: str = None,
            metadata: dict = None
    ):
        """
        Create a new performance metric entry
        
        Args:
            session_id: Interview session ID
            stage: Processing stage (stt, ai, tts, total)
            processing_time: Time taken in seconds
            input_size: Input size in bytes/characters
            output_size: Output size in bytes/characters
            success: Whether processing succeeded
            error_message: Error message if failed
            metadata: Additional metadata
            
        Returns:
            VoicePerformanceMetrics instance
        """
        return cls(
            session_id=session_id,
            stage=stage,
            processing_time=processing_time,
            input_size=input_size,
            output_size=output_size,
            success=success,
            error_message=error_message,
            metadata_json=metadata or {}
        )

    def get_performance_summary(self):
        """Get performance summary for this metric"""
        return {
            "stage": self.stage,
            "processing_time": self.processing_time,
            "success": self.success,
            "throughput": self.calculate_throughput(),
            "error": self.error_message if not self.success else None,
        }

    def calculate_throughput(self):
        """Calculate throughput (items/second)"""
        if not self.processing_time or self.processing_time <= 0:
            return 0
            
        if self.stage == "stt" and self.input_size:
            # Audio bytes per second
            return self.input_size / self.processing_time
        elif self.stage == "ai" and self.input_size:
            # Characters per second
            return self.input_size / self.processing_time
        elif self.stage == "tts" and self.output_size:
            # Audio bytes per second
            return self.output_size / self.processing_time
        else:
            return 0

    @staticmethod
    def get_stage_order():
        """Get the order of processing stages"""
        return ["stt", "ai", "tts", "total"]

    @staticmethod
    def is_valid_stage(stage: str) -> bool:
        """Check if stage is valid"""
        return stage in ["stt", "ai", "tts", "total"]