import psycopg2
import re

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("""
    SELECT id, alternative_titles_vi
    FROM core.careers
    WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
    ORDER BY id
""")
all_rows = cur.fetchall()

def has_english_word(text):
    """Kiểm tra text có chứa từ tiếng Anh không (từ có ký tự Latin liên tiếp >= 3 ký tự)."""
    if not text:
        return False
    # Tìm các từ chỉ gồm ký tự Latin (a-z, A-Z, dấu nháy)
    # Loại trừ các từ viết tắt phổ biến như CEO, CFO, IT, HR, etc.
    # Loại trừ số và ký tự đặc biệt
    words = re.findall(r"[A-Za-z][a-z]{2,}", text)  # từ Latin >= 3 ký tự, có chữ thường
    # Loại trừ các từ tiếng Việt phiên âm thường gặp
    vn_words = {'và', 'của', 'cho', 'các', 'trong', 'với', 'về', 'theo', 'tại', 'từ',
                'hay', 'hoặc', 'nhà', 'viên', 'gia', 'sĩ', 'trưởng', 'phó'}
    english_words = [w for w in words if w.lower() not in vn_words]
    return len(english_words) > 0

# Thu thập tất cả unique titles
all_titles = {}  # title -> list of (id, index)
for row in all_rows:
    row_id, titles = row
    if titles:
        for i, t in enumerate(titles):
            if t not in all_titles:
                all_titles[t] = []
            all_titles[t].append((row_id, i))

print(f"Tổng unique titles: {len(all_titles)}")

# Phân loại
english_titles = {t: ids for t, ids in all_titles.items() if has_english_word(t)}
vn_titles = {t: ids for t, ids in all_titles.items() if not has_english_word(t)}

print(f"Còn tiếng Anh (cần dịch): {len(english_titles)}")
print(f"Đã tiếng Việt: {len(vn_titles)}")

print(f"\n--- TẤT CẢ titles còn tiếng Anh ({len(english_titles)}) ---")
for t in sorted(english_titles.keys()):
    print(f"  - {t}")

cur.close()
conn.close()
