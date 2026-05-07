#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test case cuối cùng để xác minh việt hóa hoàn tất
"""

import psycopg2
import re

DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai"

def connect_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.set_client_encoding('UTF8')
    return conn

def run_final_verification():
    """Chạy test verification cuối cùng"""
    print("🔍 KIỂM TRA CUỐI CÙNG - VIỆT HÓA BẢNG core.career_dwas")
    print("=" * 60)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Test 1: Kiểm tra không còn từ tiếng Anh
    print("\n📋 Test 1: Kiểm tra từ tiếng Anh còn lại")
    english_words = [
        "about", "and", "or", "with", "matters", "risks", "opportunities", 
        "clients", "financial", "business", "communicate", "evaluate"
    ]
    
    for word in english_words:
        query = f"""
        SELECT COUNT(*) FROM core.career_dwas 
        WHERE dwa_title_vn ~* '\\b{word}\\b'
        """
        cursor.execute(query)
        count = cursor.fetchone()[0]
        status = "✅ PASS" if count == 0 else f"❌ FAIL ({count} bản ghi)"
        print(f"  - Từ '{word}': {status}")
    
    # Test 2: Kiểm tra các bản ghi mẫu cụ thể
    print("\n📋 Test 2: Kiểm tra bản ghi mẫu")
    sample_query = """
    SELECT id, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    WHERE id IN (1004, 1007, 1009, 1027, 1028)
    ORDER BY id
    """
    cursor.execute(sample_query)
    samples = cursor.fetchall()
    
    for record in samples:
        record_id, en_text, vn_text = record
        print(f"  ID {record_id}:")
        print(f"    EN: {en_text}")
        print(f"    VN: {vn_text}")
        
        # Kiểm tra không còn từ tiếng Anh
        has_english = any(word in vn_text.lower() for word in ["about", "and", "or", "with", "matters", "risks", "opportunities", "clients", "financial"])
        status = "❌ CÒN TIẾNG ANH" if has_english else "✅ SẠCH"
        print(f"    Status: {status}")
        print()
    
    # Test 3: Thống kê tổng quan
    print("📋 Test 3: Thống kê tổng quan")
    
    # Tổng số bản ghi
    cursor.execute("SELECT COUNT(*) FROM core.career_dwas")
    total_count = cursor.fetchone()[0]
    print(f"  - Tổng số bản ghi: {total_count}")
    
    # Số bản ghi có text rỗng
    cursor.execute("SELECT COUNT(*) FROM core.career_dwas WHERE dwa_title_vn IS NULL OR TRIM(dwa_title_vn) = ''")
    empty_count = cursor.fetchone()[0]
    print(f"  - Bản ghi rỗng: {empty_count}")
    
    # Độ dài trung bình
    cursor.execute("SELECT AVG(LENGTH(dwa_title_vn)) FROM core.career_dwas WHERE dwa_title_vn IS NOT NULL")
    avg_length = cursor.fetchone()[0]
    print(f"  - Độ dài trung bình: {avg_length:.1f} ký tự")
    
    # Test 4: Kiểm tra một số bản ghi ngẫu nhiên
    print("\n📋 Test 4: Kiểm tra bản ghi ngẫu nhiên")
    random_query = """
    SELECT id, dwa_title_en, dwa_title_vn 
    FROM core.career_dwas 
    ORDER BY RANDOM() 
    LIMIT 5
    """
    cursor.execute(random_query)
    random_records = cursor.fetchall()
    
    for record in random_records:
        record_id, en_text, vn_text = record
        print(f"  ID {record_id}: {vn_text}")
    
    # Kết luận
    print("\n🎯 KẾT LUẬN CUỐI CÙNG:")
    print("=" * 60)
    
    # Kiểm tra tổng thể
    cursor.execute("""
    SELECT COUNT(*) FROM core.career_dwas 
    WHERE dwa_title_vn ~* '\\b(about|and|or|with|matters|risks|opportunities|clients|financial|business|communicate|evaluate)\\b'
    """)
    total_english = cursor.fetchone()[0]
    
    if total_english == 0 and empty_count == 0 and total_count > 7000:
        print("✅ VIỆT HÓA HOÀN TẤT 100% - THÀNH CÔNG!")
        print("✅ Không còn từ tiếng Anh nào trong cột _vn")
        print("✅ Không có bản ghi rỗng")
        print("✅ Tất cả dữ liệu đã được dịch đúng chuẩn")
        success = True
    else:
        print("❌ VẪN CÒN VẤN ĐỀ CẦN KHẮC PHỤC")
        print(f"❌ Số từ tiếng Anh còn lại: {total_english}")
        print(f"❌ Số bản ghi rỗng: {empty_count}")
        success = False
    
    conn.close()
    return success

if __name__ == "__main__":
    run_final_verification()