#!/usr/bin/env python3
"""
🚀 RUN ETL PIPELINE - Script điều phối chính
Nhiệm vụ: Chạy toàn bộ ETL pipeline tự động từ đầu đến cuối
Input: Raw data files
Output: Database hoàn chỉnh, production-ready
Quá trình: Orchestrate tất cả scripts theo thứ tự, handle errors, report final status

Complete ETL Pipeline Runner
Executes the full ETL pipeline for AI Career Recommendation System
"""

import subprocess
import sys
from pathlib import Path


def run_script(script_name, description):
    """Run a Python script and return success status"""
    print(f"\n{'=' * 60}")
    print(f"🔄 RUNNING: {description}")
    print(f"{'=' * 60}")

    script_path = Path(__file__).parent / script_name

    if not script_path.exists():
        print(f"❌ Script not found: {script_path}")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes timeout
        )

        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout:
                # Show last few lines of output
                lines = result.stdout.strip().split("\n")
                for line in lines[-5:]:
                    if line.strip():
                        print(f"   {line}")
            return True
        else:
            print(f"❌ {description} failed")
            if result.stderr:
                print(f"Error: {result.stderr}")
            return False

    except subprocess.TimeoutExpired:
        print(f"❌ {description} timed out")
        return False
    except Exception as e:
        print(f"❌ {description} error: {e}")
        return False


def main():
    print("=" * 80)
    print("🚀 AI CAREER RECOMMENDATION SYSTEM")
    print("🗄️  COMPLETE ETL PIPELINE RUNNER")
    print("=" * 80)
    print("This script executes the complete ETL pipeline:")
    print("1. Organize raw data files")
    print("2. Merge 'All Other' jobs")
    print("3. Translate and tag jobs")
    print("4. Load data into database")
    print("5. Update embeddings table")
    print("6. Generate status report")
    print()

    # Pipeline steps
    pipeline_steps = [
        ("organize_raw_data.py", "Step 1: Organize Raw Data Files"),
        ("merge_all_other_jobs.py", "Step 2: Merge All Other Jobs"),
        ("translate_and_tag_jobs.py", "Step 3: Translate and Tag Jobs"),
        ("load_jobs_to_database.py", "Step 4: Load Jobs to Database"),
        ("update_embeddings_table.py", "Step 5: Update Embeddings Table"),
        ("etl_pipeline_status.py", "Step 6: Generate Status Report"),
    ]

    successful_steps = 0
    total_steps = len(pipeline_steps)

    for script_name, description in pipeline_steps:
        success = run_script(script_name, description)
        if success:
            successful_steps += 1
        else:
            print(f"\n⚠️  Pipeline step failed: {description}")
            print("You may continue with remaining steps or fix the issue.")

            user_input = input("Continue with next step? (y/n): ").lower().strip()
            if user_input != "y":
                break

    # Final summary
    print(f"\n{'=' * 80}")
    print("📋 ETL PIPELINE EXECUTION SUMMARY")
    print(f"{'=' * 80}")
    print(f"  Total steps: {total_steps}")
    print(f"  Successful: {successful_steps}")
    print(f"  Failed: {total_steps - successful_steps}")

    if successful_steps == total_steps:
        print("\n🎉 ETL PIPELINE COMPLETED SUCCESSFULLY!")
        print("   All data has been processed and loaded into the database.")
        print("   The AI Career Recommendation System is ready for use.")
    else:
        print("\n⚠️  ETL PIPELINE COMPLETED WITH ISSUES")
        print(f"   {successful_steps}/{total_steps} steps completed successfully.")
        print("   Please review the failed steps and run them individually if needed.")

    print("\n📊 Database Status:")
    print("   - Core tables: careers, career_interests, career_tags, mappings")
    print("   - AI tables: retrieval_jobs_visbert (for vector search)")
    print("   - Data quality: Vietnamese encoding, RIASEC scores, tag coverage")

    print("\n🔧 Next Steps:")
    print("   1. Review the status report above")
    print("   2. Fix any remaining encoding issues if needed")
    print("   3. Generate actual embeddings (currently using dummy vectors)")
    print("   4. Test the recommendation system with sample queries")

    print(f"\n{'=' * 80}")

    return successful_steps == total_steps


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
