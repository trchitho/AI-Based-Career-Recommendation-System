#!/usr/bin/env python3
"""
Script xóa sạch dữ liệu trong bảng core.career_overview
"""
import psycopg2
from datetime import datetime

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def main():
    print("=" * 60)
    print("🗑️  XÓA SẠCH DỮ LIỆU CAREER OVERVIEW")
    print("=" * 60)
    print(f"Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        conn = psycopg2.connect(DB)
        cur = conn.cursor()
        
        # Kiểm tra số lượng records hiện tại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        current_count = cur.fetchone()[0]
        print(f"📊 Số records hiện tại: {current_count:,}")
        
        if current_count == 0:
            print("✅ Bảng đã trống, không cần xóa.")
            return
        
        # Xác nhận từ người dùng
        print(f"\n⚠️  CẢNH BÁO: Sắp xóa {current_count:,} records trong bảng core.career_overview")
        print("❗ Hành động này KHÔNG THỂ HOÀN TÁC!")
        
        while True:
            response = input("\n🤔 Bạn có chắc chắn muốn xóa? (yes/no): ").lower().strip()
            if response in ['yes', 'y']:
                break
            elif response in ['no', 'n']:
                print("❌ Hủy bỏ thao tác xóa.")
                return
            else:
                print("❌ Vui lòng nhập 'yes' hoặc 'no'")
        
        # Xóa tất cả dữ liệu
        print("\n🗑️  Đang xóa dữ liệu...")
        cur.execute("DELETE FROM core.career_overview")
        
        # Reset sequence nếu có
        try:
            cur.execute("SELECT setval('core.career_overview_id_seq', 1, false)")
        except:
            pass  # Sequence có thể không tồn tại
        
        # Commit changes
        conn.commit()
        
        # Kiểm tra lại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        final_count = cur.fetchone()[0]
        
        print(f"✅ Đã xóa thành công!")
        print(f"   - Records trước khi xóa: {current_count:,}")
        print(f"   - Records sau khi xóa: {final_count:,}")
        
        # Kiểm tra cấu trúc bảng vẫn còn
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'career_overview'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        print(f"\n📋 Cấu trúc bảng vẫn còn ({len(columns)} cột):")
        for col_name, col_type in columns[:5]:  # Show first 5 columns
            print(f"   - {col_name}: {col_type}")
        if len(columns) > 5:
            print(f"   ... và {len(columns) - 5} cột khác")
        
        cur.close()
        conn.close()
        
        print(f"\n🎉 HOÀN THÀNH! Bảng đã sẵn sàng cho dữ liệu mới.")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == '__main__':
    main()