#!/usr/bin/env python3
"""
Script thêm cột _en cho salary và sắp xếp lại thứ tự cột logic
"""

import json
import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv("./apps/backend/.env")

# Database connection
database_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(database_url)


def add_english_salary_columns():
    """
    Thêm 5 cột _en cho salary
    """
    cur = conn.cursor()

    print("🔧 Adding English salary columns...")

    # Add English salary columns
    columns_to_add = [
        ("salary_min_en", "NUMERIC(12,2)", "Minimum salary in USD"),
        ("salary_max_en", "NUMERIC(12,2)", "Maximum salary in USD"),
        ("salary_avg_en", "NUMERIC(12,2)", "Average salary in USD"),
        ("salary_currency_en", "TEXT DEFAULT 'USD'", "Salary currency for English (USD)"),
        ("salary_bands_en", "JSONB DEFAULT '[]'::jsonb", "Salary bands in USD"),
    ]

    for column_name, column_type, comment in columns_to_add:
        try:
            # Check if column exists
            cur.execute(
                """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'core' 
                AND table_name = 'career_overview' 
                AND column_name = %s;
            """,
                (column_name,),
            )

            if not cur.fetchone():
                # Add column
                cur.execute(f"ALTER TABLE core.career_overview ADD COLUMN {column_name} {column_type};")

                # Add comment
                cur.execute(f"COMMENT ON COLUMN core.career_overview.{column_name} IS %s;", (comment,))

                print(f"✅ Added column: {column_name}")
            else:
                print(f"⚠️ Column {column_name} already exists")

        except Exception as e:
            print(f"❌ Error adding column {column_name}: {e}")

    conn.commit()
    cur.close()


def convert_vnd_to_usd():
    """
    Quy đổi VND sang USD và populate dữ liệu cho cột _en
    """
    cur = conn.cursor()

    print("💱 Converting VND to USD and populating English columns...")

    # Exchange rate: 1 USD = 24,000 VND
    exchange_rate = 24000

    # Get all records
    cur.execute(
        """
        SELECT id, salary_min, salary_max, salary_avg, salary_bands
        FROM core.career_overview
        ORDER BY id;
    """
    )

    records = cur.fetchall()
    print(f"📝 Found {len(records)} records to convert")

    converted_count = 0
    for record_id, salary_min_vnd, salary_max_vnd, salary_avg_vnd, salary_bands_vnd in records:
        # Convert VND to USD
        salary_min_usd = round(salary_min_vnd / exchange_rate, 2) if salary_min_vnd else None
        salary_max_usd = round(salary_max_vnd / exchange_rate, 2) if salary_max_vnd else None
        salary_avg_usd = round(salary_avg_vnd / exchange_rate, 2) if salary_avg_vnd else None

        # Convert salary bands to USD
        salary_bands_usd = []
        if salary_bands_vnd:
            try:
                bands_data = json.loads(salary_bands_vnd) if isinstance(salary_bands_vnd, str) else salary_bands_vnd
                for band in bands_data:
                    usd_band = {
                        "min": round(band["min"] / exchange_rate, 2),
                        "max": round(band["max"] / exchange_rate, 2),
                        "label": band["label"].replace("Cấp ", "").replace("cấp ", ""),
                    }
                    # Translate labels to English
                    label_translations = {
                        "thực tập sinh": "Intern Level",
                        "nhân viên": "Associate Level",
                        "quản lý": "Manager Level",
                        "quản lý cao cấp": "Senior Manager Level",
                        "điều hành": "Executive Level",
                        "mới vào nghề": "Entry Level",
                        "trung cấp": "Mid Level",
                        "cao cấp": "Senior Level",
                        "giám đốc": "Director Level",
                    }

                    for vi_label, en_label in label_translations.items():
                        if vi_label in usd_band["label"].lower():
                            usd_band["label"] = en_label
                            break

                    salary_bands_usd.append(usd_band)

                salary_bands_usd = json.dumps(salary_bands_usd, ensure_ascii=False)
            except Exception:
                salary_bands_usd = "[]"
        else:
            salary_bands_usd = "[]"

        # Update record with USD values
        cur.execute(
            """
            UPDATE core.career_overview 
            SET 
                salary_min_en = %s,
                salary_max_en = %s,
                salary_avg_en = %s,
                salary_currency_en = 'USD',
                salary_bands_en = %s
            WHERE id = %s;
        """,
            (salary_min_usd, salary_max_usd, salary_avg_usd, salary_bands_usd, record_id),
        )

        if cur.rowcount > 0:
            converted_count += 1

    conn.commit()
    print(f"✅ Converted {converted_count} records to USD")

    cur.close()


