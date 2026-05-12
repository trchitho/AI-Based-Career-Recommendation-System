import psycopg2
try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT education_summary_vi, experience_summary_vi FROM core.career_prep WHERE education_summary_vi IS NOT NULL LIMIT 5")
    rows = cur.fetchall()
    print("Found rows with VI content:", len(rows))
    for r in rows:
        print(r)
        
    cur.execute("SELECT count(*) FROM core.career_prep WHERE education_summary_vi IS NULL")
    print("NULL count:", cur.fetchone()[0])
except Exception as e:
    print(e)
