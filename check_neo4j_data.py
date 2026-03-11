"""
Check Neo4j data for skill gap analysis
"""
import sys
sys.path.append('apps/backend')

from app.modules.graph.neo4j_client import get_driver

def check_neo4j():
    """Check if Neo4j has career and skill data"""
    driver = get_driver()
    
    if not driver:
        print("❌ Neo4j driver not available")
        print("   Make sure Neo4j is running and configured in .env")
        return
    
    print("✅ Neo4j driver connected")
    print("\n" + "="*60)
    
    with driver.session() as session:
        # Check Career nodes
        print("\n1. Checking Career nodes...")
        result = session.run("MATCH (c:Career) RETURN c.id as id, c.title as title LIMIT 10")
        careers = [record.data() for record in result]
        
        if careers:
            print(f"   Found {len(careers)} careers:")
            for career in careers:
                print(f"   - ID: {career['id']}, Title: {career['title']}")
        else:
            print("   ❌ No Career nodes found!")
            print("   You need to import career data into Neo4j")
        
        # Check Skill nodes
        print("\n2. Checking Skill nodes...")
        result = session.run("MATCH (s:Skill) RETURN s.name as name LIMIT 10")
        skills = [record.data() for record in result]
        
        if skills:
            print(f"   Found {len(skills)} skills:")
            for skill in skills[:5]:
                print(f"   - {skill['name']}")
            if len(skills) > 5:
                print(f"   ... and {len(skills) - 5} more")
        else:
            print("   ❌ No Skill nodes found!")
        
        # Check REQUIRES_SKILL relationships
        print("\n3. Checking REQUIRES_SKILL relationships...")
        result = session.run("""
            MATCH (c:Career)-[r:REQUIRES_SKILL]->(s:Skill)
            RETURN c.id as career_id, count(s) as skill_count
            LIMIT 5
        """)
        relationships = [record.data() for record in result]
        
        if relationships:
            print(f"   Found relationships:")
            for rel in relationships:
                print(f"   - Career {rel['career_id']}: {rel['skill_count']} skills")
        else:
            print("   ❌ No REQUIRES_SKILL relationships found!")
            print("   You need to create relationships between careers and skills")
        
        # Check specific career
        print("\n4. Checking 'software-engineer' career...")
        result = session.run("""
            MATCH (c:Career {id: 'software-engineer'})-[r:REQUIRES_SKILL]->(s:Skill)
            RETURN s.name as skill, r.importance as importance
            LIMIT 10
        """)
        sw_skills = [record.data() for record in result]
        
        if sw_skills:
            print(f"   ✅ Found {len(sw_skills)} skills for software-engineer:")
            for skill in sw_skills[:5]:
                print(f"   - {skill['skill']} (importance: {skill['importance']})")
        else:
            print("   ❌ No skills found for 'software-engineer'")
            print("   Try checking with ONET code instead")
            
            # Try with ONET code
            result = session.run("""
                MATCH (c:Career)
                WHERE c.id CONTAINS 'software' OR c.title CONTAINS 'Software'
                RETURN c.id as id, c.title as title
                LIMIT 5
            """)
            similar = [record.data() for record in result]
            
            if similar:
                print("\n   Found similar careers:")
                for career in similar:
                    print(f"   - ID: {career['id']}, Title: {career['title']}")
    
    print("\n" + "="*60)
    print("\nRECOMMENDATIONS:")
    if not careers:
        print("1. Import career data into Neo4j")
        print("2. Run: python apps/backend/import_careers_to_neo4j.py")
    elif not relationships:
        print("1. Create REQUIRES_SKILL relationships")
        print("2. Link careers with their required skills")
    elif not sw_skills:
        print("1. Use correct career ID (might be ONET code)")
        print("2. Or add 'software-engineer' career to Neo4j")

if __name__ == "__main__":
    check_neo4j()
