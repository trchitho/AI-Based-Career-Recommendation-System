#!/usr/bin/env python3
"""
Script để setup hệ thống comment cho blog
- Chạy migration tạo bảng
- Import dữ liệu mẫu (nếu cần)
"""

import os
import sys
import psycopg2
from datetime import datetime, timedelta

# Thêm path để import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend'))

def get_db_connection():
    """Kết nối database từ DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise RuntimeError(
            "Thiếu biến môi trường DATABASE_URL. "
            "Hãy thiết lập DATABASE_URL trước khi chạy script."
        )
    return psycopg2.connect(database_url)

def run_migration():
    """Chạy migration tạo bảng comment system"""
    print("🔄 Đang chạy migration tạo bảng comment system...")
    
    migration_file = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        'db', 
        'migrations', 
        '001_create_blog_comments_system.sql'
    )
    
    if not os.path.exists(migration_file):
        print(f"❌ Không tìm thấy file migration: {migration_file}")
        return False
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Đọc và chạy migration
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration đã chạy thành công!")
        
        # Kiểm tra bảng đã được tạo
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core' 
            AND table_name IN ('blog_comments', 'comment_likes', 'comment_rate_limits')
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"📋 Các bảng đã tạo: {[t[0] for t in tables]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi chạy migration: {e}")
        return False

def create_sample_data():
    """Tạo dữ liệu mẫu cho comment system"""
    print("🔄 Đang tạo dữ liệu mẫu...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Kiểm tra xem có blog posts không
        cursor.execute("SELECT id, title FROM core.blog_posts LIMIT 5;")
        posts = cursor.fetchall()
        
        if not posts:
            print("⚠️  Không có blog posts nào. Tạo blog post mẫu trước...")
            # Tạo blog post mẫu
            cursor.execute("""
                INSERT INTO core.blog_posts (
                    author_id, title, slug, content_md, excerpt, category, 
                    status, published_at, created_at, updated_at
                ) VALUES (
                    1, 
                    'Welcome to CareerBridge Blog', 
                    'welcome-to-careerbridge-blog',
                    '# Welcome to CareerBridge Blog\n\nThis is our first blog post about career development and guidance.\n\n## Getting Started\n\nWe will share valuable insights about:\n- Career planning\n- Interview tips\n- Resume writing\n- Professional development',
                    'Welcome to our career development blog with tips and insights.',
                    'Career Advice',
                    'Published',
                    NOW(),
                    NOW(),
                    NOW()
                ) RETURNING id;
            """)
            post_id = cursor.fetchone()[0]
            posts = [(post_id, 'Welcome to CareerBridge Blog')]
            print(f"✅ Đã tạo blog post mẫu với ID: {post_id}")
        
        # Kiểm tra xem có users không
        cursor.execute("SELECT id, full_name FROM core.users LIMIT 3;")
        users = cursor.fetchall()
        
        if not users:
            print("⚠️  Không có users nào. Tạo users mẫu...")
            # Tạo users mẫu
            sample_users = [
                ('john.doe@example.com', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6'),  # password: demo123
                ('jane.smith@example.com', 'Jane Smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6'),
                ('mike.wilson@example.com', 'Mike Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6')
            ]
            
            for email, name, password_hash in sample_users:
                cursor.execute("""
                    INSERT INTO core.users (email, full_name, password_hash, role, is_email_verified, created_at)
                    VALUES (%s, %s, %s, 'user', true, NOW())
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id;
                """, (email, name, password_hash))
                
                result = cursor.fetchone()
                if result:
                    print(f"✅ Đã tạo user: {name} ({email})")
            
            # Lấy lại danh sách users
            cursor.execute("SELECT id, full_name FROM core.users LIMIT 3;")
            users = cursor.fetchall()
        
        # Tạo comments mẫu
        post_id = posts[0][0]
        user_ids = [u[0] for u in users[:3]]
        
        sample_comments = [
            {
                'content': 'Great article! This really helped me understand the career planning process better.',
                'user_id': user_ids[0] if len(user_ids) > 0 else 1
            },
            {
                'content': 'Thank you for sharing these insights. The interview tips section was particularly useful.',
                'user_id': user_ids[1] if len(user_ids) > 1 else 1
            },
            {
                'content': 'I have been following your blog for a while now. Keep up the excellent work!',
                'user_id': user_ids[2] if len(user_ids) > 2 else 1
            }
        ]
        
        comment_ids = []
        for comment in sample_comments:
            cursor.execute("""
                INSERT INTO core.blog_comments (post_id, user_id, content, like_count, is_deleted, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id;
            """, (post_id, comment['user_id'], comment['content'], 0, False))
            
            comment_id = cursor.fetchone()[0]
            comment_ids.append(comment_id)
            print(f"✅ Đã tạo comment: {comment['content'][:50]}...")
        
        # Tạo replies mẫu
        if len(comment_ids) >= 2:
            reply_content = "I completely agree with your point. Thanks for sharing your experience!"
            cursor.execute("""
                INSERT INTO core.blog_comments (post_id, user_id, parent_id, content, like_count, is_deleted, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW());
            """, (post_id, user_ids[0] if len(user_ids) > 0 else 1, comment_ids[0], reply_content, 0, False))
            print("✅ Đã tạo reply mẫu")
        
        # Tạo likes mẫu
        if len(comment_ids) >= 1 and len(user_ids) >= 2:
            cursor.execute("""
                INSERT INTO core.comment_likes (comment_id, user_id, created_at)
                VALUES (%s, %s, NOW());
            """, (comment_ids[0], user_ids[1]))
            print("✅ Đã tạo like mẫu")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Dữ liệu mẫu đã được tạo thành công!")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi tạo dữ liệu mẫu: {e}")
        return False

def verify_setup():
    """Kiểm tra setup đã hoàn tất"""
    print("🔍 Đang kiểm tra setup...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Kiểm tra số lượng comments
        cursor.execute("SELECT COUNT(*) FROM core.blog_comments;")
        comment_count = cursor.fetchone()[0]
        
        # Kiểm tra số lượng likes
        cursor.execute("SELECT COUNT(*) FROM core.comment_likes;")
        like_count = cursor.fetchone()[0]
        
        # Kiểm tra nested comments
        cursor.execute("SELECT COUNT(*) FROM core.blog_comments WHERE parent_id IS NOT NULL;")
        reply_count = cursor.fetchone()[0]
        
        print(f"📊 Thống kê:")
        print(f"   - Tổng comments: {comment_count}")
        print(f"   - Tổng likes: {like_count}")
        print(f"   - Tổng replies: {reply_count}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi kiểm tra setup: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Bắt đầu setup hệ thống comment cho blog...")
    print("=" * 50)
    
    # Load environment variables
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend', '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✅ Đã load environment từ: {env_path}")
    
    # Bước 1: Chạy migration
    if not run_migration():
        print("❌ Setup thất bại tại bước migration")
        return False
    
    print("-" * 50)
    
    # Bước 2: Tạo dữ liệu mẫu
    if not create_sample_data():
        print("❌ Setup thất bại tại bước tạo dữ liệu mẫu")
        return False
    
    print("-" * 50)
    
    # Bước 3: Kiểm tra setup
    if not verify_setup():
        print("❌ Setup thất bại tại bước kiểm tra")
        return False
    
    print("=" * 50)
    print("🎉 Setup hệ thống comment hoàn tất!")
    print("\n📋 Các bước tiếp theo:")
    print("1. Khởi động backend server: cd apps/backend && python -m uvicorn app.main:app --reload")
    print("2. Khởi động frontend: cd apps/frontend && npm run dev")
    print("3. Truy cập blog để test comment system")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)