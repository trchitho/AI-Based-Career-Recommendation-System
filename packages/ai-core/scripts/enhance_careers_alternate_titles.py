#!/usr/bin/env python3
"""
Script thêm cột alternative_titles_en và bổ sung dữ liệu từ O*NET Alternate Titles
"""

import csv
import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv("./apps/backend/.env")

# Database connection
database_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(database_url)


def parse_onet_alternate_titles():
    """
    Parse file O*NET Alternate Titles.txt
    """
    print("📖 Parsing O*NET Alternate Titles file...")

    alternate_titles = {}

    try:
        with open("packages/ai-core/data/raw/onet/Alternate Titles.txt", encoding="utf-8") as file:
            reader = csv.DictReader(file, delimiter="\t")

            for row in reader:
                onet_code = row["O*NET-SOC Code"]
                alternate_title = row["Alternate Title"]

                if onet_code not in alternate_titles:
                    alternate_titles[onet_code] = []

                if alternate_title and alternate_title.strip():
                    alternate_titles[onet_code].append(alternate_title.strip())

        print(f"✅ Parsed {len(alternate_titles)} O*NET codes with alternate titles")

        # Show sample
        sample_codes = list(alternate_titles.keys())[:3]
        for code in sample_codes:
            print(f"   {code}: {len(alternate_titles[code])} titles")

        return alternate_titles

    except Exception as e:
        print(f"❌ Error parsing file: {e}")
        return {}


