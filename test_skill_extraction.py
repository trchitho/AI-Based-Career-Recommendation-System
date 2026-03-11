"""
Test script to debug skill extraction issues
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'backend'))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from app.modules.content.models import Career, CareerKSA

# Database connection
DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"
engine = create_engine(DATABASE_URL)

def test_career_lookup():
    """Test if we can find software-engineer career"""
    print("\n=== Testing Career Lookup ===")
    with Session(engine) as session:
        # Try to find software-engineer
        stmt = select(Career).where(Career.slug == 'software-engineer')
        result = session.execute(stmt)
        career = result.scalar_one_or_none()
        
        if career:
            print(f"✅ Found career: {career.title_en or career.title_vi}")
            print(f"   Slug: {career.slug}")
            print(f"   ONET Code: {career.onet_code}")
            return career.onet_code
        else:
            print("❌ Career 'software-engineer' not found")
            
            # List available careers
            print("\n📋 Available careers (first 10):")
            stmt = select(Career).limit(10)
            result = session.execute(stmt)
            for c in result.scalars():
                print(f"   - {c.slug} (ONET: {c.onet_code})")
            return None

def test_skills_for_career(onet_code):
    """Test if we can find skills for a career"""
    print(f"\n=== Testing Skills for {onet_code} ===")
    with Session(engine) as session:
        stmt = select(CareerKSA).where(
            CareerKSA.onet_code == onet_code,
            CareerKSA.ksa_type == 'skill'
        ).limit(10)
        result = session.execute(stmt)
        skills = result.scalars().all()
        
        if skills:
            print(f"✅ Found {len(skills)} skills:")
            for skill in skills[:10]:
                print(f"   - {skill.name} ({skill.category}) - Importance: {skill.importance}")
        else:
            print(f"❌ No skills found for {onet_code}")

def test_all_skills():
    """Test loading all skills from database"""
    print("\n=== Testing All Skills ===")
    with Session(engine) as session:
        stmt = select(CareerKSA.name, CareerKSA.category).distinct()
        result = session.execute(stmt)
        
        skills_dict = {}
        for name, category in result:
            skill_lower = name.lower()
            if skill_lower not in skills_dict:
                skills_dict[skill_lower] = category or 'Other'
        
        print(f"✅ Total unique skills in database: {len(skills_dict)}")
        print(f"\n📋 Sample skills (first 20):")
        for i, (skill, cat) in enumerate(list(skills_dict.items())[:20]):
            print(f"   {i+1}. {skill} ({cat})")

if __name__ == "__main__":
    print("🔍 Testing Skill Gap Database Queries")
    print("=" * 50)
    
    # Test 1: Career lookup
    onet_code = test_career_lookup()
    
    # Test 2: Skills for career
    if onet_code:
        test_skills_for_career(onet_code)
    
    # Test 3: All skills
    test_all_skills()
    
    print("\n" + "=" * 50)
    print("✅ Tests complete!")
