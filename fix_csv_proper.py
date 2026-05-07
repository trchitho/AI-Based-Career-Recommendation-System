#!/usr/bin/env python3
import csv
import json
import re

def fix_json_string(json_str):
    """Properly fix JSON string with single quotes to double quotes"""
    if not json_str or json_str.strip() == '':
        return '[]'
    
    try:
        # Replace single quotes with double quotes for JSON
        # But be careful with apostrophes in text content
        fixed = json_str
        
        # Replace single quotes around keys and values
        fixed = re.sub(r"'(\w+)':", r'"\1":', fixed)  # 'key': -> "key":
        fixed = re.sub(r":\s*'([^']*)'", r': "\1"', fixed)  # : 'value' -> : "value"
        
        # Test if it's valid JSON
        json.loads(fixed)
        return fixed
        
    except:
        # If still invalid, return empty array
        return '[]'

def process_csv():
    input_file = 'career_overview.csv'
    output_file = 'career_overview_clean.csv'
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        content = infile.read()
    
    # Split into lines but handle multiline CSV properly
    lines = []
    current_line = ""
    in_quotes = False
    
    for char in content:
        current_line += char
        if char == '"':
            in_quotes = not in_quotes
        elif char == '\n' and not in_quotes:
            lines.append(current_line.strip())
            current_line = ""
    
    if current_line.strip():
        lines.append(current_line.strip())
    
    # Process header
    header = lines[0].split(',')
    print(f"Header columns: {len(header)}")
    print(f"Header: {header}")
    
    # Write clean CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile, quoting=csv.QUOTE_MINIMAL)
        
        # Write header
        writer.writerow(header)
        
        # Process data rows
        for i, line in enumerate(lines[1:], 1):
            try:
                # Parse CSV line properly
                reader = csv.reader([line])
                row = next(reader)
                
                if len(row) != len(header):
                    print(f"Row {i}: Expected {len(header)} columns, got {len(row)}")
                    continue
                
                # Fix JSON columns (salary_bands_en at index 9, salary_bands_vn at index 14)
                if len(row) > 9:
                    row[9] = fix_json_string(row[9])
                if len(row) > 14:
                    row[14] = fix_json_string(row[14])
                
                writer.writerow(row)
                
            except Exception as e:
                print(f"Error processing row {i}: {e}")
                continue
    
    print(f"Clean CSV saved as {output_file}")

if __name__ == "__main__":
    process_csv()