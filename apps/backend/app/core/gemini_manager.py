"""
Centralized Gemini API Manager with 3 separate streams
"""
import os
import time
import json
from typing import Optional, Dict, Any
from enum import Enum

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded


class GeminiStream(Enum):
    """Enum for different Gemini API streams"""
    CHATBOT = "chatbot"
    ASSESSMENT = "assessment" 
    CV_ANALYSIS = "cv_analysis"


class GeminiStreamManager:
    """Manager for a single Gemini API stream"""
    
    def __init__(self, stream_type: GeminiStream):
        self.stream_type = stream_type
        self.api_key = self._get_api_key()
        self.model_name = self._get_model_name()
        self.max_retries = int(os.getenv('GEMINI_MAX_RETRIES', '1'))
        self.retry_delay = int(os.getenv('GEMINI_RETRY_DELAY', '5'))
        self.enabled = os.getenv('GEMINI_ENABLED', 'true').lower() == 'true'
        self.fast_fail = os.getenv('AI_FAST_FAIL', 'false').lower() == 'true'
        
        # Initialize model
        self.model = None
        if self.enabled and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name.replace('models/', ''))
                print(f"✅ {stream_type.value.title()} Gemini stream initialized: {self.model_name}")
            except Exception as e:
                print(f"❌ Failed to initialize {stream_type.value} stream: {e}")
                self.model = None
    
    def _get_api_key(self) -> str:
        """Get API key for this stream"""
        if self.stream_type == GeminiStream.CHATBOT:
            return os.getenv('GEMINI_CHATBOT_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        elif self.stream_type == GeminiStream.ASSESSMENT:
            return os.getenv('GEMINI_ASSESSMENT_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        elif self.stream_type == GeminiStream.CV_ANALYSIS:
            return os.getenv('GEMINI_CV_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        return os.getenv('GEMINI_API_KEY', '')
    
    def _get_model_name(self) -> str:
        """Get model name for this stream"""
        if self.stream_type == GeminiStream.CHATBOT:
            return os.getenv('GEMINI_CHATBOT_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        elif self.stream_type == GeminiStream.ASSESSMENT:
            return os.getenv('GEMINI_ASSESSMENT_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        elif self.stream_type == GeminiStream.CV_ANALYSIS:
            return os.getenv('GEMINI_CV_MODEL', os.getenv('GEMINI_MODEL', 'gemini-flash-latest'))
        return os.getenv('GEMINI_MODEL', 'gemini-flash-latest')
    
    def is_available(self) -> bool:
        """Check if this stream is available"""
        return self.enabled and self.model is not None
    
    def generate_content_with_retry(self, prompt: str, **kwargs) -> Optional[str]:
        """
        Generate content with retry logic and fast fail
        
        Args:
            prompt: Text prompt
            **kwargs: Additional generation config
            
        Returns:
            Generated text or None if failed
        """
        if not self.is_available():
            print(f"  ⚠️ {self.stream_type.value.title()} stream not available")
            return None
        
        for attempt in range(self.max_retries + 1):
            try:
                # Prepare generation config
                config_params = {}
                
                # Handle max tokens
                max_tokens = int(os.getenv('GEMINI_MAX_TOKENS', '1000'))
                if max_tokens > 0:
                    config_params['max_output_tokens'] = max_tokens
                
                # Handle temperature
                temperature = float(os.getenv('GEMINI_TEMPERATURE', '0.7'))
                config_params['temperature'] = temperature
                
                # Override with kwargs
                config_params.update(kwargs)
                
                # Generate content
                if config_params:
                    response = self.model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(**config_params)
                    )
                else:
                    response = self.model.generate_content(prompt)
                
                return response.text.strip()
                
            except ResourceExhausted as e:
                print(f"  ❌ {self.stream_type.value.title()} quota exceeded")
                
                # FAST FAIL mode: No retry
                if self.fast_fail:
                    print(f"  ⚡ FAST FAIL mode - immediate fallback")
                    return None
                
                # Normal mode: retry once
                if attempt < self.max_retries:
                    delay = self.retry_delay
                    print(f"  ⏰ Waiting {delay} seconds before retry...")
                    time.sleep(delay)
                else:
                    print(f"  ❌ Max retries exceeded")
                    return None
                    
            except DeadlineExceeded as e:
                print(f"  ⚠️ {self.stream_type.value.title()} request timeout (attempt {attempt + 1}/{self.max_retries + 1})")
                if attempt < self.max_retries:
                    delay = self.retry_delay
                    print(f"  ⏰ Waiting {delay} seconds before retry...")
                    time.sleep(delay)
                else:
                    print(f"  ❌ Max retries exceeded")
                    return None
                    
            except Exception as e:
                print(f"  ❌ {self.stream_type.value.title()} unexpected error: {e}")
                return None
        
        return None


class MultiStreamGeminiManager:
    """Manager for all Gemini API streams"""
    
    def __init__(self):
        self.chatbot_stream = GeminiStreamManager(GeminiStream.CHATBOT)
        self.assessment_stream = GeminiStreamManager(GeminiStream.ASSESSMENT)
        self.cv_stream = GeminiStreamManager(GeminiStream.CV_ANALYSIS)
        
        print(f"🚀 Multi-stream Gemini Manager initialized")
        print(f"   Chatbot: {'✅' if self.chatbot_stream.is_available() else '❌'}")
        print(f"   Assessment: {'✅' if self.assessment_stream.is_available() else '❌'}")
        print(f"   CV Analysis: {'✅' if self.cv_stream.is_available() else '❌'}")
    
    def get_stream(self, stream_type: GeminiStream) -> GeminiStreamManager:
        """Get specific stream manager"""
        if stream_type == GeminiStream.CHATBOT:
            return self.chatbot_stream
        elif stream_type == GeminiStream.ASSESSMENT:
            return self.assessment_stream
        elif stream_type == GeminiStream.CV_ANALYSIS:
            return self.cv_stream
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
    
    def check_all_streams_status(self) -> Dict[str, bool]:
        """Check status of all streams"""
        return {
            'chatbot': self.chatbot_stream.is_available(),
            'assessment': self.assessment_stream.is_available(),
            'cv_analysis': self.cv_stream.is_available()
        }


# Global instance
multi_stream_manager = MultiStreamGeminiManager()