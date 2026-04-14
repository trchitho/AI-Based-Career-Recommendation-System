#!/usr/bin/env python3
"""
Phân tích nguồn dữ liệu hiện tại trong Neo4j để xác định vấn đề
Theo báo cáo: ETL đang dùng sai bảng career_ksas thay vì career_work_activity_summary
"""

import psycopg2
from neo4j import GraphDatabase


def analyze_neo4j_current_data():
    """Phân tích dữ liệu hiện tại trong Neo4j"""
    print("🔍 PHÂN TÍCH DỮ LIỆU HIỆN TẠI TRONG NEO4J")
    print("=" * 60)

    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

    with driver.session() as session:
        # 1. Kiểm tra tổng quan
        result = session.run(
            """
            MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
            RETURN count(DISTINCT j) as jobs, count(DISTINCT s) as skills, count(r) as relationships
        """
        )
        stats = result.single()
        print("📊 Tổng quan:")
        print(f"   • Jobs: {stats['jobs']}")
        print(f"   • Skills: {stats['skills']}")
        print(f"   • Relationships: {stats['relationships']}")

        # 2. Kiểm tra skills được chia sẻ nhiều nhất
        print("\n🔥 TOP 10 SKILLS ĐƯỢC CHIA SẺ NHIỀU NHẤT:")
        result = session.run(
            """
            MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
            RETURN s.name, count(j) as job_count, s.type
            ORDER BY job_count DESC
            LIMIT 10
        """
        )

        for i, record in enumerate(result, 1):
            skill_name = record["s.name"][:60] + "..." if len(record["s.name"]) > 60 else record["s.name"]
            print(f"   {i:2d}. {skill_name}")
            print(f"       Jobs: {record['job_count']}, Type: {record['s.type']}")

        # 3. Kiểm tra skills unique cho từng job
        print("\n🎯 KIỂM TRA SKILLS UNIQUE:")
        result = session.run(
            """
            MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
            WITH j, count(s) as skill_count
            RETURN min(skill_count) as min_skills, max(skill_count) as max_skills, 
                   avg(skill_count) as avg_skills
        """
        )

        stats = result.single()
        print(f"   • Min skills per job: {stats['min_skills']}")
        print(f"   • Max skills per job: {stats['max_skills']}")
        print(f"   • Avg skills per job: {stats['avg_skills']:.1f}")

        # 4. So sánh 2 jobs cụ thể
        print("\n🔍 SO SÁNH 2 JOBS CỤ THỂ:")
        jobs_to_compare = ["15-1252.00", "17-2051.00"]  # Software Developer vs Civil Engineer

        for job_id in jobs_to_compare:
            result = session.run(
                """
                MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                RETURN j.title, s.name, r.importance
                ORDER BY r.importance DESC
                LIMIT 5
            """,
                job_id=job_id,
            )

            records = list(result)
            if records:
                job_title = records[0]["j.title"]
                print(f"\n   📋 {job_title} ({job_id}):")
                for i, record in enumerate(records, 1):
                    skill_name = record["s.name"][:50] + "..." if len(record["s.name"]) > 50 else record["s.name"]
                    print(f"      {i}. {skill_name} (imp: {record['r.importance']})")
            else:
                print(f"\n   ❌ Không tìm thấy job {job_id}")

    driver.close()


def analyze_postgresql_data_sources():
    """Phân tích các bảng dữ liệu trong PostgreSQL"""
    print("\n🐘 PHÂN TÍCH CÁC BẢNG DỮ LIỆU TRONG POSTGRESQL")
    print("=" * 60)

    try:
        conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")
        cur = conn.cursor()

        # 1. Kiểm tra bảng career_ksas (đang dùng)
        print("📊 BẢNG career_ksas (ETL hiện tại đang dùng):")
        cur.execute("SELECT COUNT(*) FROM core.career_ksas")
        count = cur.fetchone()[0]
        print(f"   • Tổng records: {count:,}")

        # Sample data từ career_ksas
        cur.execute(
            """
            SELECT onet_code, name, description, importance, ksa_type
            FROM core.career_ksas 
            WHERE onet_code = '15-1252.00'
            ORDER BY importance DESC
            LIMIT 5
        """
        )

        print("   • Sample cho Software Developer (15-1252.00):")
        for i, row in enumerate(cur.fetchall(), 1):
            print(f"      {i}. {row[2][:50]}... (imp: {row[3]}, type: {row[4]})")

        # 2. Kiểm tra bảng career_work_activity_summary (nên dùng)
        print("\n📊 BẢNG career_work_activity_summary (nên dùng):")
        cur.execute("SELECT COUNT(*) FROM core.career_work_activity_summary")
        count = cur.fetchone()[0]
        print(f"   • Tổng records: {count:,}")

        # Sample data từ career_work_activity_summary
        cur.execute(
            """
            SELECT s.onet_code, s.element_id, m.element_name_vi, s.importance_score, s.activity_rank
            FROM core.career_work_activity_summary s
            JOIN core.career_work_activities_master m ON s.element_id = m.element_id
            WHERE s.onet_code = '15-1252.00'
            ORDER BY s.activity_rank ASC
            LIMIT 5
        """
        )

        print("   • Sample cho Software Developer (15-1252.00):")
        for i, row in enumerate(cur.fetchall(), 1):
            element_name = row[2] or row[1]
            print(f"      {i}. {element_name[:50]}... (imp: {row[3]}, rank: {row[4]})")

        # 3. So sánh Civil Engineer
        print("\n🔍 SO SÁNH CIVIL ENGINEER (17-2051.00):")

        print("   📊 career_ksas:")
        cur.execute(
            """
            SELECT name, description, importance, ksa_type
            FROM core.career_ksas 
            WHERE onet_code = '17-2051.00'
            ORDER BY importance DESC
            LIMIT 3
        """
        )

        for i, row in enumerate(cur.fetchall(), 1):
            print(f"      {i}. {row[1][:50]}... (imp: {row[2]}, type: {row[3]})")

        print("   📊 career_work_activity_summary:")
        cur.execute(
            """
            SELECT s.element_id, m.element_name_vi, s.importance_score, s.activity_rank
            FROM core.career_work_activity_summary s
            JOIN core.career_work_activities_master m ON s.element_id = m.element_id
            WHERE s.onet_code = '17-2051.00'
            ORDER BY s.activity_rank ASC
            LIMIT 3
        """
        )

        for i, row in enumerate(cur.fetchall(), 1):
            element_name = row[1] or row[0]
            print(f"      {i}. {element_name[:50]}... (imp: {row[2]}, rank: {row[3]})")

    except Exception as e:
        print(f"❌ PostgreSQL error: {e}")
    finally:
        if "cur" in locals():
            cur.close()
        if "conn" in locals():
            conn.close()


