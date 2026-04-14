#!/usr/bin/env python3
"""
🌍 INTEGRATE ESCO DATA - Tích hợp dữ liệu ESCO châu Âu
Nhiệm vụ: Tích hợp dataset ESCO (35K occupations, 104K skills) để làm giàu dữ liệu nghề nghiệp
Input: ESCO dataset files + current jobs data
Output: Enhanced jobs dataset với ESCO occupations và skills
Quá trình: Copy ESCO files, merge với O*NET data, enrich skills, create mappings

ESCO Integration Script
Integrate European Skills, Competences, Qualifications and Occupations (ESCO) data
to enrich the career recommendation system with European job market data
"""

import shutil
import sys
from pathlib import Path

import pandas as pd

# Add ai_core to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from sqlalchemy import text

from ai_core.db import get_session

# Define paths
BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
CATALOG_DIR = BASE_DIR / "data" / "catalog"

ESCO_SOURCE = RAW_DIR / "ESCO dataset - v1.2.1 - classification - en - csv"
ESCO_TARGET = RAW_DIR / "esco"

# Key ESCO files to copy
ESCO_FILES = [
    "occupations_en.csv",
    "skills_en.csv",
    "occupationSkillRelations_en.csv",
    "ISCOGroups_en.csv",
    "skillGroups_en.csv",
    "broaderRelationsOccPillar_en.csv",
    "skillsHierarchy_en.csv",
]


def copy_esco_files():
    """Copy essential ESCO files to organized directory"""
    print("📂 COPYING ESCO FILES")
    print("-" * 50)

    # Create target directory
    ESCO_TARGET.mkdir(exist_ok=True)

    copied_files = []
    for filename in ESCO_FILES:
        source_file = ESCO_SOURCE / filename
        target_file = ESCO_TARGET / filename

        if source_file.exists():
            shutil.copy2(source_file, target_file)

            # Get file size
            size_mb = target_file.stat().st_size / (1024 * 1024)
            copied_files.append((filename, size_mb))
            print(f"  ✅ {filename} ({size_mb:.1f} MB)")
        else:
            print(f"  ❌ {filename} not found")

    print(f"\n✅ Copied {len(copied_files)} ESCO files")
    return copied_files


def analyze_esco_data():
    """Analyze ESCO data structure and content"""
    print("\n🔍 ANALYZING ESCO DATA")
    print("-" * 50)

    # Load key ESCO files
    occupations_file = ESCO_TARGET / "occupations_en.csv"
    skills_file = ESCO_TARGET / "skills_en.csv"
    relations_file = ESCO_TARGET / "occupationSkillRelations_en.csv"

    if not all([f.exists() for f in [occupations_file, skills_file, relations_file]]):
        print("❌ Required ESCO files not found")
        return None

    # Load data
    print("📊 Loading ESCO data...")
    occupations_df = pd.read_csv(occupations_file)
    skills_df = pd.read_csv(skills_file)
    relations_df = pd.read_csv(relations_file)

    print(f"  ESCO Occupations: {len(occupations_df):,}")
    print(f"  ESCO Skills: {len(skills_df):,}")
    print(f"  Occupation-Skill Relations: {len(relations_df):,}")

    # Analyze ISCO groups
    isco_groups = occupations_df["iscoGroup"].value_counts().head(10)
    print("\n🏷️  Top ISCO Groups:")
    for isco_code, count in isco_groups.items():
        print(f"  {isco_code}: {count:,} occupations")

    # Analyze skill types
    skill_types = skills_df["skillType"].value_counts()
    print("\n🛠️  Skill Types:")
    for skill_type, count in skill_types.items():
        print(f"  {skill_type}: {count:,} skills")

    # Analyze reuse levels
    reuse_levels = skills_df["reuseLevel"].value_counts()
    print("\n🔄 Skill Reuse Levels:")
    for level, count in reuse_levels.items():
        print(f"  {level}: {count:,} skills")

    return {"occupations": occupations_df, "skills": skills_df, "relations": relations_df}


def map_esco_to_onet():
    """Map ESCO occupations to existing O*NET data"""
    print("\n🔗 MAPPING ESCO TO O*NET")
    print("-" * 50)

    # Load current O*NET jobs
    current_jobs_file = CATALOG_DIR / "jobs_vi_tagged.csv"
    if not current_jobs_file.exists():
        print("❌ Current jobs file not found")
        return None

    current_jobs = pd.read_csv(current_jobs_file)
    print(f"Current O*NET jobs: {len(current_jobs):,}")

    # Load ESCO occupations (for future use)
    # esco_occupations = pd.read_csv(ESCO_TARGET / "occupations_en.csv")

    # Load existing ESCO-ONET crosswalk
    crosswalk_file = RAW_DIR / "ESCO_to_ONET-SOC.csv"
    if crosswalk_file.exists():
        # File uses semicolon as delimiter
        crosswalk_df = pd.read_csv(crosswalk_file, sep=";")
        print(f"Existing ESCO-ONET mappings: {len(crosswalk_df):,}")

        # Find ESCO occupations that map to our O*NET jobs
        onet_codes = set(current_jobs["job_id"])
        mapped_esco = crosswalk_df[crosswalk_df["O*NET-SOC 2019 Code"].isin(onet_codes)]
        print(f"ESCO occupations mapped to our O*NET jobs: {len(mapped_esco):,}")

        return mapped_esco
    else:
        print("⚠️  ESCO-ONET crosswalk file not found")
        return None


