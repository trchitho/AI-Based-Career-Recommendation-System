"""
Runner script for TC-IMG-05 to TC-IMG-07 tests
Execute advanced OCR feature tests
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import and run tests
from test_tc_img_advanced import run_tests

if __name__ == '__main__':
    print("\n" + "="*80)
    print("RUNNING TC-IMG-05 TO TC-IMG-07 TESTS")
    print("Advanced OCR Features: Background Separation, Skill Bars, Multi-column")
    print("="*80 + "\n")
    
    exit_code = run_tests()
    
    print("\n" + "="*80)
    if exit_code == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("="*80 + "\n")
    
    sys.exit(exit_code)
