#!/usr/bin/env python3
"""
DỊCH THỦ CÔNG CÁC RECORDS CÒN LẠI
================================
Dịch trực tiếp không cần kết nối database
"""

# Các bản dịch thủ công cho records còn lại
translations = {
    61: {
        'experience_text_vn': 'Cần chuẩn bị đáng kể. Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
        'degree_text_vn': 'Yêu cầu bằng cử nhân. Ưu tiên bằng thạc sĩ cho các vị trí cao cấp.'
    },
    62: {
        'experience_text_vn': 'Cần chuẩn bị đáng kể. Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
        'degree_text_vn': 'Yêu cầu bằng cử nhân. Ưu tiên bằng thạc sĩ cho các vị trí cao cấp.'
    }
}

def generate_sql():
    """Tạo SQL statements để cập nhật"""
    print("-- DỊCH TRỰC TIẾP CÁC RECORDS CÒN LẠI")
    print("-- ===================================\n")
    
    for record_id, trans in translations.items():
        print(f"-- Record ID {record_id}")
        print("UPDATE core.career_overview")
        print("SET")
        print(f"    experience_text_vn = '{trans['experience_text_vn']}',")
        print(f"    degree_text_vn = '{trans['degree_text_vn']}',")
        print("    updated_at = NOW()")
        print(f"WHERE id = {record_id};\n")
    
    print("-- Kiểm tra kết quả")
    print("SELECT id, experience_text_vn, degree_text_vn")
    print("FROM core.career_overview")
    print("WHERE id IN (61, 62);")

if __name__ == "__main__":
    generate_sql()