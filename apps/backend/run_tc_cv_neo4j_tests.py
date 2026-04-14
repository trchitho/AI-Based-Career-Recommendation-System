"""
Test Runner for TC-CV-08 to TC-CV-10
Runs Neo4j integration, heatmap, and mixed language tests
"""
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def run_neo4j_integration_tests():
    """Run all Neo4j integration tests"""
    print("="*80)
    print("TC-CV-08 to TC-CV-10: NEO4J INTEGRATION TEST SUITE")
    print("="*80)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Import test module
    try:
        import pytest
        
        # Run tests with detailed output
        test_file = os.path.join(os.path.dirname(__file__), 'test_tc_cv_neo4j_integration.py')
        
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
        'TC-CV-08': {
            'name': 'Neo4j Mapping & Relationships',
            'tests': [
                'Skill gap analysis creates relationships',
                'Matched skills have :HAS_SKILL data',
                'Skill gaps categorized for Neo4j',
                'User node structure',
                'Skill node structure',
                'Relationship properties',
                'Career node structure',
            ]
        },
        'TC-CV-09': {
            'name': 'Skill Gap Heatmap Visualization',
            'tests': [
                'Heatmap data structure',
                'Matched skills display blue/green',
                'Critical gaps display red',
                'Important gaps display orange',
                'Legend includes all categories',
                'Nodes have required properties',
            ]
        },
        'TC-CV-10': {
            'name': 'Mixed Language Processing',
            'tests': [
                'Extract skills from bilingual CV',
                'Vietnamese skill names recognized',
                'Mixed language personal info',
                'English skills in Vietnamese context',
                'Normalization with mixed language',
                'PhoBERT compatible text',
                'Skill gap analysis with bilingual CV',
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
    exit_code = run_neo4j_integration_tests()
    
    sys.exit(exit_code)
