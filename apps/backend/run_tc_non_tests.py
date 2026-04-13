#!/usr/bin/env python3
"""
Runner script for TC-NON-01 to TC-NON-03 tests
Executes all non-CV image detection test cases
"""
import subprocess
import sys

def main():
    print("="*80)
    print("🧪 RUNNING TC-NON-01 to TC-NON-03 TESTS")
    print("   Non-CV Image Detection Test Suite")
    print("="*80)
    print()
    
    # Run pytest with verbose output
    cmd = [
        sys.executable, "-m", "pytest",
        "test_tc_non_images.py",
        "-v",
        "--tb=short",
        "--color=yes"
    ]
    
    result = subprocess.run(cmd, cwd=".")
    
    print()
    print("="*80)
    if result.returncode == 0:
        print("✅ ALL TC-NON TESTS PASSED")
    else:
        print("❌ SOME TC-NON TESTS FAILED")
    print("="*80)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
