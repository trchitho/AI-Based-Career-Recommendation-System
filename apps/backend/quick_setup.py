"""
Quick setup - No emoji for Windows compatibility
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

print("="*60)
print("Skill Gap Analysis - Quick Setup")
print("="*60)

# Step 1: Migration
print("\n[1/3] Running database migration...")
try:
    engine = create_engine(DATABASE_URL)
    migration_file = os.path.join(os.path.dirname(__file__), 'migrations', 'create_skill_gap_table.sql')
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    
    print("SUCCESS: Table 'core.skill_gap_analyses' created")
except Exception as e:
    print(f"ERROR: {e}")

# Step 2: Test CV Parser
print("\n[2/3] Testing CV Parser...")
try:
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    from app.modules.skill_gap.cv_parser import CVParser
    
    parser = CVParser()
    test_text = "Skills: Python, JavaScript, React, Node.js, Docker, AWS"
    skills = parser.extract_skills(test_text)
    
    print(f"SUCCESS: Extracted {len(skills)} skills")
    for skill in skills[:5]:
        print(f"  - {skill['name']} ({skill['category']})")
except Exception as e:
    print(f"ERROR: {e}")

# Step 3: Neo4j Sample Data
print("\n[3/3] Creating Neo4j sample data...")
try:
    from app.modules.graph.neo4j_client import get_driver
    
    driver = get_driver()
    if not driver:
        print("SKIPPED: Neo4j not available")
    else:
        with driver.session() as session:
            # Create career
            session.run("""
                MERGE (c:Career {id: 'software-engineer'})
                SET c.name = 'Software Engineer'
            """)
            
            # Create skills
            skills = [
                ('python', 'Programming Language', 0.9),
                ('javascript', 'Programming Language', 0.85),
                ('react', 'Web Technology', 0.8),
                ('docker', 'Cloud & DevOps', 0.7),
            ]
            
            for name, cat, imp in skills:
                session.run("""
                    MERGE (s:Skill {name: $name})
                    SET s.category = $cat
                """, {'name': name, 'cat': cat})
                
                session.run("""
                    MATCH (c:Career {id: 'software-engineer'})
                    MATCH (s:Skill {name: $name})
                    MERGE (c)-[r:REQUIRES_SKILL]->(s)
                    SET r.importance = $imp
                """, {'name': name, 'imp': imp})
            
            # Verify
            result = session.run("""
                MATCH (c:Career {id: 'software-engineer'})-[:REQUIRES_SKILL]->(s)
                RETURN count(s) as cnt
            """)
            count = result.single()['cnt']
            
        print(f"SUCCESS: Created {count} skill requirements")
except Exception as e:
    print(f"ERROR: {e}")

print("\n"+"="*60)
print("Setup Complete!")
print("="*60)
print("\nNext steps:")
print("1. Start backend: uvicorn app.main:app --reload")
print("2. Start frontend: cd ../frontend && npm run dev")
print("3. Visit: http://localhost:3000/skill-gap")
print("\nAPI Docs: http://localhost:8000/docs")
