"""
Check available software development careers in database
"""
import psycopg2

# Connect to database
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

cursor = conn.cursor()

print("🔍 Tìm các nghề nghiệp liên quan đến Software/Web Development...\n")

# Search for software-related careers
cursor.execute("""
    SELECT 
        slug,
        title_en,
        onet_code,
        short_desc_en
    FROM core.careers
    WHERE 
        title_en ILIKE '%software%' OR
        title_en ILIKE '%web%' OR
        title_en ILIKE '%developer%' OR
        title_en ILIKE '%programmer%' OR
        title_en ILIKE '%engineer%' OR
        title_en ILIKE '%computer%'
    ORDER BY title_en
""")

careers = cursor.fetchall()

print(f"✅ Tìm thấy {len(careers)} nghề nghiệp:\n")

for slug, title_en, onet_code, short_desc_en in careers:
    print(f"📌 {title_en}")
    print(f"   Slug: {slug}")
    print(f"   ONET: {onet_code}")
    if short_desc_en:
        print(f"   Mô tả: {short_desc_en[:100]}...")
    else:
        print("   Mô tả: (không có)")
    
    # Count skills for this career
    cursor.execute("""
        SELECT COUNT(*)
        FROM core.career_ksas
        WHERE career_id = (SELECT id FROM core.careers WHERE slug = %s)
    """, (slug,))
    
    skill_count = cursor.fetchone()[0]
    print(f"   Số kỹ năng: {skill_count}")
    print()

cursor.close()
conn.close()

print("✅ Hoàn tất!")
