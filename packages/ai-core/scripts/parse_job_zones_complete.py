#!/usr/bin/env python3
"""
Parse complete ONET Job Zones.txt and generate SQL inserts for career_prep table
Session 3: Complete career preparation data population with bilingual support
"""

from pathlib import Path


def parse_job_zones_file():
    """Parse the complete ONET Job Zones.txt file"""
    file_path = Path("packages/ai-core/data/raw/onet/Job Zones.txt")

    if not file_path.exists():
        print(f"File not found: {file_path}")
        return []

    job_zones = []

    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()

    # Skip header line
    for _line_num, line in enumerate(lines[1:], 2):
        line = line.strip()
        if not line:
            continue

        parts = line.split("\t")
        if len(parts) >= 4:
            onet_code = parts[0].strip()
            job_zone = int(parts[1].strip())
            date = parts[2].strip()
            domain_source = parts[3].strip()

            job_zones.append({"onet_code": onet_code, "job_zone": job_zone, "date": date, "domain_source": domain_source})

    return job_zones


def get_education_mapping(job_zone):
    """Get education requirements based on job zone"""
    mappings = {
        1: {"en": "High school diploma or less", "vi": "Tốt nghiệp THPT hoặc thấp hơn"},
        2: {"en": "High school diploma plus training", "vi": "Tốt nghiệp THPT cộng với đào tạo"},
        3: {"en": "Associates degree or equivalent", "vi": "Cao đẳng hoặc tương đương"},
        4: {"en": "Bachelors degree", "vi": "Đại học (Cử nhân)"},
        5: {"en": "Masters degree or higher", "vi": "Thạc sĩ hoặc cao hơn"},
    }
    return mappings.get(job_zone, mappings[4])


def get_experience_mapping(job_zone):
    """Get experience requirements based on job zone"""
    mappings = {
        1: {
            "en": "Little or no previous work-related skill, knowledge, or experience",
            "vi": "Ít hoặc không có kỹ năng, kiến thức hoặc kinh nghiệm làm việc trước đó",
        },
        2: {
            "en": "Some previous work-related skill, knowledge, or experience",
            "vi": "Một số kỹ năng, kiến thức hoặc kinh nghiệm làm việc trước đó",
        },
        3: {
            "en": "Previous work-related skill, knowledge, or experience required",
            "vi": "Yêu cầu kỹ năng, kiến thức hoặc kinh nghiệm làm việc trước đó",
        },
        4: {"en": "Considerable preparation needed", "vi": "Cần chuẩn bị đáng kể"},
        5: {"en": "Extensive preparation needed", "vi": "Cần chuẩn bị rộng rãi"},
    }
    return mappings.get(job_zone, mappings[4])


def get_domain_source_vi(domain_source):
    """Get Vietnamese translation for domain source"""
    mappings = {
        "Analyst": "Chuyên gia phân tích",
        "Analyst - Preliminary": "Chuyên gia phân tích sơ bộ",
        "Occupational Expert": "Chuyên gia nghề nghiệp",
        "Incumbent": "Người đang làm việc",
    }
    return mappings.get(domain_source, "Chuyên gia phân tích")


def generate_sql_inserts(job_zones):
    """Generate SQL INSERT statements for career_prep_enhanced"""
    sql_lines = []
    sql_lines.append("-- Complete ONET Job Zones Data for career_prep_enhanced")
    sql_lines.append("-- Generated from packages/ai-core/data/raw/onet/Job Zones.txt")
    sql_lines.append("")
    sql_lines.append("INSERT INTO core.career_prep_enhanced (")
    sql_lines.append("    id, onet_code, job_zone, date, domain_source, domain_source_vi,")
    sql_lines.append("    education_summary_en, education_summary_vi,")
    sql_lines.append("    experience_summary_en, experience_summary_vi")
    sql_lines.append(") VALUES")

    insert_values = []
    for i, item in enumerate(job_zones, 1):
        education = get_education_mapping(item["job_zone"])
        experience = get_experience_mapping(item["job_zone"])
        domain_source_vi = get_domain_source_vi(item["domain_source"])

        # Escape single quotes
        edu_en = education["en"].replace("'", "''")
        edu_vi = education["vi"].replace("'", "''")
        exp_en = experience["en"].replace("'", "''")
        exp_vi = experience["vi"].replace("'", "''")
        domain_vi = domain_source_vi.replace("'", "''")

        value_line = f"({i}, '{item['onet_code']}', {item['job_zone']}, '{item['date']}', '{item['domain_source']}', '{domain_vi}', '{edu_en}', '{edu_vi}', '{exp_en}', '{exp_vi}')"
        insert_values.append(value_line)

    # Join all values with commas
    sql_lines.append(",\n".join(insert_values) + ";")
    sql_lines.append("")
    sql_lines.append("-- Reset sequence to match data")
    sql_lines.append("SELECT setval('core.career_prep_enhanced_id_seq', (SELECT MAX(id) FROM core.career_prep_enhanced));")

    return "\n".join(sql_lines)


def generate_statistics_report(job_zones):
    """Generate statistics about the job zones data"""
    zone_counts = {}
    for item in job_zones:
        zone = item["job_zone"]
        zone_counts[zone] = zone_counts.get(zone, 0) + 1

    report_lines = []
    report_lines.append("-- Job Zones Statistics Report")
    report_lines.append("")

    total = len(job_zones)
    report_lines.append(f"-- Total careers: {total}")

    for zone in sorted(zone_counts.keys()):
        count = zone_counts[zone]
        percentage = (count / total) * 100
        education = get_education_mapping(zone)
        report_lines.append(f"-- Job Zone {zone}: {count} careers ({percentage:.1f}%) - {education['vi']}")

    return "\n".join(report_lines)


def main():
    """Main execution function"""
    print("🚀 Parsing complete ONET Job Zones file...")

    # Parse the file
    job_zones = parse_job_zones_file()
    print(f"✓ Parsed {len(job_zones)} job zone records")

    # Generate SQL files
    print("📝 Generating SQL files...")

    # 1. Generate complete data inserts
    insert_sql = generate_sql_inserts(job_zones)
    with open("packages/ai-core/scripts/populate_complete_career_prep_data.sql", "w", encoding="utf-8") as f:
        f.write(insert_sql)

    # 2. Generate statistics report
    stats_report = generate_statistics_report(job_zones)
    with open("packages/ai-core/scripts/career_prep_statistics.sql", "w", encoding="utf-8") as f:
        f.write(stats_report)

    print("✅ Generated SQL files:")
    print("   - populate_complete_career_prep_data.sql")
    print("   - career_prep_statistics.sql")

    # Show statistics
    zone_counts = {}
    for item in job_zones:
        zone = item["job_zone"]
        zone_counts[zone] = zone_counts.get(zone, 0) + 1

    print("\n📊 Job Zones Distribution:")
    total = len(job_zones)
    for zone in sorted(zone_counts.keys()):
        count = zone_counts[zone]
        percentage = (count / total) * 100
        education = get_education_mapping(zone)
        print(f"   Zone {zone}: {count:3d} careers ({percentage:4.1f}%) - {education['vi']}")

    print(f"\n✓ Total: {total} career preparation records")


if __name__ == "__main__":
    main()
