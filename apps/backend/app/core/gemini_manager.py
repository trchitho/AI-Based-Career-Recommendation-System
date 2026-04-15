"""
Centralized Gemini API Manager with 3 separate streams
"""
import logging
import os
import time
from collections import deque
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from google.api_core.exceptions import DeadlineExceeded, ResourceExhausted

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# TC16 — In-memory Gemini error tracker (last 200 errors)
# Used by /admin/ai-errors to surface timeout / error events without
# requiring a DB write from inside the Gemini manager.
# ---------------------------------------------------------------------------
class _GeminiErrorTracker:
    """Thread-safe ring buffer of recent Gemini API errors."""

    def __init__(self, maxlen: int = 200):
        self._buf: deque = deque(maxlen=maxlen)

    def record(
        self,
        stream: str,
        error_type: str,
        status_code: int,
        detail: str,
    ) -> None:
        self._buf.appendleft({
            "stream": stream,
            "error_type": error_type,
            "status_code": status_code,
            "detail": detail,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.error(
            "[Gemini] %s error %s on stream=%s: %s",
            error_type, status_code, stream, detail,
        )

    def recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        return list(self._buf)[:limit]

    def count_by_status(self, status_code: int) -> int:
        return sum(1 for e in self._buf if e["status_code"] == status_code)


# Module-level singleton used by all GeminiStreamManager instances
gemini_error_tracker = _GeminiErrorTracker()


class GeminiStream(Enum):
    """Enum for different Gemini API streams"""
    CHATBOT = "chatbot"
    ASSESSMENT = "assessment" 
    CV_ANALYSIS = "cv_analysis"
    INTERVIEW = "interview"


class GeminiStreamManager:
    """Manager for a single Gemini API stream with lazy initialization"""
    
    def __init__(self, stream_type: GeminiStream):
        self.stream_type = stream_type
        self.api_key = self._get_api_key()
        self.model_name = self._get_model_name()
        self.max_retries = int(os.getenv('GEMINI_MAX_RETRIES', '1'))
        self.retry_delay = int(os.getenv('GEMINI_RETRY_DELAY', '5'))
        self.enabled = os.getenv('GEMINI_ENABLED', 'true').lower() == 'true'
        self.fast_fail = os.getenv('AI_FAST_FAIL', 'false').lower() == 'true'
        
        # Fallback models list (in priority order, deduped)
        seen = set()
        candidates = [
            self.model_name,        # Primary from env
            "models/gemma-3-4b-it", # Free model that works well
            "gemini-flash-latest",  # Always-latest alias (works for all keys)
            "gemini-2.5-flash",     # Newer stable
            "gemini-2.0-flash-exp", # Experimental (different quota)
            "gemini-2.0-flash",     # Stable 2.0
            "gemini-1.5-flash",     # Older but reliable
            "models/gemini-flash-latest",  # With models/ prefix
            "models/gemini-2.5-flash",
            "models/gemini-2.0-flash",
        ]
        self.fallback_models = []
        for m in candidates:
            if m and m not in seen:
                seen.add(m)
                self.fallback_models.append(m)
        
        # LAZY INITIALIZATION - Don't initialize model until first use
        self.model = None
        self.active_model_name = None
        self._initialized = False
        
        print(f"[pkg] {self.stream_type.value.title()} stream configured (lazy init)")
    
    def _ensure_initialized(self):
        """Ensure model is initialized (lazy initialization)"""
        if self._initialized:
            return
        
        if self.enabled and self.api_key:
            print(f"🔧 First use of {self.stream_type.value} - initializing now...")
            self._initialize_with_fallback()
        
        self._initialized = True
    
    def _initialize_with_fallback(self):
        """Initialize model with automatic fallback to other models"""
        for model_name in self.fallback_models:
            try:
                print(f"🔧 Trying to initialize {self.stream_type.value} with model: {model_name}")
                genai.configure(api_key=self.api_key)
                
                # Clean model name
                clean_model_name = model_name.replace('models/', '').replace('model/', '')
                model = genai.GenerativeModel(clean_model_name)
                
                # Test the model with a simple request
                test_response = model.generate_content(
                    "Test",
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=5,
                        temperature=0.1,
                    )
                )
                
                # If successful, use this model
                self.model = model
                self.active_model_name = clean_model_name
                print(f"[ok] {self.stream_type.value.title()} stream initialized with: {clean_model_name}")
                return
                
            except Exception as e:
                error_msg = str(e).lower()
                print(f"[warn] Model {model_name} failed: {e}")
                
                # Check if it's a quota/auth issue (don't try other models)
                if any(keyword in error_msg for keyword in ['api key', 'expired', 'invalid', 'authentication', 'not valid']):
                    print("[err] API authentication issue detected, stopping fallback attempts")
                    break
                elif any(keyword in error_msg for keyword in ['quota', '429', 'rate limit', 'exceeded']):
                    print("[warn] Quota exceeded - will try fallback models with different endpoints")
                    # Continue to try other models which might use different quotas
                    continue
                
                # Continue to next model for other errors
                continue
        
        # If all models failed
        print(f"[err] Failed to initialize {self.stream_type.value} stream with any model")
        self.model = None
        self.active_model_name = None
    
    def _get_api_key(self) -> str:
        """Get API key for this stream"""
        if self.stream_type == GeminiStream.CHATBOT:
            return os.getenv('GEMINI_CHATBOT_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        elif self.stream_type == GeminiStream.ASSESSMENT:
            return os.getenv('GEMINI_ASSESSMENT_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        elif self.stream_type == GeminiStream.CV_ANALYSIS:
            return os.getenv('GEMINI_CV_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        elif self.stream_type == GeminiStream.INTERVIEW:
            return os.getenv('GEMINI_INTERVIEW_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        return os.getenv('GEMINI_API_KEY', '')
    
    def _get_model_name(self) -> str:
        """Get model name for this stream"""
        if self.stream_type == GeminiStream.CHATBOT:
            return os.getenv('GEMINI_CHATBOT_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        elif self.stream_type == GeminiStream.ASSESSMENT:
            return os.getenv('GEMINI_ASSESSMENT_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        elif self.stream_type == GeminiStream.CV_ANALYSIS:
            return os.getenv('GEMINI_CV_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        elif self.stream_type == GeminiStream.INTERVIEW:
            return os.getenv('GEMINI_INTERVIEW_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        return os.getenv('GEMINI_MODEL', 'gemini-flash-latest')
    
    def is_available(self) -> bool:
        """Check if this stream is available"""
        # Basic checks first
        if not self.enabled or not self.api_key or self.api_key == '':
            return False
        
        # If not initialized yet, assume available (will initialize on first use)
        if not self._initialized:
            return True
            
        # If initialized, check if model is actually working
        return self.model is not None
    
    def generate_content_with_retry(self, prompt: str, **kwargs) -> Optional[str]:
        """
        Generate content with retry logic, fast fail, and model fallback
        LAZY INITIALIZATION: Model is initialized on first call
        
        Args:
            prompt: Text prompt
            **kwargs: Additional generation config
            
        Returns:
            Generated text or None if failed
        """
        # LAZY INIT: Initialize on first use
        self._ensure_initialized()
        
        if not self.model:
            print(f"[warn] {self.stream_type.value.title()} stream not available")
            print(f"[debug] API key: {'✓' if self.api_key else '✗'}")
            print(f"[debug] Enabled: {self.enabled}")
            print(f"[debug] Initialized: {self._initialized}")
            return None
        
        for attempt in range(self.max_retries + 1):
            try:
                # Prepare generation config
                config_params = {}
                
                # Handle max tokens - use correct parameter name
                max_tokens = int(os.getenv('GEMINI_MAX_TOKENS', '1000'))
                if max_tokens > 0:
                    config_params['max_output_tokens'] = max_tokens  # Changed from maxOutputTokens
                
                # Handle temperature
                temperature = float(os.getenv('GEMINI_TEMPERATURE', '0.7'))
                config_params['temperature'] = temperature
                
                # Override with kwargs - fix parameter names
                for key, value in kwargs.items():
                    if key == 'maxOutputTokens':
                        config_params['max_output_tokens'] = value  # Convert to correct name
                    elif key == 'max_output_tokens':
                        config_params['max_output_tokens'] = value
                    else:
                        config_params[key] = value
                
                # Generate content
                if config_params:
                    response = self.model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(**config_params)
                    )
                else:
                    response = self.model.generate_content(prompt)
                
                return response.text.strip()
                
            except DeadlineExceeded as e:
                # TC16 — Gemini timeout → log as 504, record in tracker
                detail = str(e)[:300]
                print(f"  ⏱️ {self.stream_type.value.title()} timeout (DeadlineExceeded): {detail}")
                gemini_error_tracker.record(
                    stream=self.stream_type.value,
                    error_type="DeadlineExceeded",
                    status_code=504,
                    detail=detail,
                )
                if attempt < self.max_retries:
                    print(f"  ⏰ Retrying after {self.retry_delay}s...")
                    time.sleep(self.retry_delay)
                else:
                    return None

            except ResourceExhausted as e:
                print(f"  [err] {self.stream_type.value.title()} quota exceeded")
                gemini_error_tracker.record(
                    stream=self.stream_type.value,
                    error_type="ResourceExhausted",
                    status_code=429,
                    detail=str(e)[:300],
                )

                # FAST FAIL mode: Try fallback model if available
                if self.fast_fail:
                    print("  [fast] FAST FAIL mode - trying fallback model...")

                    # Try to switch to next available model (different API key might have quota)
                    if self._try_fallback_model():
                        print(f"  [ok] Switched to fallback model: {self.active_model_name}")
                        # Retry with new model
                        continue
                    else:
                        print("  [err] No fallback models available - immediate fallback")
                        return None

                # Normal mode: retry once
                if attempt < self.max_retries:
                    delay = self.retry_delay
                    print(f"  ⏰ Waiting {delay} seconds before retry...")
                    time.sleep(delay)
                else:
                    print("  [err] Max retries exceeded")
                    return None

            except Exception as e:
                error_msg = str(e).lower()
                print(f"  [warn] {self.stream_type.value.title()} error: {e}")
                gemini_error_tracker.record(
                    stream=self.stream_type.value,
                    error_type=type(e).__name__,
                    status_code=500,
                    detail=str(e)[:300],
                )
                
                # Check if model is deprecated/unavailable
                if any(keyword in error_msg for keyword in ['not found', '404', 'not supported', 'deprecated', 'unavailable']):
                    print(f"  [reload] Model {self.active_model_name} seems unavailable, trying fallback...")
                    
                    # Try to reinitialize with fallback models
                    if self._try_fallback_model():
                        print(f"  [ok] Switched to fallback model: {self.active_model_name}")
                        # Retry with new model
                        continue
                    else:
                        print("  [err] All fallback models failed")
                        return None
                
                # For other errors, don't retry
                return None
        
        return None
    
    def _try_fallback_model(self) -> bool:
        """Try to switch to a fallback model"""
        current_index = -1
        
        # Find current model index
        for i, model_name in enumerate(self.fallback_models):
            clean_name = model_name.replace('models/', '').replace('model/', '')
            if clean_name == self.active_model_name:
                current_index = i
                break
        
        # Try remaining models
        for model_name in self.fallback_models[current_index + 1:]:
            try:
                print(f"  [reload] Trying fallback model: {model_name}")
                
                # Clean model name
                clean_model_name = model_name.replace('models/', '').replace('model/', '')
                model = genai.GenerativeModel(clean_model_name)
                
                # Test the model
                test_response = model.generate_content(
                    "Test",
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=5,
                        temperature=0.1,
                    )
                )
                
                # If successful, switch to this model
                self.model = model
                self.active_model_name = clean_model_name
                print(f"  [ok] Successfully switched to: {clean_model_name}")
                return True
                
            except Exception as e:
                print(f"  [warn] Fallback model {model_name} also failed: {e}")
                continue
        
        return False


class MultiStreamGeminiManager:
    """Manager for all Gemini API streams with lazy initialization"""
    
    def __init__(self):
        self.chatbot_stream = GeminiStreamManager(GeminiStream.CHATBOT)
        self.assessment_stream = GeminiStreamManager(GeminiStream.ASSESSMENT)
        self.cv_stream = GeminiStreamManager(GeminiStream.CV_ANALYSIS)
        self.interview_stream = GeminiStreamManager(GeminiStream.INTERVIEW)
        
        print("[start] Multi-stream Gemini Manager initialized (lazy mode)")
        print("   Chatbot: [pkg] Ready (will init on first use)")
        print("   Assessment: [pkg] Ready (will init on first use)")
        print("   CV Analysis: [pkg] Ready (will init on first use)")
        print("   Interview: [pkg] Ready (will init on first use)")
    
    def get_stream(self, stream_type: GeminiStream) -> GeminiStreamManager:
        """Get specific stream manager"""
        if stream_type == GeminiStream.CHATBOT:
            return self.chatbot_stream
        elif stream_type == GeminiStream.ASSESSMENT:
            return self.assessment_stream
        elif stream_type == GeminiStream.CV_ANALYSIS:
            return self.cv_stream
        elif stream_type == GeminiStream.INTERVIEW:
            return self.interview_stream
        else:
            raise ValueError(f"Unknown stream type: {stream_type}")
    
    def get_chatbot_stream(self) -> GeminiStreamManager:
        """Get chatbot stream"""
        return self.chatbot_stream
    
    def get_assessment_stream(self) -> GeminiStreamManager:
        """Get assessment stream"""
        return self.assessment_stream
    
    def get_cv_stream(self) -> GeminiStreamManager:
        """Get CV analysis stream"""
        return self.cv_stream
    
    def get_interview_stream(self) -> GeminiStreamManager:
        """Get interview stream"""
        return self.interview_stream
    
    def reinitialize_all(self) -> None:
        """Force reinitialize all Gemini streams (public API)."""
        for stream in (
            self.chatbot_stream,
            self.assessment_stream,
            self.cv_stream,
            self.interview_stream,
        ):
            stream._initialize_with_fallback()

    def check_all_streams_status(self) -> Dict[str, Dict[str, any]]:
        """Check status of all streams with detailed info"""
        return {
            'chatbot': {
                'available': self.chatbot_stream.is_available(),
                'model': self.chatbot_stream.active_model_name,
                'api_key_prefix': self.chatbot_stream.api_key[:20] + '...' if self.chatbot_stream.api_key else None
            },
            'assessment': {
                'available': self.assessment_stream.is_available(),
                'model': self.assessment_stream.active_model_name,
                'api_key_prefix': self.assessment_stream.api_key[:20] + '...' if self.assessment_stream.api_key else None
            },
            'cv_analysis': {
                'available': self.cv_stream.is_available(),
                'model': self.cv_stream.active_model_name,
                'api_key_prefix': self.cv_stream.api_key[:20] + '...' if self.cv_stream.api_key else None
            },
            'interview': {
                'available': self.interview_stream.is_available(),
                'model': self.interview_stream.active_model_name,
                'api_key_prefix': self.interview_stream.api_key[:20] + '...' if self.interview_stream.api_key else None
            }
        }


# Global instance
multi_stream_manager = MultiStreamGeminiManager()