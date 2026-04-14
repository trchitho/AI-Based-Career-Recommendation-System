#!/usr/bin/env python3
"""
Runner script for TC-NON-07 to TC-NON-08 integration tests
Executes data protection and UX test cases
"""
import subprocess
import sys


def main():
    print("="*80)
    print("🧪 RUNNING TC-NON-07 to TC-NON-08 INTEGRATION TESTS")
    print("   Data Protection & UX Test Suite")
    print("="*80)
    print()
    
    # Run pytest with verbose output
    cmd = [
        sys.executable, "-m", "pytest",
        "test_tc_non_integration.py",
        "-v",
        "--tb=short",
        "--color=yes"
    ]
    
    result = subprocess.run(cmd, cwd=".")
    
    print()
    print("="*80)
    if result.returncode == 0:
        print("✅ ALL TC-NON INTEGRATION TESTS PASSED")
    else:
        print("❌ SOME TC-NON INTEGRATION TESTS FAILED")
    print("="*80)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
