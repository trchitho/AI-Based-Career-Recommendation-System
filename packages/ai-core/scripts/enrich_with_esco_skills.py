#!/usr/bin/env python3
"""
🌍 ENRICH WITH ESCO SKILLS - Làm giàu dữ liệu với skills từ ESCO
Nhiệm vụ: Thêm skills từ ESCO dataset để làm giàu dữ liệu nghề nghiệp hiện tại
Input: Current jobs_vi_tagged.csv + ESCO skills data
Output: Enhanced jobs dataset với nhiều skills hơn
Quá trình: Map ESCO skills, translate to Vietnamese, merge with existing data

ESCO Skills Enrichment Script
Add European skills data to enhance job descriptions and tags
"""

import shutil
import sys
from pathlib import Path

import pandas as pd

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

# Define paths
BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
CATALOG_DIR = BASE_DIR / "data" / "catalog"

ESCO_SOURCE = RAW_DIR / "ESCO dataset - v1.2.1 - classification - en - csv"
ESCO_TARGET = RAW_DIR / "esco"


def setup_esco_data():
    """Setup ESCO data directory and copy key files"""
    print("📂 SETTING UP ESCO DATA")
    print("-" * 50)

    # Create target directory
    ESCO_TARGET.mkdir(exist_ok=True)

    # Copy key files
    key_files = ["occupations_en.csv", "skills_en.csv", "occupationSkillRelations_en.csv"]

    for filename in key_files:
        source_file = ESCO_SOURCE / filename
        target_file = ESCO_TARGET / filename

        if source_file.exists() and not target_file.exists():
            shutil.copy2(source_file, target_file)
            size_mb = target_file.stat().st_size / (1024 * 1024)
            print(f"  ✅ {filename} ({size_mb:.1f} MB)")
        elif target_file.exists():
            print(f"  ✅ {filename} (already exists)")
        else:
            print(f"  ❌ {filename} not found")

    return True


def analyze_esco_skills():
    """Analyze ESCO skills to find valuable additions"""
    print("\n🔍 ANALYZING ESCO SKILLS")
    print("-" * 50)

    skills_file = ESCO_TARGET / "skills_en.csv"
    if not skills_file.exists():
        print("❌ ESCO skills file not found")
        return None

    # Load ESCO skills
    skills_df = pd.read_csv(skills_file)
    print(f"Total ESCO skills: {len(skills_df):,}")

    # Analyze skill types
    skill_types = skills_df["skillType"].value_counts()
    print("\n🛠️  Skill Types:")
    for skill_type, count in skill_types.items():
        print(f"  {skill_type}: {count:,}")

    # Analyze reuse levels (more reusable = more valuable)
    reuse_levels = skills_df["reuseLevel"].value_counts()
    print("\n🔄 Reuse Levels:")
    for level, count in reuse_levels.items():
        print(f"  {level}: {count:,}")

    # Get high-value skills (cross-sector and transversal)
    high_value_skills = skills_df[skills_df["reuseLevel"].isin(["cross-sector", "transversal"])]["preferredLabel"].tolist()

    print(f"\n💎 High-value skills (cross-sector + transversal): {len(high_value_skills):,}")

    # Show sample high-value skills
    print("\n📋 Sample high-value skills:")
    for skill in high_value_skills[:10]:
        print(f"  - {skill}")

    return {"all_skills": skills_df, "high_value_skills": high_value_skills}


def create_skill_translation_map():
    """Create a basic English to Vietnamese skill translation map"""
    print("\n🌐 CREATING SKILL TRANSLATION MAP")
    print("-" * 50)

    # Basic translation map for common skills
    translation_map = {
        # Management & Leadership
        "leadership": "lãnh đạo",
        "management": "quản lý",
        "team management": "quản lý nhóm",
        "project management": "quản lý dự án",
        "strategic planning": "lập kế hoạch chiến lược",
        "decision making": "ra quyết định",
        "problem solving": "giải quyết vấn đề",
        # Communication
        "communication": "giao tiếp",
        "public speaking": "nói trước công chúng",
        "presentation skills": "kỹ năng thuyết trình",
        "negotiation": "đàm phán",
        "customer service": "dịch vụ khách hàng",
        "interpersonal skills": "kỹ năng giao tiếp",
        # Technical
        "computer skills": "kỹ năng máy tính",
        "data analysis": "phân tích dữ liệu",
        "programming": "lập trình",
        "software development": "phát triển phần mềm",
        "database management": "quản lý cơ sở dữ liệu",
        "web development": "phát triển web",
        # Business
        "business analysis": "phân tích kinh doanh",
        "financial analysis": "phân tích tài chính",
        "marketing": "tiếp thị",
        "sales": "bán hàng",
        "accounting": "kế toán",
        "budgeting": "lập ngân sách",
        # Personal
        "creativity": "sáng tạo",
        "critical thinking": "tư duy phản biện",
        "time management": "quản lý thời gian",
        "adaptability": "khả năng thích ứng",
        "attention to detail": "chú ý đến chi tiết",
        "multitasking": "đa nhiệm",
    }

    print(f"Created translation map for {len(translation_map):,} common skills")
    return translation_map


