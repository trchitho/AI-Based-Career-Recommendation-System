import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("""
        SELECT c.title_en, c.title_vi 
        FROM core.careers c 
        JOIN core.career_group_mapping cgm ON c.id = cgm.career_id 
        JOIN core.career_groups cg ON cgm.group_id = cg.id 
        WHERE cg.slug = 'van-tai-logistics' OR cg.name ILIKE '%Vận tải%'
    """)
    rows = cur.fetchall()
    for r in rows:
        print(f"{r[0]} | {r[1]}")
except Exception as e:
    print(e)
