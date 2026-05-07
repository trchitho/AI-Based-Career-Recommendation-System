"""
Audio Cache Model - Cache TTS audio files để tối ưu hiệu suất
"""
from sqlalchemy import Column, String, BigInteger, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import hashlib

from app.core.db import Base


class AudioCache(Base):
    """
    Model cho bảng interview.audio_cache
    Cache audio files từ TTS để tránh tạo lại audio cho cùng nội dung
    """
    __tablename__ = "audio_cache"
    __table_args__ = {"schema": "interview"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_hash = Column(String(64), nullable=False, unique=True)  # SHA256 hash của text + voice settings
    voice_type = Column(String(20), nullable=False)  # female, male, gtts-vi, pyttsx3-female, etc.
    voice_model = Column(String(100), nullable=False)  # vi-VN-HoaiMyNeural, gtts-vi-enhanced, etc.
    audio_url = Column(String(500), nullable=False)  # URL to cached audio file
    file_size_bytes = Column(BigInteger)  # File size in bytes
    duration_seconds = Column(Float)  # Audio duration
    word_timestamps = Column(JSONB)  # Word timestamps for karaoke effect
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    last_accessed = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    access_count = Column(Integer, nullable=False, default=1)

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "content_hash": self.content_hash,
            "voice_type": self.voice_type,
            "voice_model": self.voice_model,
            "audio_url": self.audio_url,
            "file_size_bytes": self.file_size_bytes,
            "duration_seconds": self.duration_seconds,
            "word_timestamps": self.word_timestamps,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None,
            "access_count": self.access_count,
        }

    @staticmethod
    def generate_content_hash(text: str, voice_settings: dict) -> str:
        """
        Generate SHA256 hash for text + voice settings combination
        
        Args:
            text: Text content to be synthesized
            voice_settings: Voice settings (type, rate, pitch, etc.)
            
        Returns:
            SHA256 hash string
        """
        # Create consistent string from text + settings
        settings_str = f"{voice_settings.get('voice_type', 'female')}_" \
                      f"{voice_settings.get('rate', '+0%')}_" \
                      f"{voice_settings.get('pitch', '+0Hz')}_" \
                      f"{voice_settings.get('volume', 1.0)}_" \
                      f"{voice_settings.get('language', 'vi-VN')}"
        
        content = f"{text}_{settings_str}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def update_access(self):
        """Update last_accessed and increment access_count"""
        self.last_accessed = func.now()
        self.access_count += 1

    @classmethod
    def is_cache_valid(cls, created_at, ttl_hours=24):
        """
        Check if cache entry is still valid
        
        Args:
            created_at: Creation timestamp
            ttl_hours: Time to live in hours
            
        Returns:
            Boolean indicating if cache is valid
        """
        from datetime import datetime, timedelta
        
        if not created_at:
            return False
            
        expiry_time = created_at + timedelta(hours=ttl_hours)
        return datetime.utcnow() < expiry_time