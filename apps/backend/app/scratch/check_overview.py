import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT c.onet_code, o.experience_text_vn, o.experience_text_en, o.degree_text_vn, o.degree_text_en FROM core.career_overview o JOIN core.careers c ON o.career_id = c.id WHERE c.onet_code IN ('53-7011.00', '53-6061.00')")
    rows = cur.fetchall()
    for r in rows:
        print(f"Overview for {r[0]}: {r}")
except Exception as e:
    print(e)
