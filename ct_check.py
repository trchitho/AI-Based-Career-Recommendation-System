import psycopg2
DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM core.career_tasks")
print(f"Total rows: {cur.fetchone()[0]}")

cur.execute("""
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='core' AND table_name='career_tasks'
    ORDER BY ordinal_position
""")
print("Columns:")
for r in cur.fetchall(): print(f"  {r[0]} ({r[1]})")

cur.execute("SELECT id, onet_code, task_en, task_vi FROM core.career_tasks LIMIT 5")
print("Sample:")
for r in cur.fetchall():
    print(f"  id={r[0]} onet={r[1]}")
    print(f"    EN: {r[2][:80]}")
    print(f"    VI: {str(r[3])[:80] if r[3] else 'NULL'}")

cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NULL OR task_vi=''")
print(f"NULL/empty task_vi: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~ '^[a-zA-Z0-9 ,./()\\-]+$' AND length(task_vi)>10")
print(f"Mất dấu (toàn ASCII): {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\\mand\\M|\\mthe\\M|\\mof\\M|\\mfor\\M|\\mwith\\M|\\musing\\M'")
print(f"Còn tiếng Anh: {cur.fetchone()[0]}")

cur.execute(r"SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~ '[?~^@#$%*+=<>{}]'")
print(f"Ký tự lạ: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~ 'Ã|â€|Â'")
print(f"Lỗi encoding: {cur.fetchone()[0]}")

cur.close(); conn.close()

