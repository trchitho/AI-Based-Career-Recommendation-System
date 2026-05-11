import psycopg2
conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')
cur = conn.cursor()

fixes = [
    ("Grinding, Lapping, Polishing, and Buffing Machine Tool Setters, Operators, and Tenders, Metal and Plastic",
     "Thợ vận hành máy mài, đánh bóng và hoàn thiện bề mặt (kim loại và nhựa)"),
]

for en, vi in fixes:
    cur.execute("UPDATE core.careers SET title_vi = %s, updated_at = NOW() WHERE title_en = %s", (vi, en))
    print(f"Updated {cur.rowcount}: {vi}")

conn.commit()
cur.close()
conn.close()
print("Done.")
