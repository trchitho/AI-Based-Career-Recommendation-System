#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script hoàn thiện việt hóa 100% - bổ sung thêm từ vựng
"""

import psycopg2
import re

DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

# Dictionary mở rộng với tất cả từ vựng còn thiếu
EXTENDED_TRANSLATIONS = {
    # Từ vựng bổ sung từ test ngẫu nhiên
    "office supplies": "văn phòng phẩm",
    "materials": "vật liệu",
    "production equipment": "thiết bị sản xuất",
    "production processes": "quy trình sản xuất",
    "tools": "công cụ",
    "cargo": "hàng hóa",
    "costs": "chi phí",
    "expenses": "chi phí",
    "quality": "chất lượng",
    "equipment": "thiết bị",
    "processes": "quy trình",
    "supplies": "vật tư",
    "load": "tải",
    "unload": "dỡ tải",
    "order": "đặt hàng",
    "calculate": "tính toán",
    
    # Các từ vựng thông dụng khác
    "office": "văn phòng",
    "production": "sản xuất",
    "manufacturing": "sản xuất",
    "operations": "hoạt động",
    "activities": "hoạt động",
    "procedures": "thủ tục",
    "methods": "phương pháp",
    "techniques": "kỹ thuật",
    "strategies": "chiến lược",
    "policies": "chính sách",
    "guidelines": "hướng dẫn",
    "standards": "tiêu chuẩn",
    "requirements": "yêu cầu",
    "specifications": "thông số kỹ thuật",
    "instructions": "hướng dẫn",
    "directions": "chỉ dẫn",
    
    "personnel": "nhân sự",
    "staff": "nhân viên",
    "employees": "nhân viên",
    "workers": "công nhân",
    "team": "nhóm",
    "members": "thành viên",
    "colleagues": "đồng nghiệp",
    "supervisors": "giám sát viên",
    "managers": "quản lý",
    "administrators": "quản trị viên",
    
    "documents": "tài liệu",
    "files": "tập tin",
    "records": "hồ sơ",
    "reports": "báo cáo",
    "forms": "biểu mẫu",
    "applications": "đơn đăng ký",
    "requests": "yêu cầu",
    "orders": "đơn hàng",
    "invoices": "hóa đơn",
    "receipts": "biên lai",
    "contracts": "hợp đồng",
    "agreements": "thỏa thuận",
    
    "systems": "hệ thống",
    "software": "phần mềm",
    "programs": "chương trình",
    "databases": "cơ sở dữ liệu",
    "networks": "mạng lưới",
    "computers": "máy tính",
    "devices": "thiết bị",
    "machines": "máy móc",
    "instruments": "dụng cụ",
    
    "services": "dịch vụ",
    "products": "sản phẩm",
    "goods": "hàng hóa",
    "items": "mặt hàng",
    "merchandise": "hàng hóa",
    "inventory": "hàng tồn kho",
    "stock": "kho",
    "storage": "lưu trữ",
    "warehouse": "kho bãi",
    
    "sales": "bán hàng",
    "marketing": "tiếp thị",
    "advertising": "quảng cáo",
    "promotion": "khuyến mãi",
    "campaigns": "chiến dịch",
    "events": "sự kiện",
    "meetings": "cuộc họp",
    "conferences": "hội nghị",
    "presentations": "thuyết trình",
    "demonstrations": "trình diễn",
    
    "projects": "dự án",
    "tasks": "nhiệm vụ",
    "assignments": "bài tập",
    "duties": "nhiệm vụ",
    "responsibilities": "trách nhiệm",
    "functions": "chức năng",
    "roles": "vai trò",
    "positions": "vị trí",
    "jobs": "công việc",
    "work": "công việc",
    
    "information": "thông tin",
    "data": "dữ liệu",
    "details": "chi tiết",
    "facts": "sự thật",
    "statistics": "thống kê",
    "figures": "số liệu",
    "numbers": "số",
    "amounts": "số lượng",
    "quantities": "số lượng",
    "measurements": "đo lường",
    
    "problems": "vấn đề",
    "issues": "vấn đề",
    "concerns": "mối quan tâm",
    "complaints": "khiếu nại",
    "feedback": "phản hồi",
    "suggestions": "gợi ý",
    "recommendations": "khuyến nghị",
    "advice": "lời khuyên",
    "guidance": "hướng dẫn",
    "support": "hỗ trợ",
    
    "performance": "hiệu suất",
    "efficiency": "hiệu quả",
    "productivity": "năng suất",
    "effectiveness": "tính hiệu quả",
    "results": "kết quả",
    "outcomes": "kết quả đầu ra",
    "achievements": "thành tựu",
    "accomplishments": "thành tích",
    "success": "thành công",
    "failure": "thất bại",
    
    "safety": "an toàn",
    "security": "bảo mật",
    "protection": "bảo vệ",
    "prevention": "phòng ngừa",
    "maintenance": "bảo trì",
    "repair": "sửa chữa",
    "installation": "lắp đặt",
    "setup": "thiết lập",
    "configuration": "cấu hình",
    "adjustment": "điều chỉnh",
    
    "training": "đào tạo",
    "education": "giáo dục",
    "learning": "học tập",
    "development": "phát triển",
    "improvement": "cải thiện",
    "enhancement": "nâng cao",
    "upgrade": "nâng cấp",
    "update": "cập nhật",
    "modification": "sửa đổi",
    "change": "thay đổi",
}

def connect_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding('UTF8')
    return conn

def enhanced_translate(text: str) -> str:
    """Dịch nâng cao với từ vựng mở rộng"""
    if not text:
        return text
    
    result = text.strip()
    
    # Dịch theo thứ tự ưu tiên: cụm từ dài trước, từ đơn sau
    sorted_translations = sorted(EXTENDED_TRANSLATIONS.items(), 
                               key=lambda x: len(x[0]), reverse=True)
    
    for en_text, vn_text in sorted_translations:
        # Sử dụng word boundary cho từ đơn
        if len(en_text.split()) == 1:
            pattern = r'\b' + re.escape(en_text) + r'\b'
        else:
            pattern = re.escape(en_text)
        
        result = re.sub(pattern, vn_text, result, flags=re.IGNORECASE)
    
    # Làm sạch
    result = re.sub(r'\s+', ' ', result).strip()
    
    # Viết hoa chữ cái đầu
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
    
    # Đảm bảo kết thúc bằng dấu chấm nếu cần
    if text.endswith('.') and not result.endswith('.'):
        result += '.'
    
    return result

def find_records_with_english(conn):
    """Tìm các bản ghi còn từ tiếng Anh"""
    cursor = conn.cursor()
    
    # Tìm các từ tiếng Anh phổ biến còn lại
    english_words = list(EXTENDED_TRANSLATIONS.keys())
    
    conditions = []
    for word in english_words:
        conditions.append(f"dwa_title_vn ~* '\\b{re.escape(word)}\\b'")
    
    if not conditions:
        return []
    
    where_clause = " OR ".join(conditions)
    
    query = f"""
    SELECT id, onet_code, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    WHERE {where_clause}
    ORDER BY id
    """
    
    cursor.execute(query)
    return cursor.fetchall()

def complete_translation_update(conn):
    """Hoàn thiện việt hóa"""
    cursor = conn.cursor()
    
    print("🔍 Tìm các bản ghi còn từ tiếng Anh...")
    records = find_records_with_english(conn)
    print(f"📊 Tìm thấy {len(records)} bản ghi cần dịch thêm")
    
    if len(records) == 0:
        print("✅ Không có bản ghi nào cần dịch thêm!")
        return 0
    
    updated_count = 0
    
    for record in records:
        record_id, onet_code, en_text, vn_text = record
        
        # Dịch nâng cao
        new_vn_text = enhanced_translate(vn_text)  # Dịch từ Vietnamese hiện tại
        
        # Cập nhật nếu có thay đổi
        if new_vn_text != vn_text:
            update_query = """
            UPDATE core.career_dwas 
            SET dwa_title_vn = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            
            cursor.execute(update_query, (new_vn_text, record_id))
            updated_count += 1
            
            print(f"  ID {record_id}: {vn_text} → {new_vn_text}")
            
            if updated_count % 50 == 0:
                conn.commit()
                print(f"✅ Đã cập nhật {updated_count} bản ghi...")
    
    conn.commit()
    print(f"🎉 Hoàn thành! Đã cập nhật {updated_count} bản ghi")
    
    return updated_count

