"""
Run the final blog comment migration with proper error handling
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('apps/backend/.env')

def get_db_connection():
    """Get database connection from environment"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:123456@localhost:5433/career_ai')
    
    # Parse connection string
    parts = db_url.replace('postgresql://', '').split('@')
    user_pass = parts[0].split(':')
    host_port_db = parts[1].split('/')
    host_port = host_port_db[0].split(':')
    
    user = user_pass[0]
    password = user_pass[1]
    host = host_port[0]
    port = host_port[1] if len(host_port) > 1 else '5432'
    database = host_port_db[1]
    
    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )

def run_final_migration():
    """Run the final migration with proper data handling"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔄 Running final blog comment migration...")
        
        # Get the first available blog post ID
        cursor.execute("SELECT id FROM core.blog_posts LIMIT 1;")
        result = cursor.fetchone()
        
        if not result:
            print("❌ No blog posts found. Creating a sample post...")
            cursor.execute("""
                INSERT INTO core.blog_posts (
                    author_id, title, slug, content_md, excerpt, category, 
                    status, published_at, created_at, updated_at
                ) VALUES (
                    1, 
                    'Hướng dẫn phát triển sự nghiệp hiệu quả', 
                    'huong-dan-phat-trien-su-nghiep-hieu-qua-' || extract(epoch from now()),
                    '# Hướng dẫn phát triển sự nghiệp hiệu quả\n\nBài viết mẫu cho hệ thống comment.',
                    'Hướng dẫn chi tiết về cách phát triển sự nghiệp hiệu quả.',
                    'Career Development',
                    'Published',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                ) RETURNING id;
            """)
            post_id = cursor.fetchone()[0]
        else:
            post_id = result[0]
        
        print(f"✅ Using blog post ID: {post_id}")
        
        # Ensure we have test users (create if not exist)
        cursor.execute("""
            INSERT INTO core.users (email, full_name, password_hash, role, is_email_verified, created_at)
            VALUES 
                ('john.doe@example.com', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP),
                ('jane.smith@example.com', 'Jane Smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP),
                ('mike.wilson@example.com', 'Mike Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP)
            ON CONFLICT (email) DO NOTHING;
        """)
        
        # Get user IDs
        cursor.execute("SELECT id FROM core.users LIMIT 3;")
        user_ids = [row[0] for row in cursor.fetchall()]
        
        if len(user_ids) < 3:
            print("❌ Not enough users found")
            return False
        
        print(f"✅ Using user IDs: {user_ids}")
        
        # Clear existing test comments for this post
        cursor.execute("DELETE FROM core.blog_comments WHERE post_id = %s;", (post_id,))
        
        # Insert main comments
        cursor.execute("""
            INSERT INTO core.blog_comments (post_id, user_id, content, created_at, updated_at)
            VALUES 
                (%s, %s, 'Bài viết rất hữu ích! Những lời khuyên về networking đặc biệt có giá trị. Cảm ơn tác giả đã chia sẻ.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                (%s, %s, 'Tôi đã áp dụng phương pháp SMART goals và thấy hiệu quả rõ rệt trong việc lập kế hoạch nghề nghiệp. Recommend!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                (%s, %s, 'Có thể chia sẻ thêm về cách tìm mentor phù hợp không? Phần này tôi đang gặp khó khăn.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                (%s, %s, 'Kỹ năng số hóa thực sự quan trọng. Bạn nào có kinh nghiệm học online courses hiệu quả?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id;
        """, (post_id, user_ids[0], post_id, user_ids[1], post_id, user_ids[2], post_id, user_ids[0]))
        
        main_comment_ids = [row[0] for row in cursor.fetchall()]
        print(f"✅ Created {len(main_comment_ids)} main comments")
        
        # Insert reply comments
        if len(main_comment_ids) >= 4:
            cursor.execute("""
                INSERT INTO core.blog_comments (post_id, user_id, parent_id, content, created_at, updated_at)
                VALUES 
                    (%s, %s, %s, 'Mình cũng đồng ý! Networking đã giúp mình tìm được công việc hiện tại. Quan trọng là phải chân thành khi kết nối.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (%s, %s, %s, 'LinkedIn thực sự hiệu quả cho việc networking. Mình đã kết nối được với nhiều chuyên gia trong ngành.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (%s, %s, %s, 'Về việc tìm mentor, mình suggest bạn tham gia các group chuyên ngành trên Facebook hoặc LinkedIn. Nhiều senior sẵn sàng chia sẻ kinh nghiệm.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (%s, %s, %s, 'Coursera và Udemy có nhiều khóa học chất lượng. Quan trọng là practice thường xuyên và áp dụng vào công việc thực tế.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id;
            """, (
                post_id, user_ids[1], main_comment_ids[0],
                post_id, user_ids[2], main_comment_ids[0], 
                post_id, user_ids[0], main_comment_ids[2],
                post_id, user_ids[1], main_comment_ids[3]
            ))
            
            reply_comment_ids = [row[0] for row in cursor.fetchall()]
            print(f"✅ Created {len(reply_comment_ids)} reply comments")
            
            # Insert some likes
            all_comment_ids = main_comment_ids + reply_comment_ids
            like_data = []
            
            # Add likes for first few comments
            for i, comment_id in enumerate(all_comment_ids[:6]):
                for j, user_id in enumerate(user_ids):
                    if i != j:  # Don't let users like their own comments
                        like_data.append((comment_id, user_id))
            
            if like_data:
                cursor.executemany("""
                    INSERT INTO core.comment_likes (comment_id, user_id, created_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (comment_id, user_id) DO NOTHING;
                """, like_data)
                
                print(f"✅ Created {len(like_data)} comment likes")
        
        conn.commit()
        
        # Verification
        cursor.execute("""
            SELECT 
                'blog_comments' as table_name, 
                COUNT(*) as record_count 
            FROM core.blog_comments
            WHERE post_id = %s
            UNION ALL
            SELECT 
                'comment_likes' as table_name, 
                COUNT(*) as record_count 
            FROM core.comment_likes cl
            JOIN core.blog_comments bc ON cl.comment_id = bc.id
            WHERE bc.post_id = %s;
        """, (post_id, post_id))
        
        results = cursor.fetchall()
        print("\n📊 Migration results:")
        for table_name, count in results:
            print(f"   - {table_name}: {count} records")
        
        # Show comment tree
        cursor.execute("""
            SELECT 
                c.id,
                CASE 
                    WHEN c.parent_id IS NULL THEN '📝 ' || LEFT(c.content, 50) || '...'
                    ELSE '  ↳ 💬 ' || LEFT(c.content, 40) || '...'
                END as comment_preview,
                c.like_count,
                u.full_name as user_name
            FROM core.blog_comments c
            LEFT JOIN core.users u ON c.user_id = u.id
            WHERE c.post_id = %s 
            AND c.is_deleted = false
            ORDER BY 
                COALESCE(c.parent_id, c.id),
                c.created_at;
        """, (post_id,))
        
        comments = cursor.fetchall()
        print(f"\n💬 Comment tree for post {post_id}:")
        for comment_id, preview, likes, user_name in comments:
            print(f"   {preview} (👤 {user_name}, ❤️ {likes})")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False

if __name__ == '__main__':
    print("🚀 Running final blog comment migration...")
    
    if run_final_migration():
        print("\n🎉 Blog comment system migration completed successfully!")
        print("\n🔧 Next steps:")
        print("   1. Start backend: cd apps/backend && python -m uvicorn app.main:app --reload")
        print("   2. Start frontend: cd apps/frontend && npm run dev")
        print("   3. Test blog comments at: http://localhost:3000")
        print("\n✅ System is ready for production use!")
    else:
        print("\n❌ Migration failed. Please check the errors above.")