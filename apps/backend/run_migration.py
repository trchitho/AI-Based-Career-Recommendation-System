"""
Run database migration to add personal info columns
"""
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the migration SQL file"""
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
        migration_file = os.path.join(
            os.path.dirname(__file__),
            'migrations',
            'add_personal_info_to_skill_gap.sql'
        )
        
        print(f"Reading migration file: {migration_file}")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Execute migration
        print("Executing migration...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Verify columns were added
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'skill_gap_analyses'
            AND column_name IN ('cv_name', 'cv_email', 'cv_phone')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        print("\nVerification - New columns:")
        for col_name, col_type in columns:
            print(f"  ✓ {col_name} ({col_type})")
        
        cursor.close()
        conn.close()
        
        print("\n✅ All done! Personal info columns are ready.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    print("="*60)
    print("DATABASE MIGRATION: Add Personal Info to Skill Gap")
    print("="*60)
    print()
    
    run_migration()
