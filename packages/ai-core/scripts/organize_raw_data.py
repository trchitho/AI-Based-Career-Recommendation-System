#!/usr/bin/env python3
"""
Script: organize_raw_data.py
Purpose: Copy and organize raw O*NET and ESCO files into standardized directories
Author: Senior Data Engineer
Date: 2026-01-27
"""

import shutil
from pathlib import Path

# Define base paths
BASE_DIR = Path(__file__).resolve().parents[1]  # packages/ai-core
RAW_DIR = BASE_DIR / "data" / "raw"

# Source directories
ONET_SOURCE = RAW_DIR / "db_30_1_text"
ESCO_SOURCE = RAW_DIR / "ESCO dataset - v1.2.1 - classification - en - csv"

# Target directories
ONET_TARGET = RAW_DIR / "onet"
ESCO_TARGET = RAW_DIR / "esco"

# Files to copy from O*NET
ONET_FILES = [
    "Work Activities.txt",
    "Work Context.txt",
    "Education, Training, and Experience.txt",
    "Job Zones.txt",
    "DWA Reference.txt",
    "Tasks to DWAs.txt",
    "Work Context Categories.txt",
    "IWA Reference.txt",
]

# Files to copy from ESCO
ESCO_FILES = [
    "skills_en.csv",
    "occupations_en.csv",
    "occupationSkillRelations_en.csv",
    "ISCOGroups_en.csv",
]


def organize_onet_files():
    """Copy required O*NET files to target directory"""
    print(f"\n{'='*60}")
    print("PHASE 1: Organizing O*NET Files")
    print(f"{'='*60}")
    
    # Create target directory if not exists
    ONET_TARGET.mkdir(parents=True, exist_ok=True)
    
    copied_count = 0
    skipped_count = 0
    
    for filename in ONET_FILES:
        source_file = ONET_SOURCE / filename
        target_file = ONET_TARGET / filename
        
        if source_file.exists():
            # Check if target already exists
            if target_file.exists():
                print(f"  ⚠️  SKIP: {filename} (already exists)")
                skipped_count += 1
            else:
                shutil.copy2(source_file, target_file)
                print(f"  ✅ COPY: {filename}")
                copied_count += 1
        else:
            print(f"  ❌ MISSING: {filename} (not found in source)")
    
    print(f"\n📊 O*NET Summary: {copied_count} copied, {skipped_count} skipped")
    return copied_count


def organize_esco_files():
    """Copy required ESCO files to target directory"""
    print(f"\n{'='*60}")
    print("PHASE 2: Organizing ESCO Files")
    print(f"{'='*60}")
    
    # Create target directory if not exists
    ESCO_TARGET.mkdir(parents=True, exist_ok=True)
    
    copied_count = 0
    skipped_count = 0
    
    for filename in ESCO_FILES:
        source_file = ESCO_SOURCE / filename
        target_file = ESCO_TARGET / filename
        
        if source_file.exists():
            # Check if target already exists
            if target_file.exists():
                print(f"  ⚠️  SKIP: {filename} (already exists)")
                skipped_count += 1
            else:
                shutil.copy2(source_file, target_file)
                print(f"  ✅ COPY: {filename}")
                copied_count += 1
        else:
            print(f"  ❌ MISSING: {filename} (not found in source)")
    
    print(f"\n📊 ESCO Summary: {copied_count} copied, {skipped_count} skipped")
    return copied_count


def verify_crosswalk_file():
    """Verify that the crosswalk file exists"""
    print(f"\n{'='*60}")
    print("PHASE 3: Verifying Crosswalk File")
    print(f"{'='*60}")
    
    crosswalk_file = RAW_DIR / "ESCO_to_ONET-SOC.csv"
    
    if crosswalk_file.exists():
        file_size = crosswalk_file.stat().st_size / 1024  # KB
        print(f"  ✅ FOUND: ESCO_to_ONET-SOC.csv ({file_size:.2f} KB)")
        return True
    else:
        print(f"  ❌ MISSING: ESCO_to_ONET-SOC.csv")
        return False


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🚀 RAW DATA ORGANIZATION SCRIPT")
    print("="*60)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Raw Data Directory: {RAW_DIR}")
    
    # Execute organization phases
    onet_copied = organize_onet_files()
    esco_copied = organize_esco_files()
    crosswalk_ok = verify_crosswalk_file()
    
    # Final summary
    print(f"\n{'='*60}")
    print("📋 FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"  O*NET files organized: {onet_copied}")
    print(f"  ESCO files organized: {esco_copied}")
    print(f"  Crosswalk file: {'✅ OK' if crosswalk_ok else '❌ MISSING'}")
    
    if onet_copied > 0 or esco_copied > 0:
        print(f"\n✅ Organization complete! Ready for ETL processing.")
    else:
        print(f"\n⚠️  No new files copied. Files may already be organized.")
    
    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    main()
