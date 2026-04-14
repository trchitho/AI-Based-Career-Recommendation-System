#!/usr/bin/env python3
"""
Database Migration: Add question_count and question_distribution to interview_sessions
Ngày: 8 tháng 4, 2026
Mục đích: Hỗ trợ số lượng câu hỏi linh hoạt trong hệ thống phỏng vấn AI
"""

import os
import sys
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path để import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_db_connection():
    """Tạo kết nối database từ environment variables"""
    try:
        # Lấy thông tin kết nối từ env
        db_url = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")

        # Parse URL nếu cần
        if db_url.startswith("postgresql://"):
            return psycopg2.connect(db_url)
        else:
            # Fallback to individual params
            return psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5433"),
                database=os.getenv("DB_NAME", "career_ai"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "123456"),
            )
    except Exception as e:
        print(f"❌ Lỗi kết nối database: {e}")
        sys.exit(1)


def check_column_exists(cursor, table_name, column_name, schema="interview"):
    """Kiểm tra xem column đã tồn tại chưa"""
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = %s 
            AND table_name = %s 
            AND column_name = %s
        )
    """,
        (schema, table_name, column_name),
    )
    return cursor.fetchone()[0]


def add_question_config_columns():
    """Thêm columns question_count và question_distribution"""
    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            print("🔍 Kiểm tra cấu trúc bảng interview_sessions...")

            # Kiểm tra xem columns đã tồn tại chưa
            question_count_exists = check_column_exists(cursor, "interview_sessions", "question_count")
            question_distribution_exists = check_column_exists(cursor, "interview_sessions", "question_distribution")

            if question_count_exists and question_distribution_exists:
                print("✅ Columns question_count và question_distribution đã tồn tại")
                return True

            print("📝 Thêm columns mới vào bảng interview_sessions...")

            # Thêm question_count column
            if not question_count_exists:
                cursor.execute(
                    """
                    ALTER TABLE interview.interview_sessions 
                    ADD COLUMN question_count INTEGER DEFAULT 5
                """
                )
                print("✅ Đã thêm column question_count")

            # Thêm question_distribution column
            if not question_distribution_exists:
                cursor.execute(
                    """
                    ALTER TABLE interview.interview_sessions 
                    ADD COLUMN question_distribution JSONB
                """
                )
                print("✅ Đã thêm column question_distribution")

            # Commit changes
            conn.commit()
            print("✅ Migration hoàn thành thành công!")

            return True

    except Exception as e:
        print(f"❌ Lỗi khi thực hiện migration: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def update_existing_sessions():
    """Cập nhật các session hiện tại với giá trị mặc định"""
    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            print("🔄 Cập nhật dữ liệu cho các session hiện tại...")

            # Cập nhật question_distribution cho các session chưa có
            default_distribution = {"warm_up": 1, "technical": 2, "behavioral": 1, "situational": 1}

            cursor.execute(
                """
                UPDATE interview.interview_sessions 
                SET question_distribution = %s
                WHERE question_distribution IS NULL
            """,
                (psycopg2.extras.Json(default_distribution),),
            )

            updated_count = cursor.rowcount
            conn.commit()

            print(f"✅ Đã cập nhật {updated_count} session với question_distribution mặc định")
            return True

    except Exception as e:
        print(f"❌ Lỗi khi cập nhật dữ liệu: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def verify_migration():
    """Xác minh migration đã thành công"""
    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            print("🔍 Xác minh migration...")

            # Kiểm tra cấu trúc bảng
            cursor.execute(
                """
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'interview' 
                AND table_name = 'interview_sessions'
                AND column_name IN ('question_count', 'question_distribution')
                ORDER BY column_name
            """
            )

            columns = cursor.fetchall()

            if len(columns) == 2:
                print("✅ Cấu trúc bảng đã được cập nhật:")
                for col in columns:
                    print(f"   - {col['column_name']}: {col['data_type']} (default: {col['column_default']})")

                # Kiểm tra dữ liệu mẫu
                cursor.execute(
                    """
                    SELECT COUNT(*) as total,
                           COUNT(question_count) as with_count,
                           COUNT(question_distribution) as with_distribution
                    FROM interview.interview_sessions
                """
                )

                stats = cursor.fetchone()
                print("📊 Thống kê dữ liệu:")
                print(f"   - Tổng sessions: {stats['total']}")
                print(f"   - Có question_count: {stats['with_count']}")
                print(f"   - Có question_distribution: {stats['with_distribution']}")

                return True
            else:
                print("❌ Migration chưa hoàn thành đúng cách")
                return False

    except Exception as e:
        print(f"❌ Lỗi khi xác minh: {e}")
        return False
    finally:
        conn.close()


def main():
    """Hàm chính thực hiện migration"""
    print("🚀 Bắt đầu Database Migration: Interview Question Configuration")
    print(f"⏰ Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Bước 1: Thêm columns mới
    if not add_question_config_columns():
        print("❌ Migration thất bại ở bước thêm columns")
        sys.exit(1)

    # Bước 2: Cập nhật dữ liệu hiện tại
    if not update_existing_sessions():
        print("❌ Migration thất bại ở bước cập nhật dữ liệu")
        sys.exit(1)

    # Bước 3: Xác minh kết quả
    if not verify_migration():
        print("❌ Migration thất bại ở bước xác minh")
        sys.exit(1)

    print("=" * 60)
    print("🎉 Migration hoàn thành thành công!")
    print("✅ Hệ thống phỏng vấn AI đã sẵn sàng với tính năng câu hỏi linh hoạt")
    print("\n📋 Các tính năng mới:")
    print("   - Hỗ trợ 5, 7, 8, 10, 12 câu hỏi")
    print("   - Phân bố câu hỏi động theo loại")
    print("   - Lưu trữ cấu hình trong database")


if __name__ == "__main__":
    main()
