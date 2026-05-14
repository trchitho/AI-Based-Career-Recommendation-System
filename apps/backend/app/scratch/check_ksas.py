import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT name_en, name_vn FROM core.career_ksas WHERE onet_code = '53-7011.00' LIMIT 10")
    rows = cur.fetchall()
    for r in rows:
        print(f"{r[0]} | {r[1]}")
except Exception as e:
    print(e)
