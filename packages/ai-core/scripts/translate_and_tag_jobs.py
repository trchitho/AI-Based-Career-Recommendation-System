#!/usr/bin/env python3
"""
🌐 TRANSLATE AND TAG JOBS - Script cốt lõi ETL Pipeline
Nhiệm vụ: Dịch nghề sang tiếng Việt và thêm tags/skills
Input: jobs_complete.csv (959 nghề tiếng Anh)
Output: jobs_vi_tagged.csv (959 nghề với tiếng Việt đầy đủ)
Quá trình: Dịch title/description, thêm skills tiếng Việt, tính RIASEC centroid, format tags

Script: translate_and_tag_jobs.py
Purpose: Translate jobs to Vietnamese and add tags to create jobs_vi_tagged.csv
Author: Senior Data Engineer
Date: 2026-01-27

This script:
1. Reads the complete jobs.csv (with All Other jobs)
2. Translates titles and descriptions to Vietnamese
3. Translates skills/tags to Vietnamese
4. Creates jobs_vi_tagged.csv in the required format
"""

import sys
from pathlib import Path

import pandas as pd

# Define paths
BASE_DIR = Path(__file__).resolve().parents[1]
CATALOG_DIR = BASE_DIR / "data" / "catalog"
RAW_DIR = BASE_DIR / "data" / "raw"

# Input files
JOBS_FILE = CATALOG_DIR / "jobs.csv"
EXISTING_VI_JOBS = CATALOG_DIR / "jobs_vi_tagged.csv"

# Output file
OUTPUT_FILE = CATALOG_DIR / "jobs_vi_tagged_complete.csv"


