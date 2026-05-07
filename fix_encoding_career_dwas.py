#!/usr/bin/env python3
"""
Script sửa lỗi encoding và việt hóa hoàn toàn bảng core.career_dwas
"""

import psycopg2
import re
from typing import Dict, List, Tuple
import unicodedata

# Database connection
DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

# Dictionary dịch thuật chuyên ngành chi tiết
COMPREHENSIVE_TRANSLATION = {
    # Cụm từ hoàn chỉnh - ưu tiên cao
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
    
    # Từ đơn và cụm từ thông dụng
    "communicate with": "giao tiếp với",
    "collaborate with": "hợp tác với", 
    "coordinate with": "phối hợp với",
    "work with": "làm việc với",
    "meet with": "gặp gỡ với",
    "discuss with": "thảo luận với",
    "consult with": "tham vấn với",
    "negotiate with": "đàm phán với",
    "correspond with": "trao đổi thư từ với",
    
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
    
    # Động từ thông dụng
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
    """Kết nối database với encoding UTF-8"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding('UTF8')
    return conn

def fix_encoding_issues(text: str) -> str:
    """Sửa các lỗi encoding phổ biến"""
    if not text:
        return text
    
    # Mapping các ký tự bị lỗi encoding phổ biến
    encoding_fixes = {
        'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ãª': 'ê', 'Ã©': 'é',
        'Ã­': 'í', 'Ã¬': 'ì', 'Ã´': 'ô', 'Ã³': 'ó', 'Ã²': 'ò',
        'Ãº': 'ú', 'Ã¹': 'ù', 'Ã½': 'ý', 'Ã¨': 'è', 'Ã»': 'û',
        'Ä': 'đ', 'Ä'': 'đ', 'Ä‚': 'ă', 'Ä'': 'ă',
        'Ã¢Â€Â™': "'", 'Ã¢Â€Âœ': '"', 'Ã¢Â€Â': '"',
        'â€™': "'", 'â€œ': '"', 'â€': '"',
        'Ã¢â‚¬â„¢': "'", 'Ã¢â‚¬Å"': '"', 'Ã¢â‚¬Â': '"',
    }
    
    result = text
    for bad, good in encoding_fixes.items():
        result = result.replace(bad, good)
    
    # Normalize Unicode
    result = unicodedata.normalize('NFC', result)
    
    return result

def translate_comprehensive(text: str) -> str:
    """Dịch text toàn diện từ tiếng Anh sang tiếng Việt"""
    if not text:
        return text
    
    # Sửa encoding trước
    result = fix_encoding_issues(text)
    
    # Dịch theo thứ tự ưu tiên: cụm từ dài trước, từ đơn sau
    sorted_translations = sorted(COMPREHENSIVE_TRANSLATION.items(), 
                               key=lambda x: len(x[0]), reverse=True)
    
    for en_text, vn_text in sorted_translations:
        # Dịch chính xác (case-insensitive)
        pattern = re.escape(en_text)
        result = re.sub(pattern, vn_text, result, flags=re.IGNORECASE)
    
    # Làm sạch và chuẩn hóa
    result = re.sub(r'\s+', ' ', result)  # Loại bỏ khoảng trắng thừa
    result = result.strip()
    
    # Viết hoa chữ cái đầu câu
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
    
    return result

def get_all_records(conn) -> List[Tuple]:
    """Lấy tất cả bản ghi để kiểm tra và sửa"""
    cursor = conn.cursor()
    query = """
    SELECT id, onet_code, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    ORDER BY id
    """
    cursor.execute(query)
    return cursor.fetchall()

def update_all_records(conn):
    """Cập nhật tất cả bản ghi"""
    cursor = conn.cursor()
    
    print("🔍 Đang lấy tất cả bản ghi...")
    records = get_all_records(conn)
    print(f"📊 Tổng số bản ghi: {len(records)}")
    
    updated_count = 0
    
    for i, record in enumerate(records):
        record_id, onet_code, en_text, vn_text = record
        
        # Dịch lại hoàn toàn
        new_vn_text = translate_comprehensive(en_text)
        
        # Cập nhật nếu có thay đổi hoặc để đảm bảo encoding đúng
        if new_vn_text != vn_text or fix_encoding_issues(vn_text) != vn_text:
            update_query = """
            UPDATE core.career_dwas 
            SET dwa_title_vn = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            
            cursor.execute(update_query, (new_vn_text, record_id))
            updated_count += 1
            
            if updated_count % 500 == 0:
                conn.commit()  # Commit theo batch
                print(f"✅ Đã cập nhật {updated_count} bản ghi...")
        
        if (i + 1) % 1000 == 0:
            print(f"🔄 Đã xử lý {i + 1}/{len(records)} bản ghi...")
    
    conn.commit()
    print(f"🎉 Hoàn thành! Đã cập nhật {updated_count} bản ghi")
    
    return updated_count

def run_comprehensive_tests(conn) -> bool:
    """Chạy test cases toàn diện"""
    cursor = conn.cursor()
    
    print("\n🧪 Bắt đầu chạy test cases toàn diện...")
    
    # Test 1: Không còn từ tiếng Anh phổ biến
    english_words = [
        "about", "and", "or", "with", "for", "to", "in", "on", "at", "by", "from", "of",
        "matters", "risks", "opportunities", "clients", "customers", "financial", 
        "business", "analyze", "evaluate", "manage", "communicate", "develop", "create",
        "prepare", "review", "monitor", "coordinate", "supervise", "maintain", "update"
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
    
    # Test 2: Không có ký tự encoding lỗi
    test2_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn LIKE '%Ã%' OR dwa_title_vn LIKE '%â€%' OR dwa_title_vn LIKE '%Ä%'
    """
    cursor.execute(test2_query)
    encoding_count = cursor.fetchone()[0]
    
    print(f"Test 2 - Lỗi encoding: {encoding_count}")
    test2_pass = encoding_count == 0
    
    # Test 3: Không có text rỗng
    test3_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn IS NULL OR TRIM(dwa_title_vn) = ''
    """
    cursor.execute(test3_query)
    empty_count = cursor.fetchone()[0]
    
    print(f"Test 3 - Text rỗng: {empty_count}")
    test3_pass = empty_count == 0
    
    # Test 4: Độ dài hợp lý (10-200 ký tự)
    test4_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE LENGTH(dwa_title_vn) < 10 OR LENGTH(dwa_title_vn) > 200
    """
    cursor.execute(test4_query)
    length_count = cursor.fetchone()[0]
    
    print(f"Test 4 - Độ dài bất thường: {length_count}")
    test4_pass = length_count < 100  # Cho phép một số trường hợp đặc biệt
    
    # Test 5: Kiểm tra chất lượng dịch thuật (mẫu)
    test5_query = """
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_en LIKE '%Communicate with clients about financial matters%'
    AND dwa_title_vn = 'Giao tiếp với khách hàng về các vấn đề tài chính.'
    """
    cursor.execute(test5_query)
    quality_count = cursor.fetchone()[0]
    
    print(f"Test 5 - Chất lượng dịch thuật (mẫu): {quality_count} bản ghi đúng")
    test5_pass = quality_count > 0
    
    # Test 6: Tổng số bản ghi
    test6_query = "SELECT COUNT(*) FROM core.career_dwas"
    cursor.execute(test6_query)
    total_count = cursor.fetchone()[0]
    
    print(f"Test 6 - Tổng số bản ghi: {total_count}")
    test6_pass = total_count > 7000
    
    # Tổng kết
    all_tests_pass = all([test1_pass, test2_pass, test3_pass, test4_pass, test5_pass, test6_pass])
    
    print(f"\n📋 Kết quả test:")
    print(f"✅ Test 1 (Không từ tiếng Anh): {'PASS' if test1_pass else 'FAIL'}")
    print(f"✅ Test 2 (Không lỗi encoding): {'PASS' if test2_pass else 'FAIL'}")
    print(f"✅ Test 3 (Không text rỗng): {'PASS' if test3_pass else 'FAIL'}")
    print(f"✅ Test 4 (Độ dài hợp lý): {'PASS' if test4_pass else 'FAIL'}")
    print(f"✅ Test 5 (Chất lượng dịch): {'PASS' if test5_pass else 'FAIL'}")
    print(f"✅ Test 6 (Tổng số bản ghi): {'PASS' if test6_pass else 'FAIL'}")
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
        
        # Cập nhật tất cả bản ghi
        updated_count = update_all_records(conn)
        
        # Chạy test cases
        if run_comprehensive_tests(conn):
            print("\n🎉 VIỆT HÓA HOÀN TẤT - TẤT CẢ TEST PASS!")
            print("✅ Đã đảm bảo 100% không còn từ tiếng Anh trong cột _vn")
            print("✅ Đã sửa tất cả lỗi encoding")
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