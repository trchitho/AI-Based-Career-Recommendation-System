"""
Run database migrations for blog comment system
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('apps/backend/.env')

def get_db_connection():
    """Get database connection from environment"""
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
    
    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )

def run_migration_file(conn, file_path):
    """Run a single migration file"""
    print(f"\n🔄 Running migration: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
        
        print(f"✅ Migration completed: {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {file_path}")
        print(f"Error: {e}")
        conn.rollback()
        return False

def main():
    """Run all migrations"""
    print("="*60)
    print("🚀 RUNNING DATABASE MIGRATIONS")
    print("="*60)
    
    # Migration files in order
    migration_files = [
        'apps/migrations/001_create_blog_comments_system.sql',
        'apps/migrations/002_add_blog_reactions.sql',
        'apps/migrations/blog_comment_system_production.sql'
    ]
    
    try:
        # Connect to database
        conn = get_db_connection()
        print("✅ Database connection established")
        
        # Run each migration
        success_count = 0
        for migration_file in migration_files:
            if os.path.exists(migration_file):
                if run_migration_file(conn, migration_file):
                    success_count += 1
            else:
                print(f"⚠️ Migration file not found: {migration_file}")
        
        conn.close()
        
        print("\n" + "="*60)
        print(f"📊 MIGRATION SUMMARY")
        print("="*60)
        print(f"✅ Successful migrations: {success_count}/{len(migration_files)}")
        
        if success_count == len(migration_files):
            print("🎉 All migrations completed successfully!")
            print("\n🔧 Next steps:")
            print("   1. Start backend: cd apps/backend && python -m uvicorn app.main:app --reload")
            print("   2. Start frontend: cd apps/frontend && npm run dev")
            print("   3. Test blog comments at: http://localhost:3000")
        else:
            print("⚠️ Some migrations failed. Please check the errors above.")
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure PostgreSQL is running")
        print("   2. Check DATABASE_URL in .env file")
        print("   3. Verify database credentials")
        sys.exit(1)

if __name__ == '__main__':
    main()