#!/usr/bin/env python3
"""
Quick test script for Skill Gap API
Run this to check if the API is working
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

def test_backend_running():
    """Test if backend is accessible"""
    print("\n[1/5] Testing backend connection...")
    try:
        import requests
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print("  SUCCESS: Backend is running")
            return True
        else:
            print(f"  ERROR: Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"  ERROR: Cannot connect to backend - {e}")
        print("  TIP: Run 'uvicorn app.main:app --reload --port 8000' in apps/backend")
        return False

def test_database():
    """Test database connection"""
    print("\n[2/5] Testing database connection...")
    try:
        from app.core.db import engine
        with engine.connect() as conn:
            print("  SUCCESS: Database connected")
            return True
    except Exception as e:
        print(f"  ERROR: Database connection failed - {e}")
        print("  TIP: Check DATABASE_URL in .env file")
        return False

def test_table_exists():
    """Test if skill_gap_analyses table exists"""
    print("\n[3/5] Testing table existence...")
    try:
        from app.core.db import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'core' 
                    AND table_name = 'skill_gap_analyses'
                )
            """))
            exists = result.scalar()
            
            if exists:
                print("  SUCCESS: Table 'core.skill_gap_analyses' exists")
                return True
            else:
                print("  ERROR: Table 'core.skill_gap_analyses' not found")
                print("  TIP: Run 'python run_migration.py' in apps/backend")
                return False
    except Exception as e:
        print(f"  ERROR: Cannot check table - {e}")
        return False

def test_routes_registered():
    """Test if skill gap routes are registered"""
    print("\n[4/5] Testing routes registration...")
    try:
        from app.main import app
        
        routes = [route.path for route in app.routes]
        skill_gap_routes = [r for r in routes if '/skill-gap' in r]
        
        if len(skill_gap_routes) > 0:
            print(f"  SUCCESS: Found {len(skill_gap_routes)} skill gap routes:")
            for route in skill_gap_routes:
                print(f"    - {route}")
            return True
        else:
            print("  ERROR: No skill gap routes found")
            print("  TIP: Check if routes are registered in main.py")
            return False
    except Exception as e:
        print(f"  ERROR: Cannot check routes - {e}")
        return False

def test_api_endpoint():
    """Test actual API endpoint"""
    print("\n[5/5] Testing API endpoint...")
    try:
        import requests
        
        # Test without auth (should return 401 or 403)
        response = requests.get('http://localhost:8000/api/skill-gap/my-analyses', timeout=5)
        
        if response.status_code in [401, 403]:
            print("  SUCCESS: API endpoint exists (requires authentication)")
            return True
        elif response.status_code == 200:
            print("  SUCCESS: API endpoint working")
            return True
        elif response.status_code == 404:
            print("  ERROR: API endpoint not found (404)")
            print("  TIP: Check if routes are registered correctly")
            return False
        else:
            print(f"  WARNING: Unexpected status code {response.status_code}")
            return True
    except Exception as e:
        print(f"  ERROR: Cannot test API endpoint - {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Skill Gap API - Quick Test")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Backend Running", test_backend_running()))
    results.append(("Database Connection", test_database()))
    results.append(("Table Exists", test_table_exists()))
    results.append(("Routes Registered", test_routes_registered()))
    results.append(("API Endpoint", test_api_endpoint()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        symbol = "✓" if passed else "X"
        print(f"{symbol} {name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("SUCCESS: All tests passed!")
        print("\nYou can now:")
        print("1. Open http://localhost:3000/skill-gap")
        print("2. Login to your account")
        print("3. Upload a CV and test the feature")
    else:
        print("FAILED: Some tests failed")
        print("\nPlease fix the errors above and try again")
        print("\nCommon fixes:")
        print("- Start backend: cd apps/backend && uvicorn app.main:app --reload --port 8000")
        print("- Start frontend: cd apps/frontend && npm run dev")
        print("- Run migration: cd apps/backend && python run_migration.py")
        print("- Install deps: cd apps/backend && pip install -r requirements_skill_gap.txt")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
