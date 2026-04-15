#!/usr/bin/env python3
"""
📥 LOAD JOBS TO DATABASE - Script cốt lõi ETL Pipeline
Nhiệm vụ: Load dữ liệu nghề từ CSV vào PostgreSQL database
Input: jobs_vi_tagged.csv (959 nghề với tiếng Việt)
Output: Populate 5 bảng database (careers, career_interests, career_tags, mappings)
Quá trình: Parse CSV, bulk insert với conflict handling, tạo career-tag và RIASEC mappings

Script: load_jobs_to_database.py
Purpose: Load jobs data into PostgreSQL database tables
Author: Senior Data Engineer
Date: 2026-01-27

This script loads data into the following tables:
1. core.careers - Main careers table
2. core.career_interests - RIASEC scores
3. core.career_tags - Tags/skills
4. core.career_tag_map - Many-to-many mapping
5. core.career_riasec_map - RIASEC label mapping
6. ai.retrieval_jobs_visbert - For vector search (placeholder)
"""

import json
import re
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import text

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from ai_core.db import get_session

# Define paths
BASE_DIR = Path(__file__).resolve().parents[1]
CATALOG_DIR = BASE_DIR / "data" / "catalog"

# Input file
JOBS_VI_FILE = CATALOG_DIR / "jobs_vi_tagged.csv"


