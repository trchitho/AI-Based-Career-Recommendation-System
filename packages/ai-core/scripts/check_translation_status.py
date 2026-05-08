#!/usr/bin/env python3
"""
KIỂM TRA TÌNH TRẠNG DỊCH BẢNG core.career_overview
================================================

Script này kiểm tra:
1. Số lượng records đã dịch / chưa dịch
2. Chất lượng bản dịch
3. Các vấn đề cần khắc phục

Author: AI Assistant
Date: 2026-01-27
"""

import psycopg2
import json
from typing import Dict, List

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'career_recommendation',
    'user': 'postgres',
    'password': 'postgres'
}

def is_vietnamese_text(text: str) -> bool:
    """Kiểm tra xem text có phải tiếng Việt không"""
    if not text:
        return False
        
    vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
    vietnamese_chars += vietnamese_chars.upper()
    
    # Nếu có ít nhất 10% ký tự tiếng Việt thì coi là tiếng Việt
    vietnamese_count = sum(1 for char in text if char in vietnamese_chars)
    total_chars = len([c for c in text if c.isalpha()])
    
    if total_chars == 0:
        return False
        
    return (vietnamese_count / total_chars) >= 0.1

def check_translation_status():
    """Kiểm tra tình trạng dịch"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("=" * 60)
        print("🔍 KIỂM TRA TÌNH TRẠNG DỊCH BẢNG core.career_overview")
        print("=" * 60)
        
        # 1. Tổng số records
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        total_records = cur.fetchone()[0]
        print(f"📊 Tổng số records: {total_records}")
        
        # 2. Kiểm tra cột experience_text
        print("\n📝 KIỂM TRA experience_text:")
        
        # Records có experience_text_en
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE experience_text_en IS NOT NULL AND experience_text_en != ''
        """)
        exp_en_count = cur.fetchone()[0]
        print(f"  - Có experience_text_en: {exp_en_count}")
        
        # Records có experience_text_vn
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE experience_text_vn IS NOT NULL AND experience_text_vn != ''
        """)
        exp_vn_count = cur.fetchone()[0]
        print(f"  - Có experience_text_vn: {exp_vn_count}")
        
        # Records chưa dịch experience
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE experience_text_en IS NOT NULL AND experience_text_en != ''
            AND (experience_text_vn IS NULL OR experience_text_vn = '' OR experience_text_vn = experience_text_en)
        """)
        exp_untranslated = cur.fetchone()[0]
        print(f"  - Chưa dịch experience: {exp_untranslated}")
        
        # 3. Kiểm tra cột degree_text
        print("\n🎓 KIỂM TRA degree_text:")
        
        # Records có degree_text_en
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE degree_text_en IS NOT NULL AND degree_text_en != ''
        """)
        deg_en_count = cur.fetchone()[0]
        print(f"  - Có degree_text_en: {deg_en_count}")
        
        # Records có degree_text_vn
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE degree_text_vn IS NOT NULL AND degree_text_vn != ''
        """)
        deg_vn_count = cur.fetchone()[0]
        print(f"  - Có degree_text_vn: {deg_vn_count}")
        
        # Records chưa dịch degree
        cur.execute("""
            SELECT COUNT(*) FROM core.career_overview 
            WHERE degree_text_en IS NOT NULL AND degree_text_en != ''
            AND (degree_text_vn IS NULL OR degree_text_vn = '' OR degree_text_vn = degree_text_en)
        """)
        deg_untranslated = cur.fetchone()[0]
        print(f"  - Chưa dịch degree: {deg_untranslated}")
        
        # 4. Kiểm tra chất lượng dịch
        print("\n🔍 KIỂM TRA CHẤT LƯỢNG DỊCH:")
        
        cur.execute("""
            SELECT id, experience_text_vn, degree_text_vn
            FROM core.career_overview 
            WHERE experience_text_vn IS NOT NULL OR degree_text_vn IS NOT NULL
            ORDER BY id
        """)
        
        records = cur.fetchall()
        exp_quality_issues = 0
        deg_quality_issues = 0
        
        for record_id, exp_vn, deg_vn in records:
            if exp_vn and not is_vietnamese_text(exp_vn):
                exp_quality_issues += 1
            if deg_vn and not is_vietnamese_text(deg_vn):
                deg_quality_issues += 1
        
        print(f"  - Experience có vấn đề chất lượng: {exp_quality_issues}")
        print(f"  - Degree có vấn đề chất lượng: {deg_quality_issues}")
        
        # 5. Tổng kết
        print("\n📈 TỔNG KẾT:")
        total_need_translation = exp_untranslated + deg_untranslated
        total_quality_issues = exp_quality_issues + deg_quality_issues
        
        if total_need_translation == 0 and total_quality_issues == 0:
            print("✅ Việt hóa hoàn tất 100%!")
        elif total_need_translation > 0:
            print(f"⚠️ Còn {total_need_translation} trường cần dịch")
        elif total_quality_issues > 0:
            print(f"⚠️ Có {total_quality_issues} trường có vấn đề chất lượng")
        
        # 6. Hiển thị một số mẫu
        print("\n📋 MẪU DỮ LIỆU:")
        cur.execute("""
            SELECT id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn
            FROM core.career_overview 
            WHERE experience_text_vn IS NOT NULL OR degree_text_vn IS NOT NULL
            ORDER BY id
            LIMIT 3
        """)
        
        samples = cur.fetchall()
        for i, (record_id, exp_en, exp_vn, deg_en, deg_vn) in enumerate(samples, 1):
            print(f"\n  Record {record_id}:")
            if exp_en:
                print(f"    Experience EN: {exp_en[:80]}...")
            if exp_vn:
                print(f"    Experience VN: {exp_vn[:80]}...")
            if deg_en:
                print(f"    Degree EN: {deg_en[:80]}...")
            if deg_vn:
                print(f"    Degree VN: {deg_vn[:80]}...")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    check_translation_status()