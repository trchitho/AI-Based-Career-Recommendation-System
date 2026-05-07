import psycopg2
DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()

cur.execute('SELECT COUNT(DISTINCT task_en) FROM core.career_tasks')
print('Unique task_en:', cur.fetchone()[0])

cur.execute('SELECT MIN(id), MAX(id) FROM core.career_tasks')
r = cur.fetchone()
print(f'ID range: {r[0]} - {r[1]}')

# Rows cần dịch lại (còn tiếng Anh)
cur.execute(r"""
    SELECT COUNT(*) FROM core.career_tasks
    WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M|\mto\M|\mor\M'
""")
print(f'Rows cần dịch lại: {cur.fetchone()[0]}')

# Sample bad
cur.execute(r"""
    SELECT id, task_en, task_vi FROM core.career_tasks
    WHERE task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M'
    ORDER BY id
    LIMIT 5
""")
print('Bad samples:')
for r in cur.fetchall():
    print(f'  id={r[0]}')
    print(f'  EN: {r[1][:100]}')
    print(f'  VI: {r[2][:100]}')

# Sample good
cur.execute(r"""
    SELECT id, task_en, task_vi FROM core.career_tasks
    WHERE NOT (task_vi ~* '\mand\M|\mthe\M|\mof\M|\mfor\M|\mwith\M|\musing\M|\mto\M|\mor\M')
    ORDER BY id
    LIMIT 5
""")
print('Good samples:')
for r in cur.fetchall():
    print(f'  id={r[0]}')
    print(f'  EN: {r[1][:100]}')
    print(f'  VI: {r[2][:100]}')

cur.close(); conn.close()

