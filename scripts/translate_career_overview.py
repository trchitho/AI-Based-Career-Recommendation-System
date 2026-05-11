"""
Script việt hóa bảng core.career_overview
- Backup bảng trước khi dịch
- Dịch các cột experience_text_vn và degree_text_vn sang tiếng Việt
- Dùng Google Translate free (deep-translator)
- Dịch theo unique text để tối ưu số lần gọi API
- Update từng dòng vào DB
"""

import psycopg2
import time
import json
from deep_translator import GoogleTranslator

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def translate_to_vn(text: str) -> str:
    """Dịch text sang tiếng Việt dùng Google Translate free."""
    if not text or not text.strip():
        return text
    try:
        translator = GoogleTranslator(source='en', target='vi')
        result = translator.translate(text)
        time.sleep(0.3)  # tránh rate limit
        return result
    except Exception as e:
        print(f"  [LỖI dịch] {e} | text: {text[:60]}")
        return text  # giữ nguyên nếu lỗi

def is_english(text: str) -> bool:
    """Kiểm tra text có phải tiếng Anh không (chứa ký tự Latin ASCII)."""
    if not text:
        return False
    # Nếu phần lớn ký tự là ASCII thì coi là tiếng Anh
    ascii_count = sum(1 for c in text if ord(c) < 128 and c.isalpha())
    total_alpha = sum(1 for c in text if c.isalpha())
    if total_alpha == 0:
        return False
    return (ascii_count / total_alpha) > 0.7

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # =========================================================
    # BƯỚC 1: BACKUP bảng
    # =========================================================
    print("=" * 60)
    print("BƯỚC 1: Backup bảng core.career_overview")
    print("=" * 60)

    cur.execute("DROP TABLE IF EXISTS core.career_overview_backup_viet_hoa")
    cur.execute("""
        CREATE TABLE core.career_overview_backup_viet_hoa
        AS SELECT * FROM core.career_overview
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM core.career_overview_backup_viet_hoa")
    backup_count = cur.fetchone()[0]
    print(f"✅ Backup thành công: {backup_count} bản ghi -> core.career_overview_backup_viet_hoa")

    # =========================================================
    # BƯỚC 2: Lấy tất cả distinct texts cần dịch
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 2: Lấy distinct texts cần dịch")
    print("=" * 60)

    cur.execute("""
        SELECT DISTINCT experience_text_vn
        FROM core.career_overview
        WHERE experience_text_vn IS NOT NULL
        ORDER BY experience_text_vn
    """)
    all_exp = [r[0] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT degree_text_vn
        FROM core.career_overview
        WHERE degree_text_vn IS NOT NULL
        ORDER BY degree_text_vn
    """)
    all_deg = [r[0] for r in cur.fetchall()]

    # Lọc chỉ những text còn tiếng Anh
    exp_to_translate = [t for t in all_exp if is_english(t)]
    deg_to_translate = [t for t in all_deg if is_english(t)]

    print(f"experience_text_vn: {len(all_exp)} distinct, cần dịch: {len(exp_to_translate)}")
    print(f"degree_text_vn:     {len(all_deg)} distinct, cần dịch: {len(deg_to_translate)}")

    # =========================================================
    # BƯỚC 3: Dịch từng unique text
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 3: Dịch các experience_text_vn")
    print("=" * 60)

    exp_map = {}  # original_en -> translated_vn
    for i, text in enumerate(exp_to_translate, 1):
        print(f"  [{i}/{len(exp_to_translate)}] Đang dịch: {text[:70]}...")
        translated = translate_to_vn(text)
        exp_map[text] = translated
        print(f"           -> {translated[:70]}")

    print("\n" + "=" * 60)
    print("BƯỚC 3b: Dịch các degree_text_vn")
    print("=" * 60)

    deg_map = {}  # original_en -> translated_vn
    for i, text in enumerate(deg_to_translate, 1):
        print(f"  [{i}/{len(deg_to_translate)}] Đang dịch: {text[:70]}...")
        translated = translate_to_vn(text)
        deg_map[text] = translated
        print(f"           -> {translated[:70]}")

    # =========================================================
    # BƯỚC 4: Update DB từng dòng
    # =========================================================
    print("\n" + "=" * 60)
    print("BƯỚC 4: Update DB")
    print("=" * 60)

    cur.execute("SELECT id, experience_text_vn, degree_text_vn FROM core.career_overview ORDER BY id")
    rows = cur.fetchall()

    updated_count = 0
    skipped_count = 0

    for row in rows:
        row_id, exp_vn, deg_vn = row

        new_exp = exp_map.get(exp_vn, exp_vn)  # dùng bản dịch nếu có, không thì giữ nguyên
        new_deg = deg_map.get(deg_vn, deg_vn)

        # Chỉ update nếu có thay đổi
        if new_exp != exp_vn or new_deg != deg_vn:
            cur.execute("""
                UPDATE core.career_overview
                SET experience_text_vn = %s,
                    degree_text_vn = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (new_exp, new_deg, row_id))
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
        SELECT DISTINCT experience_text_vn
        FROM core.career_overview
        WHERE experience_text_vn IS NOT NULL
        ORDER BY experience_text_vn
    """)
    final_exp = [r[0] for r in cur.fetchall()]

    cur.execute("""
        SELECT DISTINCT degree_text_vn
        FROM core.career_overview
        WHERE degree_text_vn IS NOT NULL
        ORDER BY degree_text_vn
    """)
    final_deg = [r[0] for r in cur.fetchall()]

    still_english_exp = [t for t in final_exp if is_english(t)]
    still_english_deg = [t for t in final_deg if is_english(t)]

    print(f"\nexperience_text_vn còn tiếng Anh: {len(still_english_exp)}")
    for t in still_english_exp:
        print(f"  - {t[:100]}")

    print(f"\ndegree_text_vn còn tiếng Anh: {len(still_english_deg)}")
    for t in still_english_deg:
        print(f"  - {t[:100]}")

    if not still_english_exp and not still_english_deg:
        print("\n🎉 HOÀN THÀNH: 100% đã được việt hóa!")
    else:
        print(f"\n⚠️  Còn {len(still_english_exp) + len(still_english_deg)} text chưa dịch được.")

    print("\n--- Mẫu kết quả (5 dòng đầu) ---")
    cur.execute("""
        SELECT id, career_id, experience_text_vn, degree_text_vn
        FROM core.career_overview
        ORDER BY id
        LIMIT 5
    """)
    for r in cur.fetchall():
        print(f"id={r[0]}, career_id={r[1]}")
        print(f"  exp_vn: {r[2]}")
        print(f"  deg_vn: {r[3]}")
        print()

    cur.close()
    conn.close()
    print("✅ Script hoàn tất.")

if __name__ == '__main__':
    main()
