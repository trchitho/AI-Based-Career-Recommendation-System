"""
Check if test_mode column exists and has data in database
"""
import os

from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:123456@localhost:5433/career_ai"
)

def check_test_mode():
    """Check test_mode column in assessments table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column exists
        print("=" * 60)
        print("1. Checking if test_mode column exists...")
        print("=" * 60)
        
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'core' 
            AND table_name = 'assessments'
            AND column_name = 'test_mode'
        """))
        
        col_info = result.fetchone()
        if col_info:
            print(f"✅ Column exists: {col_info[0]} ({col_info[1]}, nullable: {col_info[2]})")
        else:
            print("❌ Column does NOT exist!")
            return
        
        # Check data in assessments
        print("\n" + "=" * 60)
        print("2. Checking test_mode data in recent assessments...")
        print("=" * 60)
        
        result = conn.execute(text("""
            SELECT 
                id,
                user_id,
                a_type,
                test_mode,
                created_at
            FROM core.assessments
            ORDER BY created_at DESC
            LIMIT 10
        """))
        
        rows = result.fetchall()
        if rows:
            print(f"\nFound {len(rows)} recent assessments:\n")
            for row in rows:
                test_mode_display = row[3] if row[3] else "NULL"
                print(f"  ID: {row[0]:3d} | User: {row[1]:2d} | Type: {row[2]:8s} | test_mode: {test_mode_display:12s} | Created: {row[4]}")
        else:
            print("❌ No assessments found!")
        
        # Count by test_mode
        print("\n" + "=" * 60)
        print("3. Statistics by test_mode...")
        print("=" * 60)
        
        result = conn.execute(text("""
            SELECT 
                test_mode,
                COUNT(*) as count
            FROM core.assessments
            GROUP BY test_mode
            ORDER BY count DESC
        """))
        
        stats = result.fetchall()
        print("\ntest_mode distribution:")
        for stat in stats:
            mode = stat[0] if stat[0] else "NULL"
            print(f"  {mode:15s}: {stat[1]:3d} assessments")
        
        # Check specific user's latest assessment
        print("\n" + "=" * 60)
        print("4. Latest assessment for each user...")
        print("=" * 60)
        
        result = conn.execute(text("""
            WITH latest_per_user AS (
                SELECT DISTINCT ON (user_id)
                    user_id,
                    id,
                    a_type,
                    test_mode,
                    created_at
                FROM core.assessments
                ORDER BY user_id, created_at DESC
            )
            SELECT * FROM latest_per_user
            ORDER BY created_at DESC
            LIMIT 5
        """))
        
        latest = result.fetchall()
        print("\nLatest assessment per user:")
        for row in latest:
            test_mode_display = row[3] if row[3] else "NULL"
            print(f"  User {row[0]:2d}: ID={row[1]:3d} | Type={row[2]:8s} | test_mode={test_mode_display:12s} | {row[4]}")

if __name__ == "__main__":
    try:
        check_test_mode()
        print("\n" + "=" * 60)
        print("✅ Check completed!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
