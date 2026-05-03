#!/usr/bin/env python3
"""
Database Cleanup Script
Xóa các bảng trùng lặp và không sử dụng một cách an toàn
"""

import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.core.config import settings


class DatabaseCleanup:
    def __init__(self):
        self.engine = create_engine(settings.DATABASE_URL)
        self.tables_to_remove = ["careers_backup", "blog_categories"]
        self.backup_data = {}

    def check_table_info(self, table_name: str):
        """Kiểm tra thông tin bảng trước khi xóa"""
        with self.engine.connect() as conn:
            # Đếm số dòng
            result = conn.execute(text(f"SELECT COUNT(*) FROM core.{table_name}"))
            row_count = result.scalar()

            # Lấy kích thước bảng
            result = conn.execute(
                text(
                    f"""
                SELECT pg_size_pretty(pg_total_relation_size('core.{table_name}'))
            """
                )
            )
            table_size = result.scalar()

            # Kiểm tra foreign key constraints
            result = conn.execute(
                text(
                    """
                SELECT 
                    tc.constraint_name,
                    tc.table_name,
                    kcu.column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND kcu.table_name = :table_name
            """
                ),
                {"table_name": table_name},
            )
            fk_constraints = result.fetchall()

            return {
                "row_count": row_count,
                "table_size": table_size,
                "fk_constraints": fk_constraints,
            }

    def backup_table(self, table_name: str):
        """Backup dữ liệu bảng trước khi xóa"""
        print(f"   📦 Backup dữ liệu bảng {table_name}...")

        with self.engine.connect() as conn:
            # Tạo bảng backup tạm thời
            backup_table_name = f"_backup_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            conn.execute(
                text(
                    f"""
                CREATE TABLE IF NOT EXISTS core.{backup_table_name} AS 
                SELECT * FROM core.{table_name}
            """
                )
            )
            conn.commit()

            print(f"   ✅ Đã backup vào: core.{backup_table_name}")
            return backup_table_name

    def drop_table(self, table_name: str):
        """Xóa bảng"""
        with self.engine.connect() as conn:
            conn.execute(text(f"DROP TABLE IF EXISTS core.{table_name} CASCADE"))
            conn.commit()

    def verify_table_dropped(self, table_name: str) -> bool:
        """Kiểm tra bảng đã bị xóa chưa"""
        with self.engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'core' AND table_name = :table_name
                )
            """
                ),
                {"table_name": table_name},
            )
            return not result.scalar()

    def get_table_count(self) -> int:
        """Đếm tổng số bảng trong schema core"""
        with self.engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'core'
            """
                )
            )
            return result.scalar()

    def run_cleanup(self, create_backup: bool = True):
        """Thực hiện cleanup"""
        print("=" * 80)
        print("🧹 DATABASE CLEANUP SCRIPT")
        print("=" * 80)
        print(f"Ngày: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'N/A'}")
        print()

        # Đếm số bảng ban đầu
        initial_count = self.get_table_count()
        print(f"📊 Tổng số bảng ban đầu: {initial_count}")
        print()

        # Kiểm tra và xóa từng bảng
        for table_name in self.tables_to_remove:
            print(f"🔍 Kiểm tra bảng: {table_name}")
            print("-" * 80)

            try:
                # Lấy thông tin bảng
                info = self.check_table_info(table_name)
                print(f"   • Số dòng: {info['row_count']:,}")
                print(f"   • Kích thước: {info['table_size']}")
                print(f"   • Foreign key constraints: {len(info['fk_constraints'])}")

                if info["fk_constraints"]:
                    print("   ⚠️  Cảnh báo: Bảng có foreign key constraints:")
                    for fk in info["fk_constraints"]:
                        print(f"      - {fk[0]}: {fk[1]}.{fk[2]}")

                # Backup nếu cần
                if create_backup and info["row_count"] > 0:
                    backup_name = self.backup_table(table_name)
                    self.backup_data[table_name] = backup_name

                # Xác nhận xóa
                print(f"\n   ❓ Xóa bảng {table_name}?")
                confirm = input("   Nhập 'yes' để xác nhận: ").strip().lower()

                if confirm == "yes":
                    # Xóa bảng
                    print(f"   🗑️  Đang xóa bảng {table_name}...")
                    self.drop_table(table_name)

                    # Verify
                    if self.verify_table_dropped(table_name):
                        print(f"   ✅ Đã xóa thành công: {table_name}")
                    else:
                        print(f"   ❌ Lỗi: Bảng vẫn tồn tại")
                else:
                    print(f"   ⏭️  Bỏ qua bảng {table_name}")

            except Exception as e:
                print(f"   ❌ Lỗi khi xử lý bảng {table_name}: {e}")

            print()

        # Đếm số bảng sau khi cleanup
        final_count = self.get_table_count()
        print("=" * 80)
        print("📊 KẾT QUẢ")
        print("=" * 80)
        print(f"Số bảng ban đầu: {initial_count}")
        print(f"Số bảng sau cleanup: {final_count}")
        print(f"Đã xóa: {initial_count - final_count} bảng")
        print()

        if self.backup_data:
            print("📦 CÁC BẢNG BACKUP:")
            for original, backup in self.backup_data.items():
                print(f"   • {original} → {backup}")
            print()

        print("✅ DỌN DẸP HOÀN TẤT!")
        print()
        print("📋 CHECKLIST TIẾP THEO:")
        print("   [ ] Chạy test suite: pytest apps/backend/app/tests/")
        print("   [ ] Kiểm tra application logs")
        print("   [ ] Test các API liên quan")
        print()

    def run_vacuum(self):
        """Chạy VACUUM để giải phóng không gian"""
        print("🧹 Đang chạy VACUUM ANALYZE...")
        with self.engine.connect() as conn:
            # Phải commit transaction trước khi VACUUM
            conn.execute(text("COMMIT"))
            conn.execute(text("VACUUM ANALYZE"))
        print("✅ VACUUM hoàn thành")


def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(description="Database Cleanup Script")
    parser.add_argument("--no-backup", action="store_true", help="Không tạo backup trước khi xóa")
    parser.add_argument("--auto-confirm", action="store_true", help="Tự động xác nhận (không hỏi)")
    parser.add_argument("--vacuum", action="store_true", help="Chạy VACUUM sau khi cleanup")

    args = parser.parse_args()

    cleanup = DatabaseCleanup()

    if args.auto_confirm:
        print("⚠️  CHẾ ĐỘ TỰ ĐỘNG - KHÔNG HỎI XÁC NHẬN")
        print("Nhấn Ctrl+C trong 5 giây để hủy...")
        import time

        time.sleep(5)

    try:
        cleanup.run_cleanup(create_backup=not args.no_backup)

        if args.vacuum:
            cleanup.run_vacuum()

    except KeyboardInterrupt:
        print("\n\n❌ Đã hủy cleanup")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Lỗi: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
