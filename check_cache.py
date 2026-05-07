import json, psycopg2

# Lấy 5 task_en đầu tiên từ DB
conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')
cur = conn.cursor()
cur.execute("SELECT id, task_en FROM core.career_tasks ORDER BY id LIMIT 5")
db_tasks = cur.fetchall()

# Load cache
with open('ct_progress.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

print(f'Cache size: {len(cache)}')
print('\nKiểm tra 5 rows đầu:')
for row_id, task_en in db_tasks:
    if task_en in cache:
        print(f'  Row {row_id}: CÓ trong cache')
        print(f'    Cache: {cache[task_en][:100]}')
    else:
        print(f'  Row {row_id}: KHÔNG có trong cache')
        print(f'    Task: {task_en[:100]}')
    print()

# Kiểm tra xem cache update vào DB chưa
cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE updated_at > '2026-05-03 17:00:00'")
recent_updates = cur.fetchone()[0]
print(f'Rows updated gần đây: {recent_updates}')

cur.close()
conn.close()