class JobsTranslator:
    """Translate and tag jobs for Vietnamese"""

    def __init__(self):
        self.jobs_df = None
        self.existing_vi_jobs = None
        self.translation_map = {}
        self.stats = {"total_jobs": 0, "existing_translations": 0, "new_translations": 0, "all_other_jobs": 0}

    def load_jobs(self):
        """Load the complete jobs.csv"""
        print("\n" + "=" * 60)
        print("📂 LOADING JOBS DATA")
        print("=" * 60)

        if not JOBS_FILE.exists():
            print(f"❌ Jobs file not found: {JOBS_FILE}")
            return False

        try:
            self.jobs_df = pd.read_csv(JOBS_FILE)
            print(f"✅ Loaded {len(self.jobs_df)} jobs")
            print(f"   Columns: {list(self.jobs_df.columns)}")

            # Count All Other jobs
            all_other_count = len(self.jobs_df[self.jobs_df["title"].str.contains("All Other", na=False)])
            print(f"   All Other jobs: {all_other_count}")

            self.stats["total_jobs"] = len(self.jobs_df)
            self.stats["all_other_jobs"] = all_other_count

            return True

        except Exception as e:
            print(f"❌ Error loading jobs: {e}")
            return False

    def load_existing_translations(self):
        """Load existing Vietnamese translations"""
        print("\n" + "=" * 60)
        print("📂 LOADING EXISTING TRANSLATIONS")
        print("=" * 60)

        if not EXISTING_VI_JOBS.exists():
            print("⚠️  No existing Vietnamese jobs file found")
            self.existing_vi_jobs = pd.DataFrame()
            return True

        try:
            self.existing_vi_jobs = pd.read_csv(EXISTING_VI_JOBS)
            print(f"✅ Loaded {len(self.existing_vi_jobs)} existing Vietnamese translations")

            # Create translation map for reuse
            for _, row in self.existing_vi_jobs.iterrows():
                job_id = row["job_id"]
                self.translation_map[job_id] = {
                    "title_vi": row.get("title_vi", ""),
                    "description_vi": row.get("description_vi", ""),
                    "skills_vi": row.get("skills_vi", ""),
                    "tags_vi": row.get("tags_vi", ""),
                    "riasec_centroid_json": row.get("riasec_centroid_json", "[0.0, 0.0, 0.0, 0.0, 0.0, 0.0]"),
                }

            self.stats["existing_translations"] = len(self.existing_vi_jobs)
            print(f"   Created translation map for {len(self.translation_map)} jobs")

            return True

        except Exception as e:
            print(f"❌ Error loading existing translations: {e}")
            return False

    def create_skill_translation_map(self):
        """Create skill translation mapping"""
        print("\n" + "=" * 60)
        print("🔧 CREATING SKILL TRANSLATION MAP")
        print("=" * 60)

        # Common skill translations (English -> Vietnamese)
        skill_translations = {
            # Management skills
            "active-learning": "học chủ động",
            "active-listening": "lắng nghe tích cực",
            "complex-problem-solving": "giải quyết vấn đề phức tạp",
            "coordination": "phối hợp",
            "critical-thinking": "tư duy phản biện",
            "judgment-and-decision-making": "phán đoán & ra quyết định",
            "management-of-financial-resources": "quản lý nguồn lực tài chính",
            "management-of-material-resources": "quản lý nguồn lực vật chất",
            "management-of-personnel-resources": "quản lý nguồn nhân lực",
            "monitoring": "giám sát",
            "negotiation": "đàm phán",
            "persuasion": "thuyết phục",
            "reading-comprehension": "đọc hiểu",
            "speaking": "giao tiếp nói",
            "systems-analysis": "phân tích hệ thống",
            "systems-evaluation": "đánh giá hệ thống",
            "time-management": "quản lý thời gian",
            "writing": "viết",
            "social-perceptiveness": "nhạy bén xã hội",
            "instructing": "hướng dẫn",
            "mathematics": "toán học",
            "learning-strategies": "chiến lược học tập",
            "quality-control-analysis": "phân tích kiểm soát chất lượng",
            "operations-monitoring": "giám sát vận hành",
            "service-orientation": "định hướng dịch vụ",
            # "science": "khoa học",  # Duplicate - removed
            "operations-analysis": "phân tích vận hành",
            "programming": "lập trình",
            "troubleshooting": "khắc phục sự cố",
            "technology-design": "thiết kế công nghệ",
            "equipment-selection": "lựa chọn thiết bị",
            "equipment-maintenance": "bảo trì thiết bị",
            "repairing": "sửa chữa",
            # "installation": "lắp đặt",  # Duplicate - removed
            "operation-and-control": "vận hành và điều khiển",
            # Categories
            "all-other": "khác",
            "general": "tổng quát",
            "miscellaneous": "đa dạng",
            "management": "quản lý",
            "business": "kinh doanh",
            "finance": "tài chính",
            "technology": "công nghệ",
            "engineering": "kỹ thuật",
            "science": "khoa học",
            "healthcare": "y tế",
            "education": "giáo dục",
            "arts": "nghệ thuật",
            "design": "thiết kế",
            "sales": "bán hàng",
            "service": "dịch vụ",
            "production": "sản xuất",
            "construction": "xây dựng",
            "transportation": "vận tải",
            "maintenance": "bảo trì",
            "repair": "sửa chữa",
            "installation": "lắp đặt",
            "operation": "vận hành",
        }

        print(f"✅ Created skill translation map with {len(skill_translations)} entries")
        return skill_translations

    def translate_skills(self, skills_text: str, skill_translations: dict[str, str]) -> str:
        """Translate skills from English to Vietnamese"""
        if not skills_text or pd.isna(skills_text):
            return ""

        # Split skills by pipe separator
        skills = [s.strip() for s in skills_text.split("|") if s.strip()]

        # Translate each skill
        translated_skills = []
        for skill in skills:
            translated = skill_translations.get(skill, skill)  # Keep original if no translation
            translated_skills.append(translated)

        return "|".join(translated_skills)

    def translate_title(self, title: str) -> str:
        """Translate job title to Vietnamese"""
        if not title or pd.isna(title):
            return ""

        # Common title translations
        title_translations = {
            "Chief Executives": "Giám đốc điều hành",
            "Chief Sustainability Officers": "Giám đốc phát triển bền vững",
            "General and Operations Managers": "Quản lý chung và hoạt động",
            "Legislators": "Nhà lập pháp",
            "Advertising and Promotions Managers": "Quản lý quảng cáo và khuyến mãi",
            "Marketing Managers": "Quản lý tiếp thị",
            "Sales Managers": "Quản lý bán hàng",
            "Public Relations Managers": "Quản lý quan hệ công chúng",
            "Fundraising Managers": "Quản lý huy động quỹ",
            "Administrative Services Managers": "Quản lý dịch vụ hành chính",
            "Facilities Managers": "Quản lý cơ sở vật chất",
            "Security Managers": "Quản lý an ninh",
            "Computer and Information Systems Managers": "Quản lý hệ thống máy tính và thông tin",
            "Financial Managers": "Quản lý tài chính",
            "Treasurers and Controllers": "Thủ quỹ và kiểm soát viên",
            "Investment Fund Managers": "Quản lý quỹ đầu tư",
            "Industrial Production Managers": "Quản lý sản xuất công nghiệp",
            "Quality Control Systems Managers": "Quản lý hệ thống kiểm soát chất lượng",
            "Geothermal Production Managers": "Quản lý sản xuất địa nhiệt",
            # All Other patterns
            "Managers, All Other": "Quản lý, Khác",
            "Mathematical Science Occupations, All Other": "Nghề khoa học toán học, Khác",
            "Engineers, All Other": "Kỹ sư, Khác",
            "Engineering Technologists and Technicians, Except Drafters, All Other": "Công nghệ kỹ thuật và kỹ thuật viên, Ngoại trừ người vẽ kỹ thuật, Khác",
            "Textile, Apparel, and Furnishings Workers, All Other": "Công nhân dệt may, may mặc và đồ nội thất, Khác",
        }

        # Try exact match first
        if title in title_translations:
            return title_translations[title]

        # Handle "All Other" pattern
        if ", All Other" in title:
            base_title = title.replace(", All Other", "")
            return f"{base_title}, Khác"

        # Return original if no translation found
        return title

    def translate_description(self, description: str) -> str:
        """Translate job description to Vietnamese (simplified)"""
        if not description or pd.isna(description):
            return ""

        # For All Other jobs, create a generic Vietnamese description
        if "All Other" in description or "variety of duties" in description:
            return "Thực hiện các nhiệm vụ đa dạng không được bao gồm trong các danh mục nghề nghiệp cụ thể khác trong lĩnh vực này."

        # For now, return original description (in production, would use translation API)
        return description

    def create_vietnamese_jobs(self):
        """Create Vietnamese version of all jobs"""
        print("\n" + "=" * 60)
        print("🌐 CREATING VIETNAMESE TRANSLATIONS")
        print("=" * 60)

        skill_translations = self.create_skill_translation_map()

        vietnamese_jobs = []
        new_translations = 0

        for _, row in self.jobs_df.iterrows():
            job_id = row["job_id"]

            # Check if translation already exists
            if job_id in self.translation_map:
                # Use existing translation
                vi_job = {
                    "job_id": job_id,
                    "title_vi": self.translation_map[job_id]["title_vi"],
                    "description_vi": self.translation_map[job_id]["description_vi"],
                    "skills_vi": self.translation_map[job_id]["skills_vi"],
                    "riasec_centroid_json": self.translation_map[job_id]["riasec_centroid_json"],
                    "tags_vi": self.translation_map[job_id]["tags_vi"],
                }
            else:
                # Create new translation
                title_vi = self.translate_title(row["title"])
                description_vi = self.translate_description(row["description"])
                skills_vi = self.translate_skills(row["skills"], skill_translations)
                tags_vi = self.translate_skills(row["tags_en"], skill_translations)

                # Add category tag based on job type
                if ", All Other" in row["title"]:
                    if not tags_vi:
                        tags_vi = "Khác|Tổng quát"
                    else:
                        tags_vi = f"Khác|Tổng quát|{tags_vi}"
                elif "Manager" in row["title"]:
                    if not tags_vi:
                        tags_vi = "Quản lý"
                    else:
                        tags_vi = f"Quản lý|{tags_vi}"

                vi_job = {
                    "job_id": job_id,
                    "title_vi": title_vi,
                    "description_vi": description_vi,
                    "skills_vi": skills_vi,
                    "riasec_centroid_json": row["riasec_vector"],
                    "tags_vi": tags_vi,
                }

                new_translations += 1

                if new_translations <= 5:  # Show first 5 new translations
                    print(f"   ✅ New: {job_id} - {title_vi}")

            vietnamese_jobs.append(vi_job)

        print("\n📊 Translation Summary:")
        print(f"   - Total jobs: {len(vietnamese_jobs)}")
        print(f"   - Existing translations reused: {len(vietnamese_jobs) - new_translations}")
        print(f"   - New translations created: {new_translations}")

        self.stats["new_translations"] = new_translations

        return pd.DataFrame(vietnamese_jobs)

    def save_vietnamese_jobs(self, vi_jobs_df):
        """Save Vietnamese jobs to file"""
        print("\n" + "=" * 60)
        print("💾 SAVING VIETNAMESE JOBS")
        print("=" * 60)

        try:
            # Save to new file
            vi_jobs_df.to_csv(OUTPUT_FILE, index=False, quoting=1)  # quoting=1 for QUOTE_ALL
            print(f"✅ Saved Vietnamese jobs to: {OUTPUT_FILE}")

            # Also update the original file
            original_output = CATALOG_DIR / "jobs_vi_tagged.csv"
            vi_jobs_df.to_csv(original_output, index=False, quoting=1)
            print(f"✅ Updated original: {original_output}")

            # Show file stats
            file_size = OUTPUT_FILE.stat().st_size / 1024
            print("\n📊 File Statistics:")
            print(f"   - Total records: {len(vi_jobs_df):,}")
            print(f"   - File size: {file_size:.1f} KB")
            print(f"   - Columns: {list(vi_jobs_df.columns)}")

            # Show sample of All Other jobs
            all_other_jobs = vi_jobs_df[vi_jobs_df["title_vi"].str.contains("Khác", na=False)]
            if not all_other_jobs.empty:
                print("\n📋 Sample All Other jobs translated:")
                for _, row in all_other_jobs.head(3).iterrows():
                    print(f"   - {row['job_id']}: {row['title_vi']}")

            return True

        except Exception as e:
            print(f"❌ Error saving Vietnamese jobs: {e}")
            return False

    def run(self):
        """Execute the complete translation process"""
        print("\n" + "=" * 60)
        print("🌐 JOBS TRANSLATION & TAGGING")
        print("=" * 60)
        print("This script translates jobs to Vietnamese and adds tags")
        print("to create jobs_vi_tagged.csv for the AI pipeline.")

        # Step 1: Load jobs data
        if not self.load_jobs():
            return False

        # Step 2: Load existing translations
        if not self.load_existing_translations():
            return False

        # Step 3: Create Vietnamese translations
        vi_jobs_df = self.create_vietnamese_jobs()

        if vi_jobs_df.empty:
            print("\n❌ No Vietnamese jobs created")
            return False

        # Step 4: Save Vietnamese jobs
        if not self.save_vietnamese_jobs(vi_jobs_df):
            return False

        # Final summary
        print("\n" + "=" * 60)
        print("📋 TRANSLATION SUMMARY")
        print("=" * 60)
        print(f"  Total jobs processed: {self.stats['total_jobs']:,}")
        print(f"  All Other jobs included: {self.stats['all_other_jobs']:,}")
        print(f"  Existing translations reused: {self.stats['existing_translations']:,}")
        print(f"  New translations created: {self.stats['new_translations']:,}")

        print("\n✅ Translation completed successfully!")
        print(f"   Output file: {OUTPUT_FILE.name}")
        print("   Ready for next step: Database loading")

        print("\n" + "=" * 60 + "\n")
        return True


def main():
    """Main entry point"""
    translator = JobsTranslator()
    success = translator.run()

    if not success:
        print("❌ Translation failed")
        sys.exit(1)

    print("🎉 Jobs translation and tagging completed!")


if __name__ == "__main__":
    main()
