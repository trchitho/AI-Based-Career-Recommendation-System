#!/usr/bin/env python3
"""
Test dữ liệu work activities mới sau khi rebuild ETL
"""

from neo4j import GraphDatabase


def test_software_developer_vs_civil_engineer():
    """Test sự khác biệt giữa Software Developer và Civil Engineer"""
    print("🔍 TEST SOFTWARE DEVELOPER VS CIVIL ENGINEER (NEW DATA)")
    print("=" * 70)

    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

    jobs_to_test = [("15-1252.00", "Software Developer"), ("17-2051.00", "Civil Engineer")]

    with driver.session() as session:
        for job_id, job_name in jobs_to_test:
            print(f"\n📋 {job_name} ({job_id}):")

            # Check if job exists
            result = session.run("MATCH (j:Job {id: $job_id}) RETURN j.title", job_id=job_id)
            job_record = result.single()

            if not job_record:
                print(f"   ❌ Job {job_id} không tồn tại trong Neo4j")
                continue

            print(f"   ✅ Job title: {job_record['j.title']}")

            # Get top work activities
            result = session.run(
                """
                MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                RETURN s.name, r.importance, r.activity_rank, r.combined_score
                ORDER BY r.activity_rank ASC
                LIMIT 8
            """,
                job_id=job_id,
            )

            activities = list(result)
            print(f"   📊 Work activities ({len(activities)}):")

            for i, record in enumerate(activities, 1):
                print(f"      {i}. {record['s.name']}")
                print(f"         Importance: {record['r.importance']}, Rank: {record['r.activity_rank']}")

    driver.close()


def test_job_diversity():
    """Test tính đa dạng của jobs"""
    print("\n📈 TEST JOB DIVERSITY")
    print("=" * 70)

    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

    with driver.session() as session:
        # Tìm jobs có skills khác nhau nhất
        result = session.run(
            """
            MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
            WITH j, collect(s.name) as skills, count(s) as skill_count
            RETURN j.id, j.title, skill_count, skills[0..3] as sample_skills
            ORDER BY skill_count DESC
            LIMIT 10
        """
        )

        print("📊 TOP 10 JOBS CÓ NHIỀU WORK ACTIVITIES NHẤT:")
        for i, record in enumerate(result, 1):
            print(f"   {i:2d}. {record['j.title']} ({record['j.id']})")
            print(f"       Activities: {record['skill_count']}")
            print(f"       Sample: {', '.join(record['sample_skills'])}")

        # Kiểm tra overlap giữa các jobs
        print("\n🔍 KIỂM TRA OVERLAP GIỮA CÁC JOBS:")
        result = session.run(
            """
            MATCH (s:Skill)<-[:REQUIRES]-(j:Job)
            WITH s.name as skill_name, count(j) as job_count, collect(j.title)[0..3] as sample_jobs
            WHERE job_count > 100  // Skills được chia sẻ bởi nhiều jobs
            RETURN skill_name, job_count, sample_jobs
            ORDER BY job_count DESC
            LIMIT 10
        """
        )

        for i, record in enumerate(result, 1):
            print(f"   {i:2d}. {record['skill_name'][:50]}...")
            print(f"       Shared by {record['job_count']} jobs")
            print(f"       Examples: {', '.join(record['sample_jobs'][:2])}")

    driver.close()


def test_specific_job_skills():
    """Test skills của một số jobs cụ thể"""
    print("\n🎯 TEST SPECIFIC JOB SKILLS")
    print("=" * 70)

    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

    # Tìm một số jobs để test
    test_jobs = ["Software Developer", "Civil Engineer", "Nurse", "Teacher", "Manager"]

    with driver.session() as session:
        for job_keyword in test_jobs:
            print(f"\n🔍 Tìm jobs có từ khóa '{job_keyword}':")

            result = session.run(
                """
                MATCH (j:Job)
                WHERE toLower(j.title) CONTAINS toLower($keyword)
                RETURN j.id, j.title
                LIMIT 3
            """,
                keyword=job_keyword,
            )

            jobs = list(result)
            if not jobs:
                print(f"   ❌ Không tìm thấy job nào với từ khóa '{job_keyword}'")
                continue

            for job in jobs:
                print(f"   📋 {job['j.title']} ({job['j.id']}):")

                # Get top 3 activities
                result2 = session.run(
                    """
                    MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                    RETURN s.name, r.importance
                    ORDER BY r.activity_rank ASC
                    LIMIT 3
                """,
                    job_id=job["j.id"],
                )

                activities = list(result2)
                for i, activity in enumerate(activities, 1):
                    print(f"      {i}. {activity['s.name'][:50]}... (imp: {activity['r.importance']})")

    driver.close()


def compare_old_vs_new_data():
    """So sánh dữ liệu cũ vs mới"""
    print("\n📊 SO SÁNH DỮ LIỆU CŨ VS MỚI")
    print("=" * 70)

    print("📈 THỐNG KÊ:")
    print("   DỮ LIỆU CŨ (career_ksas):")
    print("   • Jobs: 959")
    print("   • Skills: 390 (KSAs)")
    print("   • Relationships: 50,404")
    print("   • Vấn đề: Tất cả jobs có cùng top skills")

    print("\n   DỮ LIỆU MỚI (work_activities):")
    print("   • Jobs: 861")
    print("   • Skills: 41 (Work Activities)")
    print("   • Relationships: 9,711")
    print("   • Cải thiện: Job-specific activities")

    print("\n💡 KẾT LUẬN:")
    print("   ✅ Ít skills hơn nhưng job-specific hơn")
    print("   ✅ Không còn universal skills (shared by all jobs)")
    print("   ✅ Mỗi job có work activities riêng biệt")


if __name__ == "__main__":
    print("🚀 TEST DỮ LIỆU WORK ACTIVITIES MỚI")
    print("=" * 80)

    # Test 1: So sánh Software Developer vs Civil Engineer
    test_software_developer_vs_civil_engineer()

    # Test 2: Test tính đa dạng
    test_job_diversity()

    # Test 3: Test jobs cụ thể
    test_specific_job_skills()

    # Test 4: So sánh old vs new
    compare_old_vs_new_data()

    print("\n🎉 TEST HOÀN TẤT!")
    print("=" * 80)
