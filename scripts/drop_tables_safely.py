#!/usr/bin/env python3
"""
Script xóa an toàn 2 bảng: ai.quick_text_embeddings và core.essay_quick_inputs
Tạo bởi: AI Assistant
Ngày: 2026-01-08
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from datetime import datetime

# Thêm thư mục backend vào Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend'))

def get_db_connection():
    """Tạo kết nối database từ .env"""
    try:
        # Đọc DATABASE_URL từ .env
        env_path = os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend', '.env')
        
        if not os.path.exists(env_path):
            print(f"❌ Không tìm thấy file .env tại: {env_path}")
            return None
            
        # Parse DATABASE_URL
        database_url = "postgresql://postgres:123456@localhost:5433/career_ai"
        
        print(f"🔗 Đang kết nối database: {database_url.replace('123456', '***')}")
        
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        print("✅ Kết nối database thành công!")
        return conn
        
    except Exception as e:
        print(f"❌ Lỗi kết nối database: {e}")
        return None

def check_table_exists(cursor, schema, table_name):
    """Kiểm tra bảng có tồn tại không"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = %s 
            AND table_name = %s
        )
    """, (schema, table_name))
    
    return cursor.fetchone()[0]

def count_table_rows(cursor, schema, table_name):
    """Đếm số dòng trong bảng"""
    try:
        cursor.execute(f'SELECT COUNT(*) FROM "{schema}"."{table_name}"')
        return cursor.fetchone()[0]
    except Exception as e:
        print(f"⚠️  Lỗi đếm dòng {schema}.{table_name}: {e}")
        return 0

def check_foreign_keys(cursor, schema, table_name):
    """Kiểm tra foreign key constraints"""
    cursor.execute("""
        SELECT 
            tc.table_schema,
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND (
                (ccu.table_schema = %s AND ccu.table_name = %s)
                OR
                (tc.table_schema = %s AND tc.table_name = %s)
            )
    """, (schema, table_name, schema, table_name))
    
    return cursor.fetchall()

def create_backup(cursor, schema, table_name):
    """Tạo backup bảng"""
    backup_table = f"{table_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        # Tạo schema backup nếu chưa có
        cursor.execute('CREATE SCHEMA IF NOT EXISTS backup')
        
        # Tạo backup
        cursor.execute(f'''
            CREATE TABLE backup."{backup_table}" AS 
            SELECT * FROM "{schema}"."{table_name}"
        ''')
        
        print(f"✅ Đã tạo backup: backup.{backup_table}")
        return True
        
    except Exception as e:
        print(f"⚠️  Lỗi tạo backup {schema}.{table_name}: {e}")
        return False

def drop_table_safely(cursor, schema, table_name):
    """Xóa bảng một cách an toàn"""
    try:
        cursor.execute(f'DROP TABLE IF EXISTS "{schema}"."{table_name}" CASCADE')
        print(f"✅ Đã xóa bảng: {schema}.{table_name}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi xóa bảng {schema}.{table_name}: {e}")
        return False

def main():
    """Hàm chính"""
    print("🚀 Bắt đầu script xóa bảng an toàn")
    print("=" * 50)
    
    # Danh sách bảng cần xóa
    tables_to_drop = [
        ("ai", "quick_text_embeddings"),
        ("core", "essay_quick_inputs")
    ]
    
    # Kết nối database
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Bước 1: Kiểm tra bảng tồn tại
        print("\n📋 BƯỚC 1: Kiểm tra bảng tồn tại")
        existing_tables = []
        
        for schema, table_name in tables_to_drop:
            exists = check_table_exists(cursor, schema, table_name)
            if exists:
                row_count = count_table_rows(cursor, schema, table_name)
                print(f"✅ {schema}.{table_name} - Tồn tại ({row_count:,} dòng)")
                existing_tables.append((schema, table_name, row_count))
            else:
                print(f"⚠️  {schema}.{table_name} - Không tồn tại")
        
        if not existing_tables:
            print("ℹ️  Không có bảng nào cần xóa!")
            return True
        
        # Bước 2: Kiểm tra foreign key constraints
        print("\n🔗 BƯỚC 2: Kiểm tra Foreign Key Constraints")
        has_constraints = False
        
        for schema, table_name, _ in existing_tables:
            fks = check_foreign_keys(cursor, schema, table_name)
            if fks:
                has_constraints = True
                print(f"⚠️  {schema}.{table_name} có {len(fks)} foreign key constraints:")
                for fk in fks:
                    print(f"   - {fk[0]}.{fk[2]}.{fk[3]} -> {fk[4]}.{fk[5]}.{fk[6]}")
            else:
                print(f"✅ {schema}.{table_name} - Không có foreign key constraints")
        
        # Bước 3: Xác nhận từ người dùng
        print(f"\n⚠️  CẢNH BÁO: Sắp xóa {len(existing_tables)} bảng:")
        for schema, table_name, row_count in existing_tables:
            print(f"   - {schema}.{table_name} ({row_count:,} dòng)")
        
        if has_constraints:
            print("⚠️  Một số bảng có foreign key constraints - sẽ dùng CASCADE")
        
        confirm = input("\n❓ Bạn có chắc chắn muốn tiếp tục? (yes/no): ").lower().strip()
        
        if confirm not in ['yes', 'y']:
            print("❌ Đã hủy thao tác xóa bảng")
            return False
        
        # Bước 4: Tạo backup (tùy chọn)
        backup_confirm = input("❓ Bạn có muốn tạo backup trước khi xóa? (yes/no): ").lower().strip()
        
        if backup_confirm in ['yes', 'y']:
            print("\n💾 BƯỚC 4: Tạo backup")
            for schema, table_name, _ in existing_tables:
                create_backup(cursor, schema, table_name)
        
        # Bước 5: Xóa bảng
        print("\n🗑️  BƯỚC 5: Xóa bảng")
        success_count = 0
        
        for schema, table_name, _ in existing_tables:
            if drop_table_safely(cursor, schema, table_name):
                success_count += 1
        
        # Bước 6: Xác nhận kết quả
        print("\n✅ BƯỚC 6: Xác nhận kết quả")
        for schema, table_name in tables_to_drop:
            exists = check_table_exists(cursor, schema, table_name)
            if not exists:
                print(f"✅ {schema}.{table_name} - Đã xóa thành công")
            else:
                print(f"❌ {schema}.{table_name} - Vẫn tồn tại")
        
        print(f"\n🎉 Hoàn thành! Đã xóa {success_count}/{len(existing_tables)} bảng")
        return success_count == len(existing_tables)
        
    except Exception as e:
        print(f"❌ Lỗi không mong muốn: {e}")
        return False
        
    finally:
        cursor.close()
        conn.close()
        print("🔌 Đã đóng kết nối database")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)