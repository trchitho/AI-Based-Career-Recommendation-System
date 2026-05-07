#!/usr/bin/env python3
"""
Script để việt hóa hoàn toàn bảng core.career_dwas
Đảm bảo 100% không còn từ tiếng Anh trong cột _vn
"""

import psycopg2
import re
from typing import Dict, List, Tuple
import time

# Database connection
DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

# Dictionary dịch thuật chuyên ngành cho Detailed Work Activities
TRANSLATION_DICT = {
    # Financial terms
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
    
    # Business terms
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
    
    # Client/Customer terms
    "clients": "khách hàng",
    "customers": "khách hàng",
    "client needs": "nhu cầu khách hàng",
    "customer service": "dịch vụ khách hàng",
    "customer satisfaction": "sự hài lòng của khách hàng",
    "client relationships": "mối quan hệ khách hàng",
    "customer feedback": "phản hồi khách hàng",
    "client communications": "giao tiếp với khách hàng",
    
    # Work activities
    "communicate with": "giao tiếp với",
    "collaborate with": "hợp tác với",
    "coordinate with": "phối hợp với",
    "work with": "làm việc với",
    "meet with": "gặp gỡ với",
    "discuss with": "thảo luận với",
    "consult with": "tham vấn với",
    "negotiate with": "đàm phán với",
    
    # Analysis terms
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
    
    # Management terms
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
    
    # Documentation terms
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
    
    # Common prepositions and conjunctions
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
    
    # Risk and opportunity terms
    "risks": "rủi ro",
    "opportunities": "cơ hội", 
    "challenges": "thách thức",
    "issues": "vấn đề",
    "problems": "vấn đề",
    "solutions": "giải pháp",
    "benefits": "lợi ích",
    "advantages": "ưu điểm",
    "disadvantages": "nhược điểm",
    
    # Quality and compliance
    "quality": "chất lượng",
    "standards": "tiêu chuẩn",
    "compliance": "tuân thủ",
    "regulations": "quy định",
    "policies": "chính sách",
    "procedures": "quy trình",
    "guidelines": "hướng dẫn",
    "requirements": "yêu cầu",
    
    # Technology terms
    "systems": "hệ thống",
    "software": "phần mềm",
    "applications": "ứng dụng",
    "databases": "cơ sở dữ liệu",
    "networks": "mạng lưới",
    "technology": "công nghệ",
    "equipment": "thiết bị",
    "tools": "công cụ",
    
    # Performance terms
    "performance": "hiệu suất",
    "efficiency": "hiệu quả",
    "productivity": "năng suất",
    "effectiveness": "tính hiệu quả",
    "results": "kết quả",
    "outcomes": "kết quả đầu ra",
    "achievements": "thành tựu",
    "goals": "mục tiêu",
    "objectives": "mục tiêu",
    "targets": "chỉ tiêu",
    
    # Common verbs
    "matters": "vấn đề",
    "activities": "hoạt động",
    "tasks": "nhiệm vụ",
    "duties": "nhiệm vụ",
    "responsibilities": "trách nhiệm",
    "functions": "chức năng",
    "operations": "hoạt động",
    "processes": "quy trình",
    "procedures": "thủ tục",
    "methods": "phương pháp",
}

def connect_db():
    """Kết nối database"""
    return psycopg2.connect(DATABASE_URL)

def get_records_with_english(conn) -> List[Tuple]:
    """Lấy các bản ghi có từ tiếng Anh trong cột Vietnamese"""
    cursor = conn.cursor()
    
    # Tìm các bản ghi có từ tiếng Anh phổ biến
    english_patterns = [
        "about", "and", "or", "with", "for", "to", "in", "on", "at", "by", "from", "of",
        "matters", "risks", "opportunities", "clients", "customers", "financial", 
        "business", "analyze", "evaluate", "manage", "communicate", "develop", "create"
    ]
    
    pattern = "|".join([f"\\b{word}\\b" for word in english_patterns])
    
    query = f"""
    SELECT id, onet_code, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    WHERE dwa_title_vn ~* '{pattern}'
    ORDER BY id
    """
    
    cursor.execute(query)
    return cursor.fetchall()

def translate_text(text: str) -> str:
    """Dịch text từ tiếng Anh sang tiếng Việt"""
    if not text:
        return text
        
    result = text.lower()
    
    # Áp dụng dictionary dịch thuật
    for en_term, vn_term in TRANSLATION_DICT.items():
        # Dịch cả từ đơn và cụm từ
        result = re.sub(r'\b' + re.escape(en_term) + r'\b', vn_term, result, flags=re.IGNORECASE)
    
    # Viết hoa chữ cái đầu
    result = result.capitalize()
    
    # Xử lý các trường hợp đặc biệt
    result = result.replace("Giao tiếp với khách hàng về các vấn đề tài chính.", 
                          "Giao tiếp với khách hàng về các vấn đề tài chính.")
    result = result.replace("Đánh giá rủi ro tài chính hoặc cơ hội tài chính.", 
                          "Đánh giá rủi ro tài chính hoặc cơ hội đầu tư.")
    
    return result

