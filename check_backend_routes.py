#!/usr/bin/env python3
"""
Check if backend routes are actually accessible
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

def check_routes_in_code():
    """Check routes in code"""
    print("\n=== Checking Routes in Code ===")
    try:
        from app.main import app
        
        all_routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                all_routes.append({
                    'path': route.path,
                    'methods': route.methods if hasattr(route, 'methods') else ['GET']
                })
        
        # Filter skill-gap routes
        skill_gap_routes = [r for r in all_routes if 'skill-gap' in r['path']]
        
        print(f"\nTotal routes: {len(all_routes)}")
        print(f"Skill Gap routes: {len(skill_gap_routes)}")
        
        if skill_gap_routes:
            print("\nSkill Gap Routes:")
            for route in skill_gap_routes:
                methods = ', '.join(route['methods']) if route['methods'] else 'GET'
                print(f"  {methods:10} {route['path']}")
            return True
        else:
            print("\n❌ No skill gap routes found in code!")
            return False
            
    except Exception as e:
        print(f"❌ Error checking routes: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_routes_live():
    """Check if routes are accessible via HTTP"""
    print("\n=== Checking Live Routes ===")
    try:
        import requests
        
        # Test different endpoints
        tests = [
            ('GET', 'http://localhost:8000/health'),
            ('GET', 'http://localhost:8000/api/skill-gap/my-analyses'),
            ('GET', 'http://localhost:8000/docs'),
        ]
        
        for method, url in tests:
            try:
                if method == 'GET':
                    r = requests.get(url, timeout=2)
                    status = r.status_code
                    
                    # Determine result
                    if 'health' in url:
                        result = '✅ OK' if status == 200 else f'❌ {status}'
                    elif 'skill-gap' in url:
                        # 401/403 is OK (needs auth), 404 is bad
                        if status in [401, 403]:
                            result = '✅ OK (needs auth)'
                        elif status == 404:
                            result = '❌ NOT FOUND'
                        else:
                            result = f'⚠️  {status}'
                    elif 'docs' in url:
                        result = '✅ OK' if status == 200 else f'❌ {status}'
                    else:
                        result = f'{status}'
                    
                    print(f"  {method:6} {url:50} → {result}")
                    
            except requests.exceptions.RequestException as e:
                print(f"  {method:6} {url:50} → ❌ Connection failed")
                
        return True
        
    except Exception as e:
        print(f"❌ Error checking live routes: {e}")
        return False

def check_openapi_spec():
    """Check OpenAPI spec for skill-gap routes"""
    print("\n=== Checking OpenAPI Spec ===")
    try:
        import requests
        r = requests.get('http://localhost:8000/openapi.json', timeout=2)
        
        if r.status_code == 200:
            spec = r.json()
            paths = spec.get('paths', {})
            
            skill_gap_paths = {k: v for k, v in paths.items() if 'skill-gap' in k}
            
            if skill_gap_paths:
                print(f"\n✅ Found {len(skill_gap_paths)} skill-gap endpoints in OpenAPI:")
                for path, methods in skill_gap_paths.items():
                    method_list = ', '.join(methods.keys())
                    print(f"  {path:50} [{method_list}]")
                return True
            else:
                print("\n❌ No skill-gap endpoints in OpenAPI spec!")
                print("This means routes are NOT registered in the running backend.")
                return False
        else:
            print(f"❌ Cannot fetch OpenAPI spec (status {r.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Error checking OpenAPI: {e}")
        return False

def main():
    print("=" * 70)
    print("Backend Routes Checker")
    print("=" * 70)
    
    results = []
    
    # Check 1: Routes in code
    results.append(("Routes in Code", check_routes_in_code()))
    
    # Check 2: Live routes
    results.append(("Live Routes", check_routes_live()))
    
    # Check 3: OpenAPI spec
    results.append(("OpenAPI Spec", check_openapi_spec()))
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status:10} {name}")
    
    # Diagnosis
    print("\n" + "=" * 70)
    print("DIAGNOSIS")
    print("=" * 70)
    
    code_ok = results[0][1]
    live_ok = results[1][1]
    openapi_ok = results[2][1]
    
    if code_ok and not openapi_ok:
        print("\n⚠️  PROBLEM: Routes exist in code but NOT in running backend!")
        print("\n🔧 SOLUTION: Backend needs RESTART")
        print("\nSteps:")
        print("1. Go to terminal running backend")
        print("2. Press Ctrl+C to stop")
        print("3. Run: uvicorn app.main:app --reload --port 8000")
        print("4. Wait for: '✅ Skill Gap Analysis router registered'")
        print("5. Try again")
        
    elif not code_ok:
        print("\n⚠️  PROBLEM: Routes not found in code!")
        print("\n🔧 SOLUTION: Check code files")
        print("\nFiles to check:")
        print("- apps/backend/app/main.py (router registration)")
        print("- apps/backend/app/modules/skill_gap/routes.py (route definitions)")
        
    elif code_ok and openapi_ok and not live_ok:
        print("\n⚠️  PROBLEM: Routes registered but returning 404")
        print("\n🔧 SOLUTION: Check route prefix")
        print("\nVerify:")
        print("- routes.py should NOT have prefix")
        print("- main.py should have prefix='/api/skill-gap'")
        
    elif code_ok and openapi_ok and live_ok:
        print("\n✅ SUCCESS: All checks passed!")
        print("\nAPI is working. If upload still fails:")
        print("1. Check browser console (F12)")
        print("2. Check authentication token")
        print("3. Check file format (PDF only)")
        
    print("=" * 70)
    
    return 0 if all(r[1] for r in results) else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
