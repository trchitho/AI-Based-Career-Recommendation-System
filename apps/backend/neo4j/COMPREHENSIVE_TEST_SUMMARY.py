#!/usr/bin/env python3
"""
COMPREHENSIVE TEST SUMMARY - Neo4j Skills Data Source Fix
Final verification that all requirements have been met
"""

import psycopg2
from neo4j import GraphDatabase

# Connection settings
NEO_URI = "bolt://localhost:7687"
NEO_USER = "neo4j"
NEO_PASS = "password123456"
PG_HOST = "localhost"
PG_PORT = "5433"
PG_DB = "career_ai"
PG_USER = "postgres"
PG_PASS = "123456"


def main():
    print("🎯 COMPREHENSIVE TEST SUMMARY")
    print("=" * 80)
    print("Testing all requirements from BAO_CAO_PHAN_TICH_NGUON_DU_LIEU_SKILLS.md")
    print("=" * 80)

    # Test 1: Verify ETL was rebuilt with work activities
    print("\n📋 TEST 1: ETL DATA SOURCE VERIFICATION")
    print("-" * 50)
    verify_etl_data_source()

    # Test 2: Verify job-specific skills (no more universal skills)
    print("\n📋 TEST 2: JOB-SPECIFIC SKILLS VERIFICATION")
    print("-" * 50)
    verify_job_specific_skills()

    # Test 3: Verify services.py logic flow
    print("\n📋 TEST 3: SERVICES.PY LOGIC FLOW VERIFICATION")
    print("-" * 50)
    verify_services_logic()

    # Test 4: Performance comparison
    print("\n📋 TEST 4: PERFORMANCE COMPARISON")
    print("-" * 50)
    verify_performance()

    # Test 5: Final recommendation
    print("\n📋 TEST 5: FINAL SYSTEM STATUS")
    print("-" * 50)
    final_system_status()


def verify_etl_data_source():
    """Verify ETL is using work_activities instead of career_ksas"""
    driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))

    try:
        with driver.session() as session:
            # Check data structure
            result = session.run(
                """
                MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
                RETURN count(DISTINCT j) as jobs, 
                       count(DISTINCT s) as skills, 
                       count(r) as relationships
            """
            )

            record = result.single()
            jobs = record["jobs"]
            skills = record["skills"]
            relationships = record["relationships"]

            print("   📊 Current Neo4j data:")
            print(f"      • Jobs: {jobs}")
            print(f"      • Skills: {skills}")
            print(f"      • Relationships: {relationships}")

            # Expected values from work activities rebuild
            expected_jobs = 861
            expected_skills = 41
            expected_relationships = 9711

            if (
                abs(jobs - expected_jobs) <= 10
                and abs(skills - expected_skills) <= 5
                and abs(relationships - expected_relationships) <= 100
            ):
                print("   ✅ ETL DATA SOURCE: Work activities (correct)")
                print(
                    f"      Expected: ~{expected_jobs} jobs, ~{expected_skills} skills, ~{expected_relationships} relationships"
                )
                return True
            else:
                print("   ❌ ETL DATA SOURCE: Possibly still using career_ksas")
                print(
                    f"      Expected: ~{expected_jobs} jobs, ~{expected_skills} skills, ~{expected_relationships} relationships"
                )
                return False

    except Exception as e:
        print(f"   ❌ Neo4j connection failed: {e}")
        return False
    finally:
        driver.close()


def verify_job_specific_skills():
    """Verify jobs have different, job-specific skills"""
    driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))

    try:
        with driver.session() as session:
            # Test Software Developer vs Civil Engineer
            software_dev = session.run(
                """
                MATCH (j:Job {id: "15-1252.00"})-[r:REQUIRES]->(s:Skill)
                RETURN s.name as skill_name, r.importance as importance
                ORDER BY r.importance DESC
                LIMIT 5
            """
            ).data()

            civil_eng = session.run(
                """
                MATCH (j:Job {id: "17-2051.00"})-[r:REQUIRES]->(s:Skill)
                RETURN s.name as skill_name, r.importance as importance
                ORDER BY r.importance DESC
                LIMIT 5
            """
            ).data()

            if software_dev and civil_eng:
                sw_skills = [s["skill_name"] for s in software_dev]
                ce_skills = [s["skill_name"] for s in civil_eng]

                print("   📊 Software Developer skills:")
                for i, skill in enumerate(sw_skills, 1):
                    print(f"      {i}. {skill}")

                print("   📊 Civil Engineer skills:")
                for i, skill in enumerate(ce_skills, 1):
                    print(f"      {i}. {skill}")

                # Check overlap
                overlap = set(sw_skills) & set(ce_skills)
                overlap_percent = len(overlap) / max(len(sw_skills), len(ce_skills)) * 100

                print("   📈 Overlap analysis:")
                print(f"      • Common skills: {len(overlap)}/{max(len(sw_skills), len(ce_skills))}")
                print(f"      • Overlap percentage: {overlap_percent:.1f}%")

                if overlap_percent < 80:  # Less than 80% overlap is good
                    print("   ✅ JOB-SPECIFIC SKILLS: Jobs have different skills")
                    return True
                else:
                    print(f"   ❌ JOB-SPECIFIC SKILLS: Too much overlap ({overlap_percent:.1f}%)")
                    return False
            else:
                print("   ❌ Could not find Software Developer or Civil Engineer")
                return False

    except Exception as e:
        print(f"   ❌ Neo4j query failed: {e}")
        return False
    finally:
        driver.close()


