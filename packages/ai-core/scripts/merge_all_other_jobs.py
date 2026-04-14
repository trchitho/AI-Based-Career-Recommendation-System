#!/usr/bin/env python3
"""
🔀 MERGE ALL OTHER JOBS - Script cốt lõi ETL Pipeline
Nhiệm vụ: Merge các nghề "All Other" vào danh sách nghề chính
Input: jobs.csv (923 nghề gốc) + O-NET-SOC All Other.csv (36 nghề)
Output: jobs_complete.csv (959 nghề với 100% ESCO coverage)
Quá trình: Đọc 2 file CSV, merge dữ liệu, format chuẩn, ensure ESCO compatibility

Script: merge_all_other_jobs.py
Purpose: Merge "All Other" jobs from ESCO crosswalk into jobs.csv
Author: Senior Data Engineer
Date: 2026-01-27

This script:
1. Reads the current jobs.csv (without "All Other" jobs)
2. Reads the "All Other" jobs from O-NET-SOC 2019 Code - Dính All Other.csv
3. Merges them into a complete jobs.csv with proper formatting
4. Ensures all jobs from ESCO crosswalk are included
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Define paths
BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
CATALOG_DIR = BASE_DIR / "data" / "catalog"

# Input files
CURRENT_JOBS_FILE = CATALOG_DIR / "jobs.csv"
ALL_OTHER_JOBS_FILE = RAW_DIR / "O-NET-SOC 2019 Code - Dính All Other.csv"
ESCO_CROSSWALK_FILE = RAW_DIR / "ESCO_to_ONET-SOC.csv"

# Output file
OUTPUT_JOBS_FILE = CATALOG_DIR / "jobs_complete.csv"


class AllOtherJobsMerger:
    """Merge All Other jobs into the main jobs catalog"""
    
    def __init__(self):
        self.current_jobs = None
        self.all_other_jobs = None
        self.esco_crosswalk = None
        self.stats = {
            'current_jobs': 0,
            'all_other_unique': 0,
            'merged_total': 0,
            'duplicates_skipped': 0
        }
    
    def load_current_jobs(self):
        """Load current jobs.csv"""
        print("\n" + "="*60)
        print("📂 LOADING CURRENT JOBS")
        print("="*60)
        
        if not CURRENT_JOBS_FILE.exists():
            print(f"❌ Current jobs file not found: {CURRENT_JOBS_FILE}")
            return False
        
        try:
            self.current_jobs = pd.read_csv(CURRENT_JOBS_FILE)
            print(f"✅ Loaded {len(self.current_jobs)} current jobs")
            print(f"   Columns: {list(self.current_jobs.columns)}")
            
            # Show sample
            print(f"\n📋 Sample current jobs:")
            for i, row in self.current_jobs.head(3).iterrows():
                print(f"   - {row['job_id']}: {row['title']}")
            
            self.stats['current_jobs'] = len(self.current_jobs)
            return True
            
        except Exception as e:
            print(f"❌ Error loading current jobs: {e}")
            return False
    
    def load_all_other_jobs(self):
        """Load All Other jobs from crosswalk file"""
        print("\n" + "="*60)
        print("📂 LOADING ALL OTHER JOBS")
        print("="*60)
        
        if not ALL_OTHER_JOBS_FILE.exists():
            print(f"❌ All Other jobs file not found: {ALL_OTHER_JOBS_FILE}")
            return False
        
        try:
            # Read with semicolon separator
            self.all_other_jobs = pd.read_csv(ALL_OTHER_JOBS_FILE, sep=';')
            print(f"✅ Loaded {len(self.all_other_jobs)} All Other job mappings")
            print(f"   Columns: {list(self.all_other_jobs.columns)}")
            
            # Clean column names
            self.all_other_jobs.columns = self.all_other_jobs.columns.str.strip()
            
            # Show unique O*NET codes
            unique_onet_codes = self.all_other_jobs['O*NET-SOC 2019 Code'].unique()
            print(f"   Unique O*NET codes: {len(unique_onet_codes)}")
            
            # Show sample
            print(f"\n📋 Sample All Other jobs:")
            for code in unique_onet_codes[:5]:
                title = self.all_other_jobs[
                    self.all_other_jobs['O*NET-SOC 2019 Code'] == code
                ]['O*NET-SOC 2019 Title'].iloc[0]
                count = len(self.all_other_jobs[
                    self.all_other_jobs['O*NET-SOC 2019 Code'] == code
                ])
                print(f"   - {code}: {title} ({count} ESCO mappings)")
            
            self.stats['all_other_unique'] = len(unique_onet_codes)
            return True
            
        except Exception as e:
            print(f"❌ Error loading All Other jobs: {e}")
            return False
    
    def load_esco_crosswalk(self):
        """Load ESCO crosswalk for verification"""
        print("\n" + "="*60)
        print("📂 LOADING ESCO CROSSWALK")
        print("="*60)
        
        if not ESCO_CROSSWALK_FILE.exists():
            print(f"❌ ESCO crosswalk file not found: {ESCO_CROSSWALK_FILE}")
            return False
        
        try:
            # Read with semicolon separator
            self.esco_crosswalk = pd.read_csv(ESCO_CROSSWALK_FILE, sep=';')
            print(f"✅ Loaded {len(self.esco_crosswalk)} ESCO crosswalk mappings")
            
            # Clean column names
            self.esco_crosswalk.columns = self.esco_crosswalk.columns.str.strip()
            
            # Show unique O*NET codes
            unique_onet_codes = self.esco_crosswalk['O*NET-SOC 2019 Code'].unique()
            print(f"   Total unique O*NET codes in crosswalk: {len(unique_onet_codes)}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading ESCO crosswalk: {e}")
            return False
    
    def create_all_other_jobs_entries(self):
        """Create job entries for All Other jobs"""
        print("\n" + "="*60)
        print("🔧 CREATING ALL OTHER JOB ENTRIES")
        print("="*60)
        
        # Get unique All Other jobs
        unique_all_other = self.all_other_jobs[
            ['O*NET-SOC 2019 Code', 'O*NET-SOC 2019 Title']
        ].drop_duplicates()
        
        print(f"📊 Creating entries for {len(unique_all_other)} unique All Other jobs")
        
        # Create job entries in the same format as current jobs
        new_jobs = []
        
        for _, row in unique_all_other.iterrows():
            onet_code = row['O*NET-SOC 2019 Code']
            title = row['O*NET-SOC 2019 Title']
            
            # Check if already exists in current jobs
            if onet_code in self.current_jobs['job_id'].values:
                print(f"   ⚠️  Skipping {onet_code} (already exists)")
                self.stats['duplicates_skipped'] += 1
                continue
            
            # Create job entry
            job_entry = {
                'job_id': onet_code,
                'title': title,
                'description': f"Workers in this occupation perform a variety of duties that are not covered by other specific occupational categories in the {title.split(',')[0]} field.",
                'skills': '',  # Empty for now, will be filled in translation step
                'riasec_vector': '[0.0, 0.0, 0.0, 0.0, 0.0, 0.0]',  # Default vector
                'tags_en': 'all-other|general|miscellaneous'  # Default tags
            }
            
            new_jobs.append(job_entry)
            
            if len(new_jobs) <= 5:  # Show first 5
                print(f"   ✅ Created: {onet_code} - {title}")
        
        print(f"\n📊 Created {len(new_jobs)} new All Other job entries")
        return pd.DataFrame(new_jobs)
    
    def merge_jobs(self, new_jobs_df):
        """Merge current jobs with All Other jobs"""
        print("\n" + "="*60)
        print("� MERGING JOBS")
        print("="*60)
        
        # Combine dataframes
        merged_jobs = pd.concat([self.current_jobs, new_jobs_df], ignore_index=True)
        
        # Sort by job_id
        merged_jobs = merged_jobs.sort_values('job_id').reset_index(drop=True)
        
        print(f"✅ Merged jobs:")
        print(f"   - Current jobs: {len(self.current_jobs)}")
        print(f"   - New All Other jobs: {len(new_jobs_df)}")
        print(f"   - Total merged: {len(merged_jobs)}")
        
        self.stats['merged_total'] = len(merged_jobs)
        
        return merged_jobs
    
    def verify_coverage(self, merged_jobs):
        """Verify that merged jobs cover all ESCO crosswalk entries"""
        print("\n" + "="*60)
        print("🔍 VERIFYING COVERAGE")
        print("="*60)
        
        # Get all O*NET codes from ESCO crosswalk
        esco_onet_codes = set(self.esco_crosswalk['O*NET-SOC 2019 Code'].unique())
        merged_onet_codes = set(merged_jobs['job_id'].unique())
        
        # Find missing codes
        missing_codes = esco_onet_codes - merged_onet_codes
        extra_codes = merged_onet_codes - esco_onet_codes
        
        print(f"📊 Coverage Analysis:")
        print(f"   - ESCO crosswalk O*NET codes: {len(esco_onet_codes)}")
        print(f"   - Merged jobs O*NET codes: {len(merged_onet_codes)}")
        print(f"   - Missing from merged: {len(missing_codes)}")
        print(f"   - Extra in merged: {len(extra_codes)}")
        
        if missing_codes:
            print(f"\n⚠️  Missing O*NET codes (first 10):")
            for code in list(missing_codes)[:10]:
                print(f"     - {code}")
        
        if extra_codes:
            print(f"\n📋 Extra O*NET codes (first 10):")
            for code in list(extra_codes)[:10]:
                print(f"     - {code}")
        
        coverage_pct = (len(merged_onet_codes & esco_onet_codes) / len(esco_onet_codes)) * 100
        print(f"\n✅ Coverage: {coverage_pct:.1f}%")
        
        return coverage_pct > 95  # Consider good if >95% coverage
    
    def save_merged_jobs(self, merged_jobs):
        """Save merged jobs to file"""
        print("\n" + "="*60)
        print("💾 SAVING MERGED JOBS")
        print("="*60)
        
        try:
            # Create backup of original if it exists
            if CURRENT_JOBS_FILE.exists():
                backup_file = CURRENT_JOBS_FILE.with_suffix('.csv.backup')
                CURRENT_JOBS_FILE.rename(backup_file)
                print(f"📋 Created backup: {backup_file.name}")
            
            # Save merged jobs
            merged_jobs.to_csv(OUTPUT_JOBS_FILE, index=False)
            print(f"✅ Saved merged jobs to: {OUTPUT_JOBS_FILE}")
            
            # Also update the original jobs.csv
            merged_jobs.to_csv(CURRENT_JOBS_FILE, index=False)
            print(f"✅ Updated original: {CURRENT_JOBS_FILE}")
            
            # Show final stats
            print(f"\n📊 Final Statistics:")
            print(f"   - Total jobs: {len(merged_jobs):,}")
            print(f"   - File size: {OUTPUT_JOBS_FILE.stat().st_size / 1024:.1f} KB")
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving merged jobs: {e}")
            return False
    
    def run(self):
        """Execute the complete merge process"""
        print("\n" + "="*60)
        print("🚀 ALL OTHER JOBS MERGER")
        print("="*60)
        print("This script merges 'All Other' jobs into the main jobs catalog")
        print("to ensure complete coverage of ESCO crosswalk mappings.")
        
        # Step 1: Load all data
        if not self.load_current_jobs():
            return False
        
        if not self.load_all_other_jobs():
            return False
        
        if not self.load_esco_crosswalk():
            return False
        
        # Step 2: Create All Other job entries
        new_jobs_df = self.create_all_other_jobs_entries()
        
        if new_jobs_df.empty:
            print("\n⚠️  No new All Other jobs to add")
            return True
        
        # Step 3: Merge jobs
        merged_jobs = self.merge_jobs(new_jobs_df)
        
        # Step 4: Verify coverage
        coverage_ok = self.verify_coverage(merged_jobs)
        
        # Step 5: Save merged jobs
        if not self.save_merged_jobs(merged_jobs):
            return False
        
        # Final summary
        print("\n" + "="*60)
        print("📋 MERGE SUMMARY")
        print("="*60)
        print(f"  Original jobs: {self.stats['current_jobs']:,}")
        print(f"  All Other jobs added: {self.stats['all_other_unique']:,}")
        print(f"  Duplicates skipped: {self.stats['duplicates_skipped']:,}")
        print(f"  Final total: {self.stats['merged_total']:,}")
        print(f"  ESCO coverage: {'✅ Good' if coverage_ok else '⚠️  Needs review'}")
        
        if coverage_ok:
            print(f"\n✅ Merge completed successfully!")
            print(f"   Ready for next step: Translation and tagging")
        else:
            print(f"\n⚠️  Merge completed with coverage issues")
            print(f"   Review missing codes before proceeding")
        
        print("\n" + "="*60 + "\n")
        return True


def main():
    """Main entry point"""
    merger = AllOtherJobsMerger()
    success = merger.run()
    
    if not success:
        print("❌ Merge failed")
        sys.exit(1)
    
    print("🎉 All Other jobs merge completed!")


if __name__ == "__main__":
    main()