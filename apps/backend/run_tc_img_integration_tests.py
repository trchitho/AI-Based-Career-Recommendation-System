"""
Runner script for TC-IMG-08 to TC-IMG-10 tests
Execute OCR integration tests
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import and run tests
from test_tc_img_integration import run_tests

if __name__ == '__main__':
    print("\n" + "="*80)
    print("RUNNING TC-IMG-08 TO TC-IMG-10 TESTS")
    print("OCR Integration: Typo Correction, pgvector, Preview")
    print("="*80 + "\n")
    
    exit_code = run_tests()
    
    print("\n" + "="*80)
    if exit_code == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("="*80 + "\n")
    
    sys.exit(exit_code)
