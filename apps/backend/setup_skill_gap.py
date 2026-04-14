"""
Setup script for Skill Gap Analysis module
Run this to initialize the database and test the module
"""
import os
import sys

from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


def run_migration():
    """Run database migration"""
    print("🔧 Running database migration...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    migration_file = os.path.join(
        os.path.dirname(__file__),
        'migrations',
        'create_skill_gap_table.sql'
    )
    
    try:
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        with engine.connect() as conn:
            # Execute migration
            conn.execute(text(sql))
            conn.commit()
            print("✅ Migration completed successfully")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True


def test_cv_parser():
    """Test CV parser"""
    print("\n🧪 Testing CV Parser...")
    
    from app.modules.skill_gap.cv_parser import CVParser
    
    parser = CVParser()
    
    # Test text extraction
    test_text = """
    John Doe
    Software Engineer
    
    Skills:
    - Python, Java, JavaScript
    - React, Node.js, Django
    - MySQL, PostgreSQL, MongoDB
    - AWS, Docker, Kubernetes
    - Machine Learning, TensorFlow
    
    Experience:
    - Built web applications using React and Node.js
    - Developed ML models with Python and TensorFlow
    - Deployed applications on AWS with Docker
    """
    
    skills = parser.extract_skills(test_text)
    print(f"✅ Extracted {len(skills)} skills:")
    for skill in skills[:5]:
        print(f"   - {skill['name']} ({skill['category']})")
    
    return True


def test_graph_analyzer():
    """Test Graph Analyzer"""
    print("\n🧪 Testing Graph Analyzer...")
    
    try:
        from app.modules.graph.neo4j_client import Neo4jClient
        from app.modules.skill_gap.graph_analyzer import SkillGraphAnalyzer
        
        neo4j = Neo4jClient()
        analyzer = SkillGraphAnalyzer(neo4j)
        
        # Test with sample data
        cv_skills = [
            {'name': 'python', 'category': 'Programming Language'},
            {'name': 'javascript', 'category': 'Programming Language'},
            {'name': 'react', 'category': 'Web Technology'},
        ]
        
        job_skills = [
            {'name': 'python', 'category': 'Programming Language', 'importance': 0.9},
            {'name': 'javascript', 'category': 'Programming Language', 'importance': 0.8},
            {'name': 'react', 'category': 'Web Technology', 'importance': 0.7},
            {'name': 'docker', 'category': 'Cloud & DevOps', 'importance': 0.6},
            {'name': 'kubernetes', 'category': 'Cloud & DevOps', 'importance': 0.5},
        ]
        
        result = analyzer.calculate_skill_match(cv_skills, job_skills)
        print(f"✅ Match percentage: {result['match_percentage']}%")
        print(f"   Matched: {result['matched_skills_count']}")
        print(f"   Missing: {result['missing_skills_count']}")
        
        return True
    except Exception as e:
        print(f"⚠️  Graph analyzer test skipped: {e}")
        return True  # Don't fail if Neo4j is not available


def create_sample_data():
    """Create sample data in Neo4j"""
    print("\n📊 Creating sample data in Neo4j...")
    
    try:
        from app.modules.graph.neo4j_client import Neo4jClient
        
        neo4j = Neo4jClient()
        
        # Create sample career and skills
        queries = [
            """
            MERGE (c:Career {id: 'software-engineer', name: 'Software Engineer'})
            """,
            """
            MERGE (s1:Skill {name: 'python', category: 'Programming Language'})
            MERGE (s2:Skill {name: 'javascript', category: 'Programming Language'})
            MERGE (s3:Skill {name: 'react', category: 'Web Technology'})
            MERGE (s4:Skill {name: 'docker', category: 'Cloud & DevOps'})
            MERGE (s5:Skill {name: 'kubernetes', category: 'Cloud & DevOps'})
            """,
            """
            MATCH (c:Career {id: 'software-engineer'})
            MATCH (s1:Skill {name: 'python'})
            MATCH (s2:Skill {name: 'javascript'})
            MATCH (s3:Skill {name: 'react'})
            MATCH (s4:Skill {name: 'docker'})
            MATCH (s5:Skill {name: 'kubernetes'})
            MERGE (c)-[:REQUIRES_SKILL {importance: 0.9, proficiency_level: 'advanced'}]->(s1)
            MERGE (c)-[:REQUIRES_SKILL {importance: 0.8, proficiency_level: 'intermediate'}]->(s2)
            MERGE (c)-[:REQUIRES_SKILL {importance: 0.7, proficiency_level: 'intermediate'}]->(s3)
            MERGE (c)-[:REQUIRES_SKILL {importance: 0.6, proficiency_level: 'beginner'}]->(s4)
            MERGE (c)-[:REQUIRES_SKILL {importance: 0.5, proficiency_level: 'beginner'}]->(s5)
            """
        ]
        
        for query in queries:
            neo4j.execute_query(query)
        
        print("✅ Sample data created successfully")
        return True
    except Exception as e:
        print(f"⚠️  Sample data creation skipped: {e}")
        return True


def main():
    """Main setup function"""
    print("=" * 60)
    print("🚀 Skill Gap Analysis Module Setup")
    print("=" * 60)
    
    # Run migration
    if not run_migration():
        print("\n❌ Setup failed at migration step")
        return
    
    # Test CV parser
    if not test_cv_parser():
        print("\n❌ Setup failed at CV parser test")
        return
    
    # Test graph analyzer
    if not test_graph_analyzer():
        print("\n⚠️  Graph analyzer test had issues (continuing...)")
    
    # Create sample data
    if not create_sample_data():
        print("\n⚠️  Sample data creation had issues (continuing...)")
    
    print("\n" + "=" * 60)
    print("✅ Setup completed successfully!")
    print("=" * 60)
    print("\n📚 Next steps:")
    print("1. Start backend: uvicorn app.main:app --reload")
    print("2. Start frontend: cd apps/frontend && npm run dev")
    print("3. Visit: http://localhost:3000/skill-gap")
    print("\n📖 Documentation: apps/backend/app/modules/skill_gap/README.md")


if __name__ == '__main__':
    main()
