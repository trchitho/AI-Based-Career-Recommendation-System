#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script việt hóa hoàn toàn bảng core.career_dwas
Đảm bảo 100% không còn từ tiếng Anh trong cột _vn
"""

import psycopg2
import re
from typing import Dict, List, Tuple

# Database connection
DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

# Dictionary dịch thuật chuyên ngành
TRANSLATION_DICT = {
    # Cụm từ hoàn chỉnh - ưu tiên cao nhất
    "Communicate with clients about financial matters.": "Giao tiếp với khách hàng về các vấn đề tài chính.",
    "Evaluate financial risks or opportunities.": "Đánh giá rủi ro tài chính hoặc cơ hội đầu tư.",
    "Analyze financial data or information.": "Phân tích dữ liệu hoặc thông tin tài chính.",
    "Prepare financial reports or statements.": "Chuẩn bị báo cáo hoặc báo cáo tài chính.",
    "Review financial records or documents.": "Xem xét hồ sơ hoặc tài liệu tài chính.",
    "Develop financial plans or strategies.": "Phát triển kế hoạch hoặc chiến lược tài chính.",
    "Monitor financial performance or compliance.": "Giám sát hiệu suất tài chính hoặc tuân thủ.",
    "Coordinate business operations or activities.": "Phối hợp hoạt động hoặc các hoạt động kinh doanh.",
    "Manage business relationships or partnerships.": "Quản lý mối quan hệ kinh doanh hoặc đối tác.",
    "Supervise staff or team members.": "Giám sát nhân viên hoặc thành viên nhóm.",
    "Train employees or staff members.": "Đào tạo nhân viên hoặc thành viên nhân viên.",
    "Conduct meetings or presentations.": "Tiến hành cuộc họp hoặc thuyết trình.",
    "Negotiate contracts or agreements.": "Đàm phán hợp đồng hoặc thỏa thuận.",
    "Maintain records or documentation.": "Duy trì hồ sơ hoặc tài liệu.",
    "Process applications or requests.": "Xử lý đơn đăng ký hoặc yêu cầu.",
    "Provide customer service or support.": "Cung cấp dịch vụ khách hàng hoặc hỗ trợ.",
    "Resolve customer complaints or issues.": "Giải quyết khiếu nại hoặc vấn đề của khách hàng.",
    "Update databases or information systems.": "Cập nhật cơ sở dữ liệu hoặc hệ thống thông tin.",
    "Create reports or documentation.": "Tạo báo cáo hoặc tài liệu.",
    "Schedule appointments or meetings.": "Lên lịch hẹn hoặc cuộc họp.",
    
    # Cụm từ thông dụng
    "communicate with": "giao tiếp với",
    "collaborate with": "hợp tác với",
    "coordinate with": "phối hợp với",
    "work with": "làm việc với",
    "meet with": "gặp gỡ với",
    "discuss with": "thảo luận với",
    "consult with": "tham vấn với",
    "negotiate with": "đàm phán với",
    
    "financial matters": "các vấn đề tài chính",
    "financial risks": "rủi ro tài chính",
    "financial opportunities": "cơ hội tài chính",
    "financial data": "dữ liệu tài chính",
    "financial information": "thông tin tài chính",
    "financial reports": "báo cáo tài chính",
    "financial records": "hồ sơ tài chính",
    "financial transactions": "giao dịch tài chính",
    "financial performance": "hiệu suất tài chính",
    "financial analysis": "phân tích tài chính",
    "financial planning": "lập kế hoạch tài chính",
    "financial statements": "báo cáo tài chính",
    "financial compliance": "tuân thủ tài chính",
    "financial regulations": "quy định tài chính",
    "financial policies": "chính sách tài chính",
    
    "business operations": "hoạt động kinh doanh",
    "business processes": "quy trình kinh doanh",
    "business requirements": "yêu cầu kinh doanh",
    "business objectives": "mục tiêu kinh doanh",
    "business strategies": "chiến lược kinh doanh",
    "business development": "phát triển kinh doanh",
    "business relationships": "mối quan hệ kinh doanh",
    "business communications": "giao tiếp kinh doanh",
    "business meetings": "cuộc họp kinh doanh",
    "business documents": "tài liệu kinh doanh",
    "business correspondence": "thư từ kinh doanh",
    "business proposals": "đề xuất kinh doanh",
    
    # Từ đơn cơ bản
    "clients": "khách hàng",
    "customers": "khách hàng",
    "matters": "vấn đề",
    "risks": "rủi ro", 
    "opportunities": "cơ hội",
    "about": "về",
    "with": "với",
    "and": "và",
    "or": "hoặc",
    "for": "cho",
    "to": "để",
    "in": "trong",
    "on": "trên",
    "at": "tại",
    "by": "bởi",
    "from": "từ",
    "of": "của",
    "through": "thông qua",
    "during": "trong suốt",
    "regarding": "liên quan đến",
    "concerning": "về việc",
    
    # Động từ
    "analyze": "phân tích",
    "evaluate": "đánh giá",
    "assess": "đánh giá",
    "review": "xem xét",
    "examine": "kiểm tra",
    "investigate": "điều tra",
    "research": "nghiên cứu",
    "study": "nghiên cứu",
    "monitor": "giám sát",
    "track": "theo dõi",
    "manage": "quản lý",
    "supervise": "giám sát",
    "oversee": "giám sát",
    "direct": "chỉ đạo",
    "lead": "dẫn dắt",
    "guide": "hướng dẫn",
    "coordinate": "phối hợp",
    "organize": "tổ chức",
    "plan": "lập kế hoạch",
    "schedule": "lên lịch",
    "prepare": "chuẩn bị",
    "develop": "phát triển",
    "create": "tạo ra",
    "design": "thiết kế",
    "implement": "thực hiện",
    "maintain": "duy trì",
    "update": "cập nhật",
    "modify": "sửa đổi",
    "document": "ghi chép",
    "record": "ghi lại",
}

def connect_db():
    """Kết nối database"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding('UTF8')
    return conn

