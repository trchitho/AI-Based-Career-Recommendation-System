"""
Create sample data in Neo4j for testing
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.modules.graph.neo4j_client import get_driver


def create_sample_data():
    print("📊 Creating sample data in Neo4j...")
    print("=" * 60)
    
    try:
        driver = get_driver()
        if not driver:
            print("⚠️  Neo4j driver not available. Skipping...")
            return False
        
        # 1. Create Software Engineer career
        print("\n1️⃣ Creating Software Engineer career...")
        with driver.session() as session:
            session.run("""
                MERGE (c:Career {id: 'software-engineer'})
                SET c.name = 'Software Engineer',
                    c.description = 'Develops software applications'
            """)
        print("   ✅ Career created")
        
        # 2. Create skills
        print("\n2️⃣ Creating skills...")
        skills_data = [
            ('python', 'Programming Language'),
            ('javascript', 'Programming Language'),
            ('java', 'Programming Language'),
            ('react', 'Web Technology'),
            ('nodejs', 'Web Technology'),
            ('django', 'Web Technology'),
            ('mysql', 'Database'),
            ('postgresql', 'Database'),
            ('mongodb', 'Database'),
            ('aws', 'Cloud & DevOps'),
            ('docker', 'Cloud & DevOps'),
            ('kubernetes', 'Cloud & DevOps'),
            ('machine learning', 'Data Science & AI'),
            ('tensorflow', 'Data Science & AI'),
        ]
        
        with driver.session() as session:
            for skill_name, category in skills_data:
                session.run("""
                    MERGE (s:Skill {name: $name})
                    SET s.category = $category
                """, {'name': skill_name, 'category': category})
        
        print(f"   ✅ Created {len(skills_data)} skills")
        
        # 3. Create relationships with importance
        print("\n3️⃣ Creating skill requirements...")
        requirements = [
            ('python', 0.9, 'advanced'),
            ('javascript', 0.85, 'advanced'),
            ('java', 0.7, 'intermediate'),
            ('react', 0.8, 'intermediate'),
            ('nodejs', 0.75, 'intermediate'),
            ('django', 0.6, 'intermediate'),
            ('mysql', 0.7, 'intermediate'),
            ('postgresql', 0.65, 'intermediate'),
            ('mongodb', 0.5, 'beginner'),
            ('aws', 0.7, 'intermediate'),
            ('docker', 0.8, 'intermediate'),
            ('kubernetes', 0.6, 'beginner'),
            ('machine learning', 0.5, 'beginner'),
            ('tensorflow', 0.4, 'beginner'),
        ]
        
        with driver.session() as session:
            for skill_name, importance, level in requirements:
                session.run("""
                    MATCH (c:Career {id: 'software-engineer'})
                    MATCH (s:Skill {name: $skill_name})
                    MERGE (c)-[r:REQUIRES_SKILL]->(s)
                    SET r.importance = $importance,
                        r.proficiency_level = $level
                """, {
                    'skill_name': skill_name,
                    'importance': importance,
                    'level': level
                })
        
        print(f"   ✅ Created {len(requirements)} skill requirements")
        
        # 4. Verify data
        print("\n4️⃣ Verifying data...")
        with driver.session() as session:
            result = session.run("""
                MATCH (c:Career {id: 'software-engineer'})-[r:REQUIRES_SKILL]->(s:Skill)
                RETURN count(s) as skill_count
            """)
            record = result.single()
            count = record['skill_count'] if record else 0
        
        print(f"   ✅ Verified: {count} skills linked to Software Engineer")
        
        print("\n" + "=" * 60)
        print("✅ Sample data created successfully!")
        print("\nYou can now test the skill gap analysis with:")
        print("  Career ID: software-engineer")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n⚠️  Make sure Neo4j is running on bolt://localhost:7687")
        return False

if __name__ == '__main__':
    create_sample_data()
