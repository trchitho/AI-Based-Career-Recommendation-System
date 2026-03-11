#!/usr/bin/env python3
"""
Verification script for Skill Gap Analysis feature
Run this to verify all components are working correctly
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

def test_imports():
    """Test all required imports"""
    print("Testing imports...")
    
    try:
        from app.modules.skill_gap import routes
        print("  - routes.py imported")
    except Exception as e:
        print(f"  X routes.py failed: {e}")
        return False
    
    try:
        from app.modules.skill_gap import service
        print("  - service.py imported")
    except Exception as e:
        print(f"  X service.py failed: {e}")
        return False
    
    try:
        from app.modules.skill_gap import models
        print("  - models.py imported")
    except Exception as e:
        print(f"  X models.py failed: {e}")
        return False
    
    try:
        from app.modules.skill_gap import schemas
        print("  - schemas.py imported")
    except Exception as e:
        print(f"  X schemas.py failed: {e}")
        return False
    
    try:
        from app.modules.skill_gap import cv_parser
        print("  - cv_parser.py imported")
    except Exception as e:
        print(f"  X cv_parser.py failed: {e}")
        return False
    
    try:
        from app.modules.skill_gap import graph_analyzer
        print("  - graph_analyzer.py imported")
    except Exception as e:
        print(f"  X graph_analyzer.py failed: {e}")
        return False
    
    return True

def test_cv_parser():
    """Test CV parser functionality"""
    print("\nTesting CV parser...")
    
    try:
        from app.modules.skill_gap.cv_parser import CVParser
        
        parser = CVParser()
        
        # Test with sample text
        sample_text = """
        John Doe
        Software Engineer
        
        Skills:
        - Python, JavaScript, React, Node.js
        - MySQL, PostgreSQL, MongoDB
        - Docker, AWS, Git
        
        Experience:
        - Built web applications using React and Node.js
        - Worked with databases and REST APIs
        """
        
        skills = parser.extract_skills(sample_text)
        print(f"  - Extracted {len(skills)} skills: {', '.join([s['name'] for s in skills[:5]])}")
        
        if len(skills) > 0:
            print("  - CV parser working correctly")
            return True
        else:
            print("  X No skills extracted")
            return False
            
    except Exception as e:
        print(f"  X CV parser failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from app.core.db import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("  - Database connection successful")
            
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'core' 
                    AND table_name = 'skill_gap_analyses'
                )
            """))
            exists = result.scalar()
            
            if exists:
                print("  - Table 'core.skill_gap_analyses' exists")
                return True
            else:
                print("  X Table 'core.skill_gap_analyses' not found")
                return False
                
    except Exception as e:
        print(f"  X Database connection failed: {e}")
        return False

def test_main_app():
    """Test main FastAPI app"""
    print("\nTesting main app...")
    
    try:
        from app.main import app
        
        # Check if skill gap routes are registered
        routes = [route.path for route in app.routes]
        skill_gap_routes = [r for r in routes if '/skill-gap' in r]
        
        if len(skill_gap_routes) > 0:
            print(f"  - Found {len(skill_gap_routes)} skill gap routes:")
            for route in skill_gap_routes:
                print(f"    - {route}")
            return True
        else:
            print("  X No skill gap routes found")
            return False
            
    except Exception as e:
        print(f"  X Main app failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Skill Gap Analysis - Verification Script")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("CV Parser", test_cv_parser()))
    results.append(("Database", test_database_connection()))
    results.append(("Main App", test_main_app()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        symbol = "✓" if passed else "X"
        print(f"{symbol} {name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("SUCCESS: All tests passed!")
        print("The Skill Gap Analysis feature is ready to use.")
    else:
        print("WARNING: Some tests failed.")
        print("Please check the errors above and fix them.")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
