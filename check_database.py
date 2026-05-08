"""
Check database structure and create missing tables if needed
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

def check_and_create_blog_posts():
    """Check if blog_posts table exists and create if needed"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if blog_posts table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'core' 
                AND table_name = 'blog_posts'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("📝 Creating blog_posts table...")
            
            # Create blog_posts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS core.blog_posts (
                    id SERIAL PRIMARY KEY,
                    author_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) UNIQUE NOT NULL,
                    content_md TEXT NOT NULL,
                    excerpt TEXT,
                    category VARCHAR(100),
                    status VARCHAR(20) DEFAULT 'Draft',
                    published_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    like_count BIGINT DEFAULT 0,
                    dislike_count BIGINT DEFAULT 0
                );
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON core.blog_posts(slug);
                CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON core.blog_posts(status);
                CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON core.blog_posts(category);
                CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON core.blog_posts(published_at DESC);
            """)
            
            print("✅ blog_posts table created")
        else:
            print("✅ blog_posts table already exists")
        
        # Check if we have any blog posts
        cursor.execute("SELECT COUNT(*) FROM core.blog_posts;")
        post_count = cursor.fetchone()[0]
        
        if post_count == 0:
            print("📝 Creating sample blog post...")
            
            # Insert a sample blog post
            cursor.execute("""
                INSERT INTO core.blog_posts (
                    author_id, title, slug, content_md, excerpt, category, 
                    status, published_at, created_at, updated_at
                ) VALUES (
                    1, 
                    'Hướng dẫn phát triển sự nghiệp hiệu quả', 
                    'huong-dan-phat-trien-su-nghiep-hieu-qua',
                    '# Hướng dẫn phát triển sự nghiệp hiệu quả

Trong thời đại công nghệ 4.0, việc phát triển sự nghiệp đòi hỏi chiến lược rõ ràng và kỹ năng phù hợp.

## 1. Xác định mục tiêu nghề nghiệp

- Đánh giá năng lực hiện tại
- Xác định điểm mạnh và điểm yếu
- Đặt mục tiêu SMART

## 2. Xây dựng kỹ năng cần thiết

- Kỹ năng chuyên môn (Hard skills)
- Kỹ năng mềm (Soft skills)
- Kỹ năng số hóa

## 3. Networking và xây dựng mối quan hệ

- Tham gia các sự kiện ngành
- Kết nối trên LinkedIn
- Tìm mentor phù hợp

## Kết luận

Phát triển sự nghiệp là hành trình dài, cần kiên trì và học hỏi không ngừng.',
                    'Hướng dẫn chi tiết về cách phát triển sự nghiệp hiệu quả trong thời đại số.',
                    'Career Development',
                    'Published',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                );
            """)
            
            print("✅ Sample blog post created")
        else:
            print(f"✅ Found {post_count} existing blog posts")
        
        conn.commit()
        
        # Show table structure
        print("\n📊 Database structure:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core' 
            AND table_name LIKE '%blog%'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        for table in tables:
            print(f"   - {table[0]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False

if __name__ == '__main__':
    print("🔍 Checking database structure...")
    if check_and_create_blog_posts():
        print("\n✅ Database is ready for blog comment migrations!")
    else:
        print("\n❌ Database setup failed!")