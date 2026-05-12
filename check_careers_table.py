#!/usr/bin/env python3
"""Check careers table structure"""

import psycopg2

try:
    conn = psycopg2.connect(host='localhost', port='5433', database='career_ai', user='postgres', password='123456')
    cursor = conn.cursor()
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'careers' AND table_schema = 'core' ORDER BY ordinal_position")
    columns = cursor.fetchall()
    print('Careers table columns:')
    for col in columns:
        print(f'  {col[0]}: {col[1]}')
    
    # Check some sample data
    cursor.execute("SELECT id, name, industry_category, onet_code FROM core.careers LIMIT 3")
    sample_data = cursor.fetchall()
    print('\nSample data:')
    for row in sample_data:
        print(f'  ID: {row[0]}, Name: {row[1]}, Industry: {row[2]}, O*NET: {row[3]}')
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
