"""
Update old assessments to have test_mode = 'traditional'
Run this once to add test_mode to existing assessments
"""
import os
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/career_db"
)

def update_old_assessments():
    """Update all assessments with NULL test_mode to 'traditional'"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Update old assessments
        result = conn.execute(
            text("""
                UPDATE core.assessments 
                SET test_mode = 'traditional'
                WHERE test_mode IS NULL
            """)
        )
        conn.commit()
        
        updated_count = result.rowcount
        print(f"✅ Updated {updated_count} assessments to test_mode='traditional'")
        
        # Verify the update
        verify_result = conn.execute(
            text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN test_mode = 'traditional' THEN 1 END) as traditional_count,
                    COUNT(CASE WHEN test_mode = 'story' THEN 1 END) as story_count,
                    COUNT(CASE WHEN test_mode IS NULL THEN 1 END) as null_count
                FROM core.assessments
            """)
        )
        
        stats = verify_result.fetchone()
        print(f"\n📊 Assessment Statistics:")
        print(f"   Total: {stats[0]}")
        print(f"   Traditional: {stats[1]}")
        print(f"   Story: {stats[2]}")
        print(f"   NULL: {stats[3]}")

if __name__ == "__main__":
    print("🔄 Updating old assessments with test_mode...")
    update_old_assessments()
    print("\n✅ Done! Refresh your browser to see the badges.")
