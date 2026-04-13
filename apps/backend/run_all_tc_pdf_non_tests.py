#!/usr/bin/env python3
"""
Runner script for ALL TC-PDF-NON tests (Original + Enhanced)
Executes both test_tc_pdf_non.py and test_tc_pdf_non_enhanced.py
"""
import subprocess
import sys


def main():
    print("="*80)
    print("🧪 RUNNING ALL TC-PDF-NON TESTS (ORIGINAL + ENHANCED)")
    print("="*80)
    print("   Total: 27 tests (15 original + 12 enhanced)")
    print("="*80)
    print()
    
    # Run pytest with both test files
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            "test_tc_pdf_non.py",
            "test_tc_pdf_non_enhanced.py",
            "-v",
            "--tb=short"
        ],
        cwd=".",
        capture_output=False
    )
    
    print()
    print("="*80)
    if result.returncode == 0:
        print("✅ ALL TC-PDF-NON TESTS PASSED (27/27)")
    else:
        print("❌ SOME TC-PDF-NON TESTS FAILED")
    print("="*80)
    
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
