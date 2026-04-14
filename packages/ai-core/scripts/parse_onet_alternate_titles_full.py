#!/usr/bin/env python3
"""
Parse complete ONET Alternate Titles.txt and generate SQL inserts
Session 2: Complete alternate titles data population
"""

from pathlib import Path


def parse_alternate_titles_file():
    """Parse the complete ONET Alternate Titles.txt file"""
    file_path = Path("packages/ai-core/data/raw/onet/Alternate Titles.txt")

    if not file_path.exists():
        print(f"File not found: {file_path}")
        return []

    alternate_titles = []

    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()

    # Skip header line
    for _line_num, line in enumerate(lines[1:], 2):
        line = line.strip()
        if not line:
            continue

        parts = line.split("\t")
        if len(parts) >= 3:
            onet_code = parts[0].strip()
            alternate_title = parts[1].strip()
            short_title = parts[2].strip() if len(parts) > 2 else "n/a"
            source_codes = parts[3].strip() if len(parts) > 3 else ""

            if alternate_title and alternate_title != "n/a":
                # Escape single quotes for SQL
                escaped_title = alternate_title.replace("'", "''")
                escaped_short = short_title.replace("'", "''") if short_title != "n/a" else "n/a"

                alternate_titles.append(
                    {
                        "onet_code": onet_code,
                        "alternate_title": escaped_title,
                        "short_title": escaped_short,
                        "source_codes": source_codes,
                    }
                )

    return alternate_titles


def generate_sql_inserts(alternate_titles):
    """Generate SQL INSERT statements for alternate titles"""
    sql_lines = []
    sql_lines.append("-- Complete ONET Alternate Titles Data")
    sql_lines.append("-- Generated from packages/ai-core/data/raw/onet/Alternate Titles.txt")
    sql_lines.append("")
    sql_lines.append("INSERT INTO core.alternate_titles (onet_code, alternate_title_en, short_title, source_codes) VALUES")

    insert_values = []
    for item in alternate_titles:
        value_line = f"('{item['onet_code']}', '{item['alternate_title']}', '{item['short_title']}', '{item['source_codes']}')"
        insert_values.append(value_line)

    # Join all values with commas
    sql_lines.append(",\n".join(insert_values) + ";")

    return "\n".join(sql_lines)


def generate_careers_update_sql(alternate_titles):
    """Generate SQL to update careers table with alternate_titles_en"""
    # Group by onet_code
    grouped_titles = {}
    for item in alternate_titles:
        onet_code = item["onet_code"]
        if onet_code not in grouped_titles:
            grouped_titles[onet_code] = []
        grouped_titles[onet_code].append(item["alternate_title"])

    sql_lines = []
    sql_lines.append("-- Update careers_new with alternate_titles_en arrays")
    sql_lines.append("")

    for onet_code, titles in grouped_titles.items():
        if len(titles) > 0:
            # Limit to first 10 titles to avoid overly long arrays
            limited_titles = titles[:10]
            titles_array = "ARRAY['" + "', '".join(limited_titles) + "']"

            sql_lines.append("UPDATE core.careers_new")
            sql_lines.append(f"SET alternate_titles_en = {titles_array}")
            sql_lines.append(f"WHERE onet_code = '{onet_code}';")
            sql_lines.append("")

    return "\n".join(sql_lines)


def generate_vietnamese_alternatives():
    """Generate enhanced Vietnamese alternatives based on common patterns"""
    vietnamese_mappings = {
        "11-1011.00": [  # Chief Executives
            "Giám đốc điều hành",
            "Tổng giám đốc",
            "Chủ tịch công ty",
            "Giám đốc tổng quát",
            "Giám đốc điều hành cấp cao",
            "Người điều hành doanh nghiệp",
            "Lãnh đạo cấp cao",
        ],
        "11-1011.03": [  # Chief Sustainability Officers
            "Giám đốc bền vững",
            "Trưởng phòng phát triển bền vững",
            "Chuyên gia bền vững",
            "Giám đốc môi trường",
            "Quản lý phát triển bền vững",
            "Giám đốc xanh",
            "Chuyên viên phát triển bền vững",
        ],
        "11-1021.00": [  # General Managers
            "Tổng giám đốc",
            "Giám đốc điều hành",
            "Quản lý tổng quát",
            "Trưởng phòng tổng hợp",
            "Giám đốc vận hành",
            "Quản lý chung",
        ],
        "11-2011.00": [  # Advertising and Promotions Managers
            "Quản lý quảng cáo",
            "Giám đốc tiếp thị",
            "Trưởng phòng quảng cáo",
            "Chuyên viên quảng cáo",
            "Quản lý khuyến mãi",
        ],
        "11-2021.00": [  # Marketing Managers
            "Quản lý tiếp thị",
            "Giám đốc marketing",
            "Trưởng phòng tiếp thị",
            "Chuyên viên marketing",
            "Quản lý thương hiệu",
        ],
        "11-2022.00": [  # Sales Managers
            "Quản lý bán hàng",
            "Giám đốc kinh doanh",
            "Trưởng phòng bán hàng",
            "Chuyên viên bán hàng",
            "Quản lý khu vực",
        ],
    }

    sql_lines = []
    sql_lines.append("-- Enhanced Vietnamese Alternative Titles")
    sql_lines.append("")

    for onet_code, vi_titles in vietnamese_mappings.items():
        titles_array = "ARRAY['" + "', '".join(vi_titles) + "']"
        sql_lines.append("UPDATE core.careers_new")
        sql_lines.append(f"SET alternative_titles_vi = {titles_array}")
        sql_lines.append(f"WHERE onet_code = '{onet_code}';")
        sql_lines.append("")

    return "\n".join(sql_lines)


def main():
    """Main execution function"""
    print("🚀 Parsing complete ONET Alternate Titles file...")

    # Parse the file
    alternate_titles = parse_alternate_titles_file()
    print(f"✓ Parsed {len(alternate_titles)} alternate title records")

    # Generate SQL files
    print("📝 Generating SQL files...")

    # 1. Generate alternate_titles table inserts
    insert_sql = generate_sql_inserts(alternate_titles)
    with open("packages/ai-core/scripts/insert_alternate_titles_data.sql", "w", encoding="utf-8") as f:
        f.write(insert_sql)

    # 2. Generate careers table updates
    update_sql = generate_careers_update_sql(alternate_titles)
    with open("packages/ai-core/scripts/update_careers_alternate_titles_en.sql", "w", encoding="utf-8") as f:
        f.write(update_sql)

    # 3. Generate Vietnamese alternatives
    vietnamese_sql = generate_vietnamese_alternatives()
    with open("packages/ai-core/scripts/update_careers_alternative_titles_vi.sql", "w", encoding="utf-8") as f:
        f.write(vietnamese_sql)

    print("✅ Generated SQL files:")
    print("   - insert_alternate_titles_data.sql")
    print("   - update_careers_alternate_titles_en.sql")
    print("   - update_careers_alternative_titles_vi.sql")

    # Show statistics
    onet_codes = set(item["onet_code"] for item in alternate_titles)
    print("\n📊 Statistics:")
    print(f"   Total alternate titles: {len(alternate_titles)}")
    print(f"   Unique ONET codes: {len(onet_codes)}")
    print(f"   Average titles per code: {len(alternate_titles) / len(onet_codes):.1f}")


if __name__ == "__main__":
    main()
