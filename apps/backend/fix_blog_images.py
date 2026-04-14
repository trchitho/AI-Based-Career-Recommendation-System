"""
Fix blog post images with placeholder URLs
"""
import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_blog_images():
    """Update blog post images with placeholder URLs"""
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
        
        # Image mappings for different categories
        image_mappings = {
            'tech-skills-2025.jpg': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=600&fit=crop',
            'resume-writing.jpg': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600&fit=crop',
            'career-change-30.jpg': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
            'remote-work.jpg': 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
            'technical-interview.jpg': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop',
            'career-growth.jpg': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
            'linkedin-branding.jpg': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
            'salary-negotiation.jpg': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
            'ai-workplace.jpg': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
            'networking-introverts.jpg': 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop'
        }
        
        # Update each image
        updated_count = 0
        for filename, new_url in image_mappings.items():
            old_path = f'/images/blog/{filename}'
            
            cursor.execute("""
                UPDATE core.blog_posts 
                SET featured_image = %s 
                WHERE featured_image = %s
            """, (new_url, old_path))
            
            if cursor.rowcount > 0:
                print(f"✅ Updated {cursor.rowcount} post(s) with {filename}")
                updated_count += cursor.rowcount
        
        # Commit changes
        conn.commit()
        
        print(f"\n🎉 Successfully updated {updated_count} blog post images!")
        
        # Verify updates
        cursor.execute("""
            SELECT id, title, featured_image
            FROM core.blog_posts 
            WHERE featured_image LIKE 'https://images.unsplash.com%'
            ORDER BY id;
        """)
        
        updated_posts = cursor.fetchall()
        print(f"\n📊 Verified {len(updated_posts)} posts with new images:")
        
        for post_id, title, image_url in updated_posts:
            print(f"  • {title[:40]}... -> {image_url[:50]}...")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    print("="*60)
    print("FIX BLOG IMAGES")
    print("="*60)
    fix_blog_images()