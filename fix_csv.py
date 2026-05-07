#!/usr/bin/env python3
import csv
import json
import re

def fix_json_quotes(json_str):
    """Convert single quotes to double quotes in JSON string"""
    if not json_str or json_str.strip() == '':
        return '[]'
    
    # Replace single quotes with double quotes, but be careful with apostrophes in text
    # This is a simple approach - for production, use a proper JSON parser
    fixed = json_str.replace("'", '"')
    return fixed

def fix_csv_file():
    input_file = 'career_overview.csv'
    output_file = 'career_overview_fixed.csv'
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile, quoting=csv.QUOTE_MINIMAL)
        
        # Write header
        header = next(reader)
        writer.writerow(header)
        
        # Process each row
        for row_num, row in enumerate(reader, start=2):
            try:
                # Fix JSON columns (salary_bands_en and salary_bands_vn)
                if len(row) >= 10:  # salary_bands_en is column 9 (0-indexed)
                    row[9] = fix_json_quotes(row[9])
                if len(row) >= 15:  # salary_bands_vn is column 14 (0-indexed)  
                    row[14] = fix_json_quotes(row[14])
                
                writer.writerow(row)
                
            except Exception as e:
                print(f"Error processing row {row_num}: {e}")
                print(f"Row content: {row}")
                continue
    
    print(f"Fixed CSV saved as {output_file}")

if __name__ == "__main__":
    fix_csv_file()