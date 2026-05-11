import psycopg2

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM core.careers")
print("Total:", cur.fetchone()[0])

# Xem mẫu các title_vi có vẻ cứng/chưa tự nhiên
cur.execute("""
    SELECT id, title_en, title_vi
    FROM core.careers
    ORDER BY id
    LIMIT 30
""")
rows = cur.fetchall()
for r in rows:
    print(f"id={r[0]}")
    print(f"  EN: {r[1]}")
    print(f"  VI: {r[2]}")
    print()

cur.close()
conn.close()
