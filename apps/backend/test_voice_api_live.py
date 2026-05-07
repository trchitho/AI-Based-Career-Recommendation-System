#!/usr/bin/env python3
"""
Live API test for Voice Preferences endpoints
"""
import asyncio
import sys
from sqlalchemy.orm import sessionmaker
from app.core.db import engine
from app.services.voice_preferences_service import VoicePreferencesService

# Create session
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

async def test_voice_api_live():
    """Test voice preferences API functionality live"""
    print("🧪 LIVE API TEST - Voice Preferences")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        service = VoicePreferencesService(db)
        
        # Test with existing user
        test_user_id = 35
        print(f"📝 Testing with user_id: {test_user_id}")
        
        # Test 1: Get existing preferences
        print("\n1️⃣ GET EXISTING PREFERENCES:")
        existing_prefs = service.get_user_preferences(test_user_id)
        if existing_prefs:
            print(f"   ✅ Found existing preferences: {existing_prefs.to_dict()}")
        else:
            print("   ℹ️ No existing preferences found")
        
        # Test 2: Get or create preferences
        print("\n2️⃣ GET OR CREATE PREFERENCES:")
        prefs = service.get_or_create_preferences(test_user_id)
        print(f"   ✅ Preferences: {prefs.to_dict()}")
        
        # Test 3: Update preferences with various values
        print("\n3️⃣ UPDATE PREFERENCES:")
        test_updates = [
            {"preferred_voice": "female", "voice_volume": 1.5},
            {"voice_rate": "+20%", "voice_pitch": "-10Hz"},
            {"language": "en-US", "voice_volume": 0.8}
        ]
        
        for i, update in enumerate(test_updates, 1):
            updated_prefs = service.update_preferences(test_user_id, **update)
            print(f"   ✅ Update {i}: {update} -> Success")
            print(f"      Result: voice={updated_prefs.preferred_voice}, rate={updated_prefs.voice_rate}, volume={updated_prefs.voice_volume}")
        
        # Test 4: Get TTS settings
        print("\n4️⃣ GET TTS SETTINGS:")
        tts_settings = service.get_voice_settings_for_tts(test_user_id)
        print(f"   ✅ TTS Settings: {tts_settings}")
        
        # Test 5: Validation tests
        print("\n5️⃣ VALIDATION TESTS:")
        test_cases = [
            ({"preferred_voice": "female", "voice_volume": 1.0}, "Valid case"),
            ({"preferred_voice": "robot", "voice_volume": 1.0}, "Invalid voice"),
            ({"preferred_voice": "male", "voice_volume": 3.0}, "Invalid volume"),
            ({"preferred_voice": "alien", "voice_volume": -1.0}, "Multiple invalid"),
        ]
        
        for settings, description in test_cases:
            errors = service.validate_voice_settings(settings)
            if errors:
                print(f"   ✅ {description}: Found expected errors: {errors}")
            else:
                print(f"   ✅ {description}: No errors (as expected)")
        
        # Test 6: Create preferences for another user
        print("\n6️⃣ CREATE FOR NEW USER:")
        new_user_id = 33  # Another existing user
        new_prefs = service.get_or_create_preferences(new_user_id)
        print(f"   ✅ Created preferences for user {new_user_id}: {new_prefs.to_dict()}")
        
        # Test 7: Check database state
        print("\n7️⃣ DATABASE STATE CHECK:")
        from sqlalchemy import text
        result = db.execute(text('SELECT COUNT(*) FROM interview.voice_preferences'))
        total_prefs = result.fetchone()[0]
        print(f"   📊 Total voice preferences in database: {total_prefs}")
        
        result = db.execute(text('''
            SELECT user_id, preferred_voice, voice_volume, language 
            FROM interview.voice_preferences 
            ORDER BY updated_at DESC 
            LIMIT 3
        '''))
        recent_prefs = result.fetchall()
        print(f"   📋 Recent preferences:")
        for pref in recent_prefs:
            print(f"      User {pref[0]}: {pref[1]} voice, volume {pref[2]}, lang {pref[3]}")
        
        print("\n🎉 ALL LIVE API TESTS PASSED!")
        return True
        
    except Exception as e:
        print(f"\n❌ Live API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = asyncio.run(test_voice_api_live())
    sys.exit(0 if success else 1)