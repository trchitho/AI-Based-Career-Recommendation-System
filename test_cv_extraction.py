#!/usr/bin/env python3
"""
Test CV skill extraction with the fixed Gemini model
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "apps" / "backend"
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

def test_cv_extraction():
    """Test CV skill extraction"""
    try:
        from app.modules.skill_gap.cv_parser import CVParser
        
        print("🧪 Testing CV Skill Extraction")
        print("=" * 50)
        
        # Sample CV text
        sample_cv = """
        Thinh Nguyen Cong
        Fullstack Developer
        
        Email: thinh27324@gmail.com
        Phone: 0896233530
        
        SKILLS:
        - Python programming (3 years experience)
        - React.js and Node.js development
        - PostgreSQL and MongoDB databases
        - Docker containerization
        - AWS cloud services
        - Git version control
        - Agile methodology
        - Team leadership and project management
        
        EXPERIENCE:
        Software Developer at Tech Company (2021-2024)
        - Developed web applications using React and Python
        - Managed database systems and API integrations
        - Led a team of 5 developers
        - Implemented CI/CD pipelines
        """
        
        # Initialize parser
        parser = CVParser()
        
        print(f"📄 Sample CV Text ({len(sample_cv)} chars)")
        print("=" * 30)
        
        # Test keyword extraction (part of hybrid method)
        print("\n🔍 Step 1: Hybrid extraction (keywords + AI)")
        hybrid_skills = parser.extract_skills_hybrid(sample_cv, "software-developer")
        print(f"✅ Found {len(hybrid_skills)} skills via hybrid method:")
        for skill in hybrid_skills[:10]:  # Show first 10
            print(f"   - {skill['name']} ({skill.get('category', 'Unknown')}) [{skill.get('source', 'unknown')}]")
        
        # Test AI extraction only
        print(f"\n🤖 Step 2: AI-only extraction (using {os.getenv('GEMINI_MODEL', 'default')})")
        ai_skills = parser.extract_skills_with_ai(sample_cv, "software-developer")
        print(f"✅ Found {len(ai_skills)} skills via AI:")
        for skill in ai_skills[:10]:  # Show first 10
            print(f"   - {skill['name']} ({skill.get('category', 'Unknown')})")
        
        # Test main extraction method
        print(f"\n🔄 Step 3: Main extraction method")
        all_skills = parser.extract_skills(sample_cv)
        print(f"✅ Total unique skills: {len(all_skills)}")
        
        # Group by source
        keyword_only = [s for s in all_skills if s.get('source') == 'keyword']
        ai_only = [s for s in all_skills if s.get('source') == 'ai']
        
        print(f"   - Keyword-based: {len(keyword_only)}")
        print(f"   - AI-based: {len(ai_only)}")
        
        print(f"\n📊 Final skill list:")
        for i, skill in enumerate(all_skills[:15], 1):  # Show first 15
            source = skill.get('source', 'unknown')
            category = skill.get('category', 'Unknown')
            print(f"   {i:2d}. {skill['name']} ({category}) [{source}]")
        
        if len(all_skills) > 15:
            print(f"   ... and {len(all_skills) - 15} more")
        
        print(f"\n✅ CV extraction test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during CV extraction test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cv_extraction()