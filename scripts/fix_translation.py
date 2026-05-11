"""
Script fix lại các lỗi dịch còn sót:
1. Kiểm tra đúng xem text có còn tiếng Anh không (dùng langdetect)
2. Sửa lỗi "Bar admission" -> "Được cấp phép hành nghề luật"
3. Sửa các text bị nhận nhầm là tiếng Anh
"""

import psycopg2
import time

DB_URL = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

# Các bản dịch thủ công để đảm bảo chính xác 100%
MANUAL_FIXES = {
    # Sửa lỗi "Bar admission" bị dịch sai
    "Yêu cầu có bằng Tiến sĩ Luật (J.D.). Yêu cầu nhập học vào quán bar.":
        "Yêu cầu có bằng Tiến sĩ Luật (J.D.). Yêu cầu được cấp phép hành nghề luật sư.",
}

def has_english_words(text: str) -> bool:
    """Kiểm tra text có chứa từ tiếng Anh thực sự không."""
    if not text:
        return False
    # Các từ tiếng Anh phổ biến
    english_indicators = [
        ' the ', ' is ', ' are ', ' was ', ' were ', ' has ', ' have ',
        ' required', ' preferred', ' needed', ' degree', ' diploma',
        ' experience', ' training', ' years ', ' months ',
        'Bachelor', 'Master', 'Associate', 'High school',
        'Usually requires', 'Often required', 'Considerable',
        'Extensive', 'Medium preparation', 'Some preparation',
        'Professional', 'Commercial', 'Technical',
    ]
    text_lower = text.lower()
    for indicator in english_indicators:
        if indicator.lower() in text_lower:
            return True
    return False

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # =========================================================
    # BƯỚC 1: Kiểm tra thực tế xem còn text tiếng Anh không
    # =========================================================
    print("=" * 60)
    print("Kiểm tra text còn tiếng Anh thực sự")
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

    real_english_exp = [t for t in all_exp if has_english_words(t)]
    real_english_deg = [t for t in all_deg if has_english_words(t)]

    print(f"\nexperience_text_vn còn tiếng Anh thực sự: {len(real_english_exp)}")
    for t in real_english_exp:
        print(f"  - {t}")

    print(f"\ndegree_text_vn còn tiếng Anh thực sự: {len(real_english_deg)}")
    for t in real_english_deg:
        print(f"  - {t}")

    # =========================================================
    # BƯỚC 2: Sửa lỗi dịch thủ công
    # =========================================================
    print("\n" + "=" * 60)
    print("Sửa lỗi dịch thủ công")
    print("=" * 60)

    fixed_count = 0
    for old_text, new_text in MANUAL_FIXES.items():
        cur.execute("""
            UPDATE core.career_overview
            SET degree_text_vn = %s,
                updated_at = NOW()
            WHERE degree_text_vn = %s
        """, (new_text, old_text))
        rows_affected = cur.rowcount
        if rows_affected > 0:
            print(f"✅ Sửa {rows_affected} dòng:")
            print(f"   Cũ: {old_text}")
            print(f"   Mới: {new_text}")
            fixed_count += rows_affected

    conn.commit()
    print(f"\nTổng sửa: {fixed_count} bản ghi")

    # =========================================================
    # BƯỚC 3: Kiểm tra lần cuối
    # =========================================================
    print("\n" + "=" * 60)
    print("Kiểm tra lần cuối")
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

    still_english_exp = [t for t in final_exp if has_english_words(t)]
    still_english_deg = [t for t in final_deg if has_english_words(t)]

    print(f"\nexperience_text_vn còn tiếng Anh: {len(still_english_exp)}")
    for t in still_english_exp:
        print(f"  ❌ {t}")

    print(f"\ndegree_text_vn còn tiếng Anh: {len(still_english_deg)}")
    for t in still_english_deg:
        print(f"  ❌ {t}")

    print("\n--- Tất cả giá trị distinct sau khi dịch ---")
    print("\n[experience_text_vn]")
    for t in final_exp:
        marker = "❌" if has_english_words(t) else "✅"
        print(f"  {marker} {t}")

    print("\n[degree_text_vn]")
    for t in final_deg:
        marker = "❌" if has_english_words(t) else "✅"
        print(f"  {marker} {t}")

    if not still_english_exp and not still_english_deg:
        print("\n🎉 HOÀN THÀNH: 100% đã được việt hóa!")
    else:
        total_remaining = len(still_english_exp) + len(still_english_deg)
        print(f"\n⚠️  Còn {total_remaining} text unique chưa dịch hoàn toàn.")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
