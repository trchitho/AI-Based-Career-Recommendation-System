import psycopg2
try:
    conn = psycopg2.connect('dbname=career_ai user=postgres password=123456 host=localhost port=5433')
    cur = conn.cursor()
    cur.execute("SELECT * FROM core.career_prep LIMIT 1")
    colnames = [desc[0] for desc in cur.description]
    print("core.career_prep: " + ", ".join(colnames))
    
    cur.execute("SELECT * FROM core.careers LIMIT 1")
    colnames = [desc[0] for desc in cur.description]
    print("core.careers: " + ", ".join(colnames))
except Exception as e:
    print(e)
