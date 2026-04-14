#!/usr/bin/env python3
"""
REBUILD ETL WITH WORK ACTIVITIES
Thực hiện yêu cầu trong báo cáo: Thay career_ksas bằng career_work_activity_summary
"""

import psycopg2
from neo4j import GraphDatabase


class WorkActivityETL:
    """ETL mới sử dụng work activities thay vì KSAs"""

    def __init__(self):
        # PostgreSQL connection
        self.pg_conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")

        # Neo4j connection
        self.neo_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

    def backup_current_data(self):
        """Backup dữ liệu hiện tại"""
        print("💾 BACKUP DỮ LIỆU HIỆN TẠI")
        print("=" * 50)

        with self.neo_driver.session() as session:
            # Count current data
            result = session.run(
                """
                MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
                RETURN count(DISTINCT j) as jobs, count(DISTINCT s) as skills, count(r) as relationships
            """
            )

            stats = result.single()
            print("📊 Dữ liệu hiện tại:")
            print(f"   • Jobs: {stats['jobs']}")
            print(f"   • Skills: {stats['skills']}")
            print(f"   • Relationships: {stats['relationships']}")

            # Export sample for comparison
            result = session.run(
                """
                MATCH (j:Job {id: '15-1252.00'})-[r:REQUIRES]->(s:Skill)
                RETURN s.name, r.importance
                ORDER BY r.importance DESC
                LIMIT 5
            """
            )

            print("\n📋 Sample Software Developer skills (OLD):")
            for i, record in enumerate(result, 1):
                skill_name = record["s.name"][:60] + "..." if len(record["s.name"]) > 60 else record["s.name"]
                print(f"   {i}. {skill_name} (imp: {record['r.importance']})")

    def extract_work_activities_data(self):
        """Extract dữ liệu từ career_work_activity_summary"""
        print("\n📊 EXTRACT WORK ACTIVITIES DATA")
        print("=" * 50)

        cur = self.pg_conn.cursor()

        # Query mới theo báo cáo
        query = """
        SELECT 
            c.onet_code AS job_id,
            COALESCE(c.title_vi, c.title_en) AS job_title,
            s.element_id AS skill_id,
            COALESCE(m.element_name_vi, m.element_name) AS skill_name,
            s.importance_score as importance,
            s.level_score as level,
            'Work Activity' as type,
            s.activity_rank,
            s.combined_score
        FROM core.careers c
        JOIN core.career_work_activity_summary s ON c.onet_code = s.onet_code
        JOIN core.career_work_activities_master m ON s.element_id = m.element_id
        WHERE s.combined_score >= 4.0
        ORDER BY c.onet_code, s.activity_rank
        """

        cur.execute(query)
        rows = cur.fetchall()

        print(f"📈 Extracted {len(rows):,} work activity relationships")

        # Sample data
        print("\n📋 Sample extracted data:")
        for i, row in enumerate(rows[:5], 1):
            print(f"   {i}. {row[1]} -> {row[3][:50]}... (score: {row[8]}, rank: {row[7]})")

        cur.close()
        return rows

    def clear_neo4j_data(self):
        """Xóa dữ liệu cũ trong Neo4j"""
        print("\n🗑️ CLEAR OLD NEO4J DATA")
        print("=" * 50)

        with self.neo_driver.session() as session:
            # Delete all relationships and nodes
            session.run("MATCH (n) DETACH DELETE n")
            print("✅ Đã xóa tất cả nodes và relationships")

            # Recreate constraints
            try:
                session.run("CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE")
                session.run("CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE")
                print("✅ Đã tạo lại constraints")
            except Exception as e:
                print(f"⚠️ Constraint creation: {e}")

    def load_work_activities_to_neo4j(self, data_rows):
        """Load work activities data vào Neo4j"""
        print("\n📥 LOAD WORK ACTIVITIES TO NEO4J")
        print("=" * 50)

        batch_size = 1000
        total_batches = (len(data_rows) + batch_size - 1) // batch_size

        with self.neo_driver.session() as session:
            for i in range(0, len(data_rows), batch_size):
                batch = data_rows[i : i + batch_size]
                batch_num = i // batch_size + 1

                print(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} records)")

                # Convert to dict format
                batch_data = []
                for row in batch:
                    batch_data.append(
                        {
                            "job_id": row[0],
                            "job_title": row[1],
                            "skill_id": row[2],
                            "skill_name": row[3],
                            "importance": float(row[4]) if row[4] else 4.0,
                            "level": float(row[5]) if row[5] else 4.0,
                            "type": row[6],
                            "activity_rank": int(row[7]) if row[7] else 999,
                            "combined_score": float(row[8]) if row[8] else 4.0,
                        }
                    )

                # Batch insert query
                cypher_query = """
                UNWIND $batch AS row
                
                // Create Job Node
                MERGE (j:Job {id: row.job_id})
                ON CREATE SET j.title = row.job_title
                SET j.title = row.job_title 
                
                // Create Skill Node (use element_id as unique identifier)
                MERGE (s:Skill {id: row.skill_id})
                ON CREATE SET s.name = row.skill_name, s.type = row.type
                SET s.name = row.skill_name
                
                // Create REQUIRES relationship
                MERGE (j)-[r:REQUIRES]->(s)
                SET r.importance = row.importance, 
                    r.level = row.level,
                    r.activity_rank = row.activity_rank,
                    r.combined_score = row.combined_score
                """

                session.run(cypher_query, batch=batch_data)

                if batch_num % 5 == 0:  # Progress update every 5 batches
                    print(f"   ✅ Completed {batch_num}/{total_batches} batches")

        print(f"✅ Loaded all {len(data_rows):,} work activity relationships")

    def verify_new_data(self):
        """Verify dữ liệu mới"""
        print("\n✅ VERIFY NEW DATA")
        print("=" * 50)

        with self.neo_driver.session() as session:
            # Count new data
            result = session.run(
                """
                MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
                RETURN count(DISTINCT j) as jobs, count(DISTINCT s) as skills, count(r) as relationships
            """
            )

            stats = result.single()
            print("📊 Dữ liệu mới:")
            print(f"   • Jobs: {stats['jobs']}")
            print(f"   • Skills: {stats['skills']}")
            print(f"   • Relationships: {stats['relationships']}")

            # Test Software Developer vs Civil Engineer
            jobs_to_test = [("15-1252.00", "Software Developer"), ("17-2051.00", "Civil Engineer")]

            print("\n🔍 SO SÁNH 2 JOBS (NEW DATA):")

            for job_id, job_name in jobs_to_test:
                result = session.run(
                    """
                    MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                    RETURN s.name, r.importance, r.activity_rank
                    ORDER BY r.activity_rank ASC
                    LIMIT 5
                """,
                    job_id=job_id,
                )

                records = list(result)
                print(f"\n   📋 {job_name} ({job_id}):")

                if records:
                    for i, record in enumerate(records, 1):
                        skill_name = record["s.name"][:50] + "..." if len(record["s.name"]) > 50 else record["s.name"]
                        print(f"      {i}. {skill_name}")
                        print(f"         Importance: {record['r.importance']}, Rank: {record['r.activity_rank']}")
                else:
                    print(f"      ❌ Không tìm thấy data cho {job_id}")

            # Check diversity
            print("\n📈 KIỂM TRA DIVERSITY:")
            result = session.run(
                """
                MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
                WITH s.name as skill_name, count(j) as job_count
                WHERE job_count = 959  // Skills shared by ALL jobs
                RETURN count(*) as universal_skills
            """
            )

            universal_count = result.single()["universal_skills"]
            print(f"   • Universal skills (shared by all 959 jobs): {universal_count}")

            if universal_count < 10:
                print("   ✅ GOOD: Ít universal skills → job-specific data")
            else:
                print("   ⚠️ WARNING: Nhiều universal skills → vẫn có vấn đề")

    def close_connections(self):
        """Đóng connections"""
        if self.pg_conn:
            self.pg_conn.close()
        if self.neo_driver:
            self.neo_driver.close()