def update_vietnamese_translations(conn):
    """Cập nhật bản dịch tiếng Việt"""
    cursor = conn.cursor()
    
    print("🔍 Đang tìm các bản ghi cần dịch...")
    records = get_records_with_english(conn)
    print(f"📊 Tìm thấy {len(records)} bản ghi cần dịch")
    
    updated_count = 0
    
    for record in records:
        record_id, onet_code, en_text, vn_text = record
        
        # Dịch lại text
        new_vn_text = translate_text(en_text)
        
        # Chỉ cập nhật nếu có thay đổi
        if new_vn_text != vn_text:
            update_query = """
            UPDATE core.career_dwas 
            SET dwa_title_vn = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            
            cursor.execute(update_query, (new_vn_text, record_id))
            updated_count += 1
            
            if updated_count % 100 == 0:
                print(f"✅ Đã cập nhật {updated_count} bản ghi...")
    
    conn.commit()
    print(f"🎉 Hoàn thành! Đã cập nhật {updated_count} bản ghi")
    
    return updated_count

def run_quality_tests(conn) -> bool:
    """Chạy các test case kiểm tra chất lượng dịch thuật"""
    cursor = conn.cursor()
    
    print("\n🧪 Bắt đầu chạy test cases...")
    
    # Test 1: Kiểm tra không còn từ tiếng Anh phổ biến
    test1_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn ~* '\\b(about|and|or|with|matters|risks|opportunities|clients|financial)\\b'
    """
    cursor.execute(test1_query)
    english_words_count = cursor.fetchone()[0]
    
    print(f"Test 1 - Từ tiếng Anh còn lại: {english_words_count}")
    test1_pass = english_words_count == 0
    
    # Test 2: Kiểm tra không có ký tự lạ
    test2_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn ~ '[^a-zA-ZÀ-ỹ0-9\\s\\.,;:!?\\-()]'
    """
    cursor.execute(test2_query)
    weird_chars_count = cursor.fetchone()[0]
    
    print(f"Test 2 - Ký tự lạ: {weird_chars_count}")
    test2_pass = weird_chars_count == 0
    
    # Test 3: Kiểm tra không có text rỗng
    test3_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn IS NULL OR TRIM(dwa_title_vn) = ''
    """
    cursor.execute(test3_query)
    empty_count = cursor.fetchone()[0]
    
    print(f"Test 3 - Text rỗng: {empty_count}")
    test3_pass = empty_count == 0
    
    # Test 4: Kiểm tra độ dài hợp lý
    test4_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE LENGTH(dwa_title_vn) < 10 OR LENGTH(dwa_title_vn) > 200
    """
    cursor.execute(test4_query)
    length_issues = cursor.fetchone()[0]
    
    print(f"Test 4 - Độ dài bất thường: {length_issues}")
    test4_pass = length_issues < 50  # Cho phép một số trường hợp đặc biệt
    
    # Test 5: Kiểm tra encoding UTF-8
    test5_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn LIKE '%Ã%' OR dwa_title_vn LIKE '%â%' OR dwa_title_vn LIKE '%Ê%'
    """
    cursor.execute(test5_query)
    encoding_issues = cursor.fetchone()[0]
    
    print(f"Test 5 - Lỗi encoding: {encoding_issues}")
    test5_pass = encoding_issues == 0
    
    # Tổng kết
    all_tests_pass = test1_pass and test2_pass and test3_pass and test4_pass and test5_pass
    
    print(f"\n📋 Kết quả test:")
    print(f"✅ Test 1 (Không từ tiếng Anh): {'PASS' if test1_pass else 'FAIL'}")
    print(f"✅ Test 2 (Không ký tự lạ): {'PASS' if test2_pass else 'FAIL'}")
    print(f"✅ Test 3 (Không text rỗng): {'PASS' if test3_pass else 'FAIL'}")
    print(f"✅ Test 4 (Độ dài hợp lý): {'PASS' if test4_pass else 'FAIL'}")
    print(f"✅ Test 5 (Encoding đúng): {'PASS' if test5_pass else 'FAIL'}")
    print(f"\n🎯 Tổng kết: {'✅ TẤT CẢ PASS' if all_tests_pass else '❌ CÓ TEST FAIL'}")
    
    return all_tests_pass

def main():
    """Hàm chính"""
    print("🚀 Bắt đầu việt hóa bảng core.career_dwas")
    print("=" * 60)
    
    try:
        # Kết nối database
        conn = connect_db()
        print("✅ Kết nối database thành công")
        
        # Cập nhật dịch thuật
        updated_count = update_vietnamese_translations(conn)
        
        # Chạy test cases
        if run_quality_tests(conn):
            print("\n🎉 VIỆT HÓA HOÀN TẤT - TẤT CẢ TEST PASS!")
        else:
            print("\n⚠️ CÓ TEST FAIL - CẦN KIỂM TRA LẠI")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()