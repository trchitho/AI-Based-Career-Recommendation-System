import psycopg2
DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()
cur.execute("DROP TABLE IF EXISTS core.career_tasks_backup_viet_hoa")
cur.execute("CREATE TABLE core.career_tasks_backup_viet_hoa AS SELECT * FROM core.career_tasks")
conn.commit()
cur.execute("SELECT COUNT(*) FROM core.career_tasks_backup_viet_hoa")
print(f"Backup OK: {cur.fetchone()[0]} rows")
cur.close(); conn.close()

