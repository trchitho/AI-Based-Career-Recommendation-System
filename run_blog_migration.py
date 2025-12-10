"""
Script to create blog_posts table in the database.
Run this from the project root: python run_blog_migration.py
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "apps" / "backend"
sys.path.insert(0, str(backend_path))

from app.core.db import engine
from sqlalchemy import text

def run_migration():
    """Run the blog_posts table migration"""
    sql_file = Path(__file__).parent / "create_blog_posts_table.sql"
    
    if not sql_file.exists():
        print(f"Error: Migration file not found at {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    try:
        with engine.connect() as conn:
            # Execute the SQL
            conn.execute(text(sql))
            conn.commit()
            print("✅ Successfully created core.blog_posts table!")
            print("✅ Successfully created core.comments table!")
            return True
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
