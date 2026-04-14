#!/usr/bin/env python3
"""
Script: create_tables_direct.py
Purpose: Create database tables directly using SQLAlchemy
Author: Senior Data Engineer
Date: 2026-01-27
"""

import sys
from pathlib import Path

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from ai_core.db import engine
from sqlalchemy import text


def create_tables():
    """Create all required tables"""
    print("\n" + "="*60)
    print("🔧 CREATING DATABASE TABLES")
    print("="*60)
    
    tables_sql = [
        # Table 1: career_dwas
        """
        CREATE TABLE IF NOT EXISTS core.career_dwas (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            element_id VARCHAR(20),
            iwa_id VARCHAR(30),
            dwa_id VARCHAR(50) NOT NULL,
            dwa_title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_dwas_onet ON core.career_dwas(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_dwas_dwa_id ON core.career_dwas(dwa_id)",
        
        # Table 2: career_work_activities
        """
        CREATE TABLE IF NOT EXISTS core.career_work_activities (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            element_id VARCHAR(20) NOT NULL,
            element_name VARCHAR(255) NOT NULL,
            scale_id VARCHAR(10),
            data_value NUMERIC(5,2),
            n INTEGER,
            standard_error NUMERIC(5,4),
            date VARCHAR(10),
            domain_source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_work_activities_onet ON core.career_work_activities(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_work_activities_element ON core.career_work_activities(element_id)",
        
        # Table 3: career_work_context
        """
        CREATE TABLE IF NOT EXISTS core.career_work_context (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            element_id VARCHAR(20) NOT NULL,
            element_name VARCHAR(255) NOT NULL,
            scale_id VARCHAR(10),
            category INTEGER,
            data_value NUMERIC(5,2),
            n INTEGER,
            standard_error NUMERIC(5,4),
            date VARCHAR(10),
            domain_source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_work_context_onet ON core.career_work_context(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_work_context_element ON core.career_work_context(element_id)",
        
        # Table 4: career_education_pct
        """
        CREATE TABLE IF NOT EXISTS core.career_education_pct (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            element_id VARCHAR(20) NOT NULL,
            element_name VARCHAR(255) NOT NULL,
            category INTEGER NOT NULL,
            category_description VARCHAR(255),
            data_value NUMERIC(5,2),
            n INTEGER,
            standard_error NUMERIC(5,4),
            date VARCHAR(10),
            domain_source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_education_pct_onet ON core.career_education_pct(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_education_pct_category ON core.career_education_pct(category)",
        
        # Table 5: career_prep
        """
        CREATE TABLE IF NOT EXISTS core.career_prep (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL UNIQUE,
            job_zone INTEGER NOT NULL,
            date VARCHAR(10),
            domain_source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_prep_onet ON core.career_prep(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_prep_job_zone ON core.career_prep(job_zone)",
        
        # Table 6: career_wages_us
        """
        CREATE TABLE IF NOT EXISTS core.career_wages_us (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            annual_median NUMERIC(10,2),
            annual_10th_percentile NUMERIC(10,2),
            annual_25th_percentile NUMERIC(10,2),
            annual_75th_percentile NUMERIC(10,2),
            annual_90th_percentile NUMERIC(10,2),
            hourly_median NUMERIC(8,2),
            hourly_10th_percentile NUMERIC(8,2),
            hourly_25th_percentile NUMERIC(8,2),
            hourly_75th_percentile NUMERIC(8,2),
            hourly_90th_percentile NUMERIC(8,2),
            date VARCHAR(10),
            source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_wages_us_onet ON core.career_wages_us(onet_code)",
        
        # Table 7: career_mapping_esco
        """
        CREATE TABLE IF NOT EXISTS core.career_mapping_esco (
            id SERIAL PRIMARY KEY,
            onet_code VARCHAR(10) NOT NULL,
            onet_title VARCHAR(255),
            esco_code VARCHAR(20) NOT NULL,
            esco_title VARCHAR(255),
            isco_code VARCHAR(10),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_onet ON core.career_mapping_esco(onet_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_esco ON core.career_mapping_esco(esco_code)",
        "CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_isco ON core.career_mapping_esco(isco_code)",
    ]
    
    table_names = [
        'career_dwas',
        'career_work_activities',
        'career_work_context',
        'career_education_pct',
        'career_prep',
        'career_wages_us',
        'career_mapping_esco',
    ]
    
    created_tables = []
    
    for i, sql in enumerate(tables_sql):
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
            
            if 'CREATE TABLE' in sql.upper():
                table_name = [t for t in table_names if t in sql][0] if any(t in sql for t in table_names) else 'unknown'
                print(f"  ✅ Created table: {table_name}")
                created_tables.append(table_name)
            elif 'CREATE INDEX' in sql.upper():
                pass  # Silent for indexes
                
        except Exception as e:
            if 'already exists' in str(e).lower():
                if 'CREATE TABLE' in sql.upper():
                    table_name = [t for t in table_names if t in sql][0] if any(t in sql for t in table_names) else 'unknown'
                    print(f"  ⚠️  Table {table_name} already exists")
            else:
                print(f"  ❌ Error: {str(e)[:100]}")
    
    print(f"\n✅ Database setup completed")
    print(f"   Tables created/verified: {len(set(created_tables))}")
    
    return True


def verify_tables():
    """Verify tables exist"""
    print(f"\n{'='*60}")
    print("🔍 VERIFYING TABLES")
    print(f"{'='*60}")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'core' 
                  AND table_name LIKE 'career_%'
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            
            print(f"✅ Found {len(tables)} tables in core schema:")
            for table in tables:
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM core.{table}"))
                count = count_result.scalar()
                print(f"   - {table}: {count:,} rows")
    
    except Exception as e:
        print(f"❌ Verification failed: {e}")


def main():
    """Main entry point"""
    print(f"\nDatabase: {engine.url.database}")
    print(f"Host: {engine.url.host}")
    
    create_tables()
    verify_tables()
    
    print(f"\n{'='*60}")
    print("✅ Ready to run ETL pipeline!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
