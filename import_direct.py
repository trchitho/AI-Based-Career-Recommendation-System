#!/usr/bin/env python3
import pandas as pd
import psycopg2
import json
from psycopg2.extras import execute_values

def fix_json_column(json_str):
    """Fix JSON string with single quotes"""
    if not json_str or json_str.strip() == '':
        return []
    
    try:
        # Replace single quotes with double quotes for JSON
        fixed = json_str.replace("'", '"')
        return json.loads(fixed)
    except:
        return []

def import_csv_to_db():
    # Database connection
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="career_ai",
        user="postgres",
        password="123456"
    )
    
    try:
        # Read CSV with proper handling
        df = pd.read_csv('career_overview.csv', dtype=str)  # Read all as strings first
        print(f"Loaded {len(df)} rows from CSV")
        print(f"Columns: {list(df.columns)}")
        
        # Show first few rows to debug
        print("\nFirst row data:")
        for col in df.columns:
            print(f"{col}: {df.iloc[0][col]}")
        
        # Prepare data for insertion
        data_to_insert = []
        
        for idx, row in df.iterrows():
            try:
                # Skip rows with invalid career_id
                career_id_str = str(row['career_id']).strip()
                if not career_id_str.isdigit():
                    print(f"Skipping row {idx}: invalid career_id '{career_id_str}'")
                    continue
                
                career_id = int(career_id_str)
                
                # Fix JSON columns
                salary_bands_en = fix_json_column(row['salary_bands_en'])
                salary_bands_vn = fix_json_column(row['salary_bands'])  # Note: CSV uses 'salary_bands' for VN
                
                # Handle numeric fields safely
                def safe_float(val):
                    try:
                        if pd.isna(val) or val == '' or val == 'nan':
                            return None
                        return float(val)
                    except:
                        return None
                
                # Map CSV columns to DB columns
                record = (
                    career_id,
                    row['experience_text'],      # -> experience_text_en
                    row['experience_text_vi'],   # -> experience_text_vn
                    row['degree_text'],          # -> degree_text_en
                    row['degree_text_vi'],       # -> degree_text_vn
                    safe_float(row['salary_min_en']),
                    safe_float(row['salary_min']),  # -> salary_min_vn
                    safe_float(row['salary_max_en']),
                    safe_float(row['salary_max']),  # -> salary_max_vn
                    safe_float(row['salary_avg_en']),
                    safe_float(row['salary_avg']),  # -> salary_avg_vn
                    row['salary_currency_en'],
                    row['salary_currency'],      # -> salary_currency_vn
                    json.dumps(salary_bands_en),
                    json.dumps(salary_bands_vn),
                    row['updated_at']
                )
                data_to_insert.append(record)
                
            except Exception as e:
                print(f"Error processing row {idx}: {e}")
                continue
        
        print(f"\nPrepared {len(data_to_insert)} valid records for insertion")
        
        if len(data_to_insert) == 0:
            print("No valid data to insert!")
            return
        
        # Insert data
        cur = conn.cursor()
        
        insert_query = """
        INSERT INTO core.career_overview (
            career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn,
            salary_min_en, salary_min_vn, salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
            salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn, updated_at
        ) VALUES %s
        """
        
        execute_values(
            cur, insert_query, data_to_insert,
            template=None, page_size=100
        )
        
        conn.commit()
        print(f"Successfully inserted {len(data_to_insert)} records")
        
        # Verify insertion
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        count = cur.fetchone()[0]
        print(f"Total records in table: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import_csv_to_db()