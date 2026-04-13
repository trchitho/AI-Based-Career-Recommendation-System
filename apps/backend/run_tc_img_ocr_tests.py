"""
Test Runner for TC-IMG-01 to TC-IMG-04
Runs OCR testing for image-based CVs
"""
import sys
import os
import time
from datetime import datetime

def print_header():
    """Print test header"""
    print("=" * 100)
    print(" " * 30 + "TC-IMG-01 to TC-IMG-04: OCR TESTING")
    print("=" * 100)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Platform: {sys.platform}")
    print(f"Python: {sys.version.split()[0]}")
    print("=" * 100)
    print()

def run_tests():
    """Run all OCR tests"""
    print_header()
    
    try:
        import pytest
    except ImportError:
        print("❌ ERROR: pytest not installed")
        return 1
    
    test_file = "test_tc_img_ocr.py"
    
    if not os.path.exists(test_file):
        print(f"❌ ERROR: Test file not found: {test_file}")
        return 1
    
    print(f"📝 Running OCR tests from: {test_file}")
    print()
    
    start_time = time.time()
    
    pytest_args = [
        test_file,
        '-v',
        '--tb=short',
        '--color=yes',
        '-ra',
        '-W', 'ignore::DeprecationWarning'
    ]
    
    exit_code = pytest.main(pytest_args)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print()
    print("=" * 100)
    print(f"  Total Duration: {duration:.2f} seconds")
    print(f"  Exit Code: {exit_code}")
    
    if exit_code == 0:
        print(f"  Status: ✅ ALL TESTS PASSED")
    else:
        print(f"  Status: ❌ SOME TESTS FAILED")
    
    print("=" * 100)
    
    return exit_code


if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)
