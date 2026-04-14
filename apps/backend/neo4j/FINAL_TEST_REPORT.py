#!/usr/bin/env python3
"""
FINAL TEST REPORT - Neo4j Integration Fix
Kiểm tra toàn bộ flow từ PostgreSQL -> Neo4j -> Fallback
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

import psycopg2
from neo4j import GraphDatabase


def test_postgresql_connection():
    """Test PostgreSQL connection và data"""
    print("🐘 TESTING POSTGRESQL")
    print("=" * 50)

    try:
        conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")
        cur = conn.cursor()

        # Test job 13-1199.00
        job_id = "13-1199.00"

        # Check if job exists
        cur.execute("SELECT title_vi, title_en FROM core.careers WHERE onet_code = %s", (job_id,))
        job = cur.fetchone()

        if job:
            print(f"✅ Job exists: {job[0] or job[1]}")
        else:
            print(f"❌ Job {job_id} not found in core.careers")
            return False

        # Check work activity data
        cur.execute(
            """
            SELECT COUNT(*) FROM core.career_work_activity_summary 
            WHERE onet_code = %s AND is_top_activity = true
        """,
            (job_id,),
        )

        count = cur.fetchone()[0]
        print(f"📊 Work activities in PostgreSQL: {count}")

        if count > 0:
            print("⚠️ PostgreSQL HAS DATA - Neo4j will NOT be called")
            return True
        else:
            print("✅ PostgreSQL EMPTY - Neo4j WILL be called")
            return False

    except Exception as e:
        print(f"❌ PostgreSQL error: {e}")
        return False
    finally:
        if "cur" in locals():
            cur.close()
        if "conn" in locals():
            conn.close()


def test_neo4j_connection():
    """Test Neo4j connection và data"""
    print("\n🔗 TESTING NEO4J")
    print("=" * 50)

    try:
        driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

        with driver.session() as session:
            # Test connection
            session.run("RETURN 1").consume()
            print("✅ Neo4j connection successful")

            # Test job data
            job_id = "13-1199.00"
            result = session.run(
                """
                MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                WHERE r.importance >= 3.5
                RETURN count(*) as skill_count
            """,
                job_id=job_id,
            )

            count = result.single()["skill_count"]
            print(f"📊 Skills in Neo4j for {job_id}: {count}")

            if count > 0:
                print("✅ Neo4j HAS DATA - can provide skills")

                # Get sample skills
                result = session.run(
                    """
                    MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                    WHERE r.importance >= 3.5
                    RETURN s.name, r.importance
                    ORDER BY r.importance DESC
                    LIMIT 3
                """,
                    job_id=job_id,
                )

                print("📋 Sample Neo4j skills:")
                for i, record in enumerate(result, 1):
                    skill_name = record["s.name"][:60] + "..." if len(record["s.name"]) > 60 else record["s.name"]
                    print(f"   {i}. {skill_name} (imp: {record['r.importance']})")

                return True
            else:
                print(f"❌ Neo4j NO DATA for {job_id}")
                return False

    except Exception as e:
        print(f"❌ Neo4j error: {e}")
        return False
    finally:
        if "driver" in locals():
            driver.close()


def test_services_logic_flow():
    """Test the actual services.py logic flow"""
    print("\n🔄 TESTING SERVICES.PY LOGIC FLOW")
    print("=" * 50)

    job_id = "13-1199.00"

    print(f"📋 Flow for job {job_id}:")
    print(f"   1. Call _get_skills_from_postgres('{job_id}', 8)")

    # Test PostgreSQL query
    postgres_has_data = test_postgresql_skills_query(job_id)

    if postgres_has_data:
        print("   2. PostgreSQL returned data -> Use PostgreSQL skills")
        print("   3. ❌ Neo4j is NOT called")
        print("   4. Result: PostgreSQL skills displayed in UI")
    else:
        print("   2. PostgreSQL returned empty -> Call Neo4j")
        print("   3. ✅ Neo4j IS called")

        # Test Neo4j query
        neo4j_has_data = test_neo4j_skills_query(job_id)

        if neo4j_has_data:
            print("   4. Neo4j returned data -> Use Neo4j skills")
            print("   5. Result: ✅ Neo4j skills displayed in UI")
        else:
            print("   4. Neo4j returned empty -> Use fallback")
            print("   5. Result: ❌ Fallback skills displayed in UI")


def test_postgresql_skills_query(job_id):
    """Test exact PostgreSQL query from services.py"""
    try:
        conn = psycopg2.connect(host="localhost", port=5433, database="career_ai", user="postgres", password="123456")
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                m.element_name_vi  AS skill_name,
                m.activity_category_vi AS skill_type,
                s.importance_score AS importance,
                s.level_score      AS level,
                s.activity_rank    AS rank,
                s.combined_score   AS combined_score
            FROM core.career_work_activity_summary s
            JOIN core.career_work_activities_master m ON m.element_id = s.element_id
            WHERE s.onet_code = %s
              AND s.is_top_activity = true
            ORDER BY s.activity_rank ASC, s.combined_score DESC
            LIMIT 8
        """,
            (job_id,),
        )

        rows = cur.fetchall()
        return len(rows) > 0

    except Exception as e:
        print(f"   ❌ PostgreSQL query error: {e}")
        return False
    finally:
        if "cur" in locals():
            cur.close()
        if "conn" in locals():
            conn.close()


