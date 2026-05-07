"""
Audio Cache Service - Quản lý cache audio files từ TTS
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta

from app.models.audio_cache import AudioCache
from app.core.db import get_db


class AudioCacheService:
    """Service để quản lý audio cache"""

    def __init__(self, db: Session):
        self.db = db
        self.default_ttl_hours = 24  # Cache TTL: 24 hours

    def get_cached_audio(
        self,
        text: str,
        voice_settings: Dict[str, Any]
    ) -> Optional[AudioCache]:
        """
        Tìm audio đã cache cho text và voice settings
        
        Args:
            text: Text content
            voice_settings: Voice settings dictionary
            
        Returns:
            AudioCache object nếu tìm thấy và còn valid, None nếu không
        """
        content_hash = AudioCache.generate_content_hash(text, voice_settings)
        
        cached_audio = self.db.query(AudioCache).filter(
            AudioCache.content_hash == content_hash
        ).first()
        
        if cached_audio and AudioCache.is_cache_valid(cached_audio.created_at, self.default_ttl_hours):
            # Update access statistics
            cached_audio.update_access()
            self.db.commit()
            return cached_audio
        elif cached_audio:
            # Cache expired, delete it
            self.db.delete(cached_audio)
            self.db.commit()
            
        return None

    def cache_audio(
        self,
        text: str,
        voice_settings: Dict[str, Any],
        audio_url: str,
        voice_model: str,
        file_size_bytes: Optional[int] = None,
        duration_seconds: Optional[float] = None,
        word_timestamps: Optional[List[Dict]] = None
    ) -> AudioCache:
        """
        Cache audio file
        
        Args:
            text: Text content
            voice_settings: Voice settings dictionary
            audio_url: URL to audio file
            voice_model: Voice model used (vi-VN-HoaiMyNeural, gtts-vi-enhanced, etc.)
            file_size_bytes: File size in bytes
            duration_seconds: Audio duration
            word_timestamps: Word timestamps for karaoke effect
            
        Returns:
            AudioCache object
        """
        content_hash = AudioCache.generate_content_hash(text, voice_settings)
        voice_type = voice_settings.get("voice_type", "female")
        
        # Check if already cached
        existing = self.db.query(AudioCache).filter(
            AudioCache.content_hash == content_hash
        ).first()
        
        if existing:
            # Update existing cache
            existing.audio_url = audio_url
            existing.voice_model = voice_model
            existing.file_size_bytes = file_size_bytes
            existing.duration_seconds = duration_seconds
            existing.word_timestamps = word_timestamps
            existing.last_accessed = datetime.utcnow()
            existing.access_count += 1
            self.db.commit()
            return existing
        
        # Create new cache entry
        cached_audio = AudioCache(
            content_hash=content_hash,
            voice_type=voice_type,
            voice_model=voice_model,
            audio_url=audio_url,
            file_size_bytes=file_size_bytes,
            duration_seconds=duration_seconds,
            word_timestamps=word_timestamps
        )
        
        self.db.add(cached_audio)
        self.db.commit()
        self.db.refresh(cached_audio)
        return cached_audio

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Lấy thống kê cache
        
        Returns:
            Dictionary chứa thống kê cache
        """
        total_entries = self.db.query(AudioCache).count()
        
        # Count by voice type
        voice_type_stats = self.db.query(
            AudioCache.voice_type,
            self.db.func.count(AudioCache.id).label('count')
        ).group_by(AudioCache.voice_type).all()
        
        # Calculate total file size
        total_size = self.db.query(
            self.db.func.sum(AudioCache.file_size_bytes)
        ).scalar() or 0
        
        # Get most accessed entries
        popular_entries = self.db.query(AudioCache).order_by(
            desc(AudioCache.access_count)
        ).limit(5).all()
        
        return {
            "total_entries": total_entries,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "voice_type_distribution": {vt: count for vt, count in voice_type_stats},
            "most_popular": [
                {
                    "content_hash": entry.content_hash[:16] + "...",
                    "voice_type": entry.voice_type,
                    "access_count": entry.access_count,
                    "duration_seconds": entry.duration_seconds
                }
                for entry in popular_entries
            ]
        }

    def cleanup_expired_cache(self, ttl_hours: Optional[int] = None) -> int:
        """
        Xóa các cache entries đã hết hạn
        
        Args:
            ttl_hours: Time to live in hours (default: self.default_ttl_hours)
            
        Returns:
            Số lượng entries đã xóa
        """
        if ttl_hours is None:
            ttl_hours = self.default_ttl_hours
            
        expiry_time = datetime.utcnow() - timedelta(hours=ttl_hours)
        
        expired_entries = self.db.query(AudioCache).filter(
            AudioCache.created_at < expiry_time
        ).all()
        
        count = len(expired_entries)
        
        for entry in expired_entries:
            self.db.delete(entry)
            
        self.db.commit()
        return count

    def cleanup_least_used_cache(self, keep_count: int = 1000) -> int:
        """
        Xóa các cache entries ít được sử dụng nhất
        
        Args:
            keep_count: Số lượng entries muốn giữ lại
            
        Returns:
            Số lượng entries đã xóa
        """
        total_count = self.db.query(AudioCache).count()
        
        if total_count <= keep_count:
            return 0
            
        # Get entries to delete (least accessed, oldest first)
        entries_to_delete = self.db.query(AudioCache).order_by(
            AudioCache.access_count.asc(),
            AudioCache.last_accessed.asc()
        ).offset(keep_count).all()
        
        count = len(entries_to_delete)
        
        for entry in entries_to_delete:
            self.db.delete(entry)
            
        self.db.commit()
        return count

    def get_cache_by_hash(self, content_hash: str) -> Optional[AudioCache]:
        """
        Lấy cache entry theo content hash
        
        Args:
            content_hash: Content hash
            
        Returns:
            AudioCache object hoặc None
        """
        return self.db.query(AudioCache).filter(
            AudioCache.content_hash == content_hash
        ).first()

    def delete_cache_entry(self, content_hash: str) -> bool:
        """
        Xóa cache entry theo content hash
        
        Args:
            content_hash: Content hash
            
        Returns:
            True nếu xóa thành công, False nếu không tìm thấy
        """
        entry = self.get_cache_by_hash(content_hash)
        
        if entry:
            self.db.delete(entry)
            self.db.commit()
            return True
            
        return False


# Dependency injection helper
def get_audio_cache_service(db: Session = None) -> AudioCacheService:
    """Get AudioCacheService instance with database session"""
    if db is None:
        db = next(get_db())
    return AudioCacheService(db)