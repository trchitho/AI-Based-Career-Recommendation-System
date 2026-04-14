#!/usr/bin/env python3
"""
Test script để kiểm tra enhanced skills logic
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.modules.interview.services import Neo4jService


def test_skills_for_jobs():
    """Test skills logic cho các nghề nghiệp khác nhau"""

    # Danh sách các nghề nghiệp để test
    test_jobs = [
        ("53-6051.07", "Chuyên viên kiểm tra phương tiện vận tải, thiết bị và hệ thống, ngoại trừ hàng không"),  # Ít skills
        ("51-2023.00", "Bộ sưu tập thiết bị điện cơ"),  # Ít skills
        ("29-1229.02", "Bệnh viện"),  # Nhiều skills
        ("15-1252.00", "Software Developer"),  # Nhiều skills
        ("17-2051.00", "Civil Engineer"),  # Trung bình skills
    ]

    neo4j_service = Neo4jService()

    print("🔍 TESTING ENHANCED SKILLS LOGIC")
    print("=" * 60)

    for job_id, job_title in test_jobs:
        print(f"\n📋 Testing: {job_title}")
        print(f"   Job ID: {job_id}")
        print("-" * 50)

        try:
            # Test get_job_skills (8 skills default)
            skills_8 = neo4j_service.get_job_skills(job_id, limit=8)
            print(f"✅ Default 8 skills: {len(skills_8)} skills found")

            if len(skills_8) < 5:
                print(f"⚠️  WARNING: Only {len(skills_8)} skills found (minimum should be 5)")

            # Test get_all_job_skills (all skills)
            all_skills = neo4j_service.get_all_job_skills(job_id)
            print(f"✅ All skills: {len(all_skills)} skills found")

            # Display first few skills
            print(f"\n📊 Top skills for {job_title}:")
            for i, skill in enumerate(skills_8[:5], 1):
                importance = skill.get("importance", 0)
                level = skill.get("level", 0)
                rank = skill.get("rank", 999)
                print(f"   {i}. {skill['skill_name']}")
                print(f"      Importance: {importance:.1f}, Level: {level:.1f}, Rank: {rank}")

            if len(all_skills) > 8:
                print(f"\n💡 Additional skills available: {len(all_skills) - 8} more skills")
                print("   Sample additional skills:")
                for skill in all_skills[8:12]:  # Show 4 more
                    importance = skill.get("importance", 0)
                    level = skill.get("level", 0)
                    print(f"   • {skill['skill_name']} (Imp: {importance:.1f}, Lvl: {level:.1f})")

        except Exception as e:
            print(f"❌ ERROR testing {job_id}: {str(e)}")

    neo4j_service.close()
    print("\n" + "=" * 60)
    print("🎯 TESTING COMPLETED")


def test_minimum_skills_guarantee():
    """Test đảm bảo minimum 5 skills cho tất cả nghề nghiệp"""

    neo4j_service = Neo4jService()

    print("\n🔒 TESTING MINIMUM 5 SKILLS GUARANTEE")
    print("=" * 60)

    # Query để lấy các nghề nghiệp có ít skills nhất
    query = """
    MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
    WITH j, count(r) as skill_count
    WHERE skill_count <= 10
    RETURN j.id as job_id, j.title as job_title, skill_count
    ORDER BY skill_count ASC
    LIMIT 10
    """

    with neo4j_service.driver.session() as session:
        result = session.run(query)
        low_skill_jobs = [dict(record) for record in result]

    print(f"Found {len(low_skill_jobs)} jobs with <= 10 skills in database")

    for job in low_skill_jobs:
        job_id = job["job_id"]
        job_title = job["job_title"]
        db_skill_count = job["skill_count"]

        print(f"\n📋 {job_title}")
        print(f"   Job ID: {job_id}")
        print(f"   DB Skills: {db_skill_count}")

        try:
            # Test our enhanced logic
            skills = neo4j_service.get_job_skills(job_id, limit=8)
            print(f"   Enhanced Logic: {len(skills)} skills returned")

            if len(skills) >= 5:
                print("   ✅ PASS: Minimum 5 skills guaranteed")
            else:
                print(f"   ❌ FAIL: Only {len(skills)} skills returned")

            # Show the skills
            for i, skill in enumerate(skills[:3], 1):
                print(f"      {i}. {skill['skill_name']} (Imp: {skill['importance']:.1f})")

        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")

    neo4j_service.close()


if __name__ == "__main__":
    test_skills_for_jobs()
    test_minimum_skills_guarantee()
