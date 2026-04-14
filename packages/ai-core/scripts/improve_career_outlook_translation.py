#!/usr/bin/env python3
"""
Script cải thiện chất lượng dịch career_outlook
"""

import os

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv("./apps/backend/.env")

# Database connection
database_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(database_url)


def improve_growth_labels():
    """
    Cải thiện dịch growth_label_vi
    """
    cur = conn.cursor()

    print("🔧 Improving growth label translations...")

    # Extended growth label translations
    extended_translations = {
        "Declining": "Giảm",
        "Average": "Trung bình",
        "Faster Than Average": "Nhanh hơn mức trung bình",
        "As Fast As Average": "Nhanh như mức trung bình",
        "Slower Than Average": "Chậm hơn mức trung bình",
        "Much Faster Than Average": "Nhanh hơn nhiều so với mức trung bình",
        "Much Slower Than Average": "Chậm hơn nhiều so với mức trung bình",
        "Little or No Change": "Ít hoặc không thay đổi",
        "New and Emerging": "Mới và đang nổi lên",
    }

    # Update missing translations
    updated_count = 0
    for en_label, vi_label in extended_translations.items():
        cur.execute(
            """
            UPDATE core.career_outlook 
            SET growth_label_vi = %s
            WHERE growth_label = %s AND (growth_label_vi IS NULL OR growth_label_vi = growth_label);
        """,
            (vi_label, en_label),
        )

        if cur.rowcount > 0:
            updated_count += cur.rowcount
            print(f"   Updated {cur.rowcount} records: {en_label} → {vi_label}")

    conn.commit()
    print(f"✅ Improved {updated_count} growth label translations")

    cur.close()


def improve_summary_translations():
    """
    Cải thiện chất lượng dịch summary_md_vi
    """
    cur = conn.cursor()

    print("📝 Improving summary translations...")

    # Get summaries that need improvement
    cur.execute(
        """
        SELECT onet_code, summary_md_vi
        FROM core.career_outlook
        WHERE summary_md_vi IS NOT NULL
        AND (summary_md_vi LIKE '%Employment is%' OR summary_md_vi LIKE '%professionals%')
        LIMIT 100;
    """
    )

    summaries_to_improve = cur.fetchall()
    print(f"Found {len(summaries_to_improve)} summaries to improve")

    # Improvement patterns
    improvements = {
        "Employment is projected to grow": "Việc làm dự kiến tăng trưởng",
        "professionals work": "chuyên gia làm việc",
        "sector. Employment": "Việc làm trong lĩnh vực này",
        "at an bright outlook": "ở mức triển vọng tươi sáng",
        "at an average": "ở mức trung bình",
        "at an declining": "ở mức giảm",
        "at an faster than average": "ở mức nhanh hơn trung bình",
        "rate.": ".",
        " an ": " ",
        "  ": " ",
    }

    improved_count = 0
    for onet_code, summary_vi in summaries_to_improve:
        improved_summary = summary_vi

        # Apply improvements
        for en_phrase, vi_phrase in improvements.items():
            improved_summary = improved_summary.replace(en_phrase, vi_phrase)

        # Clean up extra spaces
        improved_summary = " ".join(improved_summary.split())

        if improved_summary != summary_vi:
            cur.execute(
                """
                UPDATE core.career_outlook 
                SET summary_md_vi = %s
                WHERE onet_code = %s;
            """,
                (improved_summary, onet_code),
            )
            improved_count += 1

    conn.commit()
    print(f"✅ Improved {improved_count} summary translations")

    cur.close()


def add_detailed_openings_descriptions():
    """
    Thêm mô tả chi tiết hơn cho openings_est_vi
    """
    cur = conn.cursor()

    print("📊 Adding detailed openings descriptions...")

    # Get all records to update openings descriptions
    cur.execute(
        """
        SELECT onet_code, openings_est, growth_label_vi
        FROM core.career_outlook
        WHERE openings_est IS NOT NULL;
    """
    )

    records = cur.fetchall()

    updated_count = 0
    for onet_code, openings_est, growth_label_vi in records:
        # Create more detailed description
        if openings_est >= 100000:
            level = "Rất cao"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Đây là một trong những nghề có cơ hội việc làm nhiều nhất."
        elif openings_est >= 50000:
            level = "Cao"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Nhiều cơ hội phát triển nghề nghiệp."
        elif openings_est >= 20000:
            level = "Tốt"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Cơ hội việc làm ổn định."
        elif openings_est >= 10000:
            level = "Vừa phải"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Cạnh tranh vừa phải."
        elif openings_est >= 5000:
            level = "Hạn chế"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Cần chuẩn bị kỹ năng tốt."
        elif openings_est >= 1000:
            level = "Thấp"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Cạnh tranh cao."
        else:
            level = "Rất thấp"
            desc = f"Nhu cầu tuyển dụng {level.lower()} với {openings_est:,} vị trí mở mỗi năm. Nghề chuyên môn cao hoặc thị trường hẹp."

        # Add growth context
        if growth_label_vi:
            if "tươi sáng" in growth_label_vi.lower():
                desc += " Triển vọng phát triển rất tích cực."
            elif "tốt" in growth_label_vi.lower():
                desc += " Triển vọng phát triển tích cực."
            elif "trung bình" in growth_label_vi.lower():
                desc += " Triển vọng phát triển ổn định."
            elif "giảm" in growth_label_vi.lower():
                desc += " Cần lưu ý xu hướng giảm của ngành."

        cur.execute(
            """
            UPDATE core.career_outlook 
            SET openings_est_vi = %s
            WHERE onet_code = %s;
        """,
            (desc, onet_code),
        )

        updated_count += 1

    conn.commit()
    print(f"✅ Updated {updated_count} detailed openings descriptions")

    cur.close()


def main():
    print("🎯 IMPROVING CAREER OUTLOOK TRANSLATIONS")
    print("=" * 50)

    try:
        # 1. Improve growth labels
        improve_growth_labels()

        # 2. Improve summary translations
        improve_summary_translations()

        # 3. Add detailed openings descriptions
        add_detailed_openings_descriptions()

        # 4. Final verification
        print("\n📊 FINAL VERIFICATION")

        cur = conn.cursor()

        # Check coverage
        cur.execute(
            """
            SELECT 
                COUNT(*) as total,
                COUNT(summary_md_vi) as summary_translated,
                COUNT(growth_label_vi) as growth_translated,
                COUNT(openings_est_vi) as openings_translated
            FROM core.career_outlook;
        """
        )

        total, summary_trans, growth_trans, openings_trans = cur.fetchone()

        print("Translation Coverage:")
        print(f"   Summary: {summary_trans}/{total} ({summary_trans / total * 100:.1f}%)")
        print(f"   Growth labels: {growth_trans}/{total} ({growth_trans / total * 100:.1f}%)")
        print(f"   Openings descriptions: {openings_trans}/{total} ({openings_trans / total * 100:.1f}%)")

        # Show improved samples
        cur.execute(
            """
            SELECT 
                onet_code,
                LEFT(summary_md_vi, 80) as summary_vi,
                growth_label_vi,
                LEFT(openings_est_vi, 100) as openings_vi
            FROM core.career_outlook
            ORDER BY RANDOM()
            LIMIT 3;
        """
        )

        print("\n📝 Improved samples:")
        for onet_code, summary_vi, growth_vi, openings_vi in cur.fetchall():
            print(f"   {onet_code}:")
            print(f"   Summary: {summary_vi}...")
            print(f"   Growth: {growth_vi}")
            print(f"   Openings: {openings_vi}...")
            print()

        cur.close()

        print("\n🎉 Career outlook translation improvements completed!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
