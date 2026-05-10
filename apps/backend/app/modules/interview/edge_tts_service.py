"""
Edge TTS Service - Yêu Cầu 4: Text-to-Speech và Đồng Bộ Văn Bản

Tiêu chí 4.1: Chuyển đổi text thành audio với Edge TTS giọng tiếng Việt đã chọn
Tiêu chí 4.2: Trả về audio file MP3/WAV và lưu vào Audio_Storage
Tiêu chí 4.3: Trả về URL audio cùng với question_text trong response API
Tiêu chí 4.8: Hỗ trợ vi-VN-HoaiMyNeural (nữ) và vi-VN-NamMinhNeural (nam)

CRITICAL FIX: Handle 403 errors with retry logic and fallback mechanisms
ENHANCED: Integrated with audio cache and performance metrics
"""

from typing import Optional, Dict, Any, List
import asyncio
import random
import time

import edge_tts
from loguru import logger

from app.modules.interview.audio_storage_service import audio_storage_service
from app.services.audio_cache_service import get_audio_cache_service
from app.services.voice_performance_service import get_voice_performance_service


class EdgeTTSService:
    """
    TTS Service sử dụng Microsoft Edge TTS (miễn phí).

    Tiêu chí 4.8: Hỗ trợ hai giọng tiếng Việt:
    - vi-VN-HoaiMyNeural (female)
    - vi-VN-NamMinhNeural (male)
    
    CRITICAL FIX: Enhanced with 403 error handling and retry logic
    """

    VOICES: Dict[str, str] = {
        "female": "vi-VN-HoaiMyNeural",
        "male":   "vi-VN-NamMinhNeural",
    }
    
    # Fallback voices if Vietnamese voices fail
    FALLBACK_VOICES: Dict[str, str] = {
        "female": "en-US-AriaNeural",
        "male":   "en-US-GuyNeural",
    }

    def __init__(self) -> None:
        self._default_voice = self.VOICES["female"]
        self._retry_count = 0
        self._last_success_time = 0
        self._consecutive_failures = 0  # Track consecutive failures
        self._last_failure_time = 0     # Track when last failure occurred
        self._failure_threshold = 3     # After 3 failures, skip Edge TTS temporarily
        self._cooldown_period = 300     # 5 minutes cooldown after failures
        # Initialize services (will be created when needed)
        self._cache_service = None
        self._performance_service = None

    def _get_cache_service(self):
        """Get audio cache service instance"""
        if self._cache_service is None:
            try:
                self._cache_service = get_audio_cache_service()
            except Exception as e:
                logger.warning(f"[TTS] Could not initialize cache service: {e}")
                self._cache_service = None
        return self._cache_service

    def _get_performance_service(self):
        """Get voice performance service instance"""
        if self._performance_service is None:
            try:
                self._performance_service = get_voice_performance_service()
            except Exception as e:
                logger.warning(f"[TTS] Could not initialize performance service: {e}")
                self._performance_service = None
        return self._performance_service

    def _record_performance(self, session_id: Optional[str], stage: str, processing_time: float, 
                          success: bool = True, error_message: str = None, metadata: dict = None):
        """Record performance metrics"""
        try:
            if session_id and session_id.isdigit():
                perf_service = self._get_performance_service()
                if perf_service:
                    perf_service.record_performance(
                        session_id=int(session_id),
                        stage=stage,
                        processing_time=processing_time,
                        success=success,
                        error_message=error_message,
                        metadata=metadata or {}
                    )
        except Exception as e:
            logger.warning(f"[TTS] Could not record performance: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def synthesize_text(
        self,
        text: str,
        voice_preference: str = "female",
        session_id: Optional[str] = None,
        message_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Tiêu chí 4.1: Chuyển đổi text thành audio với Edge TTS.
        Tiêu chí 4.2: Lưu audio vào Audio_Storage nếu session_id được cung cấp.
        Tiêu chí 4.3: Trả về audio_url + question_text.
        
        CRITICAL FIX: Enhanced with 403 error handling and retry logic
        ENHANCED: Integrated with audio cache and performance metrics

        Returns:
            {
                audio_data:       bytes,
                audio_url:        str | None,
                duration_seconds: float,
                voice_used:       str,
                question_text:    str,          # Tiêu chí 4.3
                word_timestamps:  list[dict],   # Tiêu chí 4.6 — có thể rỗng
                success:          bool,         # NEW: Success indicator
                fallback_reason:  str | None,   # NEW: Fallback reason if any
            }
        """
        start_time = time.time()
        
        if voice_preference not in self.VOICES:
            raise ValueError(
                f"Invalid voice preference: {voice_preference}. Must be 'male' or 'female'"
            )

        # Check cache first
        voice_settings = {
            "voice_type": voice_preference,
            "rate": "+0%",
            "pitch": "+0Hz",
            "volume": 1.0,
            "language": "vi-VN"
        }
        
        cache_service = self._get_cache_service()
        if cache_service:
            try:
                cached_audio = cache_service.get_cached_audio(text, voice_settings)
                if cached_audio:
                    processing_time = time.time() - start_time
                    self._record_performance(session_id, "tts", processing_time, True, 
                                           metadata={"cache_hit": True, "voice_model": cached_audio.voice_model})
                    
                    logger.info(f"[TTS] Cache hit for text: {text[:50]}...")
                    return {
                        "audio_data": b"",  # Don't return cached audio data
                        "audio_url": cached_audio.audio_url,
                        "duration_seconds": cached_audio.duration_seconds or 0.0,
                        "voice_used": cached_audio.voice_model,
                        "question_text": text,
                        "word_timestamps": cached_audio.word_timestamps or [],
                        "success": True,
                        "fallback_reason": None,
                        "cache_hit": True
                    }
            except Exception as e:
                logger.warning(f"[TTS] Cache lookup failed: {e}")

        # Check if Edge TTS is in cooldown period due to consecutive failures
        current_time = time.time()
        if (self._consecutive_failures >= self._failure_threshold and 
            current_time - self._last_failure_time < self._cooldown_period):
            logger.info(f"[TTS] Edge TTS in cooldown ({self._consecutive_failures} failures), using fallback directly")
            return await self._try_fallback_voice(text, voice_preference, session_id, voice_settings, start_time)

        # Try Vietnamese voice first with retry logic
        voice_name = self.VOICES[voice_preference]
        logger.info(f"[TTS] Synthesizing with voice: {voice_name}")

        # Reduce retries if we've had recent failures
        max_retries = 1 if self._consecutive_failures > 0 else 2  # Reduced from 3
        retry_delays = [1, 2]  # Reduced from [3, 8] for faster response
        
        for attempt in range(max_retries):
            try:
                # Add progressive delay to avoid rate limiting
                if attempt > 0:
                    delay = retry_delays[min(attempt-1, len(retry_delays)-1)] + random.uniform(0.2, 0.5)
                    logger.info(f"[TTS] Retry {attempt+1}/{max_retries} after {delay:.1f}s delay")
                    await asyncio.sleep(delay)
                
                # Add small random delay before each attempt
                await asyncio.sleep(random.uniform(0.05, 0.15))
                
                audio_data, word_timestamps = await self._generate_audio_with_timestamps_safe(text, voice_name)
                
                if audio_data:
                    # Success with Vietnamese voice - reset failure counter
                    duration = self._estimate_duration(text, word_timestamps)
                    result = await self._create_success_result(
                        audio_data, voice_name, text, duration, word_timestamps, session_id, voice_settings
                    )
                    
                    processing_time = time.time() - start_time
                    self._record_performance(session_id, "tts", processing_time, True, 
                                           metadata={"voice_model": voice_name, "cache_hit": False})
                    
                    # Reset failure tracking on success
                    self._last_success_time = time.time()
                    self._consecutive_failures = 0
                    self._retry_count = 0
                    return result
                    
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a 403, rate limiting, or connection error
                if any(keyword in error_msg for keyword in ["403", "invalid response status", "forbidden", "rate limit", "429"]):
                    # Record failure but reduce log noise
                    if attempt == 0:  # Only log on first attempt
                        logger.warning(f"[TTS] Edge TTS access denied (403), switching to fallback")
                    
                    if attempt < max_retries - 1:
                        continue  # Retry with longer delay
                    else:
                        # All retries failed, update failure tracking
                        self._consecutive_failures += 1
                        self._last_failure_time = current_time
                        
                        logger.info(f"[TTS] Edge TTS unavailable (failure #{self._consecutive_failures}), using fallback")
                        processing_time = time.time() - start_time
                        self._record_performance(session_id, "tts", processing_time, False, 
                                               f"Edge TTS access denied after {max_retries} attempts")
                        return await self._try_fallback_voice(text, voice_preference, session_id, voice_settings, start_time)
                else:
                    # Non-403 error, try fallback immediately
                    logger.warning(f"[TTS] Edge TTS error: {e}")
                    processing_time = time.time() - start_time
                    self._record_performance(session_id, "tts", processing_time, False, str(e))
                    return await self._try_fallback_voice(text, voice_preference, session_id, voice_settings, start_time)
        
        # If we get here, all retries failed
        self._consecutive_failures += 1
        self._last_failure_time = current_time
        logger.warning(f"[TTS] Edge TTS completely unavailable (failure #{self._consecutive_failures})")
        processing_time = time.time() - start_time
        self._record_performance(session_id, "tts", processing_time, False, 
                               f"All {max_retries} attempts failed")
        return await self._try_fallback_voice(text, voice_preference, session_id, voice_settings, start_time)

    async def synthesize_question(
        self,
        question_text: str,
        voice_preference: str = "female",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Convenience wrapper cho AI interview questions."""
        return await self.synthesize_text(
            text=question_text,
            voice_preference=voice_preference,
            session_id=session_id,
        )

    def get_available_voices(self) -> Dict[str, str]:
        return self.VOICES.copy()

    def reset_failure_tracking(self):
        """Reset failure tracking - useful for testing or manual reset"""
        self._consecutive_failures = 0
        self._last_failure_time = 0
        logger.info("[TTS] Failure tracking reset - Edge TTS will be retried")

    def get_status(self) -> Dict[str, Any]:
        """Get current TTS service status"""
        current_time = time.time()
        in_cooldown = (self._consecutive_failures >= self._failure_threshold and 
                      current_time - self._last_failure_time < self._cooldown_period)
        
        return {
            "consecutive_failures": self._consecutive_failures,
            "in_cooldown": in_cooldown,
            "cooldown_remaining": max(0, self._cooldown_period - (current_time - self._last_failure_time)) if in_cooldown else 0,
            "last_success": self._last_success_time,
            "edge_tts_available": not in_cooldown
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _try_fallback_voice(
        self,
        text: str,
        voice_preference: str,
        session_id: Optional[str] = None,
        voice_settings: Optional[Dict[str, Any]] = None,
        start_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Try fallback English voice when Vietnamese voice fails"""
        if start_time is None:
            start_time = time.time()
        
        # Skip Edge TTS fallback if we know it's failing
        if self._consecutive_failures >= self._failure_threshold:
            logger.info("[TTS] Skipping Edge TTS fallback due to known issues, using alternative services")
        else:
            fallback_voice = self.FALLBACK_VOICES[voice_preference]
            logger.info(f"[TTS] Trying fallback voice: {fallback_voice}")
            
            try:
                audio_data, word_timestamps = await self._generate_audio_with_timestamps_safe(text, fallback_voice)
                
                if audio_data:
                    duration = self._estimate_duration(text, word_timestamps)
                    result = await self._create_success_result(
                        audio_data, fallback_voice, text, duration, word_timestamps, session_id, voice_settings
                    )
                    result["fallback_reason"] = f"Vietnamese voice failed, used {fallback_voice}"
                    
                    processing_time = time.time() - start_time
                    self._record_performance(session_id, "tts", processing_time, True, 
                                           metadata={"voice_model": fallback_voice, "fallback": True})
                    
                    # Reset failure counter on successful fallback
                    self._consecutive_failures = max(0, self._consecutive_failures - 1)
                    logger.info(f"[TTS] Fallback successful with {fallback_voice}")
                    return result
                    
            except Exception as e:
                logger.info(f"[TTS] Fallback voice also failed: {str(e)[:50]}...")
                # Increase failure count since even fallback failed
                self._consecutive_failures += 1
                self._last_failure_time = time.time()
        
        # Try alternative TTS services (gTTS, pyttsx3)
        logger.info("[TTS] Using alternative TTS services")
        try:
            from .fallback_tts_service import fallback_tts_service
            fallback_result = await fallback_tts_service.synthesize_text_fallback(
                text=text,
                voice_preference=voice_preference,
                language="vi"
            )
            
            if fallback_result.get("success"):
                # Convert fallback result to our format and cache it
                audio_data = fallback_result.get("audio_data", b"")
                voice_model = fallback_result.get("voice_used", "unknown")
                
                # Try to cache the result
                if audio_data and voice_settings:
                    cache_service = self._get_cache_service()
                    if cache_service:
                        try:
                            # Upload to storage first
                            audio_url = None
                            if session_id:
                                try:
                                    from .audio_storage_service import audio_storage_service
                                    audio_url = await audio_storage_service.upload_ai_question_audio(
                                        audio_data=audio_data,
                                        session_id=int(session_id),
                                        file_extension="mp3",
                                    )
                                except Exception as upload_e:
                                    logger.warning(f"[TTS] Fallback storage upload failed: {upload_e}")
                            
                            # Cache the result
                            if audio_url:
                                cache_service.cache_audio(
                                    text=text,
                                    voice_settings=voice_settings,
                                    audio_url=audio_url,
                                    voice_model=voice_model,
                                    file_size_bytes=len(audio_data),
                                    duration_seconds=fallback_result.get("duration_seconds"),
                                    word_timestamps=fallback_result.get("word_timestamps")
                                )
                                fallback_result["audio_url"] = audio_url
                        except Exception as cache_e:
                            logger.warning(f"[TTS] Fallback caching failed: {cache_e}")
                
                processing_time = time.time() - start_time
                self._record_performance(session_id, "tts", processing_time, True, 
                                       metadata={"voice_model": voice_model, "fallback_method": fallback_result.get("method_used")})
                
                fallback_result["success"] = True
                logger.info(f"[TTS] Alternative TTS successful: {fallback_result.get('method_used')}")
                return fallback_result
                
        except Exception as fallback_e:
            logger.error(f"[TTS] Alternative TTS services failed: {fallback_e}")
        
        # Ultimate fallback: return text-only response
        logger.warning("[TTS] All TTS options failed, returning text-only response")
        processing_time = time.time() - start_time
        self._record_performance(session_id, "tts", processing_time, False, 
                               "All TTS services failed")
        
        return {
            "audio_data": b"",
            "audio_url": None,
            "duration_seconds": 0.0,
            "voice_used": "text-only",
            "question_text": text,
            "word_timestamps": [],
            "success": False,
            "fallback_reason": "All TTS services failed, text-only mode"
        }

    async def _create_success_result(
        self,
        audio_data: bytes,
        voice_name: str,
        text: str,
        duration: float,
        word_timestamps: List[Dict[str, Any]],
        session_id: Optional[str] = None,
        voice_settings: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create successful TTS result with storage upload and caching."""
        import base64 as _b64

        # Fallback: base64 data URL so frontend can play without needing storage
        data_url = f"data:audio/mp3;base64,{_b64.b64encode(audio_data).decode()}" if audio_data else None

        result: Dict[str, Any] = {
            "audio_data": audio_data,
            "audio_url": data_url,   # default to inline data URL
            "duration_seconds": duration,
            "voice_used": voice_name,
            "question_text": text,
            "word_timestamps": word_timestamps,
            "success": True,
            "fallback_reason": None,
        }

        # Tiêu chí 4.2: Lưu vào Audio_Storage (R2) — overwrite data_url if upload succeeds
        if session_id:
            try:
                audio_url = await audio_storage_service.upload_ai_question_audio(
                    audio_data=audio_data,
                    session_id=session_id,
                    file_extension="mp3",
                )
                if audio_url:
                    result["audio_url"] = audio_url  # prefer R2 URL over data URL
                    logger.info(f"[TTS] Audio stored at: {audio_url}")
                
                # Cache the successful result
                if audio_url and voice_settings:
                    cache_service = self._get_cache_service()
                    if cache_service:
                        try:
                            cache_service.cache_audio(
                                text=text,
                                voice_settings=voice_settings,
                                audio_url=audio_url,
                                voice_model=voice_name,
                                file_size_bytes=len(audio_data),
                                duration_seconds=duration,
                                word_timestamps=word_timestamps
                            )
                            logger.info(f"[TTS] Audio cached for future use")
                        except Exception as cache_e:
                            logger.warning(f"[TTS] Caching failed (non-blocking): {cache_e}")
                            
            except Exception as e:
                logger.warning(f"[TTS] Storage upload failed (non-blocking): {e}")

        logger.info(f"[TTS] Success. Voice: {voice_name}, Duration: {duration:.1f}s, Words: {len(word_timestamps)}")
        return result

    async def _generate_audio_with_timestamps_safe(
        self,
        text: str,
        voice_name: str,
    ) -> tuple[bytes, List[Dict[str, Any]]]:
        """
        Safe wrapper for _generate_audio_with_timestamps with timeout and error handling
        """
        try:
            # Add timeout to prevent hanging
            return await asyncio.wait_for(
                self._generate_audio_with_timestamps(text, voice_name),
                timeout=30.0  # 30 second timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"[TTS] Timeout generating audio with {voice_name}")
            raise RuntimeError(f"TTS timeout for voice {voice_name}")
        except Exception as e:
            # Reduce log noise for known issues
            if "403" in str(e) or "Invalid response status" in str(e):
                # Don't log individual 403 errors in the safe wrapper
                pass
            else:
                logger.warning(f"[TTS] Error generating audio with {voice_name}: {e}")
            raise

    async def _generate_audio_with_timestamps(
        self,
        text: str,
        voice_name: str,
    ) -> tuple[bytes, List[Dict[str, Any]]]:
        """
        Tiêu chí 4.6: Thu thập word timestamps từ Edge TTS stream.
        ENHANCED: Better 403 error detection and connection handling

        Word timestamp format:
            { "word": str, "offset_ms": int, "duration_ms": int }
        """
        # Add random delay to avoid rate limiting
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # Create communicate object with enhanced settings
        communicate = edge_tts.Communicate(text, voice_name)

        audio_chunks: list[bytes] = []
        word_timestamps: List[Dict[str, Any]] = []

        try:
            # Add timeout to prevent hanging connections
            async with asyncio.timeout(25.0):  # 25 second timeout
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_chunks.append(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        # Edge TTS trả về offset tính bằng 100-nanosecond units
                        offset_ms = chunk.get("offset", 0) // 10_000
                        duration_ms = chunk.get("duration", 0) // 10_000
                        word_timestamps.append({
                            "word":        chunk.get("text", ""),
                            "offset_ms":   offset_ms,
                            "duration_ms": duration_ms,
                        })
        except asyncio.TimeoutError:
            logger.error(f"[TTS] Timeout generating audio with {voice_name}")
            raise RuntimeError(f"TTS timeout for voice {voice_name}")
        except Exception as e:
            error_msg = str(e).lower()
            # Enhanced 403 error detection - but reduce log noise
            if any(keyword in error_msg for keyword in ["403", "invalid response status", "forbidden", "unauthorized"]):
                # Don't log individual 403 errors - let the caller handle logging
                raise RuntimeError(f"TTS 403 error: {str(e)}")
            elif any(keyword in error_msg for keyword in ["429", "rate limit", "too many requests"]):
                raise RuntimeError(f"TTS rate limit: {str(e)}")
            elif any(keyword in error_msg for keyword in ["connection", "network", "timeout"]):
                raise RuntimeError(f"TTS connection error: {str(e)}")
            else:
                logger.warning(f"[TTS] Unexpected error: {e}")
                raise RuntimeError(f"TTS error: {str(e)}")

        audio_data = b"".join(audio_chunks)
        if not audio_data:
            raise RuntimeError("No audio data received from Edge TTS")
            
        return audio_data, word_timestamps

    def _estimate_duration(
        self,
        text: str,
        word_timestamps: List[Dict[str, Any]],
    ) -> float:
        """
        Ước tính duration từ word timestamps (chính xác hơn) hoặc word count.
        """
        if word_timestamps:
            last = word_timestamps[-1]
            total_ms = last["offset_ms"] + last["duration_ms"]
            return max(1.0, total_ms / 1000.0)

        # Fallback: ~150 WPM cho tiếng Việt = 2.5 words/s
        word_count = len(text.split())
        return max(1.0, word_count / 2.5)


# Singleton
edge_tts_service = EdgeTTSService()
