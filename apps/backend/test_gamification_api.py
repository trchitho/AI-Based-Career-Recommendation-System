"""
Test script to verify gamification API works
Run this to insert test data into database
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/assessments/gamification"

# Test data
TEST_USER_ID = 1  # Change this to your user ID
TEST_ASSESSMENT_SESSION_ID = 999999  # Temporary test ID

def test_start_session():
    """Test starting a gamification session"""
    print("\n1. Testing START SESSION...")
    print(f"URL: {API_URL}/start-session")
    
    payload = {
        "assessment_session_id": TEST_ASSESSMENT_SESSION_ID,
        "quiz_mode": "game"
    }
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        # Note: This will fail without authentication
        # You need to add Authorization header with JWT token
        response = requests.post(
            f"{API_URL}/start-session",
            json=payload,
            headers={
                "Content-Type": "application/json",
                # Add your JWT token here:
                # "Authorization": "Bearer YOUR_JWT_TOKEN"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            return response.json()["gamification_session_id"]
        else:
            print(f"❌ Error: {response.json()}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None


def test_save_progress(session_id):
    """Test saving game progress"""
    print(f"\n2. Testing SAVE PROGRESS (session_id={session_id})...")
    print(f"URL: {API_URL}/save-progress")
    
    payload = {
        "gamification_session_id": session_id,
        "extra_data": {
            "currentIndex": 5,
            "xp": 150,
            "level": 2,
            "score": 450,
            "grid": [[None, None], [None, None]],
            "responses": [["q1", "answer1"], ["q2", "answer2"]],
            "bombs": 2,
            "rockets": 1,
            "combo": 3,
            "timestamp": 1234567890
        }
    }
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_URL}/save-progress",
            json=payload,
            headers={
                "Content-Type": "application/json",
                # Add your JWT token here:
                # "Authorization": "Bearer YOUR_JWT_TOKEN"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Progress saved successfully!")
        else:
            print(f"❌ Error: {response.json()}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")


def test_direct_db_insert():
    """Test direct database insert using SQLAlchemy"""
    print("\n3. Testing DIRECT DATABASE INSERT...")
    
    try:
        # Import database models
        import sys
        sys.path.append('.')
        
        from app.core.db import SessionLocal
        from app.modules.assessments.gamification_models import AssessmentGamificationSession
        
        db = SessionLocal()
        
        # Create test session
        test_session = AssessmentGamificationSession(
            assessment_session_id=TEST_ASSESSMENT_SESSION_ID,
            user_id=TEST_USER_ID,
            quiz_mode="game",
            xp_earned=100,
            questions_answered=10,
            extra_data={
                "currentIndex": 5,
                "xp": 150,
                "level": 2,
                "score": 450,
                "test": "direct_insert"
            }
        )
        
        db.add(test_session)
        db.commit()
        db.refresh(test_session)
        
        print(f"✅ Test session created with ID: {test_session.id}")
        print(f"   User ID: {test_session.user_id}")
        print(f"   Quiz Mode: {test_session.quiz_mode}")
        print(f"   XP Earned: {test_session.xp_earned}")
        print(f"   Extra Data: {test_session.extra_data}")
        
        # Verify it's in the database
        verify = db.query(AssessmentGamificationSession).filter(
            AssessmentGamificationSession.id == test_session.id
        ).first()
        
        if verify:
            print(f"\n✅ Verified in database!")
            print(f"   Retrieved ID: {verify.id}")
            print(f"   Retrieved Extra Data: {verify.extra_data}")
        
        db.close()
        
        print("\n✅ Direct database insert successful!")
        print("   Check pgAdmin: core.assessment_gamification_sessions table")
        print(f"   Look for ID: {test_session.id}")
        
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("=" * 60)
    print("GAMIFICATION API TEST")
    print("=" * 60)
    
    print("\n⚠️  NOTE: API tests will fail without authentication token")
    print("   Use test_direct_db_insert() to bypass API and test database directly")
    
    # Test direct database insert (no authentication needed)
    test_direct_db_insert()
    
    # Uncomment these if you have a valid JWT token:
    # session_id = test_start_session()
    # if session_id:
    #     test_save_progress(session_id)
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
