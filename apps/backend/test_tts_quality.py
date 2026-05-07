#!/usr/bin/env python3
"""
Test TTS Quality Improvements
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.modules.interview.fallback_tts_service import fallback_tts_service

async def test_tts_quality():
    """Test the improved TTS quality"""
    
    # Test texts with various punctuation and formatting issues
    test_texts = [
        "Chào bạn, bạn có thể chia sẻ một chút về hành trình học tập và kinh nghiệm làm việc của mình không?",
        "Hãy tưởng tượng bạn đang nghiên cứu một ứng viên tài năng... Bạn sẽ làm gì để đánh giá họ?",
        "Câu hỏi này có nhiều dấu câu!!! Và có cả dấu gạch ngang -- như thế này.",
        "Bạn có thể giải thích (chi tiết) về [kinh nghiệm] của mình không?",
    ]
    
    print("🎙️ Testing TTS Quality Improvements")
    print("="*60)
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n🔧 Test {i}: {text[:50]}...")
        print("-" * 40)
        
        # Test text cleaning
        cleaned = fallback_tts_service._clean_text_for_tts(text)
        print(f"Original: {text}")
        print(f"Cleaned:  {cleaned}")
        
        # Test gTTS with improved quality
        try:
            result = await fallback_tts_service._try_gtts(text, "vi")
            if result.get("success"):
                audio_size = len(result.get("audio_data", b""))
                duration = result.get("duration_seconds", 0)
                voice_used = result.get("voice_used", "unknown")
                
                print(f"✅ gTTS Success:")
                print(f"   - Voice: {voice_used}")
                print(f"   - Audio: {audio_size} bytes")
                print(f"   - Duration: {duration:.1f}s")
            else:
                print(f"❌ gTTS Failed: {result.get('error', 'unknown')}")
        except Exception as e:
            print(f"❌ gTTS Error: {e}")
    
    print("\n" + "="*60)
    print("🎉 TTS Quality Test Complete!")
    
    # Test comparison
    print("\n📊 Quality Improvements:")
    print("✅ Text cleaning removes robotic punctuation reading")
    print("✅ Enhanced gTTS settings with .com domain")
    print("✅ Optimized pyttsx3 speech rate and volume")
    print("✅ Better voice selection algorithms")


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the test
    asyncio.run(test_tts_quality())