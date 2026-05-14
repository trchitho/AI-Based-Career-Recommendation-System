"""
Check how many careers have Vietnamese titles in the database
"""
import os
import sys
from sqlalchemy import create_engine, text

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
engine = create_engine(DATABASE_URL)

def check_titles():
    with engine.connect() as conn:
        # Check total careers and how many have title_vi
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_careers,
                COUNT(title_vi) as has_title_vi,
                COUNT(title_en) as has_title_en,
                COUNT(CASE WHEN title_vi IS NOT NULL AND title_vi != '' THEN 1 END) as has_non_empty_title_vi
            FROM core.careers
        """))
        row = result.fetchone()
        
        print("=" * 60)
        print("CAREER TITLES STATISTICS")
        print("=" * 60)
        print(f"Total careers: {row[0]}")
        print(f"Has title_en: {row[2]}")
        print(f"Has title_vi (not null): {row[1]}")
        print(f"Has title_vi (not empty): {row[3]}")
        print()
        
        # Get sample of careers with Vietnamese titles
        result = conn.execute(text("""
            SELECT id, title_en, title_vi, industry_category
            FROM core.careers
            WHERE title_vi IS NOT NULL AND title_vi != ''
            LIMIT 10
        """))
        
        print("=" * 60)
        print("SAMPLE CAREERS WITH VIETNAMESE TITLES (First 10)")
        print("=" * 60)
        for row in result:
            print(f"ID: {row[0]}")
            print(f"  EN: {row[1]}")
            print(f"  VI: {row[2]}")
            print(f"  Category: {row[3]}")
            print()
        
        # Get sample of careers WITHOUT Vietnamese titles
        result = conn.execute(text("""
            SELECT id, title_en, title_vi, industry_category
            FROM core.careers
            WHERE title_vi IS NULL OR title_vi = ''
            LIMIT 10
        """))
        
        print("=" * 60)
        print("SAMPLE CAREERS WITHOUT VIETNAMESE TITLES (First 10)")
        print("=" * 60)
        for row in result:
            print(f"ID: {row[0]}")
            print(f"  EN: {row[1]}")
            print(f"  VI: {row[2] or '(NULL)'}")
            print(f"  Category: {row[3]}")
            print()
        
        # Check the top recommended careers
        result = conn.execute(text("""
            SELECT 
                c.id,
                c.title_en,
                c.title_vi,
                c.industry_category,
                COUNT(cr.id) as recommendation_count
            FROM core.career_recommendations cr
            INNER JOIN core.careers c ON c.id = cr.career_id
            WHERE cr.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY c.id, c.title_en, c.title_vi, c.industry_category
            ORDER BY recommendation_count DESC
            LIMIT 10
        """))
        
        print("=" * 60)
        print("TOP 10 RECOMMENDED CAREERS (Last 30 days)")
        print("=" * 60)
        for row in result:
            print(f"ID: {row[0]} | Count: {row[4]}")
            print(f"  EN: {row[1]}")
            print(f"  VI: {row[2] or '(NO VIETNAMESE TITLE)'}")
            print(f"  Category: {row[3]}")
            print()

if __name__ == "__main__":
    try:
        check_titles()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