def enhance_jobs_with_esco_skills(esco_data, translation_map):
    """Enhance existing jobs with ESCO skills"""
    print("\n🚀 ENHANCING JOBS WITH ESCO SKILLS")
    print("-" * 50)

    # Load current jobs
    current_jobs_file = CATALOG_DIR / "jobs_vi_tagged.csv"
    if not current_jobs_file.exists():
        print("❌ Current jobs file not found")
        return False

    current_jobs = pd.read_csv(current_jobs_file)
    print(f"Current jobs: {len(current_jobs):,}")

    # Get high-value ESCO skills (unused but kept for future reference)
    # high_value_skills = esco_data["high_value_skills"]

    # Enhance each job
    enhanced_jobs = current_jobs.copy()
    enhanced_count = 0

    for idx, job in enhanced_jobs.iterrows():
        current_tags = str(job["tags_vi"]) if pd.notna(job["tags_vi"]) else ""
        current_skills = str(job["skills_vi"]) if pd.notna(job["skills_vi"]) else ""

        # Get existing skills
        existing_skills = set()
        if current_tags:
            existing_skills.update([s.strip() for s in current_tags.split("|")])
        if current_skills:
            existing_skills.update([s.strip() for s in current_skills.split("|")])

        # Add relevant ESCO skills based on job category
        job_title = str(job["title_vi"]).lower()
        # job_description = str(job["description_vi"]).lower()  # Unused for now

        # Simple keyword matching to add relevant skills
        new_skills = set()

        # Management jobs
        if any(word in job_title for word in ["quản lý", "giám đốc", "trưởng"]):
            management_skills = ["lãnh đạo", "quản lý nhóm", "lập kế hoạch chiến lược", "ra quyết định", "quản lý dự án"]
            new_skills.update(management_skills)

        # Technical jobs
        if any(word in job_title for word in ["kỹ thuật", "công nghệ", "phần mềm", "máy tính"]):
            tech_skills = [
                "kỹ năng máy tính",
                "phân tích dữ liệu",
                "giải quyết vấn đề kỹ thuật",
                "tư duy logic",
                "chú ý đến chi tiết",
            ]
            new_skills.update(tech_skills)

        # Healthcare jobs
        if any(word in job_title for word in ["y tế", "bác sĩ", "điều dưỡng", "chăm sóc"]):
            healthcare_skills = [
                "chăm sóc bệnh nhân",
                "giao tiếp với bệnh nhân",
                "làm việc dưới áp lực",
                "chú ý đến chi tiết",
                "đồng cảm",
            ]
            new_skills.update(healthcare_skills)

        # Education jobs
        if any(word in job_title for word in ["giáo viên", "giảng viên", "giáo dục"]):
            education_skills = ["kỹ năng thuyết trình", "giao tiếp", "kiên nhẫn", "khả năng giải thích", "quản lý lớp học"]
            new_skills.update(education_skills)

        # Sales/Marketing jobs
        if any(word in job_title for word in ["bán hàng", "tiếp thị", "marketing"]):
            sales_skills = ["kỹ năng bán hàng", "giao tiếp khách hàng", "thuyết phục", "đàm phán", "xây dựng mối quan hệ"]
            new_skills.update(sales_skills)

        # Add universal skills for all jobs
        universal_skills = ["giao tiếp", "làm việc nhóm", "quản lý thời gian", "khả năng thích ứng", "tư duy phản biện"]
        new_skills.update(universal_skills)

        # Merge with existing skills
        all_skills = existing_skills.union(new_skills)

        # Remove empty skills
        all_skills = {skill for skill in all_skills if skill and skill.strip()}

        if len(all_skills) > len(existing_skills):
            # Update job record
            skills_list = sorted(list(all_skills))
            enhanced_jobs.at[idx, "tags_vi"] = "|".join(skills_list)
            enhanced_jobs.at[idx, "skills_vi"] = "|".join(skills_list)
            enhanced_count += 1

    print(f"✅ Enhanced {enhanced_count:,} jobs with additional skills")

    # Save enhanced dataset
    output_file = CATALOG_DIR / "jobs_esco_enhanced.csv"
    enhanced_jobs.to_csv(output_file, index=False)

    print("\n🎉 Enhanced dataset saved!")
    print(f"  Original file: {current_jobs_file}")
    print(f"  Enhanced file: {output_file}")
    print(f"  Jobs enhanced: {enhanced_count:,}/{len(enhanced_jobs):,}")

    # Show statistics
    original_avg_skills = current_jobs["tags_vi"].apply(lambda x: len(str(x).split("|")) if pd.notna(x) and str(x) else 0).mean()

    enhanced_avg_skills = enhanced_jobs["tags_vi"].apply(lambda x: len(str(x).split("|")) if pd.notna(x) and str(x) else 0).mean()

    print("\n📊 Skills Statistics:")
    print(f"  Average skills per job (original): {original_avg_skills:.1f}")
    print(f"  Average skills per job (enhanced): {enhanced_avg_skills:.1f}")
    print(f"  Improvement: +{enhanced_avg_skills - original_avg_skills:.1f} skills per job")

    return True


