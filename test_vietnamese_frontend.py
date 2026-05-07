#!/usr/bin/env python3
"""
Test script to verify Vietnamese language implementation on the career detail page
"""

import requests
import json
import time

def test_backend_api():
    """Test the backend API returns Vietnamese data"""
    print("🧪 Testing Backend API...")
    
    # Test Vietnamese language
    url = "http://localhost:8000/bff/catalog/career/41-2022.00?plan=pro&language=vi"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend API working - Title: {data.get('title', 'N/A')}")
            print(f"✅ Language: {data.get('language', 'N/A')}")
            
            # Check if Vietnamese data is present
            if data.get('language') == 'vi' and data.get('title'):
                print("✅ Vietnamese data is being returned correctly")
                return True
            else:
                print("❌ Vietnamese data not found")
                return False
        else:
            print(f"❌ Backend API error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend API connection error: {e}")
        return False

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    print("\n🧪 Testing Frontend Accessibility...")
    
    try:
        response = requests.get("http://localhost:3001", timeout=10)
        if response.status_code == 200:
            print("✅ Frontend is accessible at http://localhost:3001")
            return True
        else:
            print(f"❌ Frontend error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend connection error: {e}")
        return False

def main():
    print("🚀 Testing Vietnamese Language Implementation")
    print("=" * 50)
    
    backend_ok = test_backend_api()
    frontend_ok = test_frontend_accessibility()
    
    print("\n📋 Test Summary:")
    print("=" * 50)
    
    if backend_ok and frontend_ok:
        print("✅ All tests passed!")
        print("\n🎯 Next Steps:")
        print("1. Open http://localhost:3001/careers/sales/41-2022.00 in your browser")
        print("2. Switch language to Vietnamese using the language selector")
        print("3. Verify all content displays in Vietnamese")
        print("4. Check that both hardcoded UI text and database content are in Vietnamese")
    else:
        print("❌ Some tests failed. Please check the servers are running:")
        print("- Backend: http://localhost:8000")
        print("- Frontend: http://localhost:3001")

if __name__ == "__main__":
    main()