#!/usr/bin/env python3
"""
Test interview system với authentication thực tế
"""

import requests
import json
import time

def get_auth_token():
    """Lấy token từ login endpoint"""
    login_url = "http://localhost:8000/api/auth/login"
    
    # Test credentials - sử dụng test user đã tạo
    test_credentials = [
        {"email": "admin@test.com", "password": "admin123"},
        {"email": "admin@example.com", "password": "admin123"},
        {"email": "test@example.com", "password": "test123"},
    ]
    
    for creds in test_credentials:
        try:
            response = requests.post(login_url, json=creds)
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                if token:
                    print(f"✅ Authenticated with {creds['email']}")
                    return token
        except Exception as e:
            print(f"❌ Login failed for {creds['email']}: {e}")
    
    print("❌ Could not authenticate with any test credentials")
    return None

def test_interview_flow_with_auth():
    """Test complete interview flow với authentication"""
    
    print("🔐 GETTING AUTHENTICATION TOKEN")
    print("=" * 60)
    
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    base_url = "http://localhost:8000"
    
    print(f"\n🚀 STARTING INTERVIEW TEST")
    print("=" * 60)
    
    # Step 1: Start interview
    start_payload = {
        "job_id": "15-1252.00",  # Software Developer
        "question_count": 7
    }
    
    try:
        print(f"📋 Starting interview for Software Developer (7 questions)")
        response = requests.post(
            f"{base_url}/api/interview/start",
            json=start_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ Start interview failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        start_data = response.json()
        session_id = start_data["session_id"]
        print(f"✅ Interview started! Session ID: {session_id}")
        print(f"🎯 Job: {start_data['job_title']}")
        print(f"👋 Greeting: {start_data['greeting'][:100]}...")
        print(f"❓ First question: {start_data['first_question'][:100]}...")
        
    except Exception as e:
        print(f"❌ Error starting interview: {e}")
        return
    
    # Step 2: Test different answer types
    test_answers = [
        {
            "answer": "Tôi có 3 năm kinh nghiệm lập trình Python và đã làm việc với Django, FastAPI. Tôi thích giải quyết vấn đề phức tạp và học hỏi công nghệ mới.",
            "description": "Good answer - relevant and detailed"
        },
        {
            "answer": "6 giờ",
            "description": "Irrelevant answer - should trigger guidance"
        },
        {
            "answer": "",
            "description": "Empty answer - should trigger skip guidance"
        },
        {
            "answer": "ok",
            "description": "Too short - should trigger guidance"
        }
    ]
    
    print(f"\n🧪 TESTING DIFFERENT ANSWER TYPES")
    print("=" * 60)
    
    for i, test_case in enumerate(test_answers, 1):
        print(f"\n🔍 Test {i}: {test_case['description']}")
        print(f"📝 Answer: '{test_case['answer']}'")
        
        answer_payload = {
            "session_id": session_id,
            "answer": test_case["answer"],
            "has_audio": False,
            "audio_duration": None,
            "is_skipped": False
        }
        
        try:
            response = requests.post(
                f"{base_url}/api/interview/answer",
                json=answer_payload,
                headers=headers,
                timeout=30
            )
            
            print(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                status = result.get("status", "unknown")
                print(f"✅ Status: {status}")
                
                if status == "guidance_needed":
                    print(f"🎯 Guidance triggered!")
                    print(f"💬 Message: {result.get('message', '')}")
                    guidance = result.get('guidance', {})
                    if isinstance(guidance, dict):
                        print(f"💡 Advice: {guidance.get('advice', '')[:100]}...")
                    else:
                        print(f"💡 Guidance: {str(guidance)[:100]}...")
                    
                elif status == "skipped_guidance":
                    print(f"⏭️ Skip guidance triggered!")
                    print(f"💬 Message: {result.get('message', '')}")
                    print(f"🔄 Can retry: {result.get('can_retry', False)}")
                    
                elif status == "continue":
                    print(f"➡️ Continue to next question")
                    evaluation = result.get("evaluation", {})
                    if evaluation:
                        print(f"📊 Score: {evaluation.get('score', 'N/A')}/10")
                        print(f"💬 Feedback: {evaluation.get('feedback', '')[:100]}...")
                    next_q = result.get("next_question", "")
                    if next_q:
                        print(f"❓ Next question: {next_q[:100]}...")
                    
                elif status == "completed":
                    print(f"🏁 Interview completed!")
                    summary = result.get("final_summary", {})
                    if summary:
                        print(f"📊 Overall score: {summary.get('overall_score', 'N/A')}")
                        print(f"🎯 Recommendation: {summary.get('recommendation', 'N/A')}")
                
            else:
                print(f"❌ Error: {response.status_code}")
                error_detail = response.json().get("detail", "Unknown error") if response.headers.get("content-type", "").startswith("application/json") else response.text
                print(f"📄 Details: {error_detail}")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        # Small delay between requests
        time.sleep(1)
    
    print(f"\n📊 GETTING SESSION HISTORY")
    print("=" * 60)
    
    try:
        response = requests.get(
            f"{base_url}/api/interview/session/{session_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            history = response.json()
            session_info = history.get("session", {})
            messages = history.get("messages", [])
            
            print(f"✅ Session history retrieved")
            print(f"📋 Status: {session_info.get('status', 'unknown')}")
            print(f"📊 Overall score: {session_info.get('overall_score', 'N/A')}")
            print(f"💬 Total messages: {len(messages)}")
            
        else:
            print(f"❌ Failed to get history: {response.status_code}")
            
    except Exception as e:
        print(f"❌ History request failed: {e}")

def test_validation_logic_only():
    """Test validation logic without full interview"""
    print(f"\n🔍 TESTING VALIDATION LOGIC LOCALLY")
    print("=" * 60)
    
    import re
    
    # Test patterns from services.py
    irrelevant_patterns = [
        r'^\d+\s*(giờ|h|pm|am|:\d+)',  # Time patterns
        r'^(ok|okay|yes|no|không|có|được)$',  # Single word responses
        r'^[^\w\s]*$',  # Only punctuation/symbols
        r'^\d+$',  # Only numbers
        r'^(haha|hehe|lol|:D|:P|\.\.\.)$',  # Casual expressions
    ]
    
    test_answers = [
        "Tôi có kinh nghiệm lập trình Python",  # Good
        "6 giờ",  # Time pattern
        "6h",     # Time pattern  
        "ok",     # Single word
        "không",  # Single word
        "123",    # Only numbers
        "haha",   # Casual
        "",       # Empty
        "   ",    # Whitespace only
        "...",    # Punctuation only
    ]
    
    for answer in test_answers:
        answer_clean = answer.strip().lower()
        is_irrelevant = False
        matched_pattern = None
        
        # Check length first
        if not answer_clean or len(answer_clean) < 3:
            is_irrelevant = True
            matched_pattern = "empty_or_short"
        else:
            # Check patterns
            for i, pattern in enumerate(irrelevant_patterns):
                if re.match(pattern, answer_clean):
                    is_irrelevant = True
                    matched_pattern = f"pattern_{i+1}"
                    break
        
        status = "❌ IRRELEVANT" if is_irrelevant else "✅ RELEVANT"
        print(f"   '{answer}' → {status} (Rule: {matched_pattern or 'none'})")

if __name__ == "__main__":
    print("🚀 INTERVIEW SYSTEM COMPREHENSIVE TEST")
    print("=" * 80)
    
    # Test validation logic first
    test_validation_logic_only()
    
    # Test with authentication
    test_interview_flow_with_auth()
    
    print(f"\n✅ TEST COMPLETED")
    print("=" * 80)