import psycopg2

conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")
cursor = conn.cursor()

# Find software-related careers
cursor.execute("""
    SELECT slug, title_en, onet_code
    FROM core.careers
    WHERE 
        title_en ILIKE '%software%' OR
        title_en ILIKE '%web%' OR
        title_en ILIKE '%developer%'
    ORDER BY title_en
    LIMIT 20
""")

print("Software/Web Development careers:")
print("="*80)
for slug, title, onet in cursor.fetchall():
    print(f"{title}")
    print(f"  Slug: {slug}")
    print(f"  ONET: {onet}")
    print()

cursor.close()
conn.close()
