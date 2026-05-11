"""
Script việt hóa cột alternative_titles_vi trong bảng core.careers
- Backup bảng trước khi dịch
- Dịch từng phần tử trong mảng alternative_titles_vi
- Dùng Google Translate free (deep-translator)
- Lưu cache tiến độ để có thể resume nếu bị ngắt
- Update DB theo batch
"""

import psycopg2
import time
import re
import json
import os
from deep_translator import GoogleTranslator

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
CACHE_FILE = 'scripts/translation_cache_alt_titles.json'
TRANSLATE_DELAY = 0.35

def translate_to_vn(text: str) -> str:
    if not text or not text.strip():
        return text
    for attempt in range(3):
        try:
            translator = GoogleTranslator(source='en', target='vi')
            result = translator.translate(text)
            time.sleep(TRANSLATE_DELAY)
            return result
        except Exception as e:
            print(f"    [LỖI lần {attempt+1}] {e}")
            time.sleep(2 * (attempt + 1))
    return text  # giữ nguyên nếu thất bại

def needs_translation(text: str) -> bool:
    if not text:
        return False
    latin_words = re.findall(r'\b[A-Za-z][a-z]{2,}\b', text)
    vn_latin_words = {
        'và', 'của', 'cho', 'các', 'trong', 'với', 'về', 'theo', 'tại', 'từ',
        'hay', 'hoặc', 'nhà', 'viên', 'gia', 'sĩ', 'trưởng', 'phó', 'bộ',
        'khu', 'vực', 'ban', 'hội', 'đồng', 'tổng', 'cục', 'vụ', 'phòng',
        'chi', 'nhánh', 'trung', 'tâm', 'học', 'sinh', 'giáo', 'viên',
        'công', 'ty', 'doanh', 'nghiệp', 'quản', 'lý', 'giám', 'đốc',
        'nhân', 'viên', 'kỹ', 'thuật', 'chuyên', 'gia', 'điều', 'phối',
        'hành', 'chính', 'tài', 'chính', 'kinh', 'doanh', 'phát', 'triển',
        'nghiên', 'cứu', 'khoa', 'học', 'công', 'nghệ', 'thông', 'tin',
        'môi', 'trường', 'xây', 'dựng', 'giao', 'thông', 'vận', 'tải',
        'nông', 'nghiệp', 'lâm', 'nghiệp', 'thủy', 'sản', 'khai', 'thác',
        'sản', 'xuất', 'chế', 'biến', 'thương', 'mại', 'dịch', 'vụ',
        'giáo', 'dục', 'đào', 'tạo', 'tế', 'sức', 'khỏe', 'pháp',
        'luật', 'ninh', 'quốc', 'phòng', 'văn', 'hóa', 'nghệ',
        'thuật', 'thể', 'thao', 'lịch', 'khách', 'sạn',
        'lẻ', 'buôn', 'tư', 'vấn', 'hỗ', 'trợ',
        'tra', 'thanh', 'soát',
        'vệ', 'cứu', 'hộ', 'nạn',
        'cháy', 'chữa', 'cảnh', 'sát', 'quân', 'đội', 'hải', 'quân',
        'không', 'quân', 'lục', 'quân', 'biên', 'hải', 'quan',
        'thuế', 'ngân', 'hàng', 'bảo', 'hiểm', 'chứng', 'khoán',
        'bất', 'động', 'kiến', 'trúc', 'thiết',
        'quy', 'hoạch', 'địa', 'chính', 'môi', 'giới', 'định',
        'giá', 'thẩm', 'định', 'chứng', 'nhận',
    }
    real_english = [w for w in latin_words if w.lower() not in vn_latin_words]
    return len(real_english) > 0

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # =========================================================
    # BƯỚC 1: BACKUP (chỉ nếu chưa có)
    # =========================================================
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'core'
            AND table_name = 'careers_backup_alt_titles_viet_hoa'
        )
    """)
    backup_exists = cur.fetchone()[0]

    if not backup_exists:
        print("BƯỚC 1: Tạo backup...")
        cur.execute("""
            CREATE TABLE core.careers_backup_alt_titles_viet_hoa
            AS SELECT * FROM core.careers
        """)
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM core.careers_backup_alt_titles_viet_hoa")
        print(f"✅ Backup: {cur.fetchone()[0]} bản ghi")
    else:
        print("✅ Backup đã tồn tại, bỏ qua.")

    # =========================================================
    # BƯỚC 2: Thu thập unique titles cần dịch
    # =========================================================
    print("\nBƯỚC 2: Thu thập unique titles...")
    cur.execute("""
        SELECT id, alternative_titles_vi
        FROM core.careers
        WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
        ORDER BY id
    """)
    all_rows = cur.fetchall()

    all_unique_titles = set()
    for row in all_rows:
        titles = row[1]
        if titles:
            for t in titles:
                all_unique_titles.add(t)

    titles_to_translate = sorted([t for t in all_unique_titles if needs_translation(t)])
    print(f"Tổng unique: {len(all_unique_titles)}, Cần dịch: {len(titles_to_translate)}")

    # =========================================================
    # BƯỚC 3: Dịch với cache (resume được)
    # =========================================================
    print("\nBƯỚC 3: Dịch titles (có cache resume)...")
    cache = load_cache()

    already_cached = sum(1 for t in titles_to_translate if t in cache)
    remaining = [t for t in titles_to_translate if t not in cache]
    print(f"Đã có trong cache: {already_cached}, Còn lại cần dịch: {len(remaining)}")

    for i, title in enumerate(remaining, 1):
        translated = translate_to_vn(title)
        cache[title] = translated

        if i % 10 == 0:
            save_cache(cache)
            print(f"  [{i}/{len(remaining)}] đã dịch, đã lưu cache...")
        elif i <= 5 or i % 100 == 0:
            print(f"  [{i}/{len(remaining)}] {title[:50]} -> {translated[:50]}")

    save_cache(cache)
    print(f"✅ Dịch xong, tổng cache: {len(cache)} entries")

    # =========================================================
    # BƯỚC 4: Update DB
    # =========================================================
    print("\nBƯỚC 4: Update DB...")
    updated_count = 0
    skipped_count = 0

    for row in all_rows:
        row_id, titles = row
        if not titles:
            skipped_count += 1
            continue

        new_titles = []
        changed = False
        for t in titles:
            translated = cache.get(t, t)
            new_titles.append(translated)
            if translated != t:
                changed = True

        if changed:
            cur.execute("""
                UPDATE core.careers
                SET alternative_titles_vi = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_titles, row_id))
            updated_count += 1
        else:
            skipped_count += 1

    conn.commit()
    print(f"✅ Update: {updated_count} bản ghi, bỏ qua: {skipped_count}")

    # =========================================================
    # BƯỚC 5: Kiểm tra kết quả
    # =========================================================
    print("\nBƯỚC 5: Kiểm tra kết quả...")
    cur.execute("""
        SELECT id, alternative_titles_vi
        FROM core.careers
        WHERE alternative_titles_vi IS NOT NULL
        ORDER BY id
    """)
    final_rows = cur.fetchall()

    final_titles = set()
    for row in final_rows:
        if row[1]:
            for t in row[1]:
                final_titles.add(t)

    still_english = [t for t in final_titles if needs_translation(t)]
    print(f"Tổng unique titles: {len(final_titles)}")
    print(f"Còn tiếng Anh: {len(still_english)}")

    if still_english:
        print("\nCác title còn tiếng Anh (tối đa 30):")
        for t in sorted(still_english)[:30]:
            print(f"  ❌ {t}")

    if not still_english:
        print("\n🎉 HOÀN THÀNH: 100% alternative_titles_vi đã được việt hóa!")
    else:
        print(f"\n⚠️  Còn {len(still_english)} titles chưa dịch hoàn toàn.")

    cur.close()
    conn.close()
    print("\n✅ Script hoàn tất.")

if __name__ == '__main__':
    main()
