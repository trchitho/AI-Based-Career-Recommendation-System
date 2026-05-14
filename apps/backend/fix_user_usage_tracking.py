"""
Fix user_usage_tracking table by adding unique constraint
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")

def fix_user_usage_tracking():
    """Add unique constraint to user_usage_tracking table"""
    
    sql = """
    -- Add unique constraint if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'user_usage_tracking_user_feature_unique'
        ) THEN
            ALTER TABLE core.user_usage_tracking 
            ADD CONSTRAINT user_usage_tracking_user_feature_unique 
            UNIQUE (user_id, feature_type);
            
            RAISE NOTICE 'Added unique constraint user_usage_tracking_user_feature_unique';
        ELSE
            RAISE NOTICE 'Constraint user_usage_tracking_user_feature_unique already exists';
        END IF;
    END $$;
    """
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Executing SQL to add unique constraint...")
        cur.execute(sql)
        conn.commit()
        
        # Verify constraint was added
        cur.execute("""
            SELECT 
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'core.user_usage_tracking'::regclass
              AND conname = 'user_usage_tracking_user_feature_unique'
        """)
        
        result = cur.fetchone()
        if result:
            print(f"✅ Constraint added successfully:")
            print(f"   Name: {result[0]}")
            print(f"   Type: {result[1]}")
            print(f"   Definition: {result[2]}")
        else:
            print("⚠️  Constraint not found after execution")
        
        cur.close()
        conn.close()
        print("\n✅ Fix completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    fix_user_usage_tracking()
