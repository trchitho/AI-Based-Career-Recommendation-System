#!/usr/bin/env python3
"""
Script xóa sạch dữ liệu trong bảng core.career_overview (force clear)
"""
import psycopg2
from datetime import datetime

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'

def main():
    print("=" * 60)
    print("🗑️  FORCE CLEAR CAREER OVERVIEW DATA")
    print("=" * 60)
    print(f"Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        conn = psycopg2.connect(DB)
        conn.autocommit = True  # Enable autocommit
        cur = conn.cursor()
        
        # Kiểm tra số lượng records hiện tại
        print("📊 Kiểm tra dữ liệu hiện tại...")
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        current_count = cur.fetchone()[0]
        print(f"   - Records hiện tại: {current_count:,}")
        
        if current_count == 0:
            print("✅ Bảng đã trống!")
            return
        
        # Kiểm tra một vài records mẫu
        cur.execute("SELECT id, career_id FROM core.career_overview LIMIT 3")
        sample_records = cur.fetchall()
        print(f"   - Mẫu records: {sample_records}")
        
        # Thử xóa với TRUNCATE (nhanh hơn DELETE)
        print("\n🗑️  Thử TRUNCATE TABLE...")
        try:
            cur.execute("TRUNCATE TABLE core.career_overview RESTART IDENTITY")
            print("   ✅ TRUNCATE thành công!")
        except Exception as e:
            print(f"   ❌ TRUNCATE thất bại: {e}")
            print("   🔄 Thử DELETE...")
            
            # Nếu TRUNCATE không được, dùng DELETE
            cur.execute("DELETE FROM core.career_overview")
            print("   ✅ DELETE thành công!")
        
        # Kiểm tra lại
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        final_count = cur.fetchone()[0]
        
        print(f"\n📊 KẾT QUẢ:")
        print(f"   - Records trước: {current_count:,}")
        print(f"   - Records sau: {final_count:,}")
        print(f"   - Đã xóa: {current_count - final_count:,}")
        
        if final_count == 0:
            print("✅ XÓA THÀNH CÔNG!")
        else:
            print("❌ VẪN CÒN DỮ LIỆU - Thử xóa thủ công...")
            
            # Thử xóa từng batch nhỏ
            batch_size = 100
            deleted_total = 0
            
            while True:
                cur.execute(f"DELETE FROM core.career_overview WHERE id IN (SELECT id FROM core.career_overview LIMIT {batch_size})")
                deleted = cur.rowcount
                if deleted == 0:
                    break
                deleted_total += deleted
                print(f"   - Đã xóa batch: {deleted} records (tổng: {deleted_total})")
            
            # Kiểm tra cuối cùng
            cur.execute("SELECT COUNT(*) FROM core.career_overview")
            final_final_count = cur.fetchone()[0]
            print(f"   - Records cuối cùng: {final_final_count:,}")
        
        # Kiểm tra cấu trúc bảng
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'career_overview'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        print(f"\n📋 Cấu trúc bảng ({len(columns)} cột):")
        for i, (col_name, col_type) in enumerate(columns[:5]):
            print(f"   {i+1}. {col_name}: {col_type}")
        if len(columns) > 5:
            print(f"   ... và {len(columns) - 5} cột khác")
        
        cur.close()
        conn.close()
        
        print(f"\n🎉 HOÀN THÀNH! Bảng sẵn sàng cho dữ liệu mới.")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()