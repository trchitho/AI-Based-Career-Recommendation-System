"""
Voice Preferences Service - Quản lý cài đặt giọng nói của user
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.voice_preferences import VoicePreference
from app.core.db import get_db


class VoicePreferencesService:
    """Service để quản lý voice preferences của user"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_preferences(self, user_id: int) -> Optional[VoicePreference]:
        """
        Lấy voice preferences của user
        
        Args:
            user_id: ID của user
            
        Returns:
            VoicePreference object hoặc None nếu không tìm thấy
        """
        return self.db.query(VoicePreference).filter(
            VoicePreference.user_id == user_id
        ).first()

    def get_or_create_preferences(self, user_id: int) -> VoicePreference:
        """
        Lấy hoặc tạo voice preferences cho user
        
        Args:
            user_id: ID của user
            
        Returns:
            VoicePreference object
        """
        preferences = self.get_user_preferences(user_id)
        
        if not preferences:
            preferences = self.create_default_preferences(user_id)
            
        return preferences

    def create_default_preferences(self, user_id: int) -> VoicePreference:
        """
        Tạo voice preferences mặc định cho user
        
        Args:
            user_id: ID của user
            
        Returns:
            VoicePreference object
        """
        default_settings = VoicePreference.get_default_settings()
        
        preferences = VoicePreference(
            user_id=user_id,
            **default_settings
        )
        
        try:
            self.db.add(preferences)
            self.db.commit()
            self.db.refresh(preferences)
            return preferences
        except IntegrityError:
            self.db.rollback()
            # User preferences might already exist, try to get it
            return self.get_user_preferences(user_id)

    def update_preferences(
        self,
        user_id: int,
        preferred_voice: Optional[str] = None,
        voice_rate: Optional[str] = None,
        voice_pitch: Optional[str] = None,
        voice_volume: Optional[float] = None,
        language: Optional[str] = None
    ) -> VoicePreference:
        """
        Cập nhật voice preferences của user
        
        Args:
            user_id: ID của user
            preferred_voice: Loại giọng nói (male/female)
            voice_rate: Tốc độ giọng nói (+/-20%)
            voice_pitch: Cao độ giọng nói (+/-50Hz)
            voice_volume: Âm lượng (0.0-2.0)
            language: Ngôn ngữ (vi-VN, en-US)
            
        Returns:
            VoicePreference object đã cập nhật
        """
        preferences = self.get_or_create_preferences(user_id)
        
        # Update only provided fields
        if preferred_voice is not None:
            preferences.preferred_voice = preferred_voice
        if voice_rate is not None:
            preferences.voice_rate = voice_rate
        if voice_pitch is not None:
            preferences.voice_pitch = voice_pitch
        if voice_volume is not None:
            preferences.voice_volume = voice_volume
        if language is not None:
            preferences.language = language

        self.db.commit()
        self.db.refresh(preferences)
        return preferences

    def get_voice_settings_for_tts(self, user_id: int) -> Dict[str, Any]:
        """
        Lấy voice settings trong format phù hợp cho TTS services
        
        Args:
            user_id: ID của user
            
        Returns:
            Dictionary chứa voice settings
        """
        preferences = self.get_or_create_preferences(user_id)
        return preferences.get_voice_settings()

    def delete_preferences(self, user_id: int) -> bool:
        """
        Xóa voice preferences của user
        
        Args:
            user_id: ID của user
            
        Returns:
            True nếu xóa thành công, False nếu không tìm thấy
        """
        preferences = self.get_user_preferences(user_id)
        
        if preferences:
            self.db.delete(preferences)
            self.db.commit()
            return True
            
        return False

    def validate_voice_settings(self, settings: Dict[str, Any]) -> Dict[str, str]:
        """
        Validate voice settings
        
        Args:
            settings: Dictionary chứa voice settings
            
        Returns:
            Dictionary chứa các lỗi validation (empty nếu hợp lệ)
        """
        errors = {}
        
        # Validate preferred_voice
        if "preferred_voice" in settings:
            if settings["preferred_voice"] not in ["male", "female"]:
                errors["preferred_voice"] = "Must be 'male' or 'female'"
        
        # Validate voice_volume
        if "voice_volume" in settings:
            volume = settings["voice_volume"]
            if not isinstance(volume, (int, float)) or volume < 0.0 or volume > 2.0:
                errors["voice_volume"] = "Must be a number between 0.0 and 2.0"
        
        # Validate language
        if "language" in settings:
            if settings["language"] not in ["vi-VN", "en-US"]:
                errors["language"] = "Must be 'vi-VN' or 'en-US'"
        
        return errors


# Dependency injection helper
def get_voice_preferences_service(db: Session = None) -> VoicePreferencesService:
    """Get VoicePreferencesService instance with database session"""
    if db is None:
        db = next(get_db())
    return VoicePreferencesService(db)