#!/usr/bin/env python3
"""
Direct database test for Voice Preferences functionality
"""
import uuid
from sqlalchemy import text
from app.core.db import engine

def test_voice_preferences_direct():
    """Test voice preferences creation directly via SQL"""
    print("🧪 Testing Voice Preferences Direct Database Access...")
    
    try:
        with engine.connect() as conn:
            # Test user ID (existing user)
            test_user_id = 35
            
            print(f"📝 Testing with user_id: {test_user_id}")
            
            # Test 1: Insert voice preferences directly
            print("1️⃣ Testing direct insert...")
            
            # Generate UUID for the record
            pref_id = str(uuid.uuid4())
            
            insert_sql = text("""
                INSERT INTO interview.voice_preferences 
                (id, user_id, preferred_voice, voice_rate, voice_pitch, voice_volume, language)
                VALUES (:id, :user_id, :preferred_voice, :voice_rate, :voice_pitch, :voice_volume, :language)
                ON CONFLICT (user_id) DO UPDATE SET
                    preferred_voice = EXCLUDED.preferred_voice,
                    voice_rate = EXCLUDED.voice_rate,
                    voice_pitch = EXCLUDED.voice_pitch,
                    voice_volume = EXCLUDED.voice_volume,
                    language = EXCLUDED.language,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, user_id, preferred_voice, voice_rate, voice_pitch, voice_volume, language
            """)
            
            result = conn.execute(insert_sql, {
                "id": pref_id,
                "user_id": test_user_id,
                "preferred_voice": "female",
                "voice_rate": "+0%",
                "voice_pitch": "+0Hz",
                "voice_volume": 1.0,
                "language": "vi-VN"
            })
            
            row = result.fetchone()
            if row:
                print(f"   ✅ Created/Updated preferences: {dict(row._mapping)}")
            
            # Test 2: Update preferences
            print("2️⃣ Testing direct update...")
            
            update_sql = text("""
                UPDATE interview.voice_preferences 
                SET preferred_voice = :preferred_voice,
                    voice_rate = :voice_rate,
                    voice_volume = :voice_volume,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                RETURNING id, user_id, preferred_voice, voice_rate, voice_pitch, voice_volume, language
            """)
            
            result = conn.execute(update_sql, {
                "user_id": test_user_id,
                "preferred_voice": "male",
                "voice_rate": "+10%",
                "voice_volume": 1.2
            })
            
            row = result.fetchone()
            if row:
                print(f"   ✅ Updated preferences: {dict(row._mapping)}")
            
            # Test 3: Query preferences
            print("3️⃣ Testing query...")
            
            query_sql = text("""
                SELECT id, user_id, preferred_voice, voice_rate, voice_pitch, voice_volume, language,
                       created_at, updated_at
                FROM interview.voice_preferences 
                WHERE user_id = :user_id
            """)
            
            result = conn.execute(query_sql, {"user_id": test_user_id})
            row = result.fetchone()
            if row:
                print(f"   ✅ Queried preferences: {dict(row._mapping)}")
            
            # Test 4: Count total preferences
            print("4️⃣ Testing count...")
            
            count_sql = text("SELECT COUNT(*) as total FROM interview.voice_preferences")
            result = conn.execute(count_sql)
            count = result.fetchone()[0]
            print(f"   ✅ Total voice preferences in database: {count}")
            
            # Commit the transaction
            conn.commit()
            
            print("🎉 All Voice Preferences direct tests passed!")
            return True
            
    except Exception as e:
        print(f"❌ Voice Preferences direct test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_voice_preferences_direct()
    exit(0 if success else 1)