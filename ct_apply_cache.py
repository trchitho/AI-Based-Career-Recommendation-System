"""Apply cache vào DB ngay, không cần chờ dịch xong hết"""
import psycopg2, json

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()

with open('ct_progress.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

print(f'Cache: {len(cache)} tasks')
updated = 0
for task_en, task_vi in cache.items():
    if task_vi and task_vi.strip():
        cur.execute(
            "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE task_en=%s",
            (task_vi.strip(), task_en)
        )
        updated += cur.rowcount

conn.commit()
print(f'Updated {updated} rows in DB')

cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M|\mor\M|\min\M|\mto\M'""")
print(f'Con tieng Anh: {cur.fetchone()[0]}')
cur.close(); conn.close()

