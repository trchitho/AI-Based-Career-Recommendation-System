#!/usr/bin/env python3
"""
Test ONET API với key mới
"""
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
DOTENV_PATH = Path(__file__).resolve().parent / "apps/backend/.env"
load_dotenv(DOTENV_PATH, override=True)

ONET_V2_API_KEY = os.getenv("ONET_V2_API_KEY", "olWgU-nSeQf-rNikQ-UtkBU")
ONET_V2_BASE_URL = os.getenv("ONET_V2_BASE_URL", "https://api-v2.onetcenter.org")

def test_api():
    print("🧪 TEST ONET API")
    print("=" * 50)
    print(f"API Key: {ONET_V2_API_KEY}")
    print(f"Base URL: {ONET_V2_BASE_URL}")
    
    # Test với endpoint /about/ trước
    session = requests.Session()
    session.headers.update({
        'X-API-Key': ONET_V2_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'Career-AI-System/2.0'
    })
    
    print("\n1️⃣ Test endpoint /about/")
    try:
        url = f"{ONET_V2_BASE_URL}/about/"
        params = {'client': 'github_trchitho_ai_b_1'}
        response = session.get(url, params=params, timeout=30)
        print(f"   Status: {response.status_code}")
        print(f"   URL với params: {response.url}")
        if response.status_code == 200:
            print("   ✅ API Key hợp lệ!")
            data = response.json()
            print(f"   Response: {data}")
        else:
            print(f"   ❌ Lỗi: {response.text}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    print("\n3️⃣ Khám phá các endpoint có sẵn")
    try:
        # Thử các endpoint cơ bản
        endpoints_to_test = [
            "/ws/",
            "/ws/online/",
            "/ws/mnm/",
            "/database/",
        ]
        
        for endpoint in endpoints_to_test:
            print(f"\n   Thử endpoint: {endpoint}")
            url = f"{ONET_V2_BASE_URL}{endpoint}"
            params = {'client': 'github_trchitho_ai_b_1'}
            response = session.get(url, params=params, timeout=30)
            print(f"   Status: {response.status_code}")
            print(f"   URL với params: {response.url}")
            if response.status_code == 200:
                print("   ✅ Endpoint này hoạt động!")
                try:
                    data = response.json()
                    print(f"   Response: {data}")
                except:
                    print(f"   Response text: {response.text[:300]}...")
            else:
                print(f"   ❌ Status: {response.status_code}")
                
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        
    print("\n5️⃣ Test lấy dữ liệu education từ database")
    try:
        # Thử lấy dữ liệu education cho một ONET code
        test_code = "11-1011.00"
        url = f"{ONET_V2_BASE_URL}/database/rows/education_training_experience"
        
        # Thêm filter cho ONET code cụ thể + client parameter
        params = {
            'filter1': f'onetsoc_code.eq.{test_code}',
            'client': 'github_trchitho_ai_b_1'
        }
        
        response = session.get(url, params=params, timeout=30)
        print(f"   URL: {url}")
        print(f"   Params: {params}")
        print(f"   Full URL: {response.url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Education data endpoint hoạt động!")
            data = response.json()
            print(f"   Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not dict'}")
            if isinstance(data, dict) and 'row' in data:
                print(f"   Số rows: {len(data['row'])}")
                if data['row']:
                    print(f"   Sample row: {data['row'][0]}")
        else:
            print(f"   ❌ Lỗi: {response.text[:300]}...")
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")

if __name__ == '__main__':
    test_api()