def create_enhanced_jobs_dataset(esco_data, mapped_esco):
    """Create enhanced jobs dataset with ESCO data"""
    print("\n🚀 CREATING ENHANCED JOBS DATASET")
    print("-" * 50)

    if not esco_data or mapped_esco is None:
        print("❌ Required data not available")
        return False

    # Load current jobs
    current_jobs = pd.read_csv(CATALOG_DIR / "jobs_vi_tagged.csv")
    print(f"Starting with {len(current_jobs):,} O*NET jobs")

    # Strategy 1: Enhance existing jobs with ESCO skills
    enhanced_jobs = current_jobs.copy()

    # Load ESCO occupation-skill relations
    relations_df = esco_data["relations"]
    skills_df = esco_data["skills"]

    # Create skill lookup
    skill_lookup = dict(zip(skills_df["conceptUri"], skills_df["preferredLabel"]))

    # Enhance jobs with ESCO skills
    enhanced_count = 0
    for idx, job in enhanced_jobs.iterrows():
        job_id = job["job_id"]

        # Find ESCO occupations for this O*NET job
        esco_mappings = mapped_esco[mapped_esco["O*NET-SOC 2019 Code"] == job_id]

        if len(esco_mappings) > 0:
            # Get ESCO skills for these occupations
            esco_skills = set()
            for _, mapping in esco_mappings.iterrows():
                esco_code = mapping.get("ESCO/ISCO Code", "")
                esco_title = mapping.get("ESCO/ISCO Title", "")
                if esco_code and esco_title:
                    # For now, we'll use ESCO title as additional skill
                    # In a full implementation, we'd map ESCO codes to ESCO URIs
                    esco_skills.add(esco_title)

            if esco_skills:
                # Add ESCO skills to existing tags
                current_tags = str(job["tags_vi"]) if pd.notna(job["tags_vi"]) else ""
                current_skills = str(job["skills_vi"]) if pd.notna(job["skills_vi"]) else ""

                # Merge skills (avoid duplicates)
                all_skills = set()
                if current_tags:
                    all_skills.update(current_tags.split("|"))
                if current_skills:
                    all_skills.update(current_skills.split("|"))

                # Add ESCO skills (translated to Vietnamese would be ideal)
                all_skills.update(esco_skills)

                # Update the job record
                enhanced_jobs.at[idx, "tags_vi"] = "|".join(sorted(all_skills))
                enhanced_jobs.at[idx, "skills_vi"] = "|".join(sorted(all_skills))
                enhanced_count += 1

    print(f"✅ Enhanced {enhanced_count:,} jobs with ESCO skills")

    # Strategy 2: Add high-value ESCO occupations not in O*NET
    print("\n🆕 Adding new ESCO occupations...")

    # Find popular ESCO occupations not mapped to O*NET
    occupations_df = esco_data["occupations"]

    # Get ESCO occupations with many skills (high-value)
    esco_skill_counts = relations_df.groupby("occupationUri").size().reset_index(columns=["skill_count"])
    esco_skill_counts = esco_skill_counts.sort_values("skill_count", ascending=False)

    # Get top ESCO occupations not in our current dataset
    mapped_esco_uris = set(mapped_esco["ESCO URI"]) if len(mapped_esco) > 0 else set()
    new_esco_candidates = []

    for _, row in esco_skill_counts.head(1000).iterrows():  # Top 1000 skill-rich occupations
        esco_uri = row["occupationUri"]
        if esco_uri not in mapped_esco_uris:
            # Get occupation details
            occ_details = occupations_df[occupations_df["conceptUri"] == esco_uri]
            if len(occ_details) > 0:
                occ = occ_details.iloc[0]
                new_esco_candidates.append(
                    {
                        "esco_uri": esco_uri,
                        "title": occ["preferredLabel"],
                        "description": occ.get("description", ""),
                        "isco_group": occ.get("iscoGroup", ""),
                        "skill_count": row["skill_count"],
                    }
                )

    print(f"Found {len(new_esco_candidates):,} new ESCO occupation candidates")

    # Add top 100 new ESCO occupations
    new_jobs = []
    for i, candidate in enumerate(new_esco_candidates[:100]):
        # Create synthetic job ID for ESCO occupations
        job_id = f"ESCO-{candidate['isco_group']}-{i + 1:03d}"

        # Get skills for this occupation
        occ_skills = relations_df[relations_df["occupationUri"] == candidate["esco_uri"]]
        skills_list = []
        for _, skill_rel in occ_skills.iterrows():
            skill_label = skill_lookup.get(skill_rel["skillUri"], "")
            if skill_label:
                skills_list.append(skill_label)

        # Create job record
        new_job = {
            "job_id": job_id,
            "title_vi": candidate["title"],  # Would need translation
            "description_vi": candidate["description"][:500] if candidate["description"] else "",
            "skills_vi": "|".join(skills_list[:20]),  # Limit to top 20 skills
            "riasec_centroid_json": "[0.5, 0.5, 0.5, 0.5, 0.5, 0.5]",  # Default RIASEC
            "tags_vi": "|".join(skills_list[:20]),
        }
        new_jobs.append(new_job)

    if new_jobs:
        new_jobs_df = pd.DataFrame(new_jobs)
        enhanced_jobs = pd.concat([enhanced_jobs, new_jobs_df], ignore_index=True)
        print(f"✅ Added {len(new_jobs):,} new ESCO occupations")

    # Save enhanced dataset
    output_file = CATALOG_DIR / "jobs_esco_enhanced.csv"
    enhanced_jobs.to_csv(output_file, index=False)

    print("\n🎉 Enhanced dataset created!")
    print(f"  Original jobs: {len(current_jobs):,}")
    print(f"  Enhanced jobs: {len(enhanced_jobs):,}")
    print(f"  New jobs added: {len(enhanced_jobs) - len(current_jobs):,}")
    print(f"  Output file: {output_file}")

    return True


