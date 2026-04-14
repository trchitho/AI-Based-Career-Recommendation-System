"""
Runner script for TC-IMG-11 to TC-IMG-13 tests
Execute OCR edge cases tests
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import and run tests
from test_tc_img_edge_cases import run_tests

if __name__ == '__main__':
    print("\n" + "="*80)
    print("RUNNING TC-IMG-11 TO TC-IMG-13 TESTS")
    print("OCR Edge Cases: Large Files, Multiple Images, No Text")
    print("="*80 + "\n")
    
    exit_code = run_tests()
    
    print("\n" + "="*80)
    if exit_code == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("="*80 + "\n")
    
    sys.exit(exit_code)
