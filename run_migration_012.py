#!/usr/bin/env python3
"""
Migration script for VietnamWorks Job Categories
Run this script to execute migration 012
"""

import psycopg2
import os
from psycopg2 import sql
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get database connection"""
    try:
        # Try to get connection details from environment or use defaults
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5433')
        db_name = os.getenv('DB_NAME', 'career_ai')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD', '123456')
        
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        logger.info(f"Connected to database: {db_name}")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def execute_migration():
    """Execute the migration script"""
    try:
        # Read the migration file
        migration_file = 'db/migrations/012_vietnamworks_job_categories.sql'
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        logger.info(f"Reading migration file: {migration_file}")
        
        # Connect to database
        conn = get_db_connection()
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Execute migration
        logger.info("Executing migration 012...")
        cursor.execute(migration_sql)
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM core.vietnamworks_categories")
        category_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT category_group) FROM core.vietnamworks_categories")
        group_count = cursor.fetchone()[0]
        
        logger.info(f"Migration completed successfully!")
        logger.info(f"  VietnamWorks Categories: {category_count}")
        logger.info(f"  Category Groups: {group_count}")
        
        # Show sample data
        cursor.execute("""
            SELECT category_group, COUNT(*) as count 
            FROM core.vietnamworks_categories 
            GROUP BY category_group 
            ORDER BY count DESC
            LIMIT 5
        """)
        top_groups = cursor.fetchall()
        
        logger.info("Top 5 category groups:")
        for group, count in top_groups:
            logger.info(f"  {group}: {count} categories")
        
        cursor.close()
        conn.close()
        
        logger.info("Migration 012 completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = execute_migration()
    if success:
        print("✅ Migration 012 completed successfully!")
    else:
        print("❌ Migration 012 failed!")
        exit(1)
