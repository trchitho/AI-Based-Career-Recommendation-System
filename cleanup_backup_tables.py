#!/usr/bin/env python3
import psycopg2

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

def cleanup_backup_tables():
    """Xóa an toàn các bảng backup không cần thiết"""
    
    backup_tables = [
        "career_dwas_backup",
        "careers_backup_complete", 
        "careers_backup_desc_en",
        "careers_backup_final",
        "careers_backup_google",
        "careers_backup_professional",
        "careers_backup_ultimate"
    ]
    
    cur = conn.cursor()
    
    print("=== CLEANUP BACKUP TABLES ===")
    
    # Kiểm tra các bảng tồn tại
    print("1. Kiểm tra các bảng backup tồn tại...")
    existing_tables = []
    
    for table_name in backup_tables:
        try:
            cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'core' 
                    AND table_name = %s
                )
            """, (table_name,))
            
            exists = cur.fetchone()[0]
            if exists:
                existing_tables.append(table_name)
                print(f"   ✅ {table_name} - Tồn tại")
            else:
                print(f"   ❌ {table_name} - Không tồn tại")
                
        except Exception as e:
            print(f"   ⚠️ Lỗi kiểm tra {table_name}: {e}")
    
    if not existing_tables:
        print("\n📝 Không có bảng backup nào cần xóa.")
        return
    
    print(f"\n2. Tìm thấy {len(existing_tables)} bảng backup cần xóa:")
    for table in existing_tables:
        print(f"   - core.{table}")
    
    # Xóa từng bảng
    print(f"\n3. Bắt đầu xóa các bảng backup...")
    deleted_count = 0
    
    for table_name in existing_tables:
        try:
            # Kiểm tra số lượng records trước khi xóa
            cur.execute(f"SELECT COUNT(*) FROM core.{table_name}")
            record_count = cur.fetchone()[0]
            
            # Xóa bảng
            cur.execute(f"DROP TABLE IF EXISTS core.{table_name} CASCADE")
            conn.commit()
            
            deleted_count += 1
            print(f"   ✅ Đã xóa core.{table_name} ({record_count:,} records)")
            
        except Exception as e:
            print(f"   ❌ Lỗi xóa core.{table_name}: {e}")
            conn.rollback()
    
    print(f"\n=== HOÀN THÀNH ===")
    print(f"✅ Đã xóa thành công {deleted_count}/{len(existing_tables)} bảng backup")
    
    # Kiểm tra lại
    print(f"\n4. Kiểm tra lại sau khi xóa...")
    remaining_tables = []
    
    for table_name in backup_tables:
        try:
            cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'core' 
                    AND table_name = %s
                )
            """, (table_name,))
            
            exists = cur.fetchone()[0]
            if exists:
                remaining_tables.append(table_name)
                
        except Exception as e:
            print(f"   ⚠️ Lỗi kiểm tra {table_name}: {e}")
    
    if remaining_tables:
        print(f"⚠️ Còn lại {len(remaining_tables)} bảng chưa xóa được:")
        for table in remaining_tables:
            print(f"   - core.{table}")
    else:
        print("🎉 Tất cả bảng backup đã được xóa thành công!")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    cleanup_backup_tables()