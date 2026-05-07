#!/usr/bin/env python3
"""
Test to verify the generate-stories-batch API is working and explain visibility issue
"""

import requests
import json

def test_story_api():
    """Test the generate-stories-batch API"""
    url = "http://localhost:8000/api/assessments/generate-stories-batch"
    
    # Sample payload matching the frontend format
    payload = {
        "questions": [
            {
                "id": "1",
                "question_text": "I like to work with tools and machines",
                "dimension": "R",
                "test_type": "RIASEC"
            },
            {
                "id": "2", 
                "question_text": "I enjoy solving complex problems",
                "dimension": "I",
                "test_type": "RIASEC"
            },
            {
                "id": "3",
                "question_text": "I like to express myself creatively",
                "dimension": "A", 
                "test_type": "RIASEC"
            },
            {
                "id": "4",
                "question_text": "I enjoy helping others",
                "dimension": "S",
                "test_type": "RIASEC"
            },
            {
                "id": "5",
                "question_text": "I like to lead and persuade others",
                "dimension": "E",
                "test_type": "RIASEC"
            }
        ],
        "group_size": 5
    }
    
    try:
        print("🔍 Testing generate-stories-batch API...")
        print(f"📡 URL: {url}")
        print(f"📦 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.ok:
            data = response.json()
            print("[OK] API Response Success!")
            print(f"📖 Groups generated: {len(data.get('groups', []))}")
            print(f"📝 Scenarios generated: {len(data.get('scenarios', []))}")
            print(f"🎯 Success flag: {data.get('success', False)}")
            
            # Show first scenario as example
            scenarios = data.get('scenarios', [])
            if scenarios:
                first_scenario = scenarios[0]
                print(f"\n📚 Example scenario:")
                print(f"   Emoji: {first_scenario.get('emoji', 'N/A')}")
                print(f"   Title: {first_scenario.get('title', 'N/A')}")
                print(f"   Context: {first_scenario.get('context', 'N/A')[:100]}...")
                
        else:
            print(f"[ERR] API Error: {response.status_code}")
            print(f"📄 Error Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("[ERR] Connection Error: Backend server not running on localhost:8000")
    except requests.exceptions.Timeout:
        print("⏰ Timeout Error: API took too long to respond")
    except Exception as e:
        print(f"[ERR] Unexpected Error: {e}")

def explain_visibility_issue():
    """Explain why user might not see the API in Network tab"""
    print("\n" + "="*60)
    print("🔍 WHY YOU MIGHT NOT SEE THE API IN NETWORK TAB")
    print("="*60)
    
    print("""
📋 POSSIBLE REASONS:

1. 🎮 USING GAME MODES INSTEAD OF STORY MODE
   - If you select 'Puzzle Game' or 'Animated Quiz' from /quiz-modes
   - These modes use different components (TetrisQuizGame, GameQuizMode)
   - They DON'T call the generate-stories-batch API

2. 🚪 NOT ACCESSING STORY MODE
   - Story mode is accessed via: /assessment (without mode parameter)
   - Or by going directly to /assessment?mode=legacy
   - Only the StoryBasedAssessment component calls this API

3. 🔄 CACHED RESPONSES
   - The StoryBasedAssessment has caching logic
   - If stories were generated before, it might use cached data
   - Clear browser cache to force new API calls

4. ⚡ FAST API CALLS
   - The API call happens during loading phase
   - It might be too quick to notice in Network tab
   - Look for calls during the "Generating stories..." loading message

📍 TO SEE THE API CALL:
1. Go to /assessment (not /quiz-modes)
2. Open Network tab in DevTools
3. Filter by 'generate-stories-batch'
4. The call happens during initial loading

🎯 CURRENT SETUP:
- [OK] API exists and works: POST /api/assessments/generate-stories-batch
- [OK] Frontend calls it: StoryBasedAssessment.tsx line ~280
- [OK] Used in: EnhancedAssessmentFlow -> StoryBasedAssessment
- [OK] Accessed via: /assessment (legacy mode)
""")

if __name__ == "__main__":
    test_story_api()
    explain_visibility_issue()