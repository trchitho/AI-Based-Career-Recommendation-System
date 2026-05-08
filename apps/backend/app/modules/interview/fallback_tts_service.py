"""
Fallback TTS Service - Backup when Edge TTS fails with 403 errors

Provides text-to-speech alternatives when Microsoft Edge TTS is unavailable:
1. gTTS (Google Text-to-Speech) - Free but requires internet
2. pyttsx3 (Offline TTS) - Works offline but lower quality
3. Text-only fallback - Always works
"""

import asyncio
import hashlib
import io
import os
import re
import tempfile
from typing import Dict, Any, List, Optional, Tuple

from loguru import logger

try:
    import gtts
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    logger.warning("[FallbackTTS] gTTS not available, install with: pip install gtts")

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    logger.warning("[FallbackTTS] pyttsx3 not available, install with: pip install pyttsx3")


class FallbackTTSService:
    """
    Fallback TTS service when Edge TTS fails
    Priority: gTTS > pyttsx3 > text-only
    """
    
    def __init__(self):
        self.gtts_available = GTTS_AVAILABLE
        self.pyttsx3_available = PYTTSX3_AVAILABLE
        logger.info(f"[FallbackTTS] Initialized - gTTS: {self.gtts_available}, pyttsx3: {self.pyttsx3_available}")
    
    async def synthesize_text_fallback(
        self,
        text: str,
        voice_preference: str = "female",
        language: str = "vi"
    ) -> Dict[str, Any]:
        """
        Try fallback TTS methods in order of preference
        
        Returns:
            {
                "audio_data": bytes,
                "audio_url": str | None,
                "duration_seconds": float,
                "voice_used": str,
                "question_text": str,
                "word_timestamps": list,
                "success": bool,
                "fallback_reason": str,
                "method_used": str,
            }
        """
        logger.info(f"[FallbackTTS] Attempting fallback TTS for: {text[:50]}...")
        
        # Method 1: Try gTTS (Google Text-to-Speech)
        if self.gtts_available:
            try:
                result = await self._try_gtts(text, language)
                if result["success"]:
                    result["method_used"] = "gtts"
                    result["fallback_reason"] = "Edge TTS failed, used Google TTS"
                    logger.info("[FallbackTTS] Success with gTTS")
                    return result
            except Exception as e:
                logger.warning(f"[FallbackTTS] gTTS failed: {e}")
        
        # Method 2: Try pyttsx3 (Offline TTS)
        if self.pyttsx3_available:
            try:
                result = await self._try_pyttsx3(text, voice_preference)
                if result["success"]:
                    result["method_used"] = "pyttsx3"
                    result["fallback_reason"] = "Edge TTS and gTTS failed, used offline TTS"
                    logger.info("[FallbackTTS] Success with pyttsx3")
                    return result
            except Exception as e:
                logger.warning(f"[FallbackTTS] pyttsx3 failed: {e}")
        
        # Method 3: Text-only fallback (always works)
        logger.warning("[FallbackTTS] All TTS methods failed, returning text-only")
        return {
            "audio_data": b"",
            "audio_url": None,
            "duration_seconds": 0.0,
            "voice_used": "text-only",
            "question_text": text,
            "word_timestamps": [],
            "success": False,
            "fallback_reason": "All TTS services failed, text-only mode",
            "method_used": "text-only",
        }
    
    def _clean_text_for_tts(self, text: str) -> str:
        """
        Clean text for better TTS quality - remove problematic punctuation and formatting
        ENHANCED: Better Vietnamese text processing to reduce robotic sound
        """
        import re
        
        # Remove or replace problematic characters that make TTS sound robotic
        cleaned = text
        
        # Replace multiple punctuation with single ones
        cleaned = re.sub(r'[.]{2,}', '.', cleaned)  # Multiple dots -> single dot
        cleaned = re.sub(r'[!]{2,}', '!', cleaned)  # Multiple exclamation -> single
        cleaned = re.sub(r'[?]{2,}', '?', cleaned)  # Multiple question -> single
        
        # Remove excessive punctuation combinations that sound robotic
        cleaned = re.sub(r'[.!?]{2,}', '.', cleaned)  # Mixed punctuation -> single dot
        cleaned = re.sub(r'[.]{1}[!?]{1}', '.', cleaned)  # .! or .? -> just .
        cleaned = re.sub(r'[!]{1}[.?]{1}', '!', cleaned)  # !. or !? -> just !
        cleaned = re.sub(r'[?]{1}[.!]{1}', '?', cleaned)  # ?. or ?! -> just ?
        
        # Replace dashes and special characters with natural pauses
        cleaned = re.sub(r'[-–—]+', ', ', cleaned)  # Dashes -> comma pause
        cleaned = re.sub(r'[()[\]{}]', '', cleaned)  # Remove brackets (sounds robotic)
        cleaned = re.sub(r'["""''`]', '', cleaned)  # Remove quotes
        cleaned = re.sub(r'[*#@$%^&+=<>|\\]', '', cleaned)  # Remove special symbols
        
        # Fix common Vietnamese TTS issues
        cleaned = re.sub(r'\b(vs|VS)\b', 'so với', cleaned)  # vs -> so với
        cleaned = re.sub(r'\b(etc|ETC)\b', 'và các thứ khác', cleaned)  # etc -> và các thứ khác
        cleaned = re.sub(r'\b(ok|OK)\b', 'được', cleaned)  # ok -> được
        cleaned = re.sub(r'\b(AI|ai)\b', 'trí tuệ nhân tạo', cleaned)  # AI -> trí tuệ nhân tạo
        
        # Replace numbers with Vietnamese words for better pronunciation
        number_map = {
            '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm',
            '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín', '10': 'mười'
        }
        for num, word in number_map.items():
            cleaned = re.sub(rf'\b{num}\b', word, cleaned)
        
        # Clean up spacing and formatting
        cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces -> single space
        cleaned = re.sub(r'\s*,\s*', ', ', cleaned)  # Fix comma spacing
        cleaned = re.sub(r'\s*\.\s*', '. ', cleaned)  # Fix period spacing
        cleaned = cleaned.strip()
        
        # Ensure proper sentence ending for natural flow
        if cleaned and not cleaned[-1] in '.!?':
            cleaned += '.'
        
        # Remove any remaining double spaces
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        return cleaned

    async def _try_gtts(self, text: str, language: str) -> Dict[str, Any]:
        """Try Google Text-to-Speech with improved quality and Vietnamese optimization"""
        try:
            # Clean text for better TTS quality
            cleaned_text = self._clean_text_for_tts(text)
            
            # Create gTTS object with optimized settings for Vietnamese
            tts_params = {
                'text': cleaned_text, 
                'lang': language, 
                'slow': False,  # Normal speed for natural flow
                'tld': 'com'  # Use .com domain for better quality
            }
            
            # For Vietnamese, use additional optimization
            if language == 'vi':
                # Split long sentences for better pronunciation
                sentences = re.split(r'[.!?]+', cleaned_text)
                if len(sentences) > 1 and len(cleaned_text) > 100:
                    # Process shorter chunks for better Vietnamese pronunciation
                    audio_chunks = []
                    for sentence in sentences:
                        sentence = sentence.strip()
                        if sentence:
                            sentence_tts = gtts.gTTS(
                                text=sentence + '.',
                                lang=language,
                                slow=False,
                                tld='com'
                            )
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                                temp_path = temp_file.name
                            await asyncio.get_event_loop().run_in_executor(None, sentence_tts.save, temp_path)
                            with open(temp_path, "rb") as f:
                                audio_chunks.append(f.read())
                            os.unlink(temp_path)
                    
                    # Combine audio chunks (simple concatenation)
                    audio_data = b''.join(audio_chunks)
                else:
                    # Single chunk processing
                    tts = gtts.gTTS(**tts_params)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                        temp_path = temp_file.name
                    await asyncio.get_event_loop().run_in_executor(None, tts.save, temp_path)
                    with open(temp_path, "rb") as f:
                        audio_data = f.read()
                    os.unlink(temp_path)
            else:
                # Non-Vietnamese languages - standard processing
                tts = gtts.gTTS(**tts_params)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                    temp_path = temp_file.name
                await asyncio.get_event_loop().run_in_executor(None, tts.save, temp_path)
                with open(temp_path, "rb") as f:
                    audio_data = f.read()
                os.unlink(temp_path)
            
            # Calculate duration from actual audio file size (more accurate than word count)
            # gTTS MP3 at ~48kbps = 6000 bytes/sec for Vietnamese
            if audio_data:
                duration = max(1.0, len(audio_data) / 6000)
            elif language == 'vi':
                duration = max(1.0, len(cleaned_text.split()) / 2.2)
            else:
                duration = max(1.0, len(cleaned_text.split()) / 2.5)
            
            return {
                "audio_data": audio_data,
                "audio_url": None,
                "duration_seconds": duration,
                "voice_used": f"gtts-{language}-enhanced-v2",
                "question_text": text,
                "word_timestamps": [],
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"[FallbackTTS] gTTS error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _try_pyttsx3(self, text: str, voice_preference: str) -> Dict[str, Any]:
        """Try pyttsx3 offline TTS with improved quality and Vietnamese optimization"""
        try:
            def _generate_pyttsx3_audio():
                engine = pyttsx3.init()
                
                # Enhanced voice settings for better quality
                voices = engine.getProperty('voices')
                if voices:
                    # Try to find the best quality voice
                    target_voice = None
                    for voice in voices:
                        voice_name = voice.name.lower()
                        # Prioritize higher quality voices
                        if voice_preference == "female":
                            if any(keyword in voice_name for keyword in ["zira", "hazel", "female", "woman", "aria", "cortana"]):
                                target_voice = voice.id
                                break
                        elif voice_preference == "male":
                            if any(keyword in voice_name for keyword in ["david", "mark", "male", "man", "george"]):
                                target_voice = voice.id
                                break
                    
                    if target_voice:
                        engine.setProperty('voice', target_voice)
                
                # Optimize speech settings for better quality and Vietnamese
                engine.setProperty('rate', 140)  # Slower for Vietnamese clarity
                engine.setProperty('volume', 0.95)  # High volume for clarity
                
                # Clean text for better pronunciation
                cleaned_text = self._clean_text_for_tts(text)
                
                # Additional Vietnamese-specific processing for pyttsx3
                # Break long sentences for better flow
                if len(cleaned_text) > 80:
                    # Add slight pauses at commas for better flow
                    cleaned_text = cleaned_text.replace(',', ', ')
                    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # Clean up extra spaces
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                    temp_path = temp_file.name
                
                engine.save_to_file(cleaned_text, temp_path)
                engine.runAndWait()
                
                return temp_path
            
            # Run in executor to avoid blocking
            temp_path = await asyncio.get_event_loop().run_in_executor(None, _generate_pyttsx3_audio)
            
            # Read audio data
            with open(temp_path, "rb") as f:
                audio_data = f.read()
            
            # Clean up temp file
            os.unlink(temp_path)
            
            # Estimate duration (slower rate for Vietnamese)
            duration = max(1.0, len(text.split()) / 2.3)  # Slightly slower rate for clarity
            
            return {
                "audio_data": audio_data,
                "audio_url": None,
                "duration_seconds": duration,
                "voice_used": f"pyttsx3-{voice_preference}-vietnamese-optimized",
                "question_text": text,
                "word_timestamps": [],
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"[FallbackTTS] pyttsx3 error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
fallback_tts_service = FallbackTTSService()