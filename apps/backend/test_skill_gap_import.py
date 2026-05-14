"""Test skill_gap router import"""
import sys
import traceback

print("Testing skill_gap router import...")
print("=" * 60)

try:
    from app.modules.skill_gap import routes as skill_gap_router
    print("✅ Import successful!")
    print(f"Router object: {skill_gap_router.router}")
    print(f"Router routes: {len(skill_gap_router.router.routes)}")
    
    # Print all routes
    for route in skill_gap_router.router.routes:
        print(f"  - {route.path} [{', '.join(route.methods)}]")
    
except Exception as e:
    print("❌ Import failed!")
    print(f"Error: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)

print("=" * 60)
print("All tests passed!")
