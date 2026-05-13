"""Test skill_gap routes registration"""
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Create a test app
app = FastAPI()

# Import and register the skill_gap router
from app.modules.skill_gap import routes as skill_gap_router

app.include_router(skill_gap_router.router, prefix="/api/skill-gap", tags=["skill-gap"])

# Create test client
client = TestClient(app)

# Test the routes
print("Testing skill-gap routes...")
print("=" * 60)

# Test 1: GET /api/skill-gap/my-analyses (should return 401 without auth)
response = client.get("/api/skill-gap/my-analyses")
print(f"GET /api/skill-gap/my-analyses: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test 2: Check if route exists in OpenAPI spec
response = client.get("/openapi.json")
openapi = response.json()
skill_gap_routes = [path for path in openapi["paths"].keys() if "skill-gap" in path]
print(f"Skill-gap routes in OpenAPI spec: {len(skill_gap_routes)}")
for route in skill_gap_routes:
    print(f"  - {route}")
print()

print("=" * 60)
print("All tests completed!")