class JobsDatabaseLoader:
    """Load jobs data into database"""

    def __init__(self):
        self.session = get_session()
        self.jobs_df = None
        self.stats = {
            "careers_loaded": 0,
            "interests_loaded": 0,
            "tags_created": 0,
            "tag_mappings_created": 0,
            "riasec_mappings_created": 0,
            "errors": 0,
        }

    def __del__(self):
        """Cleanup session"""
        if hasattr(self, "session"):
            self.session.close()

    def load_jobs_data(self):
        """Load Vietnamese jobs data"""
        print("\n" + "=" * 60)
        print("📂 LOADING JOBS DATA")
        print("=" * 60)

        if not JOBS_VI_FILE.exists():
            print(f"❌ Jobs file not found: {JOBS_VI_FILE}")
            return False

        try:
            self.jobs_df = pd.read_csv(JOBS_VI_FILE)
            print(f"✅ Loaded {len(self.jobs_df)} jobs")
            print(f"   Columns: {list(self.jobs_df.columns)}")

            # Show sample
            print("\n📋 Sample jobs:")
            for _i, row in self.jobs_df.head(3).iterrows():
                print(f"   - {row['job_id']}: {row['title_vi']}")

            return True

        except Exception as e:
            print(f"❌ Error loading jobs data: {e}")
            return False

    def create_slug(self, title: str, job_id: str) -> str:
        """Create URL-friendly slug from title"""
        if not title or pd.isna(title):
            return job_id.lower().replace(".", "-")

        # Remove special characters and convert to lowercase
        slug = re.sub(r"[^\w\s-]", "", title.lower())
        slug = re.sub(r"[-\s]+", "-", slug)
        slug = slug.strip("-")

        # Fallback to job_id if slug is empty
        if not slug:
            slug = job_id.lower().replace(".", "-")

        return slug

    def parse_riasec_vector(self, riasec_str: str) -> tuple[float, float, float, float, float, float]:
        """Parse RIASEC vector string to individual scores"""
        try:
            if pd.isna(riasec_str) or not riasec_str:
                return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

            # Parse JSON-like string
            riasec_str = riasec_str.strip()
            if riasec_str.startswith("[") and riasec_str.endswith("]"):
                scores = json.loads(riasec_str)
                if len(scores) >= 6:
                    return tuple(float(s) for s in scores[:6])

            return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

        except Exception as e:
            print(f"   ⚠️  Error parsing RIASEC vector: {riasec_str} - {e}")
            return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    def load_careers_table(self):
        """Load data into core.careers table"""
        print("\n" + "=" * 60)
        print("📊 LOADING CAREERS TABLE")
        print("=" * 60)

        try:
            # Check existing careers
            existing_count = self.session.execute(text("SELECT COUNT(*) FROM core.careers")).scalar()
            print(f"   Existing careers: {existing_count}")

            careers_data = []
            for _, row in self.jobs_df.iterrows():
                job_id = row["job_id"]
                title_vi = row["title_vi"]
                description_vi = row["description_vi"]

                # Create slug
                slug = self.create_slug(title_vi, job_id)

                career_data = {
                    "onet_code": job_id,
                    "slug": slug,
                    "title_en": "",  # We don't have English titles in this dataset
                    "title_vi": title_vi,
                    "short_desc_en": "",
                    "short_desc_vn": description_vi[:500] if description_vi else "",  # Truncate for short desc
                    "source": "onet_etl",
                    "industry_category": "General",
                }

                careers_data.append(career_data)

            # Bulk insert with ON CONFLICT handling
            if careers_data:
                insert_query = text(
                    """
                    INSERT INTO core.careers 
                    (onet_code, slug, title_en, title_vi, short_desc_en, short_desc_vn, source, industry_category)
                    VALUES (:onet_code, :slug, :title_en, :title_vi, :short_desc_en, :short_desc_vn, :source, :industry_category)
                    ON CONFLICT (onet_code) DO UPDATE SET
                        title_vi = EXCLUDED.title_vi,
                        short_desc_vn = EXCLUDED.short_desc_vn,
                        updated_at = CURRENT_TIMESTAMP
                """
                )

                # Insert in batches
                batch_size = 100
                inserted = 0
                for i in range(0, len(careers_data), batch_size):
                    batch = careers_data[i : i + batch_size]
                    self.session.execute(insert_query, batch)
                    self.session.commit()
                    inserted += len(batch)
                    print(f"   ⏳ Inserted batch: {inserted}/{len(careers_data)}")

                print(f"✅ Loaded {len(careers_data)} careers")
                self.stats["careers_loaded"] = len(careers_data)

            return True

        except Exception as e:
            print(f"❌ Error loading careers: {e}")
            self.session.rollback()
            self.stats["errors"] += 1
            return False

    def load_career_interests(self):
        """Load data into core.career_interests table"""
        print("\n" + "=" * 60)
        print("📊 LOADING CAREER INTERESTS")
        print("=" * 60)

        try:
            # Check existing interests
            existing_count = self.session.execute(text("SELECT COUNT(*) FROM core.career_interests")).scalar()
            print(f"   Existing interests: {existing_count}")

            interests_data = []
            for _, row in self.jobs_df.iterrows():
                job_id = row["job_id"]
                riasec_vector = row["riasec_centroid_json"]

                # Parse RIASEC scores
                r, i, a, s, e, c = self.parse_riasec_vector(riasec_vector)

                interest_data = {"onet_code": job_id, "r": r, "i": i, "a": a, "s": s, "e": e, "c": c, "source": "onet_etl"}

                interests_data.append(interest_data)

            # Bulk insert with ON CONFLICT handling
            if interests_data:
                insert_query = text(
                    """
                    INSERT INTO core.career_interests 
                    (onet_code, r, i, a, s, e, c, source)
                    VALUES (:onet_code, :r, :i, :a, :s, :e, :c, :source)
                    ON CONFLICT (onet_code) DO UPDATE SET
                        r = EXCLUDED.r,
                        i = EXCLUDED.i,
                        a = EXCLUDED.a,
                        s = EXCLUDED.s,
                        e = EXCLUDED.e,
                        c = EXCLUDED.c,
                        fetched_at = CURRENT_TIMESTAMP
                """
                )

                self.session.execute(insert_query, interests_data)
                self.session.commit()

                print(f"✅ Loaded {len(interests_data)} career interests")
                self.stats["interests_loaded"] = len(interests_data)

            return True

        except Exception as e:
            print(f"❌ Error loading career interests: {e}")
            self.session.rollback()
            self.stats["errors"] += 1
            return False

    def clean_tag_name(self, tag: str) -> str:
        """Clean tag name to fix encoding issues"""
        if not tag or pd.isna(tag):
            return ""

        # Fix common encoding issues in Vietnamese
        tag = tag.strip()

        # Remove any non-printable characters
        tag = "".join(char for char in tag if char.isprintable())

        return tag

    def load_career_tags(self):
        """Load tags and create mappings"""
        print("\n" + "=" * 60)
        print("📊 LOADING CAREER TAGS")
        print("=" * 60)

        try:
            # Collect all unique tags
            all_tags = set()
            job_tags_map = {}

            for _, row in self.jobs_df.iterrows():
                job_id = row["job_id"]
                tags_vi = row["tags_vi"]

                if tags_vi and not pd.isna(tags_vi):
                    tags = [self.clean_tag_name(tag) for tag in tags_vi.split("|") if tag.strip()]
                    tags = [tag for tag in tags if tag]  # Remove empty tags

                    job_tags_map[job_id] = tags
                    all_tags.update(tags)

            print(f"   Found {len(all_tags)} unique tags")
            print(f"   Jobs with tags: {len(job_tags_map)}")

            # Insert tags into core.career_tags
            existing_tags = {}
            result = self.session.execute(text("SELECT id, name FROM core.career_tags"))
            for row in result:
                existing_tags[row[1]] = row[0]

            print(f"   Existing tags in database: {len(existing_tags)}")

            # Insert new tags
            new_tags = all_tags - set(existing_tags.keys())
            if new_tags:
                print(f"   Inserting {len(new_tags)} new tags...")

                for tag in new_tags:
                    try:
                        result = self.session.execute(text("INSERT INTO core.career_tags (name) VALUES (:name) RETURNING id"), {"name": tag})
                        tag_id = result.scalar()
                        existing_tags[tag] = tag_id
                        self.session.commit()
                    except Exception as e:
                        print(f"   ⚠️  Error inserting tag '{tag}': {e}")
                        self.session.rollback()
                        continue

            self.stats["tags_created"] = len(new_tags)

            # Create career-tag mappings
            print("\n   Creating career-tag mappings...")

            # Get career IDs
            career_ids = {}
            result = self.session.execute(text("SELECT id, onet_code FROM core.careers"))
            for row in result:
                career_ids[row[1]] = row[0]

            # Clear existing mappings for these careers
            onet_codes = list(job_tags_map.keys())
            if onet_codes:
                placeholders = ",".join([f"'{code}'" for code in onet_codes])
                self.session.execute(
                    text(
                        f"""
                    DELETE FROM core.career_tag_map 
                    WHERE career_id IN (
                        SELECT id FROM core.careers WHERE onet_code IN ({placeholders})
                    )
                """
                    )
                )
                self.session.commit()

            # Insert new mappings
            mapping_data = []
            for job_id, tags in job_tags_map.items():
                if job_id not in career_ids:
                    continue

                career_id = career_ids[job_id]
                for tag in tags:
                    if tag in existing_tags:
                        mapping_data.append({"career_id": career_id, "tag_id": existing_tags[tag]})

            if mapping_data:
                insert_query = text(
                    """
                    INSERT INTO core.career_tag_map (career_id, tag_id)
                    VALUES (:career_id, :tag_id)
                    ON CONFLICT (career_id, tag_id) DO NOTHING
                """
                )

                # Insert in batches
                batch_size = 1000
                inserted = 0
                for i in range(0, len(mapping_data), batch_size):
                    batch = mapping_data[i : i + batch_size]
                    self.session.execute(insert_query, batch)
                    self.session.commit()
                    inserted += len(batch)
                    print(f"   ⏳ Inserted mappings: {inserted}/{len(mapping_data)}")

                print(f"✅ Created {len(mapping_data)} career-tag mappings")
                self.stats["tag_mappings_created"] = len(mapping_data)

            return True

        except Exception as e:
            print(f"❌ Error loading career tags: {e}")
            self.session.rollback()
            self.stats["errors"] += 1
            return False

    def load_riasec_mappings(self):
        """Load RIASEC label mappings"""
        print("\n" + "=" * 60)
        print("📊 LOADING RIASEC MAPPINGS")
        print("=" * 60)

        try:
            # Get RIASEC labels
            riasec_labels = {}
            result = self.session.execute(text("SELECT id, code FROM core.riasec_labels"))
            for row in result:
                riasec_labels[row[1]] = row[0]

            print(f"   Available RIASEC labels: {len(riasec_labels)}")

            # Get career IDs
            career_ids = {}
            result = self.session.execute(text("SELECT id, onet_code FROM core.careers"))
            for row in result:
                career_ids[row[1]] = row[0]

            # Create RIASEC mappings based on highest scores
            mapping_data = []
            for _, row in self.jobs_df.iterrows():
                job_id = row["job_id"]
                riasec_vector = row["riasec_centroid_json"]

                if job_id not in career_ids:
                    continue

                career_id = career_ids[job_id]
                r, i, a, s, e, c = self.parse_riasec_vector(riasec_vector)

                # Find top 2 RIASEC dimensions
                scores = {"R": r, "I": i, "A": a, "S": s, "E": e, "C": c}
                sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)

                # Map to single letters and combinations
                top_codes = []

                # Add individual top scores (threshold > 0.5)
                for code, score in sorted_scores:
                    if score > 0.5:
                        top_codes.append(code)

                # Add top combination if we have at least 2 high scores
                if len(top_codes) >= 2:
                    combo_code = "".join(top_codes[:2])
                    if combo_code in riasec_labels:
                        top_codes.append(combo_code)

                # Create mappings
                for code in top_codes:
                    if code in riasec_labels:
                        mapping_data.append({"career_id": career_id, "label_id": riasec_labels[code]})

            # Clear existing mappings
            onet_codes = list(self.jobs_df["job_id"])
            if onet_codes:
                placeholders = ",".join([f"'{code}'" for code in onet_codes])
                self.session.execute(
                    text(
                        f"""
                    DELETE FROM core.career_riasec_map 
                    WHERE career_id IN (
                        SELECT id FROM core.careers WHERE onet_code IN ({placeholders})
                    )
                """
                    )
                )
                self.session.commit()

            # Insert new mappings
            if mapping_data:
                insert_query = text(
                    """
                    INSERT INTO core.career_riasec_map (career_id, label_id)
                    VALUES (:career_id, :label_id)
                    ON CONFLICT (career_id, label_id) DO NOTHING
                """
                )

                self.session.execute(insert_query, mapping_data)
                self.session.commit()

                print(f"✅ Created {len(mapping_data)} RIASEC mappings")
                self.stats["riasec_mappings_created"] = len(mapping_data)

            return True

        except Exception as e:
            print(f"❌ Error loading RIASEC mappings: {e}")
            self.session.rollback()
            self.stats["errors"] += 1
            return False

    def run(self):
        """Execute the complete database loading process"""
        print("\n" + "=" * 60)
        print("🗄️  JOBS DATABASE LOADER")
        print("=" * 60)
        print("This script loads Vietnamese jobs data into PostgreSQL")
        print("database tables for the AI Career Recommendation System.")

        try:
            # Step 1: Load jobs data
            if not self.load_jobs_data():
                return False

            # Step 2: Load careers table
            if not self.load_careers_table():
                return False

            # Step 3: Load career interests
            if not self.load_career_interests():
                return False

            # Step 4: Load career tags and mappings
            if not self.load_career_tags():
                return False

            # Step 5: Load RIASEC mappings
            if not self.load_riasec_mappings():
                return False

            # Final summary
            print("\n" + "=" * 60)
            print("📋 DATABASE LOADING SUMMARY")
            print("=" * 60)
            print(f"  Careers loaded: {self.stats['careers_loaded']:,}")
            print(f"  Interests loaded: {self.stats['interests_loaded']:,}")
            print(f"  New tags created: {self.stats['tags_created']:,}")
            print(f"  Tag mappings created: {self.stats['tag_mappings_created']:,}")
            print(f"  RIASEC mappings created: {self.stats['riasec_mappings_created']:,}")
            print(f"  Errors encountered: {self.stats['errors']:,}")

            if self.stats["errors"] == 0:
                print("\n✅ Database loading completed successfully!")
                print("   All jobs data has been loaded into PostgreSQL")
            else:
                print(f"\n⚠️  Database loading completed with {self.stats['errors']} errors")
                print("   Check logs above for details")

            print("\n" + "=" * 60 + "\n")
            return True

        except Exception as e:
            print(f"\n❌ Database loading failed: {e}")
            return False


def main():
    """Main entry point"""
    loader = JobsDatabaseLoader()
    success = loader.run()

    if not success:
        print("❌ Database loading failed")
        sys.exit(1)

    print("🎉 Jobs database loading completed!")


if __name__ == "__main__":
    main()
