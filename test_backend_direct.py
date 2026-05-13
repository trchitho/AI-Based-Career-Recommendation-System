"""Direct test of backend API"""
import requests

BASE_URL = "http://localhost:8000"

print("Testing backend API...")
print("=" * 60)

# Test 1: Health check
try:
    response = requests.get(f"{BASE_URL}/health")
    print(f"✅ Health check: {response.status_code} - {response.json()}")
except Exception as e:
    print(f"❌ Health check failed: {e}")

# Test 2: OpenAPI spec
try:
    response = requests.get(f"{BASE_URL}/openapi.json")
    openapi = response.json()
    skill_gap_routes = [path for path in openapi["paths"].keys() if "skill-gap" in path]
    print(f"\n✅ OpenAPI spec loaded")
    print(f"Found {len(skill_gap_routes)} skill-gap routes:")
    for route in sorted(skill_gap_routes):
        methods = list(openapi["paths"][route].keys())
        print(f"  - {route} [{', '.join(m.upper() for m in methods)}]")
except Exception as e:
    print(f"❌ OpenAPI spec failed: {e}")

# Test 3: Try to call skill-gap endpoint (should return 401 without proper auth)
try:
    response = requests.get(
        f"{BASE_URL}/api/skill-gap/my-analyses",
        headers={"Authorization": "Bearer invalid_token"}
    )
    print(f"\n✅ Skill-gap endpoint responded: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Skill-gap endpoint failed: {e}")

print("\n" + "=" * 60)
print("Tests completed!")
