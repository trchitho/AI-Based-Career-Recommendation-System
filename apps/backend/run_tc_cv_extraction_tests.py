"""
Test Runner for TC-CV-04 to TC-CV-07
Runs all CV extraction tests and generates comprehensive report
"""
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def run_extraction_tests():
    """Run all CV extraction tests"""
    print("="*80)
    print("TC-CV-04 to TC-CV-07: CV EXTRACTION TEST SUITE")
    print("="*80)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Import test module
    try:
        import pytest
        
        # Run tests with detailed output
        test_file = os.path.join(os.path.dirname(__file__), 'test_tc_cv_extraction.py')
        
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
        'TC-CV-04': {
            'name': 'Personal Information Extraction',
            'tests': [
                'Extract name from standard format',
                'Extract email from various formats',
                'Extract Vietnamese phone numbers',
                'No confusion between fields',
                'Extract with Vietnamese diacritics',
                'Handle missing personal info',
                'Multiple emails - take first',
            ]
        },
        'TC-CV-05': {
            'name': 'Skills Extraction',
            'tests': [
                'Extract skills from bullet points',
                'Extract skills from paragraph',
                'Extract skills from mixed format',
                'Verify skills have categories',
                'Extract soft skills',
                'Case-insensitive extraction',
                'No duplicate skills',
            ]
        },
        'TC-CV-06': {
            'name': 'Skill Normalization',
            'tests': [
                'Normalize React variants',
                'Normalize JavaScript variants',
                'Normalize Node.js variants',
                'Normalize database variants',
                'Normalize cloud platforms',
                'Preserve unique skills',
                'Case-insensitive normalization',
            ]
        },
        'TC-CV-07': {
            'name': 'Experience Extraction',
            'tests': [
                'Extract experience with dates',
                'Calculate total years',
                'Extract job titles',
                'Handle various date formats',
                'Handle current position',
                'Extract company names',
                'Extract responsibilities',
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
    exit_code = run_extraction_tests()
    
    sys.exit(exit_code)
