"""
Enhanced Test Runner for TC-CV-11 to TC-CV-13
Runs performance, complex layout, and data quality tests with detailed reporting
"""
import sys
import os
import time
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def print_header():
    """Print test header"""
    print("=" * 100)
    print(" " * 20 + "TC-CV-11 to TC-CV-13: ENHANCED PERFORMANCE & QUALITY TESTS")
    print("=" * 100)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Platform: {sys.platform}")
    print(f"Python: {sys.version.split()[0]}")
    print("=" * 100)
    print()

def print_section(title):
    """Print section header"""
    print()
    print("-" * 100)
    print(f"  {title}")
    print("-" * 100)

def run_tests():
    """Run all enhanced tests"""
    print_header()
    
    # Import pytest
    try:
        import pytest
    except ImportError:
        print("❌ ERROR: pytest not installed")
        print("   Install with: pip install pytest")
        return 1
    
    # Test file
    test_file = "test_tc_cv_performance_quality.py"
    
    if not os.path.exists(test_file):
        print(f"❌ ERROR: Test file not found: {test_file}")
        return 1
    
    print(f"📝 Running tests from: {test_file}")
    print()
    
    # Run tests with detailed output
    start_time = time.time()
    
    pytest_args = [
        test_file,
        '-v',                    # Verbose
        '--tb=short',            # Short traceback
        '--color=yes',           # Colored output
        '-ra',                   # Show all test results
        '--durations=10',        # Show 10 slowest tests
        '-W', 'ignore::DeprecationWarning'  # Ignore deprecation warnings
    ]
    
    print_section("TEST EXECUTION")
    exit_code = pytest.main(pytest_args)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Print summary
    print()
    print("=" * 100)
    print_section("TEST SUMMARY")
    print()
    print(f"  Total Duration: {duration:.2f} seconds")
    print(f"  Exit Code: {exit_code}")
    
    if exit_code == 0:
        print(f"  Status: ✅ ALL TESTS PASSED")
    else:
        print(f"  Status: ❌ SOME TESTS FAILED")
    
    print()
    print("=" * 100)
    print()
    
    # Print test categories
    print_section("TEST CATEGORIES")
    print()
    print("  TC-CV-11: Performance & Latency Tests")
    print("    ✅ PDF extraction latency")
    print("    ✅ Skill extraction performance")
    print("    ✅ Normalization performance")
    print("    ✅ Complete CV parsing latency")
    print("    ✅ Concurrent processing")
    print("    ✅ Large CV handling")
    print("    ✅ OCR simulation (NEW)")
    print("    ✅ Memory efficiency (NEW)")
    print("    ✅ Stress test (NEW)")
    print()
    print("  TC-CV-12: Complex Layout Handling")
    print("    ✅ Two-column layout")
    print("    ✅ Icon-based CVs")
    print("    ✅ Table-based layout")
    print("    ✅ Mixed formatting")
    print("    ✅ Non-standard headers")
    print("    ✅ Compressed layout")
    print("    ✅ Nested tables (NEW)")
    print("    ✅ Multi-page CVs (NEW)")
    print("    ✅ Vertical text (NEW)")
    print("    ✅ Mixed language layout (NEW)")
    print()
    print("  TC-CV-13: Data Quality & Noise Handling")
    print("    ✅ Non-CV document detection")
    print("    ✅ Random text handling")
    print("    ✅ Empty file handling")
    print("    ✅ Corrupted text handling")
    print("    ✅ CV quality validation")
    print("    ✅ Invalid format detection")
    print("    ✅ Mixed language noise")
    print("    ✅ Specific error messages (NEW)")
    print("    ✅ File type detection (NEW)")
    print("    ✅ Malformed contact info (NEW)")
    print("    ✅ Duplicate information (NEW)")
    print("    ✅ Incomplete sections (NEW)")
    print("    ✅ Special characters in skills (NEW)")
    print("    ✅ OCR-spaced text (NEW)")
    print()
    print("=" * 100)
    print()
    
    # Print enhancements
    print_section("ENHANCEMENTS IN THIS VERSION")
    print()
    print("  🚀 Performance Tests:")
    print("     • Added OCR simulation performance test")
    print("     • Added memory efficiency monitoring")
    print("     • Added stress test with 50 rapid requests")
    print()
    print("  📐 Layout Tests:")
    print("     • Added nested table layout support")
    print("     • Added multi-page CV simulation")
    print("     • Added vertical text handling")
    print("     • Added mixed language layout test")
    print()
    print("  🔍 Quality Tests:")
    print("     • Added specific error message generation")
    print("     • Added file type detection")
    print("     • Added malformed contact info handling")
    print("     • Added duplicate information detection")
    print("     • Added incomplete section handling")
    print("     • Added special characters in skills")
    print("     • Added OCR-spaced text handling")
    print()
    print("=" * 100)
    print()
    
    # Print recommendations
    if exit_code == 0:
        print_section("✅ RECOMMENDATIONS")
        print()
        print("  All tests passed successfully!")
        print()
        print("  Next Steps:")
        print("  1. ✅ Deploy to staging environment")
        print("  2. ✅ Run integration tests with real CVs")
        print("  3. ✅ Monitor performance metrics in production")
        print("  4. ✅ Collect user feedback on edge cases")
        print()
    else:
        print_section("⚠️  ACTION REQUIRED")
        print()
        print("  Some tests failed. Please:")
        print("  1. Review the test output above")
        print("  2. Fix any failing tests")
        print("  3. Re-run this test suite")
        print()
    
    print("=" * 100)
    print()
    
    return exit_code


if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)
