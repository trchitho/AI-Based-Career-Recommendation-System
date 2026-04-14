"""
Check skills for Surveying and Mapping Technicians career
"""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

cursor = conn.cursor()

# Get career info
cursor.execute("""
    SELECT id, slug, title_en, onet_code
    FROM core.careers
    WHERE slug LIKE '%surveying%' OR slug LIKE '%mapping%'
""")

print("📋 Surveying/Mapping Careers:")
print("="*80)
for career_id, slug, title, onet in cursor.fetchall():
    print(f"\n{title}")
    print(f"  Slug: {slug}")
    print(f"  ONET: {onet}")
    
    # Get skills for this career
    cursor.execute("""
        SELECT skill_name, category, importance, description
        FROM core.career_ksas
        WHERE career_id = %s
        ORDER BY importance DESC
    """, (career_id,))
    
    skills = cursor.fetchall()
    print(f"  Skills count: {len(skills)}")
    
    if skills:
        print("\n  Top skills:")
        for name, category, importance, desc in skills[:10]:
            print(f"    - {name} ({category}): {importance}")
            if desc:
                print(f"      {desc[:80]}...")

cursor.close()
conn.close()

print("\n" + "="*80)
print("✅ Done!")
