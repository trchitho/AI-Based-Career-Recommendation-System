import psycopg2
try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT onet_code, title_en, title_vi FROM core.careers WHERE title_en = 'Passenger Attendants' OR title_en = 'Conveyor Operators and Tenders'")
    rows = cur.fetchall()
    for r in rows:
        print(f"Career: {r}")
        cur.execute("SELECT education_summary_vi, experience_summary_vi, education_summary_en, experience_summary_en FROM core.career_prep WHERE onet_code = %s", (r[0],))
        prep = cur.fetchone()
        print(f"Prep: {prep}")
except Exception as e:
    print(e)
