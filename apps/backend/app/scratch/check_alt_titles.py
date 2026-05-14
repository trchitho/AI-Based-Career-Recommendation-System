import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT alternative_titles_vi, alternative_titles_en FROM core.careers WHERE title_en = 'Passenger Attendants'")
    print(cur.fetchone())
except Exception as e:
    print(e)
