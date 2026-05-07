#!/usr/bin/env python3
"""
Kiểm tra số lượng nghề trong database
"""
import psycopg2

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def main():
    try:
        conn = psycopg2.connect(DB)
        cur = conn.cursor()
        
        print("📊 KIỂM TRA SỐ LƯỢNG NGHỀ")
        print("=" * 50)
        
        # Tổng số nghề
        cur.execute("SELECT COUNT(*) FROM core.careers")
        total_careers = cur.fetchone()[0]
        print(f"Tổng số nghề: {total_careers:,}")
        
        # Nghề có overview
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        has_overview = cur.fetchone()[0]
        print(f"Có overview: {has_overview:,}")
        
        # Nghề chưa có overview
        cur.execute("""
            SELECT COUNT(*) 
            FROM core.careers c
            LEFT JOIN core.career_overview co ON c.id = co.career_id
            WHERE co.career_id IS NULL
        """)
        missing_overview = cur.fetchone()[0]
        print(f"Chưa có overview: {missing_overview:,}")
        
        # Kiểm tra ONET codes
        cur.execute("SELECT COUNT(DISTINCT onet_code) FROM core.careers WHERE onet_code IS NOT NULL")
        unique_onet_codes = cur.fetchone()[0]
        print(f"ONET codes duy nhất: {unique_onet_codes:,}")
        
        # Mẫu ONET codes
        cur.execute("SELECT id, onet_code FROM core.careers WHERE onet_code IS NOT NULL LIMIT 5")
        sample_codes = cur.fetchall()
        print(f"\nMẫu ONET codes:")
        for career_id, onet_code in sample_codes:
            print(f"  - Career {career_id}: {onet_code}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == '__main__':
    main()