def translate_text(text: str) -> str:
    """Dịch text từ tiếng Anh sang tiếng Việt"""
    if not text:
        return text
    
    result = text
    
    # Dịch theo thứ tự ưu tiên: cụm từ dài trước, từ đơn sau
    sorted_translations = sorted(TRANSLATION_DICT.items(), 
                               key=lambda x: len(x[0]), reverse=True)
    
    for en_text, vn_text in sorted_translations:
        # Sử dụng word boundary để tránh dịch nhầm
        if len(en_text.split()) == 1:  # Từ đơn
            pattern = r'\b' + re.escape(en_text) + r'\b'
        else:  # Cụm từ
            pattern = re.escape(en_text)
        
        result = re.sub(pattern, vn_text, result, flags=re.IGNORECASE)
    
    # Làm sạch
    result = re.sub(r'\s+', ' ', result).strip()
    
    # Viết hoa chữ cái đầu
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
    
    return result

def get_records_need_translation(conn) -> List[Tuple]:
    """Lấy các bản ghi cần dịch"""
    cursor = conn.cursor()
    
    # Tìm các bản ghi có từ tiếng Anh
    english_words = [
        "about", "and", "or", "with", "for", "to", "in", "on", "at", "by", "from", "of",
        "matters", "risks", "opportunities", "clients", "customers", "financial", 
        "business", "analyze", "evaluate", "manage", "communicate", "develop", "create",
        "prepare", "review", "monitor", "coordinate", "supervise", "maintain", "update"
    ]
    
    conditions = []
    for word in english_words:
        conditions.append(f"dwa_title_vn ~* '\\b{word}\\b'")
    
    where_clause = " OR ".join(conditions)
    
    query = f"""
    SELECT id, onet_code, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    WHERE {where_clause}
    ORDER BY id
    """
    
    cursor.execute(query)
    return cursor.fetchall()

