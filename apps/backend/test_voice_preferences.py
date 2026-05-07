#!/usr/bin/env python3
"""
Test script for Voice Preferences functionality
"""
import asyncio
import sys
from sqlalchemy.orm import sessionmaker
from app.core.db import engine

# Create session
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

async def test_voice_preferences():
    """Test voice preferences creation and retrieval"""
    print("🧪 Testing Voice Preferences Service...")
    
    db = SessionLocal()
    try:
        # Import here to avoid circular imports
        from app.services.voice_preferences_service import VoicePreferencesService
        
        service = VoicePreferencesService(db)
        
        # Use an existing user ID
        test_user_id = 35  # From the database query above
        
        print(f"📝 Testing with user_id: {test_user_id}")
        
        # Test 1: Get or create preferences
        print("1️⃣ Testing get_or_create_preferences...")
        preferences = service.get_or_create_preferences(test_user_id)
        print(f"   ✅ Created/Retrieved preferences: {preferences.to_dict()}")
        
        # Test 2: Update preferences
        print("2️⃣ Testing update_preferences...")
        updated_prefs = service.update_preferences(
            user_id=test_user_id,
            preferred_voice="male",
            voice_rate="+10%",
            voice_volume=1.2
        )
        print(f"   ✅ Updated preferences: {updated_prefs.to_dict()}")
        
        # Test 3: Get voice settings for TTS
        print("3️⃣ Testing get_voice_settings_for_tts...")
        tts_settings = service.get_voice_settings_for_tts(test_user_id)
        print(f"   ✅ TTS settings: {tts_settings}")
        
        # Test 4: Validation
        print("4️⃣ Testing validation...")
        valid_settings = {"preferred_voice": "female", "voice_volume": 1.5}
        invalid_settings = {"preferred_voice": "robot", "voice_volume": 3.0}
        
        valid_errors = service.validate_voice_settings(valid_settings)
        invalid_errors = service.validate_voice_settings(invalid_settings)
        
        print(f"   ✅ Valid settings errors: {valid_errors} (should be empty)")
        print(f"   ✅ Invalid settings errors: {invalid_errors} (should have errors)")
        
        print("🎉 All Voice Preferences tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Voice Preferences test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = asyncio.run(test_voice_preferences())
    sys.exit(0 if success else 1)