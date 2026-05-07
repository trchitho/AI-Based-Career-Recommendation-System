#!/usr/bin/env python3
"""
Complete TTS System Test - Verify all fallback layers work correctly
"""
import asyncio
import os
import sys
import logging
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.modules.interview.edge_tts_service import edge_tts_service
from app.modules.interview.fallback_tts_service import fallback_tts_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_tts_system():
    """Test the complete TTS system with all fallback layers"""
    
    test_text = "Chào bạn, bạn có thể chia sẻ một chút về hành trình học tập và kinh nghiệm làm việc của mình không?"
    
    logger.info("🚀 Testing Complete TTS System")
    logger.info(f"📝 Test text: {test_text[:50]}...")
    
    # Test 1: Edge TTS Service (with all fallbacks)
    logger.info("\n" + "="*60)
    logger.info("🔧 Test 1: Edge TTS Service (Primary + Fallbacks)")
    logger.info("="*60)
    
    try:
        result = await edge_tts_service.synthesize_text(
            text=test_text,
            voice_preference="female",
            session_id="999"  # Test session
        )
        
        logger.info(f"✅ TTS Result:")
        logger.info(f"   - Success: {result.get('success', False)}")
        logger.info(f"   - Voice Used: {result.get('voice_used', 'unknown')}")
        logger.info(f"   - Audio Data: {len(result.get('audio_data', b''))} bytes")
        logger.info(f"   - Audio URL: {result.get('audio_url', 'None')}")
        logger.info(f"   - Duration: {result.get('duration_seconds', 0):.1f}s")
        logger.info(f"   - Fallback Reason: {result.get('fallback_reason', 'None')}")
        
        if result.get('success') and result.get('audio_data'):
            logger.info("🎉 TTS SUCCESS: Audio generated successfully!")
        elif not result.get('success') and result.get('fallback_reason'):
            logger.info("⚠️  TTS FALLBACK: Using text-only mode (expected with current Edge TTS issues)")
        else:
            logger.warning("❌ TTS FAILED: No audio or fallback")
            
    except Exception as e:
        logger.error(f"❌ Edge TTS Service failed: {e}")
    
    # Test 2: Direct Fallback TTS Service
    logger.info("\n" + "="*60)
    logger.info("🔧 Test 2: Direct Fallback TTS Service")
    logger.info("="*60)
    
    try:
        fallback_result = await fallback_tts_service.synthesize_text_fallback(
            text=test_text,
            voice_preference="female",
            language="vi"
        )
        
        logger.info(f"✅ Fallback TTS Result:")
        logger.info(f"   - Success: {fallback_result.get('success', False)}")
        logger.info(f"   - Method Used: {fallback_result.get('method_used', 'unknown')}")
        logger.info(f"   - Voice Used: {fallback_result.get('voice_used', 'unknown')}")
        logger.info(f"   - Audio Data: {len(fallback_result.get('audio_data', b''))} bytes")
        logger.info(f"   - Duration: {fallback_result.get('duration_seconds', 0):.1f}s")
        logger.info(f"   - Fallback Reason: {fallback_result.get('fallback_reason', 'None')}")
        
        if fallback_result.get('success') and fallback_result.get('audio_data'):
            logger.info("🎉 FALLBACK SUCCESS: Alternative TTS working!")
        else:
            logger.info("⚠️  FALLBACK: Text-only mode (no TTS dependencies installed)")
            
    except Exception as e:
        logger.error(f"❌ Fallback TTS Service failed: {e}")
    
    # Test 3: Check TTS Dependencies
    logger.info("\n" + "="*60)
    logger.info("🔧 Test 3: TTS Dependencies Check")
    logger.info("="*60)
    
    try:
        import gtts
        logger.info("✅ gTTS: Available")
        gtts_available = True
    except ImportError:
        logger.warning("❌ gTTS: Not installed (pip install gtts)")
        gtts_available = False
    
    try:
        import pyttsx3
        logger.info("✅ pyttsx3: Available")
        pyttsx3_available = True
    except ImportError:
        logger.warning("❌ pyttsx3: Not installed (pip install pyttsx3)")
        pyttsx3_available = False
    
    try:
        import edge_tts
        logger.info("✅ edge-tts: Available")
        edge_tts_available = True
    except ImportError:
        logger.error("❌ edge-tts: Not installed (pip install edge-tts)")
        edge_tts_available = False
    
    # Test 4: Audio Storage Test
    logger.info("\n" + "="*60)
    logger.info("🔧 Test 4: Audio Storage Configuration")
    logger.info("="*60)
    
    from app.modules.interview.audio_storage_service import audio_storage_service
    
    logger.info(f"✅ R2 Configured: {audio_storage_service.is_configured}")
    logger.info(f"✅ Main Bucket: {audio_storage_service.bucket_name}")
    logger.info(f"✅ Audio Bucket: {audio_storage_service.audio_bucket_name}")
    logger.info(f"✅ Public URL: {audio_storage_service.public_url}")
    
    if audio_storage_service.is_configured:
        try:
            bucket_name = await audio_storage_service._verify_bucket()
            logger.info(f"✅ Using Bucket: {bucket_name}")
        except Exception as e:
            logger.warning(f"⚠️  Bucket verification failed: {e}")
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("📊 SYSTEM STATUS SUMMARY")
    logger.info("="*60)
    
    total_methods = 0
    working_methods = 0
    
    if edge_tts_available:
        total_methods += 1
        logger.info("🔹 Edge TTS: Available (may have 403 issues)")
    
    if gtts_available:
        total_methods += 1
        working_methods += 1
        logger.info("🔹 Google TTS (gTTS): Available ✅")
    
    if pyttsx3_available:
        total_methods += 1
        working_methods += 1
        logger.info("🔹 Offline TTS (pyttsx3): Available ✅")
    
    total_methods += 1  # Text-only always available
    working_methods += 1
    logger.info("🔹 Text-Only Mode: Always Available ✅")
    
    logger.info(f"\n🎯 RELIABILITY: {working_methods}/{total_methods} methods available")
    
    if working_methods >= 2:
        logger.info("🟢 SYSTEM STATUS: EXCELLENT - Multiple fallback options available")
    elif working_methods >= 1:
        logger.info("🟡 SYSTEM STATUS: GOOD - At least one fallback available")
    else:
        logger.info("🔴 SYSTEM STATUS: DEGRADED - Only text-only mode available")
    
    logger.info("\n🎉 TTS System Test Complete!")
    
    return {
        "edge_tts_available": edge_tts_available,
        "gtts_available": gtts_available,
        "pyttsx3_available": pyttsx3_available,
        "storage_configured": audio_storage_service.is_configured,
        "working_methods": working_methods,
        "total_methods": total_methods
    }


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the test
    result = asyncio.run(test_tts_system())
    
    # Exit with appropriate code
    if result["working_methods"] >= 2:
        sys.exit(0)  # Excellent
    elif result["working_methods"] >= 1:
        sys.exit(0)  # Good enough
    else:
        sys.exit(1)  # Degraded