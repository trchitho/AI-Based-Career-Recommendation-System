#!/usr/bin/env python3
"""
Test ONET API v2 với logic dừng sau 5 lỗi liên tiếp
Kiểm tra authentication và các endpoints khả dụng
"""

import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load environment
DOTENV_PATH = Path(__file__).resolve().parent / "apps/backend/.env"
load_dotenv(DOTENV_PATH, override=True)

API_KEY = os.getenv("ONET_V2_API_KEY")
BASE_URL = os.getenv("ONET_V2_BASE_URL", "https://api-v2.onetcenter.org")

print(f"🔑 API Key: {API_KEY}")
print(f"🌐 Base URL: {BASE_URL}")
print("=" * 60)

def test_api_endpoint(client: httpx.Client, endpoint: str, description: str) -> bool:
    """Test một endpoint và trả về True nếu thành công"""
    try:
        print(f"📡 Testing {description}: {endpoint}")
        response = client.get(f"{BASE_URL}/{endpoint.lstrip('/')}")
        
        if response.status_code == 200:
            print(f"✅ SUCCESS: {response.status_code}")
            data = response.json()
            if isinstance(data, dict):
                print(f"   Keys: {list(data.keys())[:5]}...")
            return True
        else:
            print(f"❌ FAILED: {response.status_code} - {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"💥 ERROR: {e}")
        return False

def test_career_overview_endpoints(client: httpx.Client, test_codes: list[str]) -> dict:
    """
    Test các endpoints để lấy career overview data
    Trả về dict với thống kê kết quả
    """
    results = {
        "total_tested": 0,
        "successful": 0,
        "failed": 0,
        "consecutive_errors": 0,
        "max_consecutive_errors": 5,
        "stopped_early": False,
        "working_endpoints": [],
        "failed_endpoints": []
    }
    
    # Các endpoints có thể dùng để lấy education/experience data
    test_endpoints = [
        "/online/occupations/{code}/summary/education",
        "/online/occupations/{code}/summary/work_activities", 
        "/online/occupations/{code}/summary/work_context",
        "/database/rows/education_training_experience?filter1=onetsoc_code.eq.{code}",
        "/database/rows/job_zones?filter1=onetsoc_code.eq.{code}",
        "/mnm/occupations/{code}/overview",
        "/mnm/occupations/{code}/education"
    ]
    
    print(f"\n🎯 Testing career overview endpoints with {len(test_codes)} sample codes...")
    print(f"⚠️  Will stop after {results['max_consecutive_errors']} consecutive errors")
    
    for code in test_codes:
        if results["stopped_early"]:
            break
            
        print(f"\n--- Testing with code: {code} ---")
        
        for endpoint_template in test_endpoints:
            if results["stopped_early"]:
                break
                
            endpoint = endpoint_template.format(code=code)
            results["total_tested"] += 1
            
            try:
                print(f"📡 {endpoint}")
                response = client.get(f"{BASE_URL}/{endpoint.lstrip('/')}")
                
                if response.status_code == 200:
                    print(f"✅ SUCCESS: {response.status_code}")
                    results["successful"] += 1
                    results["consecutive_errors"] = 0  # Reset counter
                    
                    # Lưu endpoint thành công
                    if endpoint_template not in results["working_endpoints"]:
                        results["working_endpoints"].append(endpoint_template)
                    
                    # Show sample data
                    try:
                        data = response.json()
                        if isinstance(data, dict):
                            print(f"   Sample keys: {list(data.keys())[:3]}...")
                    except:
                        pass
                        
                else:
                    print(f"❌ FAILED: {response.status_code} - {response.text[:100]}")
                    results["failed"] += 1
                    results["consecutive_errors"] += 1
                    
                    # Lưu endpoint thất bại
                    if endpoint_template not in results["failed_endpoints"]:
                        results["failed_endpoints"].append(endpoint_template)
                    
                    # Kiểm tra dừng sau 5 lỗi liên tiếp
                    if results["consecutive_errors"] >= results["max_consecutive_errors"]:
                        print(f"\n🛑 STOPPING: {results['consecutive_errors']} consecutive errors reached!")
                        results["stopped_early"] = True
                        break
                        
            except Exception as e:
                print(f"💥 ERROR: {e}")
                results["failed"] += 1
                results["consecutive_errors"] += 1
                
                if results["consecutive_errors"] >= results["max_consecutive_errors"]:
                    print(f"\n🛑 STOPPING: {results['consecutive_errors']} consecutive errors reached!")
                    results["stopped_early"] = True
                    break
            
            # Small delay between requests
            time.sleep(0.5)
    
    return results

def main():
    if not API_KEY:
        print("❌ Missing ONET_V2_API_KEY in .env file")
        sys.exit(1)
    
    # Create HTTP client with correct authentication
    client = httpx.Client(
        timeout=30.0,
        headers={
            "X-API-Key": API_KEY,  # Correct authentication method
            "User-Agent": "Career-AI-System/1.0"
        }
    )
    
    try:
        # Test 1: Basic connectivity
        print("🔍 STEP 1: Testing basic connectivity...")
        basic_success = test_api_endpoint(client, "/about/", "API Info")
        
        if not basic_success:
            print("\n❌ Basic connectivity failed. Check API key and network.")
            return
        
        # Test 2: Database tables
        print(f"\n🔍 STEP 2: Testing database access...")
        db_success = test_api_endpoint(client, "/database/", "Database Tables")
        
        # Test 3: Career overview endpoints
        print(f"\n🔍 STEP 3: Testing career overview endpoints...")
        
        # Sample career codes to test
        test_codes = [
            "15-1254.00",  # Web Developers
            "11-1011.00",  # Chief Executives  
            "29-1141.00",  # Registered Nurses
            "25-2021.00",  # Elementary School Teachers
            "13-2011.00"   # Accountants and Auditors
        ]
        
        results = test_career_overview_endpoints(client, test_codes)
        
        # Print summary
        print("\n" + "="*60)
        print("📊 FINAL RESULTS:")
        print(f"   Total endpoints tested: {results['total_tested']}")
        print(f"   Successful: {results['successful']}")
        print(f"   Failed: {results['failed']}")
        print(f"   Success rate: {results['successful']/results['total_tested']*100:.1f}%" if results['total_tested'] > 0 else "   Success rate: 0%")
        print(f"   Stopped early due to errors: {results['stopped_early']}")
        
        if results["working_endpoints"]:
            print(f"\n✅ Working endpoints ({len(results['working_endpoints'])}):")
            for ep in results["working_endpoints"]:
                print(f"   - {ep}")
        
        if results["failed_endpoints"]:
            print(f"\n❌ Failed endpoints ({len(results['failed_endpoints'])}):")
            for ep in results["failed_endpoints"]:
                print(f"   - {ep}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if results["successful"] == 0:
            print("   - API key may be invalid or expired")
            print("   - Check quota limits")
            print("   - Verify API key format and permissions")
        elif results["successful"] > 0:
            print("   - API key is working!")
            print("   - Use working endpoints for data collection")
            if results["stopped_early"]:
                print("   - Some endpoints may have quota limits")
        
    finally:
        client.close()

if __name__ == "__main__":
    main()