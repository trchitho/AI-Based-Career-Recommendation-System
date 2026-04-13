"""
Check blog post images in database
"""
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_blog_images():
    """Check blog post featured images"""
    try:
        # Get database URL from environment
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
        
        print(f"Connecting to database: {host}:{port}/{database}")
        
        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        cursor = conn.cursor()
        
        # Check blog posts
        cursor.execute("""
            SELECT id, title, featured_image, status, like_count, dislike_count
            FROM core.blog_posts 
            ORDER BY created_at DESC 
            LIMIT 10;
        """)
        
        posts = cursor.fetchall()
        
        print(f"\n📊 Found {len(posts)} blog posts:")
        print("="*80)
        
        for post_id, title, featured_image, status, like_count, dislike_count in posts:
            print(f"ID: {post_id}")
            print(f"Title: {title[:50]}...")
            print(f"Status: {status}")
            print(f"Featured Image: {featured_image or 'None'}")
            print(f"Likes: {like_count or 0}, Dislikes: {dislike_count or 0}")
            print("-" * 40)
        
        # Check if featured_image column exists and has data
        cursor.execute("""
            SELECT 
                COUNT(*) as total_posts,
                COUNT(featured_image) as posts_with_images,
                COUNT(*) FILTER (WHERE featured_image IS NOT NULL AND featured_image != '') as posts_with_valid_images
            FROM core.blog_posts;
        """)
        
        stats = cursor.fetchone()
        total, with_images, with_valid = stats
        
        print(f"\n📈 Statistics:")
        print(f"Total posts: {total}")
        print(f"Posts with featured_image field: {with_images}")
        print(f"Posts with valid image URLs: {with_valid}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    print("="*60)
    print("BLOG IMAGES CHECK")
    print("="*60)
    check_blog_images()