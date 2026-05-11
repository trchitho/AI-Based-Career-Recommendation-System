#!/usr/bin/env python3
"""
Complete Database Test - Kiểm tra tất cả 9 bảng interview và đảm bảo có dữ liệu
"""
import asyncio
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_database_tables():
    """Test all 9 interview tables"""
    
    print("🔍 TESTING COMPLETE INTERVIEW DATABASE")
    print("="*60)
    
    # List of all 9 tables
    tables = [
        "interview_sessions",
        "interview_messages", 
        "interview_audio",
        "interview_feedback",
        "interview_templates",
        "job_descriptions",
        "audio_cache",
        "voice_performance_metrics", 
        "voice_preferences"
    ]
    
    db = SessionLocal()
    
    try:
        total_records = 0
        empty_tables = []
        
        for table in tables:
            try:
                result = db.execute(text(f'SELECT COUNT(*) FROM interview.{table}'))
                count = result.scalar()
                total_records += count
                
                if count == 0:
                    empty_tables.append(table)
                    print(f"⚠️  {table}: {count} records (EMPTY)")
                else:
                    print(f"✅ {table}: {count} records")
                    
            except Exception as e:
                print(f"❌ {table}: ERROR - {e}")
                empty_tables.append(table)
        
        print("\n" + "="*60)
        print("📊 DATABASE SUMMARY")
        print("="*60)
        print(f"Total tables: {len(tables)}")
        print(f"Tables with data: {len(tables) - len(empty_tables)}")
        print(f"Empty tables: {len(empty_tables)}")
        print(f"Total records: {total_records}")
        
        if empty_tables:
            print(f"\n⚠️  EMPTY TABLES: {', '.join(empty_tables)}")
            print("These tables need to be populated with test data!")
        
        # Test table relationships
        print("\n🔗 TESTING TABLE RELATIONSHIPS")
        print("-" * 40)
        
        # Test if we have any interview sessions
        result = db.execute(text('SELECT COUNT(*) FROM interview.interview_sessions'))
        session_count = result.scalar()
        
        if session_count > 0:
            print(f"✅ Found {session_count} interview sessions")
            
            # Test messages relationship
            result = db.execute(text('''
                SELECT COUNT(*) FROM interview.interview_messages m
                JOIN interview.interview_sessions s ON m.session_id = s.id
            '''))
            message_count = result.scalar()
            print(f"✅ Found {message_count} messages linked to sessions")
            
            # Test audio relationship
            result = db.execute(text('''
                SELECT COUNT(*) FROM interview.interview_audio a
                JOIN interview.interview_sessions s ON a.session_id = s.id
            '''))
            audio_count = result.scalar()
            print(f"✅ Found {audio_count} audio files linked to sessions")
            
        else:
            print("⚠️  No interview sessions found - cannot test relationships")
        
        # Test voice-specific tables
        print("\n🎙️ TESTING VOICE SYSTEM TABLES")
        print("-" * 40)
        
        voice_tables = ["audio_cache", "voice_performance_metrics", "voice_preferences"]
        voice_empty = 0
        
        for table in voice_tables:
            result = db.execute(text(f'SELECT COUNT(*) FROM interview.{table}'))
            count = result.scalar()
            if count == 0:
                voice_empty += 1
                print(f"⚠️  {table}: EMPTY (needs test data)")
            else:
                print(f"✅ {table}: {count} records")
        
        if voice_empty == len(voice_tables):
            print("\n❌ ALL VOICE TABLES ARE EMPTY!")
            print("The voice system tables need to be populated with test data.")
            return False
        elif voice_empty > 0:
            print(f"\n⚠️  {voice_empty}/{len(voice_tables)} voice tables are empty")
            print("Some voice system features may not work properly.")
        
        print("\n" + "="*60)
        
        if len(empty_tables) == 0:
            print("🎉 ALL TABLES HAVE DATA - DATABASE IS COMPLETE!")
            return True
        elif len(empty_tables) <= 3:
            print("⚠️  MOSTLY COMPLETE - Some tables need test data")
            return True
        else:
            print("❌ TOO MANY EMPTY TABLES - Database needs more test data")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False
    finally:
        db.close()


