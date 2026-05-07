import psycopg2, json, re
from collections import Counter

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()

cur.execute("SELECT DISTINCT task_en FROM core.career_tasks ORDER BY task_en")
tasks = [r[0] for r in cur.fetchall()]
print(f"Total unique tasks: {len(tasks)}")

# Phân tích từ đầu câu (verb patterns)
first_words = Counter()
for t in tasks:
    words = t.split()
    if words:
        first_words[words[0].lower()] += 1

print("\nTop 30 first words:")
for w, c in first_words.most_common(30):
    print(f"  {w}: {c}")

# Phân tích độ dài
lengths = [len(t) for t in tasks]
print(f"\nTask length: min={min(lengths)}, max={max(lengths)}, avg={sum(lengths)//len(lengths)}")

# Xem sample tasks từ cache để hiểu chất lượng dịch
with open('ct_progress.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)
print(f"\nCache: {len(cache)} tasks")

# Kiểm tra chất lượng cache
bad_in_cache = 0
for en, vi in cache.items():
    if re.search(r'\b(and|the|of|for|with|using|to|or|in|is|are|from|by|as|at)\b', vi, re.I):
        bad_in_cache += 1
print(f"Bad translations in cache: {bad_in_cache}")

cur.close(); conn.close()

