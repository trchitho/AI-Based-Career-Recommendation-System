"""
Script to run database migration for vietnamworks_categories table
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the migration SQL file"""
    
    # Get database connection info from environment
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
    database = host_port_db[1].split('?')[0]
    
    print(f"Connecting to database: {host}:{port}/{database}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✓ Connected to database successfully")
        
        # Read migration file
        migration_file = Path(__file__).parent / 'migrations' / 'create_vietnamworks_categories.sql'
        
        if not migration_file.exists():
            print(f"✗ Migration file not found: {migration_file}")
            return False
        
        print(f"Reading migration file: {migration_file}")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print("Executing migration...")
        
        # Execute migration
        cursor.execute(migration_sql)
        
        print("✓ Migration executed successfully!")
        
        # Verify table was created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'core' 
            AND table_name = 'vietnamworks_categories'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✓ Table 'core.vietnamworks_categories' created successfully!")
            
            # Show table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'core' 
                AND table_name = 'vietnamworks_categories'
                ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            print("\nTable structure:")
            print("-" * 80)
            print(f"{'Column':<25} {'Type':<20} {'Nullable':<10} {'Default':<20}")
            print("-" * 80)
            for col in columns:
                print(f"{col[0]:<25} {col[1]:<20} {col[2]:<10} {str(col[3])[:20]:<20}")
            print("-" * 80)
            
            # Show indexes
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'core' 
                AND tablename = 'vietnamworks_categories'
            """)
            
            indexes = cursor.fetchall()
            if indexes:
                print("\nIndexes:")
                print("-" * 80)
                for idx in indexes:
                    print(f"  • {idx[0]}")
                print("-" * 80)
            
            return True
        else:
            print("✗ Table was not created")
            return False
        
    except psycopg2.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            print("\nDatabase connection closed")

if __name__ == '__main__':
    print("=" * 80)
    print("VietnamWorks Categories Table Migration")
    print("=" * 80)
    print()
    
    success = run_migration()
    
    print()
    if success:
        print("✓ Migration completed successfully!")
        sys.exit(0)
    else:
        print("✗ Migration failed!")
        sys.exit(1)
