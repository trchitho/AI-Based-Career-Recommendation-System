"""
Test Runner for TC-CV-11 to TC-CV-13
Runs performance, complex layout, and data quality tests
"""
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def run_performance_quality_tests():
    """Run all performance and quality tests"""
    print("="*80)
    print("TC-CV-11 to TC-CV-13: PERFORMANCE & QUALITY TEST SUITE")
    print("="*80)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Import test module
    try:
        import pytest
        
        # Run tests with detailed output
        test_file = os.path.join(os.path.dirname(__file__), 'test_tc_cv_performance_quality.py')
        
        pytest_args = [
            test_file,
            '-v',
            '--tb=short',
            '--color=yes',
            '-ra',  # Show summary of all test outcomes
        ]
        
        print("Running tests...")
        print()
        
        exit_code = pytest.main(pytest_args)
        
        print()
        print("="*80)
        print("TEST EXECUTION SUMMARY")
        print("="*80)
        print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Exit Code: {exit_code}")
        
        if exit_code == 0:
            print("✅ ALL TESTS PASSED")
        else:
            print("❌ SOME TESTS FAILED")
        
        print("="*80)
        
        return exit_code
        
    except ImportError as e:
        print(f"❌ Error: {e}")
        print("Please install pytest: pip install pytest")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


def generate_test_report():
    """Generate detailed test report"""
    print("\n" + "="*80)
    print("TEST COVERAGE REPORT")
    print("="*80)
    print()
    
    test_cases = {
        'TC-CV-11': {
            'name': 'Performance & Latency',
            'tests': [
                'PDF extraction latency (< 2s)',
                'Skill extraction performance (< 1s)',
                'Normalization performance (< 0.1s)',
                'Complete CV parsing (< 10s SLA)',
                'Concurrent processing efficiency',
                'Large CV handling (< 5s)',
            ]
        },
        'TC-CV-12': {
            'name': 'Complex Layout Handling',
            'tests': [
                'Two-column layout extraction',
                'Icon-based CV handling',
                'Table-based layout',
                'Mixed formatting (bold/italic)',
                'Non-standard section headers',
                'Compressed layout (no whitespace)',
            ]
        },
        'TC-CV-13': {
            'name': 'Noisy Data & Quality',
            'tests': [
                'Non-CV document detection',
                'Random text file handling',
                'Empty file handling',
                'Corrupted text handling',
                'CV quality validation',
                'Invalid format detection',
                'Mixed language with noise',
            ]
        }
    }
    
    for test_id, test_info in test_cases.items():
        print(f"{test_id}: {test_info['name']}")
        print(f"  Total test cases: {len(test_info['tests'])}")
        for i, test in enumerate(test_info['tests'], 1):
            print(f"    {i}. {test}")
        print()
    
    total_tests = sum(len(info['tests']) for info in test_cases.values())
    print(f"Total Test Cases: {total_tests}")
    print("="*80)


if __name__ == '__main__':
    # Generate report first
    generate_test_report()
    
    print()
    
    # Run tests
    exit_code = run_performance_quality_tests()
    
    sys.exit(exit_code)
