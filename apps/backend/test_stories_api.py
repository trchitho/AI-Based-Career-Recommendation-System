#!/usr/bin/env python3
"""
Test the generate-stories-batch API
"""

import requests
import json

def test_stories_api():
    url = "http://localhost:8000/api/assessments/generate-stories-batch"
    
    payload = {
        "questions": [
            {
                "id": "1",
                "question_text": "Bạn thích làm việc với máy móc và công cụ",
                "test_type": "riasec",
                "dimension": "realistic"
            },
            {
                "id": "2", 
                "question_text": "Bạn thích nghiên cứu và phân tích dữ liệu",
                "test_type": "riasec",
                "dimension": "investigative"
            }
        ],
        "group_size": 5
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("🔍 Testing API:", url)
    print("📤 Payload:", json.dumps(payload, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        print(f"📥 Status Code: {response.status_code}")
        print(f"📥 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("❌ Error Response:")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_stories_api()