def add_alternate_titles_en_column():
    """
    Thêm cột alternative_titles_en
    """
    cur = conn.cursor()

    print("🔧 Adding alternative_titles_en column...")

    try:
        # Check if column exists
        cur.execute(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'careers' 
            AND column_name = 'alternative_titles_en';
        """
        )

        if not cur.fetchone():
            # Add column
            cur.execute("ALTER TABLE core.careers ADD COLUMN alternative_titles_en TEXT[];")

            # Add comment
            cur.execute("COMMENT ON COLUMN core.careers.alternative_titles_en IS 'Alternative career titles in English (array)';")

            print("✅ Added alternative_titles_en column")
        else:
            print("⚠️ Column alternative_titles_en already exists")

    except Exception as e:
        print(f"❌ Error adding column: {e}")

    conn.commit()
    cur.close()


def populate_alternate_titles(onet_alternate_titles):
    """
    Populate dữ liệu alternate titles từ O*NET
    """
    cur = conn.cursor()

    print("📝 Populating alternate titles from O*NET data...")

    # Get all careers
    cur.execute("SELECT id, onet_code, title_en FROM core.careers ORDER BY id;")
    careers = cur.fetchall()

    updated_en_count = 0
    updated_vi_count = 0

    for career_id, onet_code, _title_en in careers:
        # Get English alternate titles from O*NET
        en_titles = onet_alternate_titles.get(onet_code, [])

        # Limit to 8 titles to avoid too long arrays
        en_titles = en_titles[:8]

        # Generate Vietnamese translations for alternate titles
        vi_titles = []
        for en_title in en_titles:
            # Simple translation patterns
            vi_title = en_title

            # Common translations
            translations = {
                "Chief Executive Officer": "Giám đốc điều hành",
                "CEO": "Tổng giám đốc",
                "President": "Chủ tịch",
                "Director": "Giám đốc",
                "Manager": "Quản lý",
                "Officer": "Cán bộ",
                "Executive": "Điều hành viên",
                "Administrator": "Quản trị viên",
                "Coordinator": "Điều phối viên",
                "Supervisor": "Giám sát viên",
                "Specialist": "Chuyên gia",
                "Analyst": "Nhà phân tích",
                "Consultant": "Tư vấn viên",
                "Engineer": "Kỹ sư",
                "Technician": "Kỹ thuật viên",
                "Assistant": "Trợ lý",
                "Associate": "Cộng tác viên",
                "Representative": "Đại diện",
                "Agent": "Đại lý",
                "Clerk": "Nhân viên văn phòng",
            }

            # Apply translations
            for en_word, vi_word in translations.items():
                if en_word in vi_title:
                    vi_title = vi_title.replace(en_word, vi_word)

            vi_titles.append(vi_title)

        # Update English titles
        if en_titles:
            cur.execute(
                """
                UPDATE core.careers 
                SET alternative_titles_en = %s
                WHERE id = %s;
            """,
                (en_titles, career_id),
            )
            updated_en_count += 1

        # Update Vietnamese titles (enhance existing or create new)
        if vi_titles:
            cur.execute(
                """
                UPDATE core.careers 
                SET alternative_titles_vi = %s
                WHERE id = %s;
            """,
                (vi_titles, career_id),
            )
            updated_vi_count += 1

    conn.commit()

    print(f"✅ Updated {updated_en_count} careers with English alternate titles")
    print(f"✅ Updated {updated_vi_count} careers with Vietnamese alternate titles")

    cur.close()


def restructure_careers_table():
    """
    Sắp xếp lại thứ tự cột logic
    """
    cur = conn.cursor()

    print("🔄 Restructuring careers table with logical column order...")

    # Create new table with logical column order
    cur.execute(
        """
        CREATE TABLE core.careers_new (
            id bigint NOT NULL DEFAULT nextval('core.careers_fixed_id_seq'::regclass),
            slug text NOT NULL,
            onet_code text,
            title_en text,
            title_vi text,
            alternative_titles_en text[],
            alternative_titles_vi text[],
            short_desc_en text,
            description_vi text,
            industry_category character varying(100),
            source character varying(50) DEFAULT 'manual',
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            CONSTRAINT careers_new_pkey PRIMARY KEY (id),
            CONSTRAINT careers_new_onet_code_key UNIQUE (onet_code),
            CONSTRAINT careers_new_slug_key UNIQUE (slug)
        );
    """
    )

    # Copy data to new table
    cur.execute(
        """
        INSERT INTO core.careers_new (
            id, slug, onet_code, title_en, title_vi, alternative_titles_en, alternative_titles_vi,
            short_desc_en, description_vi, industry_category, source, created_at, updated_at
        )
        SELECT 
            id, slug, onet_code, title_en, title_vi, alternative_titles_en, alternative_titles_vi,
            short_desc_en, description_vi, industry_category, source, created_at, updated_at
        FROM core.careers
        ORDER BY id;
    """
    )

    # Drop old table and rename new one
    cur.execute("DROP TABLE core.careers CASCADE;")
    cur.execute("ALTER TABLE core.careers_new RENAME TO careers;")

    # Recreate indexes
    indexes = [
        "CREATE INDEX idx_careers_onet ON core.careers USING btree(onet_code);",
        "CREATE INDEX idx_careers_title_vi_gin ON core.careers USING gin(to_tsvector('simple', title_vi));",
        "CREATE UNIQUE INDEX ux_careers_onet_code ON core.careers USING btree(onet_code);",
        "CREATE UNIQUE INDEX ux_careers_slug ON core.careers USING btree(slug);",
    ]

    for index_sql in indexes:
        cur.execute(index_sql)

    # Add comments
    comments = [
        ("title_en", "Career title in English (O*NET standard)"),
        ("title_vi", "Career title in Vietnamese"),
        ("alternative_titles_en", "Alternative career titles in English (array)"),
        ("alternative_titles_vi", "Alternative career titles in Vietnamese (array)"),
        ("short_desc_en", "Short description in English"),
        ("description_vi", "Career description in Vietnamese"),
    ]

    for column_name, comment in comments:
        cur.execute(f"COMMENT ON COLUMN core.careers.{column_name} IS %s;", (comment,))

    conn.commit()
    print("✅ Table restructured with logical column order")

    cur.close()


def verify_results():
    """
    Kiểm tra kết quả
    """
    cur = conn.cursor()

    print("🔍 Verifying results...")

    # Check counts
    cur.execute(
        """
        SELECT 
            COUNT(*) as total,
            COUNT(alternative_titles_en) as en_titles,
            COUNT(alternative_titles_vi) as vi_titles
        FROM core.careers;
    """
    )

    total, en_titles, vi_titles = cur.fetchone()

    print("📊 Results:")
    print(f"   Total careers: {total:,}")
    print(f"   English alternate titles: {en_titles:,} ({en_titles / total * 100:.1f}%)")
    print(f"   Vietnamese alternate titles: {vi_titles:,} ({vi_titles / total * 100:.1f}%)")

    # Check column order
    cur.execute(
        """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'careers'
        ORDER BY ordinal_position;
    """
    )

    columns = [row[0] for row in cur.fetchall()]
    print(f"   Column order: {', '.join(columns)}")

    # Show samples
    cur.execute(
        """
        SELECT 
            id, onet_code, title_en, title_vi,
            alternative_titles_en, alternative_titles_vi
        FROM core.careers
        WHERE alternative_titles_en IS NOT NULL
        ORDER BY id
        LIMIT 3;
    """
    )

    print("\n📝 Sample data:")
    for record in cur.fetchall():
        print(f"   ID {record[0]} ({record[1]}): {record[2]}")
        print(f"   Vietnamese: {record[3]}")
        print(f"   EN Alternates: {record[4]}")
        print(f"   VI Alternates: {record[5]}")
        print()

    cur.close()


def main():
    print("🔧 ENHANCING CAREERS WITH ALTERNATE TITLES")
    print("=" * 60)

    try:
        # 1. Parse O*NET alternate titles
        onet_alternate_titles = parse_onet_alternate_titles()

        # 2. Add alternative_titles_en column
        add_alternate_titles_en_column()

        # 3. Populate alternate titles
        populate_alternate_titles(onet_alternate_titles)

        # 4. Restructure table with logical column order
        restructure_careers_table()

        # 5. Verify results
        verify_results()

        print("\n🎉 Careers alternate titles enhancement completed!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
