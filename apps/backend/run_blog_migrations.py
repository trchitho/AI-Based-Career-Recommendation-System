"""
Run blog-related database migrations
"""
import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration(migration_file):
    """Run a specific migration SQL file"""
    try:
        # Get database URL from environment
        db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:123456@localhost:5433/career_ai')
        
        # Parse connection string
        # Format: postgresql://user:password@host:port/database
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
        
        # Read migration file
        migration_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'db',
            'migrations',
            migration_file
        )
        
        print(f"Reading migration file: {migration_path}")
        
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Execute migration
        print("Executing migration...")
        cursor.execute(sql)
        conn.commit()
        
        print(f"✅ Migration {migration_file} completed successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration {migration_file} failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def main():
    print("="*60)
    print("DATABASE MIGRATION: Blog System")
    print("="*60)
    print()
    
    # List of migrations to run in order
    migrations = [
        '001_create_blog_comments_system.sql',
        '002_add_blog_reactions.sql'
    ]
    
    for migration in migrations:
        print(f"\n🔄 Running migration: {migration}")
        success = run_migration(migration)
        if not success:
            print(f"❌ Failed to run {migration}. Stopping.")
            break
        print(f"✅ {migration} completed successfully!")
    
    print("\n" + "="*60)
    print("✅ All blog migrations completed!")
    print("="*60)


if __name__ == '__main__':
    main()