def test_neo4j_skills_query(job_id):
    """Test exact Neo4j query from services.py"""
    try:
        driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123456"))

        with driver.session() as session:
            result = session.run(
                """
                MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                WHERE r.importance >= 3.5
                RETURN s.name as skill_name, 
                       COALESCE(s.type, 'skill') as skill_type,
                       r.importance as importance, 
                       r.level as level,
                       COALESCE(r.activity_rank, 999) as rank,
                       COALESCE(r.combined_score, r.importance) as combined_score
                ORDER BY r.importance DESC, r.level DESC
                LIMIT 8
            """,
                job_id=job_id,
            )

            skills = list(result)
            return len(skills) > 0

    except Exception as e:
        print(f"   ❌ Neo4j query error: {e}")
        return False
    finally:
        if "driver" in locals():
            driver.close()


def generate_final_report():
    """Generate final test report"""
    print("\n📊 FINAL TEST REPORT")
    print("=" * 70)

    # Test all components
    postgres_status = test_postgresql_connection()
    neo4j_status = test_neo4j_connection()

    # Test logic flow
    test_services_logic_flow()

    # Generate summary
    print("\n🎯 SUMMARY")
    print("=" * 70)

    print("📋 Component Status:")
    print(f"   • PostgreSQL: {'✅ Connected' if postgres_status else '❌ Issue'}")
    print(f"   • Neo4j: {'✅ Connected' if neo4j_status else '❌ Issue'}")

    print("\n📋 Expected Behavior for job 13-1199.00:")
    if not postgres_status and neo4j_status:
        print("   ✅ PostgreSQL empty -> Neo4j called -> Neo4j skills displayed")
        print("   🎉 UI should show Vietnamese Neo4j skills, NOT fallback!")
    elif postgres_status:
        print("   ⚠️ PostgreSQL has data -> Neo4j NOT called -> PostgreSQL skills displayed")
    else:
        print("   ❌ Both PostgreSQL and Neo4j have issues -> Fallback displayed")

    print("\n💡 NEXT STEPS:")
    if not postgres_status and neo4j_status:
        print("   1. ✅ Logic is correct - Neo4j should be called")
        print("   2. 🚀 Start backend server to test API")
        print("   3. 🧪 Test API endpoint: GET /api/interview/jobs/13-1199.00")
        print("   4. 🎯 Verify UI shows Vietnamese skills from Neo4j")
    else:
        print("   1. ⚠️ Check database connections and data")
        print("   2. 🔧 Fix any connection issues")
        print("   3. 🔄 Re-run this test")


if __name__ == "__main__":
    print("🚀 FINAL NEO4J INTEGRATION TEST REPORT")
    print("=" * 80)
    print("Testing complete flow: PostgreSQL -> Neo4j -> Fallback")
    print("=" * 80)

    generate_final_report()

    print("\n🎉 TEST COMPLETE!")
    print("=" * 80)
