#!/usr/bin/env python3
"""
DỊCH NGAY CÁC RECORDS CÒN LẠI - KHÔNG KIỂM TRA GÌ CẢ
==================================================
Dịch trực tiếp các records ID 61, 62 và bất kỳ record nào khác còn tiếng Anh
"""

import psycopg2
import time
from googletrans import Translator

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'career_recommendation',
    'user': 'postgres',
    'password': 'postgres'
}

def translate_text(translator, text):
    """Dịch text từ tiếng Anh sang tiếng Việt"""
    if not text:
        return text
    
    try:
        time.sleep(1)  # Delay để tránh rate limit
        result = translator.translate(text, src='en', dest='vi')
        return result.text
    except Exception as e:
        print(f"❌ Lỗi dịch: {e}")
        return text

def main():
    print("🚀 DỊCH NGAY CÁC RECORDS CÒN LẠI")
    print("=" * 50)
    
    # Kết nối database
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    translator = Translator()
    
    # Lấy tất cả records có text tiếng Anh trong cột _vn
    cur.execute("""
        SELECT id, career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn
        FROM core.career_overview 
        WHERE 
            (experience_text_en IS NOT NULL AND experience_text_en != '' AND 
             (experience_text_vn IS NULL OR experience_text_vn = '' OR experience_text_vn = experience_text_en))
            OR
            (degree_text_en IS NOT NULL AND degree_text_en != '' AND 
             (degree_text_vn IS NULL OR degree_text_vn = '' OR degree_text_vn = degree_text_en))
        ORDER BY id
    """)
    
    records = cur.fetchall()
    
    if not records:
        print("✅ Tất cả records đã được dịch!")
        return
    
    print(f"📊 Tìm thấy {len(records)} records cần dịch")
    
    for i, (record_id, career_id, exp_en, exp_vn, deg_en, deg_vn) in enumerate(records, 1):
        print(f"\n🔄 Đang dịch record {i}/{len(records)} (ID: {record_id})")
        
        # Dịch experience_text nếu cần
        if exp_en and (not exp_vn or exp_vn == exp_en):
            print(f"📝 Dịch experience: {exp_en[:50]}...")
            exp_vn_new = translate_text(translator, exp_en)
            print(f"✅ Kết quả: {exp_vn_new[:50]}...")
        else:
            exp_vn_new = exp_vn
        
        # Dịch degree_text nếu cần
        if deg_en and (not deg_vn or deg_vn == deg_en):
            print(f"📝 Dịch degree: {deg_en[:50]}...")
            deg_vn_new = translate_text(translator, deg_en)
            print(f"✅ Kết quả: {deg_vn_new[:50]}...")
        else:
            deg_vn_new = deg_vn
        
        # Cập nhật database
        cur.execute("""
            UPDATE core.career_overview 
            SET experience_text_vn = %s,
                degree_text_vn = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (exp_vn_new, deg_vn_new, record_id))
        
        conn.commit()
        print(f"✅ Đã cập nhật record ID {record_id}")
    
    print(f"\n🎉 HOÀN THÀNH! Đã dịch {len(records)} records")
    
    conn.close()

if __name__ == "__main__":
    main()