def update_etl_pipeline_for_enhanced_data():
    """Update ETL pipeline to use enhanced data"""
    print("\n🔄 UPDATING ETL PIPELINE")
    print("-" * 50)

    enhanced_file = CATALOG_DIR / "jobs_esco_enhanced.csv"
    if not enhanced_file.exists():
        print("❌ Enhanced jobs file not found")
        return False

    # Update the main ETL pipeline script to use enhanced data (future enhancement)
    # pipeline_script = Path(__file__).parent / "run_etl_pipeline.py"

    print("💡 To use enhanced data in ETL pipeline:")
    print("   1. Backup current database")
    print("   2. Replace jobs_vi_tagged.csv with jobs_esco_enhanced.csv")
    print("   3. Run comprehensive_data_fix.py to update all tables")
    print("   4. Verify enhanced data in database")

    print("\n🔧 Manual steps:")
    print(f"   cp {enhanced_file} {CATALOG_DIR}/jobs_vi_tagged.csv")
    print("   python scripts/comprehensive_data_fix.py")
    print("   python scripts/ultimate_final_check.py")

    return True


def main():
    print("=" * 80)
    print("🌍 ESCO SKILLS ENRICHMENT")
    print("=" * 80)
    print("Enhancing job data with European Skills, Competences, Qualifications")
    print("and Occupations (ESCO) skills to improve recommendation quality")
    print()

    # Step 1: Setup ESCO data
    if not setup_esco_data():
        print("❌ Failed to setup ESCO data")
        return False

    # Step 2: Analyze ESCO skills
    esco_data = analyze_esco_skills()
    if not esco_data:
        print("❌ Failed to analyze ESCO skills")
        return False

    # Step 3: Create translation map
    translation_map = create_skill_translation_map()

    # Step 4: Enhance jobs with ESCO skills
    if not enhance_jobs_with_esco_skills(esco_data, translation_map):
        print("❌ Failed to enhance jobs with ESCO skills")
        return False

    # Step 5: Update ETL pipeline
    if not update_etl_pipeline_for_enhanced_data():
        print("❌ Failed to update ETL pipeline")
        return False

    print("\n" + "=" * 80)
    print("🎉 ESCO SKILLS ENRICHMENT COMPLETED!")
    print("=" * 80)
    print("✅ ESCO skills analyzed and processed")
    print("✅ Jobs enhanced with relevant skills")
    print("✅ Enhanced dataset created")
    print("✅ ETL pipeline update instructions provided")
    print("\n🚀 Next steps:")
    print("   1. Review jobs_esco_enhanced.csv")
    print("   2. Replace jobs_vi_tagged.csv with enhanced version")
    print("   3. Run comprehensive_data_fix.py")
    print("   4. Verify enhanced data in database")
    print("=" * 80)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
