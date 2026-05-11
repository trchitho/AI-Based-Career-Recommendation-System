import asyncio
import hashlib
import os
import time
from typing import Optional, Dict, Any, Tuple
import edge_tts
from pydub import AudioSegment
import io
import aiofiles
from app.core.config import settings
from app.core.logging import logger

class EnhancedTTSService:
    VOICE_MAPPING = {
        'female': 'vi-VN-HoaiMyNeural',
        'male': 'vi-VN-NamMinhNeural'
    }
    
    RATE_MAPPING = {
        'slow': '-20%',
        'normal': '+0%', 
        'fast': '+20%'
    }
    
    def __init__(self):
        self.cache_dir = getattr(settings, 'EDGE_TTS_CACHE_DIR', '/tmp/edge_tts_cache')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # In-memory cache for frequently used audio
        self.memory_cache = {}
        self.memory_cache_size = 50  # Max items in memory
        self.cache_hits = 0
        self.cache_misses = 0
        
        print(f"✅ TTS Service initialized with cache dir: {self.cache_dir}")
        
    def _get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.cache_hits + self.cache_misses
        hit_rate = (self.cache_hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "memory_cache_size": len(self.memory_cache),
            "disk_cache_files": len([f for f in os.listdir(self.cache_dir) if f.endswith('.cache')])
        }
        
    async def generate_speech(
        self, 
        text: str, 
        voice_type: str = 'female',
        rate: str = 'normal',
        pitch: str = '+0Hz',
        cache_key: Optional[str] = None
    ) -> Optional[Tuple[bytes, Dict[str, Any]]]:
        """
        Generate speech using edge-tts library with caching and retry logic
        Returns (audio_bytes, metadata) or None if failed
        """
        max_retries = 3
        retry_delay = 1  # seconds
        
        # Generate cache key first
        if not cache_key:
            cache_key = self._generate_cache_key(text, voice_type, rate, pitch)
        
        # Check cache first (before any processing)
        cached_audio = await self._get_cached_audio(cache_key)
        if cached_audio:
            logger.info(f"[TTS] Cache hit for key: {cache_key[:8]}...")
            return cached_audio
        
        for attempt in range(max_retries):
            try:
                voice = self.VOICE_MAPPING.get(voice_type, self.VOICE_MAPPING['female'])
                rate_value = self.RATE_MAPPING.get(rate, '+0%')
                
                logger.info(f"[TTS] Attempt {attempt + 1}/{max_retries} - Synthesizing with voice: {voice}")
                
                communicate = edge_tts.Communicate(
                    text=text, 
                    voice=voice, 
                    rate=rate_value, 
                    pitch=pitch
                )
                
                audio_data = b""
                word_timestamps = []
                
                # Add timeout for streaming with progress tracking
                start_time = time.time()
                async with asyncio.timeout(20):  # Increased timeout
                    chunk_count = 0
                    async for chunk in communicate.stream():
                        if chunk["type"] == "audio":
                            audio_data += chunk["data"]
                            chunk_count += 1
                            
                            # Log progress every 100 chunks to avoid spam
                            if chunk_count % 100 == 0:
                                elapsed = time.time() - start_time
                                logger.info(f"[TTS] Processing chunk {chunk_count}, elapsed: {elapsed:.1f}s")
                                
                        elif chunk["type"] == "WordBoundary":
                            word_timestamps.append({
                                "word": chunk["text"],
                                "start_time": chunk["audio_offset"] / 10000000,  # Convert to seconds
                                "end_time": (chunk["audio_offset"] + chunk["duration"]) / 10000000
                            })
                
                if not audio_data:
                    logger.error(f"[TTS] Empty audio data on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    return None
                
                # Optimize audio (compress and normalize)
                optimized_audio = await self._optimize_audio(audio_data)
                
                processing_time = time.time() - start_time
                metadata = {
                    "voice": voice,
                    "rate": rate_value,
                    "pitch": pitch,
                    "duration": len(optimized_audio) / 16000,  # Approximate duration
                    "word_timestamps": word_timestamps,
                    "original_size": len(audio_data),
                    "compressed_size": len(optimized_audio),
                    "attempt": attempt + 1,
                    "processing_time": processing_time,
                    "chunk_count": chunk_count
                }
                
                # Cache the result immediately
                await self._cache_audio(cache_key, optimized_audio, metadata)
                
                logger.info(f"[TTS] Success on attempt {attempt + 1}: {len(optimized_audio)} bytes, {processing_time:.2f}s, {chunk_count} chunks")
                return optimized_audio, metadata
                
            except asyncio.TimeoutError:
                logger.warning(f"[TTS] Timeout on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                    
            except Exception as e:
                logger.error(f"[TTS] Error on attempt {attempt + 1}/{max_retries}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
        
        logger.error(f"[TTS] All {max_retries} attempts failed")
        return None
    
    async def generate_with_fallback(
        self, 
        text: str, 
        voice_type: str = 'female',
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate speech with fallback to text_only and performance monitoring
        """
        start_time = asyncio.get_event_loop().time()
        
        # Log cache stats periodically
        if (self.cache_hits + self.cache_misses) % 10 == 0:
            stats = self._get_cache_stats()
            logger.info(f"[TTS] Cache Stats: {stats}")
        
        try:
            result = await asyncio.wait_for(
                self.generate_speech(text, voice_type),
                timeout=getattr(settings, 'VOICE_PROCESSING_TIMEOUT', 30)
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            if result:
                audio_data, metadata = result
                
                # Save audio file
                audio_url = await self._save_audio_file(audio_data, user_id)
                
                # Add performance metrics
                metadata["cache_stats"] = self._get_cache_stats()
                metadata["processing_time"] = processing_time
                
                logger.info(f"[TTS] Success: {processing_time:.2f}s, {len(audio_data)} bytes, cache_hit_rate={self._get_cache_stats()['hit_rate']}")
                
                return {
                    "type": "audio",
                    "text": text,
                    "audio_url": audio_url,
                    "voice_type": voice_type,
                    "processing_time": processing_time,
                    "metadata": metadata,
                    "success": True
                }
            else:
                raise Exception("TTS generation returned None")
                
        except asyncio.TimeoutError:
            processing_time = asyncio.get_event_loop().time() - start_time
            logger.warning(f"[TTS] Timeout after {getattr(settings, 'VOICE_PROCESSING_TIMEOUT', 30)}s")
            return self._create_fallback_response(text, voice_type, f"TTS timeout ({processing_time:.1f}s)")
            
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"[TTS] Generation error ({processing_time:.2f}s): {str(e)}")
            return self._create_fallback_response(text, voice_type, f"TTS error: {str(e)}")
    
    async def clear_cache(self, older_than_hours: int = 24) -> Dict[str, int]:
        """Clear old cache files and reset memory cache"""
        try:
            cleared_files = 0
            cleared_memory = len(self.memory_cache)
            
            # Clear memory cache
            self.memory_cache.clear()
            
            # Clear old disk cache files
            current_time = time.time()
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.cache'):
                    filepath = os.path.join(self.cache_dir, filename)
                    file_age = current_time - os.path.getmtime(filepath)
                    
                    if file_age > (older_than_hours * 3600):
                        os.remove(filepath)
                        cleared_files += 1
            
            logger.info(f"[TTS] Cache cleared: {cleared_files} disk files, {cleared_memory} memory items")
            
            return {
                "cleared_disk_files": cleared_files,
                "cleared_memory_items": cleared_memory,
                "remaining_disk_files": len([f for f in os.listdir(self.cache_dir) if f.endswith('.cache')])
            }
            
        except Exception as e:
            logger.error(f"[TTS] Cache clear failed: {e}")
            return {"error": str(e)}
    
    async def _optimize_audio(self, audio_data: bytes) -> bytes:
        """Optimize audio for web delivery"""
        try:
            # Convert to AudioSegment for processing
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            
            # Normalize audio levels
            audio = audio.normalize()
            
            # Ensure consistent format: 16kHz, mono, 16-bit
            audio = audio.set_frame_rate(16000)
            audio = audio.set_channels(1)
            audio = audio.set_sample_width(2)  # 16-bit
            
            # Export optimized audio
            output_buffer = io.BytesIO()
            audio.export(output_buffer, format="wav")
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.warning(f"Audio optimization failed: {e}, returning original")
            return audio_data
    
    async def _save_audio_file(self, audio_data: bytes, user_id: Optional[str] = None) -> str:
        """Save audio file and return URL"""
        filename = f"tts_{hashlib.md5(audio_data).hexdigest()}.wav"
        filepath = os.path.join(self.cache_dir, filename)
        
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(audio_data)
        
        # Return relative URL for serving
        return f"/api/audio/{filename}"
    
    def _generate_cache_key(self, text: str, voice_type: str, rate: str, pitch: str) -> str:
        """Generate cache key for TTS request"""
        content = f"{text}:{voice_type}:{rate}:{pitch}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _get_cached_audio(self, cache_key: str) -> Optional[Tuple[bytes, Dict[str, Any]]]:
        """Get cached audio with memory + disk cache"""
        try:
            # Check memory cache first (fastest)
            if cache_key in self.memory_cache:
                self.cache_hits += 1
                logger.info(f"[TTS] Memory cache hit: {cache_key}")
                return self.memory_cache[cache_key]
            
            # Check disk cache
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.cache")
            if os.path.exists(cache_file):
                # Check if cache is not too old (24 hours)
                cache_age = time.time() - os.path.getmtime(cache_file)
                if cache_age < 86400:  # 24 hours
                    async with aiofiles.open(cache_file, 'rb') as f:
                        import pickle
                        cached_data = pickle.loads(await f.read())
                        
                        # Store in memory cache for next time
                        self._store_in_memory_cache(cache_key, cached_data)
                        
                        self.cache_hits += 1
                        logger.info(f"[TTS] Disk cache hit: {cache_key}")
                        return cached_data
                else:
                    # Remove old cache file
                    os.remove(cache_file)
                    logger.info(f"[TTS] Removed expired cache: {cache_key}")
            
            self.cache_misses += 1
            return None
                    
        except Exception as e:
            logger.warning(f"[TTS] Cache retrieval failed: {e}")
            self.cache_misses += 1
            return None
    
    def _store_in_memory_cache(self, cache_key: str, data: Tuple[bytes, Dict[str, Any]]):
        """Store data in memory cache with LRU eviction"""
        # If cache is full, remove oldest item
        if len(self.memory_cache) >= self.memory_cache_size:
            # Remove first item (oldest)
            oldest_key = next(iter(self.memory_cache))
            del self.memory_cache[oldest_key]
        
        self.memory_cache[cache_key] = data
    
    async def _cache_audio(self, cache_key: str, audio_data: bytes, metadata: Dict[str, Any]):
        """Cache audio data in both memory and disk"""
        try:
            cache_data = (audio_data, metadata)
            
            # Store in memory cache
            self._store_in_memory_cache(cache_key, cache_data)
            
            # Store in disk cache (async)
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.cache")
            async with aiofiles.open(cache_file, 'wb') as f:
                import pickle
                await f.write(pickle.dumps(cache_data))
                
            logger.info(f"[TTS] Cached audio: {cache_key} ({len(audio_data)} bytes)")
                
        except Exception as e:
            logger.warning(f"[TTS] Cache storage failed: {e}")
    
    def _create_fallback_response(self, text: str, voice_type: str, error_reason: str) -> Dict[str, Any]:
        """Create fallback text-only response"""
        return {
            "type": "text_only",
            "text": text,
            "audio_url": None,
            "voice_type": voice_type,
            "processing_time": 0,
            "metadata": {"fallback_reason": error_reason},
            "success": False,
            "fallback_reason": error_reason
        }

# Singleton instance
tts_service = EnhancedTTSService()