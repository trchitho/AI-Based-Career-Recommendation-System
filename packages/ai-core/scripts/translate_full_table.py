#!/usr/bin/env python3
"""
DỊCH TOÀN BỘ BẢNG core.career_overview
=====================================
Dịch tất cả các cột text từ tiếng Anh sang tiếng Việt
Không kiểm tra gì cả, chỉ dịch!
"""

import time
import json
import os
from googletrans import Translator

# Khởi tạo translator
translator = Translator()

def translate_text(text):
    """Dịch text từ tiếng Anh sang tiếng Việt"""
    if not text or text.strip() == "":
        return ""
    
    try:
        time.sleep(1.2)  # Delay để tránh rate limit
        result = translator.translate(text, src='en', dest='vi')
        translated = result.text
        print(f"✅ Dịch: {text[:40]}... → {translated[:40]}...")
        return translated
    except Exception as e:
        print(f"❌ Lỗi dịch: {e}")
        return text

def main():
    print("🚀 DỊCH TOÀN BỘ BẢNG core.career_overview")
    print("=" * 60)
    
    # Danh sách các text cần dịch (từ dữ liệu bạn cung cấp)
    records_to_translate = [
        {
            'id': 3,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree)."
        },
        {
            'id': 4,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree)."
        },
        {
            'id': 59,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree)."
        },
        {
            'id': 60,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree)."
        },
        {
            'id': 61,
            'experience_text_en': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",
            'degree_text_en': "Bachelor's degree required. Master's degree preferred for senior positions."
        },
        {
            'id': 62,
            'experience_text_en': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",
            'degree_text_en': "Bachelor's degree required. Master's degree preferred for senior positions."
        }
    ]
    
    # Tạo file SQL output
    sql_output = []
    sql_output.append("-- DỊCH TOÀN BỘ BẢNG core.career_overview")
    sql_output.append("-- =====================================")
    sql_output.append("-- Tự động tạo bởi translate_full_table.py")
    sql_output.append(f"-- Ngày: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    sql_output.append("")
    
    total_records = len(records_to_translate)
    
    for i, record in enumerate(records_to_translate, 1):
        record_id = record['id']
        exp_en = record['experience_text_en']
        deg_en = record['degree_text_en']
        
        print(f"\n🔄 Đang dịch record {i}/{total_records} (ID: {record_id})")
        
        # Dịch experience_text
        print("📝 Dịch experience_text...")
        exp_vn = translate_text(exp_en)
        
        # Dịch degree_text
        print("📝 Dịch degree_text...")
        deg_vn = translate_text(deg_en)
        
        # Tạo SQL statement
        sql_output.append(f"-- Record ID {record_id}")
        sql_output.append("UPDATE core.career_overview")
        sql_output.append("SET")
        sql_output.append(f"    experience_text_vn = '{exp_vn.replace(\"'\", \"''\")}',")
        sql_output.append(f"    degree_text_vn = '{deg_vn.replace(\"'\", \"''\")}',")
        sql_output.append("    updated_at = NOW()")
        sql_output.append(f"WHERE id = {record_id};")
        sql_output.append("")
        
        print(f"✅ Hoàn thành record ID {record_id}")
    
    # Thêm query kiểm tra
    sql_output.append("-- Kiểm tra kết quả")
    sql_output.append("SELECT id, experience_text_vn, degree_text_vn")
    sql_output.append("FROM core.career_overview")
    record_ids = [str(r['id']) for r in records_to_translate]
    sql_output.append(f"WHERE id IN ({', '.join(record_ids)});")
    
    # Ghi file SQL
    output_file = "career_overview_full_translation.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_output))
    
    print(f"\n🎉 HOÀN THÀNH DỊCH TOÀN BỘ BẢNG!")
    print(f"📁 File SQL: {output_file}")
    print(f"📊 Đã dịch: {total_records} records")
    
    # Hiển thị một số kết quả mẫu
    print("\n📋 MẪU KẾT QUẢ DỊCH:")
    for record in records_to_translate[:2]:
        print(f"\nRecord ID {record['id']}:")
        exp_vn = translate_text(record['experience_text_en'])
        deg_vn = translate_text(record['degree_text_en'])
        print(f"  Experience VN: {exp_vn}")
        print(f"  Degree VN: {deg_vn}")

if __name__ == "__main__":
    main()