def update_database_with_enhanced_data():
    """Update database with enhanced ESCO data"""
    print("\n🗄️  UPDATING DATABASE")
    print("-" * 50)

    enhanced_file = CATALOG_DIR / "jobs_esco_enhanced.csv"
    if not enhanced_file.exists():
        print("❌ Enhanced jobs file not found")
        return False

    enhanced_jobs = pd.read_csv(enhanced_file)
    print(f"Loading {len(enhanced_jobs):,} enhanced jobs into database...")

    session = get_session()

    try:
        # Check current database state
        result = session.execute(text("SELECT COUNT(*) FROM core.careers"))
        current_count = result.scalar()
        print(f"Current database careers: {current_count:,}")

        if len(enhanced_jobs) > current_count:
            print(f"⚠️  Enhanced dataset has {len(enhanced_jobs) - current_count:,} more jobs")
            print("   Database tables will need to be updated:")
            print("   - core.careers")
            print("   - core.career_interests")
            print("   - core.career_tags")
            print("   - core.career_tag_map")
            print("   - core.career_riasec_map")
            print("   - ai.retrieval_jobs_visbert")
            print("   - ai.career_embeddings")

            print("\n💡 Recommendation:")
            print("   1. Backup current database")
            print("   2. Run comprehensive ETL pipeline with enhanced data")
            print("   3. Use jobs_esco_enhanced.csv as new input")
        else:
            print("✅ Enhanced dataset size matches current database")

        return True

    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False
    finally:
        session.close()


def main():
    print("=" * 80)
    print("🌍 ESCO DATA INTEGRATION")
    print("=" * 80)
    print("Integrating European Skills, Competences, Qualifications and Occupations")
    print("(ESCO) data to enrich the AI Career Recommendation System")
    print()

    # Step 1: Copy ESCO files
    copied_files = copy_esco_files()
    if not copied_files:
        print("❌ Failed to copy ESCO files")
        return False

    # Step 2: Analyze ESCO data
    esco_data = analyze_esco_data()
    if not esco_data:
        print("❌ Failed to analyze ESCO data")
        return False

    # Step 3: Map ESCO to O*NET
    mapped_esco = map_esco_to_onet()

    # Step 4: Create enhanced dataset
    if not create_enhanced_jobs_dataset(esco_data, mapped_esco):
        print("❌ Failed to create enhanced dataset")
        return False

    # Step 5: Update database recommendations
    if not update_database_with_enhanced_data():
        print("❌ Failed to check database update requirements")
        return False

    print("\n" + "=" * 80)
    print("🎉 ESCO INTEGRATION COMPLETED!")
    print("=" * 80)
    print("✅ ESCO files copied and organized")
    print("✅ Enhanced jobs dataset created")
    print("✅ Database update recommendations provided")
    print("\n🚀 Next steps:")
    print("   1. Review jobs_esco_enhanced.csv")
    print("   2. Run ETL pipeline with enhanced data")
    print("   3. Update all database tables")
    print("=" * 80)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