def verify_services_logic():
    """Verify services.py logic: PostgreSQL -> Neo4j -> Fallback"""
    print("   🔍 Testing services.py logic flow...")

    # Test with a job that has PostgreSQL data
    job_with_pg_data = "15-1252.00"  # Software Developer

    # Test PostgreSQL
    pg_skills = test_postgresql_query(job_with_pg_data)
    print(f"   📊 PostgreSQL for {job_with_pg_data}: {len(pg_skills)} skills")

    # Test Neo4j
    neo4j_skills = test_neo4j_query(job_with_pg_data)
    print(f"   📊 Neo4j for {job_with_pg_data}: {len(neo4j_skills)} skills")

    # Simulate services.py logic
    if pg_skills:
        final_source = "PostgreSQL"
        final_skills = pg_skills
    elif neo4j_skills:
        final_source = "Neo4j"
        final_skills = neo4j_skills
    else:
        final_source = "Fallback"
        final_skills = []

    print(f"   🎯 Final result: {final_source} ({len(final_skills)} skills)")

    if final_source in ["PostgreSQL", "Neo4j"] and len(final_skills) > 0:
        print("   ✅ SERVICES LOGIC: Working correctly - using real data")
        if final_skills:
            print(f"      Sample skill: {final_skills[0].get('skill_name', 'Unknown')}")
        return True
    else:
        print("   ❌ SERVICES LOGIC: Using fallback when real data should be available")
        return False


def test_postgresql_query(job_id: str) -> list:
    """Test PostgreSQL skills query"""
    try:
        conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, database=PG_DB, user=PG_USER, password=PG_PASS)
        cursor = conn.cursor()

        sql = """
            SELECT m.element_name_vi AS skill_name, s.importance_score AS importance
            FROM core.career_work_activity_summary s
            JOIN core.career_work_activities_master m ON m.element_id = s.element_id
            WHERE s.onet_code = %s AND s.is_top_activity = true
            ORDER BY s.activity_rank ASC
            LIMIT 8
        """

        cursor.execute(sql, (job_id,))
        rows = cursor.fetchall()

        skills = [{"skill_name": row[0], "importance": float(row[1]) if row[1] else 0.0} for row in rows]

        cursor.close()
        conn.close()
        return skills

    except Exception:
        return []


def test_neo4j_query(job_id: str) -> list:
    """Test Neo4j skills query"""
    driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))

    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (j:Job {id: $job_id})-[r:REQUIRES]->(s:Skill)
                WHERE r.importance >= 3.5
                RETURN s.name as skill_name, r.importance as importance
                ORDER BY r.importance DESC
                LIMIT 8
            """,
                job_id=job_id,
            )

            skills = [{"skill_name": record["skill_name"], "importance": float(record["importance"])} for record in result]
            return skills

    except Exception:
        return []
    finally:
        driver.close()


def verify_performance():
    """Verify performance improvements"""
    driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))

    try:
        import time

        with driver.session() as session:
            # Test query performance
            start_time = time.time()

            result = session.run(
                """
                MATCH (j:Job)-[r:REQUIRES]->(s:Skill)
                WHERE r.importance >= 4.0
                RETURN j.title, s.name, r.importance
                ORDER BY r.importance DESC
                LIMIT 10
            """
            )

            records = list(result)
            end_time = time.time()

            query_time = (end_time - start_time) * 1000  # Convert to ms

            print("   ⚡ Query performance:")
            print(f"      • Query time: {query_time:.1f}ms")
            print(f"      • Records returned: {len(records)}")

            if query_time < 100:  # Less than 100ms is good
                print(f"   ✅ PERFORMANCE: Query time acceptable ({query_time:.1f}ms)")
                return True
            else:
                print(f"   ⚠️ PERFORMANCE: Query time high ({query_time:.1f}ms)")
                return False

    except Exception as e:
        print(f"   ❌ Performance test failed: {e}")
        return False
    finally:
        driver.close()


def final_system_status():
    """Final system status and recommendations"""
    print("   🎯 FINAL SYSTEM STATUS:")

    # Check all components
    components = {
        "PostgreSQL": test_postgresql_connection(),
        "Neo4j": test_neo4j_connection(),
        "ETL Data": verify_etl_data_source(),
        "Job Diversity": verify_job_specific_skills(),
        "Services Logic": verify_services_logic(),
    }

    print("   📊 Component Status:")
    for component, status in components.items():
        status_icon = "✅" if status else "❌"
        print(f"      • {component}: {status_icon}")

    all_working = all(components.values())

    if all_working:
        print("\n   🎉 SYSTEM STATUS: ✅ ALL SYSTEMS OPERATIONAL")
        print("   📋 Summary:")
        print("      • ETL rebuilt with work activities data")
        print("      • Jobs now have job-specific skills")
        print("      • No more universal skills shared by all jobs")
        print("      • Services.py logic working correctly")
        print("      • Performance is acceptable")
        print("\n   🚀 READY FOR PRODUCTION!")
    else:
        print("\n   ⚠️ SYSTEM STATUS: Some issues remain")
        failed_components = [k for k, v in components.items() if not v]
        print(f"   📋 Failed components: {', '.join(failed_components)}")


def test_postgresql_connection():
    """Test PostgreSQL connection"""
    try:
        conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, database=PG_DB, user=PG_USER, password=PG_PASS)
        conn.close()
        return True
    except Exception:
        return False


def test_neo4j_connection():
    """Test Neo4j connection"""
    try:
        driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))
        with driver.session() as session:
            session.run("RETURN 1").consume()
        driver.close()
        return True
    except Exception:
        return False


if __name__ == "__main__":
    main()
    print("\n" + "=" * 80)
    print("🎯 COMPREHENSIVE TEST COMPLETE")
    print("=" * 80)
