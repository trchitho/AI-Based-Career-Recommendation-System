import os; from dotenv import load_dotenv; load_dotenv('.env')
import psycopg

DB = os.getenv('DATABASE_URL')
TABLES = ['careers','career_tasks','career_technology','career_prep','career_overview','career_outlook','career_work_context']
with psycopg.connect(DB) as conn:
    with conn.cursor() as cur:
        for t in TABLES:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='core' AND table_name=%s ORDER BY ordinal_position", (t,))
            cols = [r[0] for r in cur.fetchall()]
            vi_vn = [c for c in cols if '_vi' in c or '_vn' in c or c.endswith('_en')]
            print(f'{t}: {vi_vn}')
