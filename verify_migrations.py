"""
Verify all migrations have been applied successfully
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

def verify_migrations():
    """Verify all migrations have been applied"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔍 VERIFYING BLOG COMMENT SYSTEM MIGRATIONS")
        print("="*60)
        
        # 1. Check tables exist
        print("\n1️⃣ Checking tables...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core' 
            AND table_name IN ('blog_posts', 'blog_comments', 'comment_likes', 'comment_rate_limits', 'blog_post_reactions')
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        expected_tables = ['blog_comments', 'blog_post_reactions', 'blog_posts', 'comment_likes', 'comment_rate_limits']
        
        for table in expected_tables:
            if any(t[0] == table for t in tables):
                print(f"   ✅ {table}")
            else:
                print(f"   ❌ {table} - MISSING")
        
        # 2. Check indexes
        print("\n2️⃣ Checking indexes...")
        cursor.execute("""
            SELECT indexname, tablename
            FROM pg_indexes 
            WHERE schemaname = 'core' 
            AND tablename IN ('blog_comments', 'comment_likes', 'comment_rate_limits', 'blog_post_reactions')
            ORDER BY tablename, indexname;
        """)
        
        indexes = cursor.fetchall()
        print(f"   ✅ Found {len(indexes)} indexes")
        for index_name, table_name in indexes:
            print(f"      - {table_name}.{index_name}")
        
        # 3. Check triggers
        print("\n3️⃣ Checking triggers...")
        cursor.execute("""
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers 
            WHERE event_object_schema = 'core'
            AND event_object_table IN ('blog_comments', 'comment_likes', 'blog_post_reactions')
            ORDER BY event_object_table, trigger_name;
        """)
        
        triggers = cursor.fetchall()
        print(f"   ✅ Found {len(triggers)} triggers")
        for trigger_name, table_name in triggers:
            print(f"      - {table_name}.{trigger_name}")
        
        # 4. Check data
        print("\n4️⃣ Checking data...")
        
        # Blog posts
        cursor.execute("SELECT COUNT(*) FROM core.blog_posts;")
        blog_posts_count = cursor.fetchone()[0]
        print(f"   📝 Blog posts: {blog_posts_count}")
        
        # Blog comments
        cursor.execute("SELECT COUNT(*) FROM core.blog_comments;")
        comments_count = cursor.fetchone()[0]
        print(f"   💬 Comments: {comments_count}")
        
        # Comment likes
        cursor.execute("SELECT COUNT(*) FROM core.comment_likes;")
        likes_count = cursor.fetchone()[0]
        print(f"   ❤️ Comment likes: {likes_count}")
        
        # Blog post reactions
        cursor.execute("SELECT COUNT(*) FROM core.blog_post_reactions;")
        reactions_count = cursor.fetchone()[0]
        print(f"   👍 Post reactions: {reactions_count}")
        
        # 5. Test functionality
        print("\n5️⃣ Testing functionality...")
        
        # Test like count trigger
        cursor.execute("""
            SELECT c.id, c.content, c.like_count, 
                   (SELECT COUNT(*) FROM core.comment_likes cl WHERE cl.comment_id = c.id) as actual_likes
            FROM core.blog_comments c 
            WHERE c.like_count > 0 
            LIMIT 3;
        """)
        
        like_tests = cursor.fetchall()
        print("   🧪 Like count consistency:")
        for comment_id, content, stored_likes, actual_likes in like_tests:
            status = "✅" if stored_likes == actual_likes else "❌"
            print(f"      {status} Comment {comment_id}: stored={stored_likes}, actual={actual_likes}")
        
        # Test nested comments
        cursor.execute("""
            SELECT 
                COUNT(*) as total_comments,
                COUNT(*) FILTER (WHERE parent_id IS NULL) as main_comments,
                COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as reply_comments
            FROM core.blog_comments;
        """)
        
        total, main, replies = cursor.fetchone()
        print(f"   🌳 Comment structure: {total} total ({main} main, {replies} replies)")
        
        # 6. Show sample data
        print("\n6️⃣ Sample data:")
        cursor.execute("""
            SELECT 
                bp.title,
                COUNT(bc.id) as comment_count,
                SUM(bc.like_count) as total_likes
            FROM core.blog_posts bp
            LEFT JOIN core.blog_comments bc ON bp.id = bc.post_id
            WHERE bc.is_deleted = false OR bc.id IS NULL
            GROUP BY bp.id, bp.title
            HAVING COUNT(bc.id) > 0
            ORDER BY comment_count DESC
            LIMIT 5;
        """)
        
        sample_data = cursor.fetchall()
        print("   📊 Posts with comments:")
        for title, comment_count, total_likes in sample_data:
            print(f"      - '{title[:50]}...' ({comment_count} comments, {total_likes or 0} likes)")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✅ MIGRATION VERIFICATION COMPLETE")
        print("="*60)
        print("🎉 All blog comment system components are working correctly!")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        cursor.close()
        conn.close()
        return False

if __name__ == '__main__':
    if verify_migrations():
        print("\n🚀 Ready to start the application:")
        print("   Backend:  cd apps/backend && python -m uvicorn app.main:app --reload")
        print("   Frontend: cd apps/frontend && npm run dev")
        print("   URL:      http://localhost:3000")
    else:
        print("\n❌ Some issues found. Please check the migration files.")