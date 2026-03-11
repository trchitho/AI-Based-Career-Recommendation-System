#!/usr/bin/env python3
"""
Test the skill gap analysis components directly
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

def test_skill_gap_components():
    """Test the skill gap analysis components"""
    try:
        from app.modules.skill_gap.cv_parser import CVParser
        from app.modules.skill_gap.graph_analyzer import SkillGraphAnalyzer
        
        print("🎯 Testing Skill Gap Analysis Components")
        print("=" * 50)
        
        # Sample CV content
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
        
        career_id = "marketing-managers-11-2021-00"  # Use a career we know exists
        
        print(f"📄 CV Text: {len(sample_cv)} characters")
        print(f"🎯 Target Career: {career_id}")
        print()
        
        # Step 1: Extract skills from CV
        print("🔄 Step 1: Extracting skills from CV...")
        cv_parser = CVParser()
        cv_skills = cv_parser.extract_skills_hybrid(sample_cv, career_id)
        
        print(f"✅ Extracted {len(cv_skills)} skills:")
        for i, skill in enumerate(cv_skills[:10], 1):
            source = skill.get('source', 'unknown')
            category = skill.get('category', 'Unknown')
            print(f"   {i:2d}. {skill['name']} ({category}) [{source}]")
        if len(cv_skills) > 10:
            print(f"   ... and {len(cv_skills) - 10} more")
        
        # Step 2: Extract personal info
        print(f"\n🔄 Step 2: Extracting personal information...")
        personal_info = cv_parser.extract_personal_info(sample_cv)
        print(f"✅ Personal Info:")
        print(f"   - Name: {personal_info.get('name', 'Not found')}")
        print(f"   - Email: {personal_info.get('email', 'Not found')}")
        print(f"   - Phone: {personal_info.get('phone', 'Not found')}")
        
        # Step 3: Analyze skill gap
        print(f"\n🔄 Step 3: Analyzing skill gap...")
        graph_analyzer = SkillGraphAnalyzer()
        
        # Get job requirements
        job_skills = graph_analyzer.get_job_required_skills(career_id)
        print(f"✅ Job Requirements ({len(job_skills)} skills):")
        for i, skill in enumerate(job_skills[:5], 1):
            print(f"   {i:2d}. {skill['name']} ({skill.get('category', 'Unknown')})")
        if len(job_skills) > 5:
            print(f"   ... and {len(job_skills) - 5} more")
        
        # Perform gap analysis
        analysis_result = graph_analyzer.analyze_skill_gap(cv_skills, career_id)
        
        print(f"\n📊 Gap Analysis Results:")
        print(f"   - Match Percentage: {analysis_result.get('match_percentage', 0):.1f}%")
        print(f"   - Total Required: {analysis_result.get('total_required_skills', 0)}")
        print(f"   - Skills Matched: {analysis_result.get('matched_skills_count', 0)}")
        print(f"   - Skills Missing: {analysis_result.get('missing_skills_count', 0)}")
        
        # Show matched skills
        matched_skills = analysis_result.get('matched_skills', [])
        print(f"\n✅ Matched Skills ({len(matched_skills)}):")
        for i, match in enumerate(matched_skills[:5], 1):
            cv_skill = match.get('cv_skill', {}).get('name', 'Unknown')
            job_skill = match.get('job_skill', {}).get('name', 'Unknown')
            score = match.get('similarity_score', 0)
            print(f"   {i:2d}. {cv_skill} ↔ {job_skill} (Score: {score:.2f})")
        if len(matched_skills) > 5:
            print(f"   ... and {len(matched_skills) - 5} more")
        
        # Show skill gaps
        skill_gaps = analysis_result.get('skill_gaps', {})
        all_gaps = []
        for category, gaps in skill_gaps.items():
            all_gaps.extend(gaps)
        
        print(f"\n❌ Skill Gaps ({len(all_gaps)}):")
        for i, gap in enumerate(all_gaps[:5], 1):
            name = gap.get('name', 'Unknown')
            category = gap.get('category', 'Unknown')
            print(f"   {i:2d}. {name} ({category})")
        if len(all_gaps) > 5:
            print(f"   ... and {len(all_gaps) - 5} more")
        
        print(f"\n✅ Skill gap analysis test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during skill gap analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_skill_gap_components()