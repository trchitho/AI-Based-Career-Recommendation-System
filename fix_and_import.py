#!/usr/bin/env python3
import psycopg2
import json
import re

def fix_json_format(json_str):
    """Fix JSON format from '"key'": value to "key": value"""
    if not json_str or json_str.strip() == '':
        return '[]'
    
    try:
        # Fix the malformed JSON format
        # Replace '"key'": with "key":
        fixed = re.sub(r"'\"(\w+)'\":", r'"\1":', json_str)
        # Replace ': '"value'"' with ': "value"'
        fixed = re.sub(r":\s*'\"([^'\"]*)'\"", r': "\1"', fixed)
        # Replace remaining single quotes around values
        fixed = re.sub(r":\s*'([^']*)'", r': "\1"', fixed)
        
        # Test if it's valid JSON
        parsed = json.loads(fixed)
        return json.dumps(parsed)  # Return properly formatted JSON
        
    except Exception as e:
        print(f"JSON fix error: {e} for: {json_str[:100]}...")
        return '[]'

def import_csv_data():
    # Database connection
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="career_ai",
        user="postgres",
        password="123456"
    )
    
    try:
        # Clear existing data first
        cur = conn.cursor()
        cur.execute("DELETE FROM core.career_overview")
        print("Cleared existing data")
        
        # Read and process CSV line by line
        with open('career_overview.csv', 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        header = lines[0].strip()
        print(f"Header: {header}")
        
        successful_imports = 0
        failed_imports = 0
        
        for i, line in enumerate(lines[1:], 1):
            try:
                # Parse CSV line manually due to complex JSON content
                line = line.strip()
                if not line:
                    continue
                
                # Split by comma but be careful with JSON content
                parts = []
                current_part = ""
                in_quotes = False
                bracket_count = 0
                
                for char in line:
                    if char == '"' and (not current_part or current_part[-1] != '\\'):
                        in_quotes = not in_quotes
                    elif char == '[' and in_quotes:
                        bracket_count += 1
                    elif char == ']' and in_quotes:
                        bracket_count -= 1
                    elif char == ',' and not in_quotes and bracket_count == 0:
                        parts.append(current_part.strip())
                        current_part = ""
                        continue
                    
                    current_part += char
                
                if current_part:
                    parts.append(current_part.strip())
                
                if len(parts) != 16:
                    print(f"Row {i}: Expected 16 parts, got {len(parts)}")
                    failed_imports += 1
                    continue
                
                # Clean and convert data
                career_id = int(parts[0])
                experience_text_en = parts[1].strip('"')
                experience_text_vn = parts[2].strip('"')
                degree_text_en = parts[3].strip('"')
                degree_text_vn = parts[4].strip('"')
                
                # Handle numeric fields
                def safe_float(val):
                    try:
                        return float(val) if val and val != 'nan' else None
                    except:
                        return None
                
                salary_min_en = safe_float(parts[5])
                salary_max_en = safe_float(parts[6])
                salary_avg_en = safe_float(parts[7])
                salary_currency_en = parts[8].strip('"')
                
                # Fix JSON fields
                salary_bands_en = fix_json_format(parts[9].strip('"'))
                
                salary_min_vn = safe_float(parts[10])
                salary_max_vn = safe_float(parts[11])
                salary_avg_vn = safe_float(parts[12])
                salary_currency_vn = parts[13].strip('"')
                
                salary_bands_vn = fix_json_format(parts[14].strip('"'))
                updated_at = parts[15].strip('"')
                
                # Insert into database
                insert_query = """
                INSERT INTO core.career_overview (
                    career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn,
                    salary_min_en, salary_min_vn, salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
                    salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                cur.execute(insert_query, (
                    career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn,
                    salary_min_en, salary_min_vn, salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
                    salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn, updated_at
                ))
                
                successful_imports += 1
                
                if successful_imports % 100 == 0:
                    print(f"Processed {successful_imports} records...")
                
            except Exception as e:
                print(f"Error processing row {i}: {e}")
                failed_imports += 1
                continue
        
        conn.commit()
        print(f"\nImport completed!")
        print(f"Successful: {successful_imports}")
        print(f"Failed: {failed_imports}")
        
        # Verify final count
        cur.execute("SELECT COUNT(*) FROM core.career_overview")
        count = cur.fetchone()[0]
        print(f"Total records in database: {count}")
        
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import_csv_data()