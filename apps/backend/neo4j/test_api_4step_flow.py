#!/usr/bin/env python3
"""
Test API endpoints with new 4-step flow
"""

import requests

BASE_URL = "http://localhost:8000"


def test_api_endpoint(job_id: str, description: str):
    """Test API endpoint for a specific job"""
    print(f"\n🧪 TESTING API: {job_id} ({description})")
    print("-" * 60)

    try:
        url = f"{BASE_URL}/api/interview/jobs/{job_id}"
        response = requests.get(url, timeout=10)

        print(f"   📊 Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            # Extract skills information
            skills = data.get("skills", [])
            job_title = data.get("job_title", "Unknown")

            print(f"   📋 Job Title: {job_title}")
            print(f"   📊 Skills Count: {len(skills)}")

            if skills:
                print("   📋 Top 5 Skills:")
                for i, skill in enumerate(skills[:5], 1):
                    skill_name = skill.get("skill_name", "Unknown")
                    skill_type = skill.get("skill_type", "Unknown")
                    importance = skill.get("importance", 0)
                    source = skill.get("source", "Unknown")
                    print(f"      {i}. {skill_name}")
                    print(f"         Type: {skill_type} | Level: {importance:.2f}")
                    if source != "Unknown":
                        print(f"         Source: {source}")

                # Determine likely source based on skill characteristics
                first_skill = skills[0]
                if "Tư duy sáng tạo" in first_skill.get("skill_name", ""):
                    likely_source = "PostgreSQL work activities"
                elif "Tiếng Anh" in first_skill.get("skill_name", "") or "Khả năng" in first_skill.get("skill_type", ""):
                    likely_source = "PostgreSQL career_ksas (abilities/knowledge)"
                elif "Problem Solving" in first_skill.get("skill_name", ""):
                    likely_source = "Fallback"
                else:
                    likely_source = "Neo4j or other"

                print(f"   🎯 Likely Source: {likely_source}")
            else:
                print("   ❌ No skills returned")
        else:
            print(f"   ❌ API Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")

    except Exception as e:
        print(f"   ❌ Request failed: {e}")


def main():
    print("🚀 TESTING API ENDPOINTS WITH NEW 4-STEP FLOW")
    print("=" * 80)

    # Test different job types
    test_jobs = [
        ("15-1252.00", "Software Developer - should use work activities"),
        ("17-2051.00", "Civil Engineer - should use work activities"),
        ("33-9094.00", "Job without work activities - should use KSAs"),
        ("45-2099.00", "Job without work activities - should use KSAs"),
        ("99-9999.00", "Non-existent job - should use fallback"),
    ]

    for job_id, description in test_jobs:
        test_api_endpoint(job_id, description)

    print(f"\n{'=' * 80}")
    print("🎯 API TESTING COMPLETE")
    print(f"{'=' * 80}")
    print("Expected behavior:")
    print("   • Jobs with work activities → Vietnamese work activities")
    print("   • Jobs without work activities → Vietnamese abilities/knowledge")
    print("   • Non-existent jobs → English fallback skills")


if __name__ == "__main__":
    main()