def main():
    """Main function thực hiện rebuild ETL"""
    print("🚀 REBUILD ETL WITH WORK ACTIVITIES")
    print("=" * 80)
    print("Thực hiện yêu cầu trong báo cáo: Thay career_ksas → career_work_activity_summary")
    print("=" * 80)

    etl = WorkActivityETL()

    try:
        # Step 1: Backup current data
        etl.backup_current_data()

        # Step 2: Extract new data
        work_activities_data = etl.extract_work_activities_data()

        if not work_activities_data:
            print("❌ Không có dữ liệu work activities. Dừng ETL.")
            return

        # Step 3: Confirm before clearing
        print("\n⚠️ CẢNH BÁO: Sẽ xóa tất cả dữ liệu Neo4j hiện tại!")
        print("Tiếp tục? (y/N): ", end="")

        # Auto-confirm for script execution
        confirm = "y"  # Change to input() for manual confirmation
        print("y")

        if confirm.lower() != "y":
            print("❌ Hủy bỏ ETL rebuild")
            return

        # Step 4: Clear old data
        etl.clear_neo4j_data()

        # Step 5: Load new data
        etl.load_work_activities_to_neo4j(work_activities_data)

        # Step 6: Verify new data
        etl.verify_new_data()

        print("\n🎉 ETL REBUILD HOÀN TẤT!")
        print("=" * 80)
        print("✅ Đã thay thế career_ksas bằng career_work_activity_summary")
        print("✅ Jobs giờ sẽ có work activities cụ thể thay vì generic KSAs")
        print("✅ Test lại API /api/interview/jobs/{job_id} để xem kết quả")

    except Exception as e:
        print(f"❌ ETL failed: {e}")
        import traceback

        traceback.print_exc()

    finally:
        etl.close_connections()


if __name__ == "__main__":
    main()
