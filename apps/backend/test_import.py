#!/usr/bin/env python3
"""Test import for VietnamWorks router"""

try:
    from app.modules.vietnamworks.routes import router
    print("✅ Import successful!")
    print(f"Router type: {type(router)}")
    print(f"Router routes: {[route.path for route in router.routes]}")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
