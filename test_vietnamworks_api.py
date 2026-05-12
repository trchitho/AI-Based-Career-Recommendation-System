#!/usr/bin/env python3
"""
Test script for VietnamWorks API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/vietnamworks"

def test_endpoint(endpoint, description):
    """Test a specific endpoint"""
    try:
        print(f"\n🧪 Testing: {description}")
        print(f"📡 Endpoint: {endpoint}")
        
        response = requests.get(f"{BASE_URL}{endpoint}")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Data type: {type(data)}")
            
            if isinstance(data, list):
                print(f"📋 Found {len(data)} items")
                if data:
                    print(f"🔍 Sample item: {json.dumps(data[0], indent=2, ensure_ascii=False)[:300]}...")
            elif isinstance(data, dict):
                print(f"🗂️  Keys: {list(data.keys())}")
                if 'categories' in data:
                    print(f"📊 Categories: {data['categories']}")
                if 'groups' in data:
                    print(f"🗂️  Groups: {data['groups']}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {e}")

def main():
    """Test all VietnamWorks API endpoints"""
    print("🚀 Testing VietnamWorks API Endpoints")
    print("=" * 50)
    
    # Test endpoints
    test_cases = [
        ("/stats", "Get VietnamWorks statistics"),
        ("/categories?limit=5", "Get first 5 categories"),
        ("/categories/groups", "Get category groups"),
        ("/categories/search?q=kế toán", "Search for 'kế toán'"),
        ("/categories/1", "Get category by ID (1)"),
        ("/categories/slug/phan-mem-may-tinh", "Get category by slug"),
        ("/mapping/career/1", "Get career mappings for career 1"),
        ("/mapping/category/1", "Get category mappings for category 1"),
    ]
    
    for endpoint, description in test_cases:
        test_endpoint(endpoint, description)
    
    print("\n" + "=" * 50)
    print("🎯 Test completed!")

if __name__ == "__main__":
    main()