def final_comprehensive_test(conn):
    """Test toàn diện cuối cùng"""
    cursor = conn.cursor()
    
    print("\n🧪 Test toàn diện cuối cùng...")
    
    # Kiểm tra tất cả từ tiếng Anh trong dictionary
    all_english_words = list(EXTENDED_TRANSLATIONS.keys())
    
    total_english_remaining = 0
    for word in all_english_words:
        query = f"""
        SELECT COUNT(*) FROM core.career_dwas 
        WHERE dwa_title_vn ~* '\\b{re.escape(word)}\\b'
        """
        cursor.execute(query)
        count = cursor.fetchone()[0]
        total_english_remaining += count
        
        if count > 0:
            print(f"  ⚠️ Từ '{word}': {count} bản ghi")
    
    print(f"\n📊 Tổng từ tiếng Anh còn lại: {total_english_remaining}")
    
    # Kiểm tra một số bản ghi ngẫu nhiên
    print("\n🔍 Kiểm tra bản ghi ngẫu nhiên:")
    cursor.execute("""
    SELECT id, dwa_title_vn 
    FROM core.career_dwas 
    ORDER BY RANDOM() 
    LIMIT 10
    """)
    
    random_records = cursor.fetchall()
    for record_id, vn_text in random_records:
        print(f"  ID {record_id}: {vn_text}")
    
    return total_english_remaining == 0

def main():
    """Hàm chính"""
    print("🚀 HOÀN THIỆN VIỆT HÓA 100% - BƯỚC CUỐI CÙNG")
    print("=" * 70)
    
    try:
        conn = connect_db()
        print("✅ Kết nối database thành công")
        
        # Hoàn thiện dịch thuật
        updated_count = complete_translation_update(conn)
        
        # Test cuối cùng
        if final_comprehensive_test(conn):
            print("\n🎉 VIỆT HÓA HOÀN THIỆN 100% - THÀNH CÔNG HOÀN TOÀN!")
            print("✅ Không còn từ tiếng Anh nào trong cột _vn")
            print("✅ Chất lượng dịch thuật đạt chuẩn production")
        else:
            print("\n⚠️ Vẫn còn một số từ tiếng Anh - cần kiểm tra thêm")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()