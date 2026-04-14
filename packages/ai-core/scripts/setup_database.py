#!/usr/bin/env python3
"""
Script: setup_database.py
Purpose: Create database tables for ETL pipeline
Author: Senior Data Engineer
Date: 2026-01-27
"""

import sys
from pathlib import Path

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from sqlalchemy import text

from ai_core.db import engine


def create_tables():
    """Execute SQL script to create tables"""
    print("\n" + "=" * 60)
    print("🔧 DATABASE SETUP")
    print("=" * 60)

    sql_file = Path(__file__).parent / "create_tables.sql"

    if not sql_file.exists():
        print(f"❌ SQL file not found: {sql_file}")
        return False

    try:
        # Read SQL file
        with open(sql_file, encoding="utf-8") as f:
            sql_content = f.read()

        # Remove comments (lines starting with --)
        lines = sql_content.split("\n")
        cleaned_lines = []
        for line in lines:
            # Skip comment lines
            if line.strip().startswith("--"):
                continue
            cleaned_lines.append(line)

        cleaned_sql = "\n".join(cleaned_lines)

        # Split by semicolon to get individual statements
        statements = [s.strip() for s in cleaned_sql.split(";") if s.strip()]

        print(f"📄 Loaded SQL file: {sql_file.name}")
        print(f"📊 Found {len(statements)} SQL statements")

        # Execute each statement with autocommit
        for _i, statement in enumerate(statements, 1):
            # Skip empty statements
            if len(statement) < 10:
                continue

            try:
                with engine.connect() as conn:
                    conn.execute(text(statement))
                    conn.commit()

                # Extract table name for logging
                if "CREATE TABLE" in statement.upper():
                    table_name = statement.split("core.")[1].split("(")[0].strip() if "core." in statement else "unknown"
                    print(f"  ✅ Created table: {table_name}")
                elif "CREATE INDEX" in statement.upper():
                    idx_name = statement.split("idx_")[1].split(" ")[0] if "idx_" in statement else "index"
                    print(f"  ✅ Created index: idx_{idx_name}")
                elif "COMMENT ON TABLE" in statement.upper():
                    print("  ✅ Added table comment")

            except Exception as e:
                # Ignore "already exists" errors
                if "already exists" in str(e).lower():
                    if "CREATE TABLE" in statement.upper():
                        table_name = statement.split("core.")[1].split("(")[0].strip() if "core." in statement else "unknown"
                        print(f"  ⚠️  Table {table_name} already exists (skipped)")
                    else:
                        print("  ⚠️  Object already exists (skipped)")
                else:
                    print(f"  ❌ Error: {str(e)[:100]}")

        print("\n✅ Database setup completed")

        # Verify tables
        verify_tables()

        return True

    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False


def verify_tables():
    """Verify that tables were created"""
    print(f"\n{'=' * 60}")
    print("🔍 VERIFYING TABLES")
    print(f"{'=' * 60}")

    try:
        with engine.connect() as conn:
            # Check for tables in core schema
            result = conn.execute(
                text(
                    """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'core' 
                  AND table_name LIKE 'career_%'
                ORDER BY table_name
            """
                )
            )

            tables = [row[0] for row in result]

            if tables:
                print(f"✅ Found {len(tables)} tables in core schema:")
                for table in tables:
                    # Get row count
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM core.{table}"))
                    count = count_result.scalar()
                    print(f"   - {table}: {count:,} rows")
            else:
                print("⚠️  No tables found in core schema")

    except Exception as e:
        print(f"❌ Verification failed: {e}")


def main():
    """Main entry point"""
    print(f"\nDatabase: {engine.url.database}")
    print(f"Host: {engine.url.host}")

    success = create_tables()

    if success:
        print(f"\n{'=' * 60}")
        print("✅ Setup complete! Ready to run ETL pipeline.")
        print(f"{'=' * 60}\n")
    else:
        print(f"\n{'=' * 60}")
        print("❌ Setup failed. Please check errors above.")
        print(f"{'=' * 60}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