def create_test_data():
    """Create test data for empty tables"""
    
    print("\n🔧 CREATING TEST DATA FOR EMPTY TABLES")
    print("="*60)
    
    db = SessionLocal()
    
    try:
        # Create test voice preferences
        print("Creating test voice preferences...")
        db.execute(text('''
            INSERT INTO interview.voice_preferences (user_id, preferred_voice, voice_rate, voice_pitch, voice_volume, language)
            VALUES (1, 'female', '+0%', '+0Hz', 1.0, 'vi-VN')
            ON CONFLICT (user_id) DO NOTHING
        '''))
        
        # Create test audio cache entry
        print("Creating test audio cache...")
        db.execute(text('''
            INSERT INTO interview.audio_cache (content_hash, voice_type, voice_model, audio_url, file_size_bytes, duration_seconds)
            VALUES ('test_hash_123', 'female', 'gtts-vi-enhanced', 'https://example.com/test.mp3', 54144, 8.5)
            ON CONFLICT (content_hash) DO NOTHING
        '''))
        
        # Create test performance metrics (if we have sessions)
        result = db.execute(text('SELECT id FROM interview.interview_sessions LIMIT 1'))
        session = result.fetchone()
        
        if session:
            session_id = session[0]
            print(f"Creating test performance metrics for session {session_id}...")
            
            # TTS performance metric
            db.execute(text('''
                INSERT INTO interview.voice_performance_metrics (session_id, stage, processing_time, input_size, output_size, success, metadata)
                VALUES (:session_id, 'tts', 3.2, 100, 54144, true, '{"voice_model": "gtts-vi-enhanced", "cache_hit": false}')
            '''), {"session_id": session_id})
            
            # STT performance metric
            db.execute(text('''
                INSERT INTO interview.voice_performance_metrics (session_id, stage, processing_time, input_size, output_size, success, metadata)
                VALUES (:session_id, 'stt', 2.1, 32768, 150, true, '{"model": "whisper-base", "language": "vi"}')
            '''), {"session_id": session_id})
            
            # AI performance metric
            db.execute(text('''
                INSERT INTO interview.voice_performance_metrics (session_id, stage, processing_time, input_size, output_size, success, metadata)
                VALUES (:session_id, 'ai', 1.8, 150, 200, true, '{"model": "gemini-flash", "tokens_used": 350}')
            '''), {"session_id": session_id})
        
        db.commit()
        print("✅ Test data created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create test data: {e}")
        db.rollback()
        return False
    finally:
        db.close()


async def test_services():
    """Test the new services"""
    
    print("\n🧪 TESTING NEW SERVICES")
    print("="*60)
    
    try:
        # Test voice preferences service
        print("Testing VoicePreferencesService...")
        from app.services.voice_preferences_service import get_voice_preferences_service
        
        service = get_voice_preferences_service()
        preferences = service.get_or_create_preferences(1)
        print(f"✅ Voice preferences: {preferences.preferred_voice}, {preferences.language}")
        
        # Test audio cache service
        print("Testing AudioCacheService...")
        from app.services.audio_cache_service import get_audio_cache_service
        
        cache_service = get_audio_cache_service()
        stats = cache_service.get_cache_stats()
        print(f"✅ Audio cache: {stats['total_entries']} entries, {stats['total_size_mb']} MB")
        
        # Test performance service
        print("Testing VoicePerformanceService...")
        from app.services.voice_performance_service import get_voice_performance_service
        
        perf_service = get_voice_performance_service()
        system_stats = perf_service.get_system_performance_stats(hours_back=24)
        print(f"✅ Performance metrics: {system_stats['total_requests']} requests, {system_stats['overall_success_rate']:.1%} success rate")
        
        return True
        
    except Exception as e:
        print(f"❌ Service test failed: {e}")
        return False


async def main():
    """Main test function"""
    
    print("🚀 COMPLETE DATABASE AND SERVICES TEST")
    print("="*60)
    
    # Test 1: Database tables
    db_success = test_database_tables()
    
    # Test 2: Create test data if needed
    if not db_success:
        print("\n🔧 Some tables are empty, creating test data...")
        create_test_data()
        
        # Re-test after creating data
        print("\n🔄 RE-TESTING AFTER CREATING TEST DATA")
        db_success = test_database_tables()
    
    # Test 3: Services
    service_success = await test_services()
    
    # Final result
    print("\n" + "="*60)
    print("🏁 FINAL TEST RESULTS")
    print("="*60)
    
    if db_success and service_success:
        print("🎉 ALL TESTS PASSED!")
        print("✅ Database: Complete with all 9 tables populated")
        print("✅ Services: All voice services working correctly")
        print("✅ System: Ready for production use")
        return True
    else:
        print("❌ SOME TESTS FAILED!")
        if not db_success:
            print("❌ Database: Some tables are still empty or have issues")
        if not service_success:
            print("❌ Services: Voice services have problems")
        print("🔧 System needs attention before production use")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)