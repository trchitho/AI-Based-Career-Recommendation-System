"""
Script việt hóa cột alternative_titles_vi trong bảng core.careers
- Backup bảng trước khi dịch
- Dịch từng phần tử trong mảng alternative_titles_vi
- Dùng Google Translate free (deep-translator)
- Dịch theo unique text để tối ưu số lần gọi
- Update từng dòng vào DB
"""

import psycopg2
import time
import re
from deep_translator import GoogleTranslator

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

# Delay giữa các lần gọi API (giây)
TRANSLATE_DELAY = 0.4

def translate_to_vn(text: str) -> str:
    """Dịch text sang tiếng Việt dùng Google Translate free."""
    if not text or not text.strip():
        return text
    try:
        translator = GoogleTranslator(source='en', target='vi')
        result = translator.translate(text)
        time.sleep(TRANSLATE_DELAY)
        return result
    except Exception as e:
        print(f"    [LỖI dịch] {e}")
        time.sleep(2)
        # Thử lại 1 lần
        try:
            translator = GoogleTranslator(source='en', target='vi')
            result = translator.translate(text)
            return result
        except Exception as e2:
            print(f"    [LỖI dịch lần 2] {e2} | giữ nguyên: {text[:60]}")
            return text

def needs_translation(text: str) -> bool:
    """
    Kiểm tra text có cần dịch không.
    Trả về True nếu text chứa từ tiếng Anh thực sự (không phải tên riêng/viết tắt).
    """
    if not text:
        return False

    # Tìm các từ Latin liên tiếp >= 3 ký tự có chữ thường (không phải viết tắt)
    # Pattern: từ bắt đầu bằng chữ hoa hoặc thường, có ít nhất 1 chữ thường
    latin_words = re.findall(r'\b[A-Za-z][a-z]{2,}\b', text)

    # Loại trừ các từ tiếng Việt phiên âm Latin thường gặp
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
        'giáo', 'dục', 'đào', 'tạo', 'y', 'tế', 'sức', 'khỏe', 'pháp',
        'luật', 'an', 'ninh', 'quốc', 'phòng', 'văn', 'hóa', 'nghệ',
        'thuật', 'thể', 'thao', 'du', 'lịch', 'khách', 'sạn', 'nhà',
        'hàng', 'bán', 'lẻ', 'bán', 'buôn', 'tư', 'vấn', 'hỗ', 'trợ',
        'điều', 'tra', 'kiểm', 'tra', 'thanh', 'tra', 'kiểm', 'soát',
        'bảo', 'vệ', 'cứu', 'hộ', 'cứu', 'nạn', 'phòng', 'cháy',
        'chữa', 'cháy', 'cảnh', 'sát', 'quân', 'đội', 'hải', 'quân',
        'không', 'quân', 'lục', 'quân', 'biên', 'phòng', 'hải', 'quan',
        'thuế', 'quan', 'ngân', 'hàng', 'bảo', 'hiểm', 'chứng', 'khoán',
        'bất', 'động', 'sản', 'xây', 'dựng', 'kiến', 'trúc', 'thiết',
        'kế', 'quy', 'hoạch', 'địa', 'chính', 'môi', 'giới', 'định',
        'giá', 'thẩm', 'định', 'kiểm', 'định', 'chứng', 'nhận',
    }

    real_english = [w for w in latin_words if w.lower() not in vn_latin_words]
    return len(real_english) > 0

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # =========================================================
    # BƯỚC 1: BACKUP bảng
    # =========================================================
    print("=" * 60)
    print("BƯỚC 1: Backup bảng core.careers")
    print("=" * 60)

    cur.execute("DROP TABLE IF EXISTS core.careers_backup_alt_titles_viet_hoa")
    cur.execute("""
        CREATE TABLE core.careers_backup_alt_titles_viet_hoa
        AS SELECT * FROM core.careers
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM core.careers_backup_alt_titles_viet_hoa")
    backup_count = cur.fetchone()[0]
    print(f"✅ Backup thành công: {backup_count} bản ghi -> core.careers_backup_alt_titles_viet_hoa")

    # =========================================================
    # BƯỚC 2: Thu thập tất cả unique titles cần dịch
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 2: Thu thập unique titles cần dịch")
    print("=" * 60)

    cur.execute("""
        SELECT id, alternative_titles_vi
        FROM core.careers
        WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
        ORDER BY id
    """)
    all_rows = cur.fetchall()

    # Thu thập tất cả unique titles
    all_unique_titles = set()
    for row in all_rows:
        titles = row[1]
        if titles:
            for t in titles:
                all_unique_titles.add(t)

    # Lọc những title cần dịch
    titles_to_translate = [t for t in all_unique_titles if needs_translation(t)]
    titles_already_vn = [t for t in all_unique_titles if not needs_translation(t)]

    print(f"Tổng unique titles: {len(all_unique_titles)}")
    print(f"Cần dịch: {len(titles_to_translate)}")
    print(f"Đã tiếng Việt: {len(titles_already_vn)}")

    # =========================================================
    # BƯỚC 3: Dịch từng unique title
    # =========================================================
    print("\n" + "=" * 60)
    print(f"BƯỚC 3: Dịch {len(titles_to_translate)} unique titles")
    print("=" * 60)

    translation_map = {}  # original -> translated
    failed = []

    for i, title in enumerate(sorted(titles_to_translate), 1):
        print(f"  [{i}/{len(titles_to_translate)}] {title[:70]}")
        translated = translate_to_vn(title)
        translation_map[title] = translated
        print(f"           -> {translated[:70]}")

        # Commit progress mỗi 50 titles để không mất dữ liệu
        if i % 50 == 0:
            print(f"  ... [{i}/{len(titles_to_translate)}] đã dịch xong, tiếp tục...")

    print(f"\n✅ Dịch xong {len(translation_map)} titles")
    if failed:
        print(f"⚠️  Thất bại: {len(failed)} titles")

    # =========================================================
    # BƯỚC 4: Update DB từng dòng
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 4: Update DB từng dòng")
    print("=" * 60)

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
            if t in translation_map:
                new_titles.append(translation_map[t])
                if translation_map[t] != t:
                    changed = True
            else:
                new_titles.append(t)

        if changed:
            cur.execute("""
                UPDATE core.careers
                SET alternative_titles_vi = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_titles, row_id))
            updated_count += 1
        else:
            skipped_count += 1

    conn.commit()
    print(f"✅ Đã update: {updated_count} bản ghi")
    print(f"   Bỏ qua (đã VN): {skipped_count} bản ghi")

    # =========================================================
    # BƯỚC 5: Kiểm tra kết quả
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 5: Kiểm tra kết quả")
    print("=" * 60)

    cur.execute("""
        SELECT id, alternative_titles_vi
        FROM core.careers
        WHERE alternative_titles_vi IS NOT NULL AND array_length(alternative_titles_vi, 1) > 0
        ORDER BY id
    """)
    final_rows = cur.fetchall()

    final_all_titles = set()
    for row in final_rows:
        titles = row[1]
        if titles:
            for t in titles:
                final_all_titles.add(t)

    still_english = [t for t in final_all_titles if needs_translation(t)]

    print(f"\nTổng unique titles sau dịch: {len(final_all_titles)}")
    print(f"Còn tiếng Anh: {len(still_english)}")

    if still_english:
        print("\nCác title còn tiếng Anh:")
        for t in sorted(still_english)[:50]:
            print(f"  ❌ {t}")
        if len(still_english) > 50:
            print(f"  ... và {len(still_english) - 50} title khác")

    if not still_english:
        print("\n🎉 HOÀN THÀNH: 100% alternative_titles_vi đã được việt hóa!")
    else:
        print(f"\n⚠️  Còn {len(still_english)} unique titles chưa dịch hoàn toàn.")

    # Mẫu kết quả
    print("\n--- Mẫu kết quả (3 dòng đầu) ---")
    cur.execute("""
        SELECT id, title_vi, alternative_titles_vi
        FROM core.careers
        ORDER BY id
        LIMIT 3
    """)
    for r in cur.fetchall():
        print(f"id={r[0]}, title_vi={r[1]}")
        print(f"  alternative_titles_vi: {r[2]}")
        print()

    cur.close()
    conn.close()
    print("✅ Script hoàn tất.")

if __name__ == '__main__':
    main()
