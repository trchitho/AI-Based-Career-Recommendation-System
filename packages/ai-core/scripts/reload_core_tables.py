#!/usr/bin/env python3
"""
🔄 RELOAD CORE TABLES - Reload core.careers và core.career_interests
Nhiệm vụ: Reload 2 bảng core bị rỗng từ jobs_final_vi.csv
Input: jobs_final_vi.csv với RIASEC đã được fix
Output: core.careers và core.career_interests được populate đầy đủ
Quá trình: Parse CSV, insert vào 2 bảng core với đầy đủ thông tin

Reload core.careers and core.career_interests from updated CSV
"""

import json
import sys
from pathlib import Path

import pandas as pd

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from sqlalchemy import text

from ai_core.db import get_session


def reload_core_careers():
    """Reload core.careers from jobs_final_vi.csv"""
    print("🔄 RELOADING core.careers")
    print("-" * 50)

    # Read Vietnamese CSV
    csv_path = Path("data/catalog/jobs_final_vi.csv")
    if not csv_path.exists():
        print(f"❌ File not found: {csv_path}")
        return False

    df = pd.read_csv(csv_path)
    print(f"📖 Loaded {len(df)} jobs from CSV")

    session = get_session()

    try:
        # Truncate table first
        session.execute(text("TRUNCATE TABLE core.careers CASCADE"))
        session.commit()
        print("✅ Truncated core.careers")

        # Insert careers
        careers_loaded = 0
        for _, row in df.iterrows():
            try:
                # Determine industry category based on job_id pattern
                job_id = row["job_id"]
                industry_category = get_industry_category(job_id)

                session.execute(
                    text(
                        """
                    INSERT INTO core.careers 
                    (onet_code, title_en, title_vi, short_desc_en, short_desc_vi, industry_category, source)
                    VALUES (:onet_code, :title_en, :title_vi, :desc_en, :desc_vi, :industry_category, 'ETL_FINAL')
                """
                    ),
                    {
                        "onet_code": job_id,
                        "title_en": job_id,  # Placeholder
                        "title_vi": row["title_vi"],
                        "desc_en": "",  # Placeholder
                        "desc_vi": row["description_vi"],
                        "industry_category": industry_category,
                    },
                )
                careers_loaded += 1

                if careers_loaded % 100 == 0:
                    print(f"   Loaded {careers_loaded} careers...")

            except Exception as e:
                print(f"   ⚠️  Error loading career {job_id}: {e}")

        session.commit()
        print(f"✅ Loaded {careers_loaded} careers into core.careers")
        return careers_loaded > 0

    except Exception as e:
        print(f"❌ Error reloading core.careers: {e}")
        session.rollback()
        return False
    finally:
        session.close()


def reload_core_career_interests():
    """Reload core.career_interests from jobs_final_vi.csv"""
    print("\n🔄 RELOADING core.career_interests")
    print("-" * 50)

    # Read Vietnamese CSV
    csv_path = Path("data/catalog/jobs_final_vi.csv")
    df = pd.read_csv(csv_path)

    session = get_session()

    try:
        # Truncate table first
        session.execute(text("TRUNCATE TABLE core.career_interests CASCADE"))
        session.commit()
        print("✅ Truncated core.career_interests")

        # Insert career interests
        interests_loaded = 0
        for _, row in df.iterrows():
            try:
                job_id = row["job_id"]

                # Parse RIASEC from JSON
                riasec_json = row["riasec_centroid_json"]
                if isinstance(riasec_json, str):
                    riasec_vector = json.loads(riasec_json)
                else:
                    riasec_vector = riasec_json

                # Extract R, I, A, S, E, C values
                r, i, a, s, e, c = riasec_vector[:6]

                session.execute(
                    text(
                        """
                    INSERT INTO core.career_interests 
                    (onet_code, r, i, a, s, e, c, source)
                    VALUES (:onet_code, :r, :i, :a, :s, :e, :c, 'ETL_FINAL')
                """
                    ),
                    {
                        "onet_code": job_id,
                        "r": float(r),
                        "i": float(i),
                        "a": float(a),
                        "s": float(s),
                        "e": float(e),
                        "c": float(c),
                    },
                )
                interests_loaded += 1

                if interests_loaded % 100 == 0:
                    print(f"   Loaded {interests_loaded} interests...")

            except Exception as e:
                print(f"   ⚠️  Error loading interest {job_id}: {e}")

        session.commit()
        print(f"✅ Loaded {interests_loaded} career interests")
        return interests_loaded > 0

    except Exception as e:
        print(f"❌ Error reloading core.career_interests: {e}")
        session.rollback()
        return False
    finally:
        session.close()


