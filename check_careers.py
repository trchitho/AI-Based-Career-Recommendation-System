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
        
        # Kiểm tra bảng careers
        cur.execute("SELECT COUNT(*) FROM core.careers")
        career_count = cur.fetchone()[0]
        print(f"📊 Tổng số nghề trong core.careers: {career_count:,}")
        
        # Kiểm tra một số mẫu
        cur.execute("SELECT id, onet_code, title_en, title_vi FROM core.careers ORDER BY id LIMIT 5")
        samples = cur.fetchall()
        print(f"\n📋 Mẫu 5 nghề đầu tiên:")
        for career in samples:
            print(f"   ID {career[0]}: {career[1]} - {career[2]} | {career[3] or 'Chưa dịch'}")
        
        # Kiểm tra bảng career_overview hiện tại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        overview_count = cur.fetchone()[0]
        print(f"\n📊 Số nghề đã có overview: {overview_count:,}")
        
        if overview_count > 0:
            cur.execute("SELECT career_id, experience_text_en, salary_min_en, salary_max_en FROM core.career_overview LIMIT 3")
            overview_samples = cur.fetchall()
            print(f"\n📋 Mẫu overview hiện có:")
            for overview in overview_samples:
                print(f"   Career ID {overview[0]}: {overview[1][:50] if overview[1] else 'N/A'}... | Salary: ${overview[2] or 0}-${overview[3] or 0}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == '__main__':
    main()