def restructure_table_columns():
    """
    Sắp xếp lại thứ tự cột logic bằng cách tạo bảng mới
    """
    cur = conn.cursor()

    print("🔄 Restructuring table with logical column order...")

    # Create new table with logical column order
    cur.execute(
        """
        CREATE TABLE core.career_overview_new (
            id bigint NOT NULL DEFAULT nextval('core.career_overview_id_seq'::regclass),
            career_id bigint NOT NULL,
            experience_text text,
            experience_text_vi text,
            degree_text text,
            degree_text_vi text,
            salary_min_en numeric(12,2),
            salary_max_en numeric(12,2),
            salary_avg_en numeric(12,2),
            salary_currency_en text DEFAULT 'USD',
            salary_bands_en jsonb DEFAULT '[]'::jsonb,
            salary_min numeric(12,2),
            salary_max numeric(12,2),
            salary_avg numeric(12,2),
            salary_currency text DEFAULT 'VND',
            salary_bands jsonb DEFAULT '[]'::jsonb,
            updated_at timestamp with time zone DEFAULT now(),
            CONSTRAINT career_overview_new_pkey PRIMARY KEY (id),
            CONSTRAINT ux_career_overview_new_career UNIQUE (career_id)
        );
    """
    )

    # Copy data to new table
    cur.execute(
        """
        INSERT INTO core.career_overview_new (
            id, career_id, experience_text, experience_text_vi, degree_text, degree_text_vi,
            salary_min_en, salary_max_en, salary_avg_en, salary_currency_en, salary_bands_en,
            salary_min, salary_max, salary_avg, salary_currency, salary_bands, updated_at
        )
        SELECT 
            id, career_id, experience_text, experience_text_vi, degree_text, degree_text_vi,
            salary_min_en, salary_max_en, salary_avg_en, salary_currency_en, salary_bands_en,
            salary_min, salary_max, salary_avg, salary_currency, salary_bands, updated_at
        FROM core.career_overview
        ORDER BY id;
    """
    )

    # Drop old table and rename new one
    cur.execute("DROP TABLE core.career_overview CASCADE;")
    cur.execute("ALTER TABLE core.career_overview_new RENAME TO career_overview;")

    # Recreate foreign key constraint
    cur.execute(
        """
        ALTER TABLE core.career_overview 
        ADD CONSTRAINT career_overview_career_id_fkey 
        FOREIGN KEY (career_id) REFERENCES core.careers (id) 
        MATCH SIMPLE ON UPDATE NO ACTION ON DELETE CASCADE;
    """
    )

    # Recreate index
    cur.execute(
        """
        CREATE INDEX idx_career_overview_career 
        ON core.career_overview USING btree(career_id);
    """
    )

    # Add comments
    comments = [
        ("experience_text_vi", "Experience requirements in Vietnamese"),
        ("degree_text_vi", "Degree requirements in Vietnamese"),
        ("salary_min_en", "Minimum salary in USD"),
        ("salary_max_en", "Maximum salary in USD"),
        ("salary_avg_en", "Average salary in USD"),
        ("salary_currency_en", "Salary currency for English (USD)"),
        ("salary_bands_en", "Salary bands in USD"),
    ]

    for column_name, comment in comments:
        cur.execute(f"COMMENT ON COLUMN core.career_overview.{column_name} IS %s;", (comment,))

    conn.commit()
    print("✅ Table restructured with logical column order")

    cur.close()


def verify_restructure():
    """
    Kiểm tra kết quả restructure
    """
    cur = conn.cursor()

    print("🔍 Verifying restructure results...")

    # Check record count and ID sequence
    cur.execute("SELECT MIN(id), MAX(id), COUNT(*) FROM core.career_overview;")
    min_id, max_id, total_count = cur.fetchone()

    print("📊 Table verification:")
    print(f"   Total records: {total_count:,}")
    print(f"   ID range: {min_id} - {max_id}")

    # Check column order
    cur.execute(
        """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'career_overview'
        ORDER BY ordinal_position;
    """
    )

    columns = cur.fetchall()
    print(f"   Column order: {', '.join([col[0] for col in columns])}")

    # Show sample data
    cur.execute(
        """
        SELECT 
            id, career_id,
            LEFT(experience_text, 30) as exp_en,
            LEFT(experience_text_vi, 30) as exp_vi,
            salary_min_en, salary_max_en,
            salary_min, salary_max
        FROM core.career_overview
        ORDER BY id
        LIMIT 3;
    """
    )

    print("\n📝 Sample data:")
    for record in cur.fetchall():
        print(f"   ID {record[0]}: Career {record[1]}")
        print(f"   Experience EN: {record[2]}...")
        print(f"   Experience VI: {record[3]}...")
        print(f"   Salary EN: ${record[4]:,.0f} - ${record[5]:,.0f}")
        print(f"   Salary VN: {record[6]:,.0f} - {record[7]:,.0f} VND")
        print()

    cur.close()


def main():
    print("🔧 RESTRUCTURING CAREER_OVERVIEW WITH ENGLISH SALARY COLUMNS")
    print("=" * 70)

    try:
        # 1. Add English salary columns
        add_english_salary_columns()

        # 2. Convert VND to USD
        convert_vnd_to_usd()

        # 3. Restructure table with logical column order
        restructure_table_columns()

        # 4. Verify results
        verify_restructure()

        print("\n🎉 Career overview restructure completed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
