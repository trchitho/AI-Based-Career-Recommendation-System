"""
Voice Preferences Model - Lưu trữ cài đặt giọng nói của user
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.db import Base


class VoicePreference(Base):
    """
    Model cho bảng interview.voice_preferences
    Lưu trữ cài đặt giọng nói cá nhân của từng user
    """
    __tablename__ = "voice_preferences"
    __table_args__ = {"schema": "interview"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, nullable=False, unique=True)  # Remove ForeignKey constraint from code
    preferred_voice = Column(String(10), nullable=False, default="female")  # male/female
    voice_rate = Column(String(10), nullable=False, default="+0%")  # +/-20%
    voice_pitch = Column(String(10), nullable=False, default="+0Hz")  # +/-50Hz
    voice_volume = Column(Float, nullable=False, default=1.0)  # 0.0-2.0
    language = Column(String(10), nullable=False, default="vi-VN")  # vi-VN, en-US
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    # user = relationship("User", back_populates="voice_preference")

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "preferred_voice": self.preferred_voice,
            "voice_rate": self.voice_rate,
            "voice_pitch": self.voice_pitch,
            "voice_volume": self.voice_volume,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_voice_settings(self):
        """Get voice settings in format suitable for TTS services"""
        return {
            "voice_type": self.preferred_voice,
            "rate": self.voice_rate,
            "pitch": self.voice_pitch,
            "volume": self.voice_volume,
            "language": self.language,
        }

    @classmethod
    def get_default_settings(cls):
        """Get default voice settings"""
        return {
            "preferred_voice": "female",
            "voice_rate": "+0%",
            "voice_pitch": "+0Hz",
            "voice_volume": 1.0,
            "language": "vi-VN",
        }