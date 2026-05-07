#!/usr/bin/env python3
import psycopg2
import json

def import_simple_data():
    # Sample data to test import
    sample_data = [
        (1, "Extensive skill needed", "Cần kỹ năng sâu rộng", "Master's degree", "Bằng thạc sĩ", 
         60000.00, 1440000000.00, 120000.00, 2880000000.00, 90000.00, 2160000000.00,
         "USD", "VND", '[]', '[]', "2026-01-27 15:44:54.424881+00"),
        (2, "Some experience needed", "Cần một số kinh nghiệm", "Bachelor's degree", "Bằng cử nhân",
         50000.00, 1200000000.00, 100000.00, 2400000000.00, 75000.00, 1800000000.00,
         "USD", "VND", '[]', '[]', "2026-01-27 15:44:54.424881+00")
    ]
    
    # Database connection
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="career_ai",
        user="postgres",
        password="123456"
    )
    
    try:
        cur = conn.cursor()
        
        # Insert sample data
        insert_query = """
        INSERT INTO core.career_overview (
            career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn,
            salary_min_en, salary_min_vn, salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
            salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        for record in sample_data:
            cur.execute(insert_query, record)
        
        conn.commit()
        print(f"Successfully inserted {len(sample_data)} sample records")
        
        # Verify insertion
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        count = cur.fetchone()[0]
        print(f"Total records in table: {count}")
        
        # Show sample data
        cur.execute("SELECT career_id, experience_text_en, salary_min_en, salary_max_en FROM core.career_overview LIMIT 3")
        rows = cur.fetchall()
        print("\nSample data:")
        for row in rows:
            print(f"Career ID: {row[0]}, Experience: {row[1][:50]}..., Salary: ${row[2]}-${row[3]}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import_simple_data()