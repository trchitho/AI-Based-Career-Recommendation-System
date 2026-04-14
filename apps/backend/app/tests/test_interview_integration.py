#!/usr/bin/env python3
"""
Test interview integration - check if all components are working
"""

import requests
import json

def test_backend_api():
    """Test backend interview API"""
    print("🔍 Testing Backend Interview API...")
    
    try:
        # Test health endpoint
        response = requests.get("http://127.0.0.1:8000/api/interview/health", timeout=5)
        if response.ok:
            print("✅ Interview API Health: OK")
            health_data = response.json()
            print(f"   Services: {health_data.get('services', {})}")
        else:
            print(f"❌ Interview API Health: {response.status_code}")
            return False
            
        # Test job search
        response = requests.get("http://127.0.0.1:8000/api/interview/jobs/search?limit=3", timeout=5)
        if response.ok:
            jobs_data = response.json()
            job_count = len(jobs_data.get('jobs', []))
            print(f"✅ Job Search API: {job_count} jobs found")
            if job_count > 0:
                first_job = jobs_data['jobs'][0]
                print(f"   Sample job: {first_job.get('id')} - {first_job.get('title', '')[:50]}...")
        else:
            print(f"❌ Job Search API: {response.status_code}")
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Backend not running on http://127.0.0.1:8000")
        return False
    except Exception as e:
        print(f"❌ Backend test error: {e}")
        return False

def test_frontend_server():
    """Test frontend server"""
    print("\n🔍 Testing Frontend Server...")
    
    try:
        response = requests.get("http://localhost:3001/", timeout=5)
        if response.ok:
            print("✅ Frontend Server: Running on port 3001")
            return True
        else:
            print(f"❌ Frontend Server: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Frontend not running on http://localhost:3001")
        return False
    except Exception as e:
        print(f"❌ Frontend test error: {e}")
        return False

def check_file_structure():
    """Check if all required files exist"""
    print("\n🔍 Checking File Structure...")
    
    import os
    
    required_files = [
        "apps/frontend/src/App.tsx",
        "apps/frontend/src/components/layout/MainLayout.tsx", 
        "apps/frontend/src/components/dashboard/InterviewActionCard.tsx",
        "apps/frontend/src/pages/InterviewPage.tsx",
        "apps/frontend/src/pages/InterviewListPage.tsx",
        "apps/frontend/src/pages/InterviewSelectionPage.tsx",
        "apps/frontend/src/pages/InterviewHistoryPage.tsx",
        "apps/frontend/src/pages/InterviewResultsPage.tsx",
        "apps/frontend/src/services/interviewService.ts",
        "apps/frontend/src/i18n/locales/en.json",
        "apps/frontend/src/i18n/locales/vi.json",
        "apps/backend/app/modules/interview/routes.py",
        "apps/backend/app/modules/interview/models.py",
        "apps/backend/app/modules/interview/schemas.py",
        "apps/backend/app/modules/interview/services.py",
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"\n❌ Missing files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    else:
        print(f"\n✅ All {len(required_files)} required files exist")
        return True

def check_routes_registration():
    """Check if routes are properly registered"""
    print("\n🔍 Checking Routes Registration...")
    
    # Check App.tsx for interview routes
    try:
        with open("apps/frontend/src/App.tsx", "r", encoding="utf-8") as f:
            app_content = f.read()
            
        interview_routes = [
            'path="/interview"',
            'path="/interview/selection/:jobId"', 
            'path="/interview/:jobId"',
            'path="/interview/history"',
            'path="/interview/results/:sessionId"'
        ]
        
        missing_routes = []
        for route in interview_routes:
            if route not in app_content:
                missing_routes.append(route)
            else:
                print(f"✅ Route registered: {route}")
        
        if missing_routes:
            print(f"❌ Missing routes in App.tsx:")
            for route in missing_routes:
                print(f"   - {route}")
            return False
        else:
            print("✅ All interview routes registered in App.tsx")
            
    except Exception as e:
        print(f"❌ Error checking App.tsx: {e}")
        return False
    
    # Check MainLayout.tsx for navigation
    try:
        with open("apps/frontend/src/components/layout/MainLayout.tsx", "r", encoding="utf-8") as f:
            layout_content = f.read()
            
        if 'to: "/interview"' in layout_content and "t('nav.interview')" in layout_content:
            print("✅ Interview navigation added to MainLayout.tsx")
        else:
            print("❌ Interview navigation missing from MainLayout.tsx")
            return False
            
    except Exception as e:
        print(f"❌ Error checking MainLayout.tsx: {e}")
        return False
        
    return True

def check_translations():
    """Check if translations are added"""
    print("\n🔍 Checking Translations...")
    
    try:
        # Check English translations
        with open("apps/frontend/src/i18n/locales/en.json", "r", encoding="utf-8") as f:
            en_data = json.load(f)
            
        if en_data.get("nav", {}).get("interview") == "Interview":
            print("✅ English translation: nav.interview = 'Interview'")
        else:
            print("❌ Missing English translation for nav.interview")
            return False
            
        # Check Vietnamese translations  
        with open("apps/frontend/src/i18n/locales/vi.json", "r", encoding="utf-8") as f:
            vi_data = json.load(f)
            
        if vi_data.get("nav", {}).get("interview") == "Phỏng vấn":
            print("✅ Vietnamese translation: nav.interview = 'Phỏng vấn'")
        else:
            print("❌ Missing Vietnamese translation for nav.interview")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error checking translations: {e}")
        return False

def main():
    """Run all tests"""
    print("🎯 Interview Integration Test")
    print("=" * 50)
    
    results = []
    
    # Test each component
    results.append(("File Structure", check_file_structure()))
    results.append(("Routes Registration", check_routes_registration()))
    results.append(("Translations", check_translations()))
    results.append(("Backend API", test_backend_api()))
    results.append(("Frontend Server", test_frontend_server()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Interview integration is complete.")
        print("\n📍 Access Points:")
        print("   • Frontend: http://localhost:3001/interview")
        print("   • Backend API: http://127.0.0.1:8000/api/interview/health")
        print("   • Navigation: Click 'Interview' in main menu")
        print("   • Dashboard: Interview action card")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please fix the issues above.")
    
    return passed == total

if __name__ == "__main__":
    main()