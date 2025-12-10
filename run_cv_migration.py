"""
Quick script to create the CVs table in the database.
Run this from the project root: python run_cv_migration.py
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
    """Run the CVs table migration"""
    sql_file = Path(__file__).parent / "apps" / "backend" / "alembic" / "versions" / "001_create_cvs_table.sql"
    
    if not sql_file.exists():
        print(f"Error: Migration file not found at {sql_file}")
        return False
    
    with open(sql_file, 'r') as f:
        sql = f.read()
    
    try:
        with engine.connect() as conn:
            # Execute the SQL
            conn.execute(text(sql))
            conn.commit()
            print("✅ Successfully created core.cvs table!")
            return True
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
