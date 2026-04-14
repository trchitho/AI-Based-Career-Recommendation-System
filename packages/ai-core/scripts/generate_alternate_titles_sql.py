#!/usr/bin/env python3
"""
Generate SQL updates for alternate_titles_en from ONET Alternate Titles.txt
"""

import json
from pathlib import Path

def parse_alternate_titles_file():
    """Parse the ONET Alternate Titles.txt file"""
    file_path = Path("packages/ai-core/data/raw/onet/Alternate Titles.txt")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return {}
    
    alternate_titles = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Skip header line
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
            
        parts = line.split('\t')
        if len(parts) >= 3:
            onet_code = parts[0].strip()
            alternate_title = parts[1].strip()
            
            if onet_code not in alternate_titles:
                alternate_titles[onet_code] = []
            
            if alternate_title and alternate_title != 'n/a':
                alternate_titles[onet_code].append(alternate_title)
    
    return alternate_titles

def generate_sql_updates(alternate_titles_data):
    """Generate SQL UPDATE statements"""
    sql_statements = []
    
    for onet_code, titles in alternate_titles_data.items():
        if titles:  # Only if there are alternate titles
            # Escape single quotes in titles
            escaped_titles = [title.replace("'", "''") for title in titles]
            titles_array = "ARRAY['" + "', '".join(escaped_titles) + "']"
            
            sql = f"""UPDATE core.careers_reorganized 
SET alternate_titles_en = {titles_array}
WHERE onet_code = '{onet_code}';"""
            
            sql_statements.append(sql)
    
    return sql_statements

def main():
    """Main execution function"""
    print("📖 Parsing ONET Alternate Titles file...")
    alternate_titles_data = parse_alternate_titles_file()
    print(f"✓ Found alternate titles for {len(alternate_titles_data)} ONET codes")
    
    print("🔄 Generating SQL updates...")
    sql_statements = generate_sql_updates(alternate_titles_data)
    
    # Write to SQL file
    output_file = Path("packages/ai-core/scripts/populate_alternate_titles_en.sql")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Auto-generated SQL to populate alternate_titles_en\n")
        f.write("-- Generated from ONET Alternate Titles.txt\n\n")
        
        for sql in sql_statements:
            f.write(sql + "\n\n")
    
    print(f"✓ Generated {len(sql_statements)} SQL statements")
    print(f"✓ Saved to: {output_file}")

if __name__ == "__main__":
    main()