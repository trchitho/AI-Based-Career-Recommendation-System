#!/usr/bin/env python3
"""
DỊCH THỦ CÔNG TẤT CẢ RECORDS - KHÔNG CẦN DATABASE
===============================================
Dịch trực tiếp từ dữ liệu bạn cung cấp và tạo SQL statements
"""

import time
from googletrans import Translator

# Khởi tạo translator
translator = Translator()

def translate_text(text):
    """Dịch text từ tiếng Anh sang tiếng Việt"""
    if not text or text.strip() == "":
        return ""
    
    # Kiểm tra xem đã là tiếng Việt chưa
    vietnamese_chars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
    vietnamese_count = sum(1 for char in text.lower() if char in vietnamese_chars)
    total_alpha = sum(1 for char in text if char.isalpha())
    
    if total_alpha > 0 and (vietnamese_count / total_alpha) >= 0.1:
        print(f"📝 Đã là tiếng Việt: {text[:50]}...")
        return text
    
    try:
        time.sleep(2)  # Delay để tránh rate limit
        result = translator.translate(text, src='en', dest='vi')
        translated = result.text
        print(f"✅ Dịch: {text[:40]}... → {translated[:40]}...")
        return translated
    except Exception as e:
        print(f"❌ Lỗi dịch: {e}")
        return text

def main():
    print("🇻🇳 DỊCH THỦ CÔNG TẤT CẢ RECORDS")
    print("=" * 50)
    
    # Dữ liệu từ bảng career_overview (từ thông tin bạn cung cấp)
    records = [
        {
            'id': 3,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'experience_text_vn': "Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree).",
            'degree_text_vn': "Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư."
        },
        {
            'id': 4,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'experience_text_vn': "Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree).",
            'degree_text_vn': "Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư."
        },
        {
            'id': 59,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'experience_text_vn': "Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree).",
            'degree_text_vn': "Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư."
        },
        {
            'id': 60,
            'experience_text_en': "Extensive skill, knowledge, and experience needed. Typically requires more than 5 years of specialized experience in leadership roles.",
            'experience_text_vn': "Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.",
            'degree_text_en': "Master's degree required. Some positions may require Ph.D., M.D., or J.D. (law degree).",
            'degree_text_vn': "Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư."
        },
        {
            'id': 61,
            'experience_text_en': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",
            'experience_text_vn': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",  # Chưa dịch
            'degree_text_en': "Bachelor's degree required. Master's degree preferred for senior positions.",
            'degree_text_vn': "Bachelor's degree required. Master's degree preferred for senior positions."  # Chưa dịch
        },
        {
            'id': 62,
            'experience_text_en': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",
            'experience_text_vn': "Considerable preparation needed. Usually requires 2-4 years of related work experience.",  # Chưa dịch
            'degree_text_en': "Bachelor's degree required. Master's degree preferred for senior positions.",
            'degree_text_vn': "Bachelor's degree required. Master's degree preferred for senior positions."  # Chưa dịch
        }
    ]
    
    # Tạo file SQL output
    sql_statements = []
    sql_statements.append("-- VIỆT HÓA HOÀN CHỈNH BẢNG core.career_overview")
    sql_statements.append("-- ===============================================")
    sql_statements.append(f"-- Ngày tạo: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    sql_statements.append("")
    
    total_records = len(records)
    
    for i, record in enumerate(records, 1):
        record_id = record['id']
        exp_en = record['experience_text_en']
        exp_vn = record['experience_text_vn']
        deg_en = record['degree_text_en']
        deg_vn = record['degree_text_vn']
        
        print(f"\n🔄 Xử lý record {i}/{total_records} (ID: {record_id})")
        
        # Kiểm tra và dịch experience_text_vn nếu cần
        if exp_vn == exp_en or not exp_vn:  # Chưa dịch hoặc giống tiếng Anh
            print("📝 Dịch experience_text...")
            exp_vn_new = translate_text(exp_en)
        else:
            exp_vn_new = exp_vn
            print(f"✅ Experience đã dịch: {exp_vn[:50]}...")
        
        # Kiểm tra và dịch degree_text_vn nếu cần
        if deg_vn == deg_en or not deg_vn:  # Chưa dịch hoặc giống tiếng Anh
            print("📝 Dịch degree_text...")
            deg_vn_new = translate_text(deg_en)
        else:
            deg_vn_new = deg_vn
            print(f"✅ Degree đã dịch: {deg_vn[:50]}...")
        
        # Tạo SQL statement
        exp_escaped = exp_vn_new.replace("'", "''")
        deg_escaped = deg_vn_new.replace("'", "''")
        
        sql_statements.append(f"-- Record ID {record_id}")
        sql_statements.append("UPDATE core.career_overview")
        sql_statements.append("SET")
        sql_statements.append(f"    experience_text_vn = '{exp_escaped}',")
        sql_statements.append(f"    degree_text_vn = '{deg_escaped}',")
        sql_statements.append("    updated_at = NOW()")
        sql_statements.append(f"WHERE id = {record_id};")
        sql_statements.append("")
        
        print(f"✅ Hoàn thành record ID {record_id}")
    
    # Thêm query kiểm tra
    sql_statements.append("-- Kiểm tra kết quả")
    sql_statements.append("SELECT id, experience_text_vn, degree_text_vn")
    sql_statements.append("FROM core.career_overview")
    record_ids = [str(r['id']) for r in records]
    sql_statements.append(f"WHERE id IN ({', '.join(record_ids)});")
    
    # Ghi file SQL
    output_file = "career_overview_vietnamese_complete.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print(f"\n🎉 HOÀN THÀNH VIỆT HÓA!")
    print(f"📁 File SQL: {output_file}")
    print(f"📊 Đã xử lý: {total_records} records")
    print("📋 Chạy file SQL này trong database để cập nhật")

if __name__ == "__main__":
    main()