def compare_data_diversity():
    """So sánh tính đa dạng của 2 nguồn dữ liệu"""
    print("\n📈 SO SÁNH TÍNH ĐA DẠNG DỮ LIỆU")
    print("=" * 60)

    try:
        conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")
        cur = conn.cursor()

        # 1. Đếm unique skills cho Software Developer vs Civil Engineer trong career_ksas
        print("📊 CAREER_KSAS (ETL hiện tại):")

        jobs = [("15-1252.00", "Software Developer"), ("17-2051.00", "Civil Engineer")]

        for job_id, job_name in jobs:
            cur.execute(
                """
                SELECT COUNT(DISTINCT name) as unique_skills
                FROM core.career_ksas 
                WHERE onet_code = %s AND importance >= 3.0
            """,
                (job_id,),
            )

            count = cur.fetchone()[0]
            print(f"   • {job_name}: {count} unique skills")

        # 2. Đếm unique activities cho Software Developer vs Civil Engineer trong work_activity_summary
        print("\n📊 CAREER_WORK_ACTIVITY_SUMMARY (nên dùng):")

        for job_id, job_name in jobs:
            cur.execute(
                """
                SELECT COUNT(DISTINCT s.element_id) as unique_activities
                FROM core.career_work_activity_summary s
                WHERE s.onet_code = %s AND s.combined_score >= 4.0
            """,
                (job_id,),
            )

            count = cur.fetchone()[0]
            print(f"   • {job_name}: {count} unique activities")

        # 3. Kiểm tra overlap giữa 2 jobs
        print("\n🔍 KIỂM TRA OVERLAP GIỮA 2 JOBS:")

        # Overlap trong career_ksas
        cur.execute(
            """
            SELECT COUNT(*) as overlap_count
            FROM (
                SELECT name FROM core.career_ksas WHERE onet_code = '15-1252.00' AND importance >= 3.0
                INTERSECT
                SELECT name FROM core.career_ksas WHERE onet_code = '17-2051.00' AND importance >= 3.0
            ) overlap
        """
        )

        overlap_ksas = cur.fetchone()[0]
        print(f"   • career_ksas overlap: {overlap_ksas} skills")

        # Overlap trong work_activity_summary
        cur.execute(
            """
            SELECT COUNT(*) as overlap_count
            FROM (
                SELECT element_id FROM core.career_work_activity_summary WHERE onet_code = '15-1252.00' AND combined_score >= 4.0
                INTERSECT
                SELECT element_id FROM core.career_work_activity_summary WHERE onet_code = '17-2051.00' AND combined_score >= 4.0
            ) overlap
        """
        )

        overlap_activities = cur.fetchone()[0]
        print(f"   • work_activity_summary overlap: {overlap_activities} activities")

        # Kết luận
        print("\n💡 KẾT LUẬN:")
        if overlap_ksas > overlap_activities:
            print("   ✅ work_activity_summary có ít overlap hơn → job-specific hơn")
        else:
            print("   ⚠️ Cần kiểm tra thêm dữ liệu")

    except Exception as e:
        print(f"❌ PostgreSQL error: {e}")
    finally:
        if "cur" in locals():
            cur.close()
        if "conn" in locals():
            conn.close()


if __name__ == "__main__":
    print("🚀 PHÂN TÍCH NGUỒN DỮ LIỆU SKILLS - THEO BÁO CÁO")
    print("=" * 80)
    print("Mục tiêu: Xác định tại sao tất cả jobs có cùng skills")
    print("=" * 80)

    # 1. Phân tích dữ liệu hiện tại trong Neo4j
    analyze_neo4j_current_data()

    # 2. Phân tích các bảng PostgreSQL
    analyze_postgresql_data_sources()

    # 3. So sánh tính đa dạng
    compare_data_diversity()

    print("\n🎉 PHÂN TÍCH HOÀN TẤT!")
    print("=" * 80)
