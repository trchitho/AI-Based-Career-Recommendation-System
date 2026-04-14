#!/usr/bin/env python3
"""
Runner script for TC-PDF-NON-01 to TC-PDF-NON-04 tests
Executes all non-CV PDF detection test cases
"""
import subprocess
import sys


def main():
    print("="*80)
    print("🧪 RUNNING TC-PDF-NON-01 to TC-PDF-NON-04 TESTS")
    print("   Non-CV PDF Detection Test Suite")
    print("="*80)
    print()
    
    # Run pytest with verbose output
    cmd = [
        sys.executable, "-m", "pytest",
        "test_tc_pdf_non.py",
        "-v",
        "--tb=short",
        "--color=yes"
    ]
    
    result = subprocess.run(cmd, cwd=".")
    
    print()
    print("="*80)
    if result.returncode == 0:
        print("✅ ALL TC-PDF-NON TESTS PASSED")
    else:
        print("❌ SOME TC-PDF-NON TESTS FAILED")
    print("="*80)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
