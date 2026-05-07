import psycopg2
conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM core.career_tasks')
print('Total rows:', cur.fetchone()[0])
cur.execute(r"""SELECT COUNT(*) FROM core.career_tasks WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M|\mor\M|\min\M|\mto\M'""")
print('Con tieng Anh:', cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE task_vi IS NULL OR task_vi=''")
print('NULL/empty:', cur.fetchone()[0])
# Sample 3 rows dau
cur.execute("SELECT id, task_en, task_vi FROM core.career_tasks ORDER BY id LIMIT 3")
for r in cur.fetchall():
    print(f'\nid={r[0]}')
    print(f'  EN: {r[1][:90]}')
    print(f'  VI: {r[2][:90]}')
cur.close(); conn.close()

