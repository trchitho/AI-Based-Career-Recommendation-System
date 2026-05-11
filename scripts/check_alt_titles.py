import psycopg2
import json

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM core.careers")
print("Total rows:", cur.fetchone()[0])

cur.execute("""
    SELECT COUNT(*) FROM core.careers
    WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
""")
print("Rows with alternative_titles_vi:", cur.fetchone()[0])

# Lấy mẫu 5 dòng để xem cấu trúc
cur.execute("""
    SELECT id, title_vi, alternative_titles_vi
    FROM core.careers
    WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
    ORDER BY id
    LIMIT 5
""")
rows = cur.fetchall()
for r in rows:
    print(f"\nid={r[0]}, title_vi={r[1]}")
    print(f"  alternative_titles_vi: {r[2]}")

# Đếm tổng số phần tử trong mảng cần dịch
cur.execute("""
    SELECT id, alternative_titles_vi
    FROM core.careers
    WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
    ORDER BY id
""")
all_rows = cur.fetchall()

all_titles = set()
for row in all_rows:
    titles = row[1]
    if titles:
        for t in titles:
            all_titles.add(t)

print(f"\nTổng unique titles trong alternative_titles_vi: {len(all_titles)}")

# Kiểm tra xem có title nào còn tiếng Anh không
def has_english(text):
    if not text:
        return False
    english_words = ['Manager', 'Director', 'Supervisor', 'Engineer', 'Analyst',
                     'Specialist', 'Coordinator', 'Officer', 'Assistant', 'Associate',
                     'Senior', 'Junior', 'Lead', 'Chief', 'Head', 'Plant', 'Operations',
                     'Production', 'General', 'Regional', 'National', 'Technical']
    for w in english_words:
        if w.lower() in text.lower():
            return True
    return False

english_titles = [t for t in all_titles if has_english(t)]
vn_titles = [t for t in all_titles if not has_english(t)]
print(f"Còn tiếng Anh: {len(english_titles)}")
print(f"Đã tiếng Việt: {len(vn_titles)}")

print("\nMẫu 10 title còn tiếng Anh:")
for t in sorted(english_titles)[:10]:
    print(f"  - {t}")

print("\nMẫu 10 title đã tiếng Việt:")
for t in sorted(vn_titles)[:10]:
    print(f"  - {t}")

cur.close()
conn.close()