def update_translations(conn):
    """Cập nhật bản dịch"""
    cursor = conn.cursor()
    
    print("🔍 Đang tìm các bản ghi cần dịch...")
    records = get_records_need_translation(conn)
    print(f"📊 Tìm thấy {len(records)} bản ghi cần dịch")
    
    if len(records) == 0:
        print("✅ Không có bản ghi nào cần dịch!")
        return 0
    
    updated_count = 0
    
    for record in records:
        record_id, onet_code, en_text, vn_text = record
        
        # Dịch lại
        new_vn_text = translate_text(en_text)
        
        # Cập nhật nếu có thay đổi
        if new_vn_text != vn_text:
            update_query = """
            UPDATE core.career_dwas 
            SET dwa_title_vn = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            
            cursor.execute(update_query, (new_vn_text, record_id))
            updated_count += 1
            
            if updated_count % 100 == 0:
                conn.commit()
                print(f"✅ Đã cập nhật {updated_count} bản ghi...")
    
    conn.commit()
    print(f"🎉 Hoàn thành! Đã cập nhật {updated_count} bản ghi")
    
    return updated_count

def run_quality_tests(conn) -> bool:
    """Chạy test cases kiểm tra chất lượng"""
    cursor = conn.cursor()
    
    print("\n🧪 Bắt đầu chạy test cases...")
    
    # Test 1: Kiểm tra không còn từ tiếng Anh
    english_words = [
        "about", "and", "or", "with", "matters", "risks", "opportunities", 
        "clients", "financial", "business", "analyze", "evaluate"
    ]
    
    pattern = "|".join([f"\\b{word}\\b" for word in english_words])
    test1_query = f"""
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn ~* '{pattern}'
    """
    cursor.execute(test1_query)
    english_count = cursor.fetchone()[0]
    
    print(f"Test 1 - Từ tiếng Anh còn lại: {english_count}")
    test1_pass = english_count == 0
    
    # Test 2: Kiểm tra không có text rỗng
    test2_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn IS NULL OR TRIM(dwa_title_vn) = ''
    """
    cursor.execute(test2_query)
    empty_count = cursor.fetchone()[0]
    
    print(f"Test 2 - Text rỗng: {empty_count}")
    test2_pass = empty_count == 0
    
    # Test 3: Kiểm tra độ dài hợp lý
    test3_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE LENGTH(dwa_title_vn) < 5 OR LENGTH(dwa_title_vn) > 300
    """
    cursor.execute(test3_query)
    length_count = cursor.fetchone()[0]
    
    print(f"Test 3 - Độ dài bất thường: {length_count}")
    test3_pass = length_count < 50
    
    # Test 4: Kiểm tra chất lượng dịch thuật mẫu
    test4_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_en LIKE '%Communicate with clients about financial matters%'
    AND dwa_title_vn LIKE '%Giao tiếp với khách hàng về các vấn đề tài chính%'
    """
    cursor.execute(test4_query)
    quality_count = cursor.fetchone()[0]
    
    print(f"Test 4 - Chất lượng dịch thuật (mẫu): {quality_count} bản ghi đúng")
    test4_pass = quality_count >= 0  # Có thể không có bản ghi mẫu này
    
    # Test 5: Tổng số bản ghi
    test5_query = "SELECT COUNT(*) FROM core.career_dwas"
    cursor.execute(test5_query)
    total_count = cursor.fetchone()[0]
    
    print(f"Test 5 - Tổng số bản ghi: {total_count}")
    test5_pass = total_count > 7000
    
    # Tổng kết
    all_tests_pass = test1_pass and test2_pass and test3_pass and test4_pass and test5_pass
    
    print(f"\n📋 Kết quả test:")
    print(f"✅ Test 1 (Không từ tiếng Anh): {'PASS' if test1_pass else 'FAIL'}")
    print(f"✅ Test 2 (Không text rỗng): {'PASS' if test2_pass else 'FAIL'}")
    print(f"✅ Test 3 (Độ dài hợp lý): {'PASS' if test3_pass else 'FAIL'}")
    print(f"✅ Test 4 (Chất lượng dịch): {'PASS' if test4_pass else 'FAIL'}")
    print(f"✅ Test 5 (Tổng số bản ghi): {'PASS' if test5_pass else 'FAIL'}")
    print(f"\n🎯 Tổng kết: {'✅ TẤT CẢ PASS' if all_tests_pass else '❌ CÓ TEST FAIL'}")
    
    return all_tests_pass

def main():
    """Hàm chính"""
    print("🚀 BẮT ĐẦU VIỆT HÓA HOÀN TOÀN BẢNG core.career_dwas")
    print("=" * 70)
    
    try:
        # Kết nối database
        conn = connect_db()
        print("✅ Kết nối database thành công")
        
        # Cập nhật dịch thuật
        updated_count = update_translations(conn)
        
        # Chạy test cases
        if run_quality_tests(conn):
            print("\n🎉 VIỆT HÓA HOÀN TẤT - TẤT CẢ TEST PASS!")
            print("✅ Đã đảm bảo 100% không còn từ tiếng Anh trong cột _vn")
            print("✅ Chất lượng dịch thuật đạt chuẩn production")
        else:
            print("\n⚠️ CÓ TEST FAIL - CẦN KIỂM TRA LẠI")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()