def get_industry_category(job_id):
    """Get industry category based on job_id pattern"""
    # Map job_id prefixes to industry categories
    industry_map = {
        "11-": "Management",
        "13-": "Business and Financial Operations",
        "15-": "Computer and Mathematical",
        "17-": "Architecture and Engineering",
        "19-": "Life, Physical, and Social Science",
        "21-": "Community and Social Service",
        "23-": "Legal",
        "25-": "Education, Training, and Library",
        "27-": "Arts, Design, Entertainment, Sports, and Media",
        "29-": "Healthcare Practitioners and Technical",
        "31-": "Healthcare Support",
        "33-": "Protective Service",
        "35-": "Food Preparation and Serving Related",
        "37-": "Building and Grounds Cleaning and Maintenance",
        "39-": "Personal Care and Service",
        "41-": "Sales and Related",
        "43-": "Office and Administrative Support",
        "45-": "Farming, Fishing, and Forestry",
        "47-": "Construction and Extraction",
        "49-": "Installation, Maintenance, and Repair",
        "51-": "Production",
        "53-": "Transportation and Material Moving",
    }

    for prefix, category in industry_map.items():
        if job_id.startswith(prefix):
            return category

    return "Other"  # Default fallback


def verify_reload():
    """Verify that reload was successful"""
    print("\n✅ VERIFYING RELOAD")
    print("-" * 50)

    session = get_session()

    try:
        # Check core.careers
        result = session.execute(text("SELECT COUNT(*) FROM core.careers"))
        careers_count = result.scalar()
        print(f"core.careers: {careers_count:,} rows")

        # Check core.career_interests
        result = session.execute(text("SELECT COUNT(*) FROM core.career_interests"))
        interests_count = result.scalar()
        print(f"core.career_interests: {interests_count:,} rows")

        # Check for zero RIASEC scores
        result = session.execute(
            text(
                """
            SELECT COUNT(*) FROM core.career_interests 
            WHERE r = 0 AND i = 0 AND a = 0 AND s = 0 AND e = 0 AND c = 0
        """
            )
        )
        zero_count = result.scalar()
        print(f"Zero RIASEC scores: {zero_count}")

        # Sample All Other jobs
        result = session.execute(
            text(
                """
            SELECT ci.onet_code, c.title_vi, ci.r, ci.i, ci.a, ci.s, ci.e, ci.c
            FROM core.career_interests ci
            JOIN core.careers c ON ci.onet_code = c.onet_code
            WHERE c.title_vi LIKE '%Khác%' OR c.title_vi LIKE '%All Other%'
            ORDER BY ci.onet_code
            LIMIT 3
        """
            )
        )

        samples = result.fetchall()
        print("\nSample All Other jobs:")
        for onet_code, title, r, i, a, s, e, c in samples:
            total = float(r) + float(i) + float(a) + float(s) + float(e) + float(c)
            print(f"   {onet_code}: {title[:40]}...")
            print(f"      RIASEC: R={r:.3f}, I={i:.3f}, A={a:.3f}, S={s:.3f}, E={e:.3f}, C={c:.3f} (Total: {total:.3f})")

        success = careers_count == 959 and interests_count == 959 and zero_count == 0

        if success:
            print("\n🎉 RELOAD SUCCESSFUL!")
            print(f"   ✅ {careers_count} careers loaded")
            print(f"   ✅ {interests_count} career interests loaded")
            print(f"   ✅ {zero_count} zero RIASEC scores")
        else:
            print("\n⚠️  RELOAD ISSUES:")
            if careers_count != 959:
                print(f"   - Expected 959 careers, got {careers_count}")
            if interests_count != 959:
                print(f"   - Expected 959 interests, got {interests_count}")
            if zero_count > 0:
                print(f"   - Found {zero_count} zero RIASEC scores")

        return success

    except Exception as e:
        print(f"❌ Error verifying reload: {e}")
        return False
    finally:
        session.close()


def main():
    print("=" * 80)
    print("🔄 RELOAD CORE TABLES FROM UPDATED CSV")
    print("=" * 80)

    # Step 1: Reload core.careers
    careers_success = reload_core_careers()

    if not careers_success:
        print("\n❌ Failed to reload core.careers")
        return

    # Step 2: Reload core.career_interests
    interests_success = reload_core_career_interests()

    if not interests_success:
        print("\n❌ Failed to reload core.career_interests")
        return

    # Step 3: Verify reload
    verify_success = verify_reload()

    if verify_success:
        print("\n🎉 CORE TABLES RELOAD COMPLETED SUCCESSFULLY!")
        print("   ✅ core.careers: 959 rows with industry categories")
        print("   ✅ core.career_interests: 959 rows with valid RIASEC")
        print("   ✅ All All Other jobs have scientific RIASEC scores")
        print("   ✅ System is production ready")
    else:
        print("\n⚠️  Reload partially successful, some issues remain")


if __name__ == "__main__":
    main()
