"""Xuất toàn bộ title_en + title_vi ra file để review bằng mắt"""
import psycopg2

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("SELECT id, title_en, title_vi FROM core.careers ORDER BY id")
rows = cur.fetchall()
cur.close()
conn.close()

with open('scripts/all_titles_review.txt', 'w', encoding='utf-8') as f:
    for row_id, en, vi in rows:
        f.write(f"id={row_id}\n")
        f.write(f"  EN: {en}\n")
        f.write(f"  VI: {vi}\n")
        f.write("\n")

print(f"Xuất {len(rows)} dòng -> scripts/all_titles_review.txt")
