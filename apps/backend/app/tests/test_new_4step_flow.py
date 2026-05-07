#!/usr/bin/env python3
"""
Test new 4-step skills flow:
1. PostgreSQL work activities
2. Neo4j
3. PostgreSQL career_ksas (abilities + knowledge only)
4. Fallback
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


def test_step1_postgres_work_activities(job_id: str) -> list:
    """Step 1: PostgreSQL work activities"""
    try:
        conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, database=PG_DB, user=PG_USER, password=PG_PASS)
        cursor = conn.cursor()

        sql = """
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
        """

        cursor.execute(sql, (job_id,))
        rows = cursor.fetchall()

        skills = []
        for row in rows:
            skills.append(
                {
                    "skill_name": row[0],
                    "skill_type": row[1] or "Kỹ năng",
                    "importance": float(row[2]) if row[2] else 0.0,
                    "level": float(row[3]) if row[3] else 0.0,
                    "rank": row[4] or 999,
                    "combined_score": float(row[5]) if row[5] else 0.0,
                    "source": "work_activities",
                }
            )

        cursor.close()
        conn.close()
        return skills

    except Exception as e:
        print(f"   [ERR] Step 1 error: {e}")
        return []


def test_step2_neo4j(job_id: str) -> list:
    """Step 2: Neo4j skills"""
    driver = GraphDatabase.driver(NEO_URI, auth=(NEO_USER, NEO_PASS))

    try:
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

            skills = []
            for record in result:
                skills.append(
                    {
                        "skill_name": record["skill_name"],
                        "skill_type": record["skill_type"],
                        "importance": float(record["importance"]) if record["importance"] else 3.0,
                        "level": float(record["level"]) if record["level"] else 3.0,
                        "rank": int(record["rank"]) if record["rank"] else 999,
                        "combined_score": float(record["combined_score"]) if record["combined_score"] else 3.0,
                        "source": "neo4j",
                    }
                )

            return skills

    except Exception as e:
        print(f"   [ERR] Step 2 error: {e}")
        return []
    finally:
        driver.close()


def test_step3_postgres_ksas(job_id: str) -> list:
    """Step 3: PostgreSQL career_ksas (abilities + knowledge only)"""
    try:
        conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, database=PG_DB, user=PG_USER, password=PG_PASS)
        cursor = conn.cursor()

        sql = """
            SELECT
                COALESCE(name_vi, name) AS skill_name,
                CASE 
                    WHEN ksa_type = 'ability' THEN 'Khả năng'
                    WHEN ksa_type = 'knowledge' THEN 'Kiến thức'
                    ELSE ksa_type
                END AS skill_type,
                importance,
                level,
                ksa_type
            FROM core.career_ksas
            WHERE onet_code = %s
              AND ksa_type IN ('ability', 'knowledge')
              AND level IS NOT NULL
              AND importance IS NOT NULL
            ORDER BY level DESC, importance DESC
            LIMIT 5
        """

        cursor.execute(sql, (job_id,))
        rows = cursor.fetchall()

        skills = []
        for i, row in enumerate(rows):
            skills.append(
                {
                    "skill_name": row[0],
                    "skill_type": row[1],
                    "importance": float(row[3]),  # Hiển thị level thay vì importance
                    "level": float(row[3]) if row[3] else 0.0,
                    "rank": i + 1,
                    "combined_score": float(row[3]) if row[3] else 0.0,
                    "source": "career_ksas",
                    "ksa_type": row[4],
                }
            )

        cursor.close()
        conn.close()
        return skills

    except Exception as e:
        print(f"   [ERR] Step 3 error: {e}")
        return []


def test_step4_fallback(job_id: str) -> list:
    """Step 4: Fallback skills"""
    fallback_skills = [
        {
            "skill_name": "Problem Solving",
            "skill_type": "skill",
            "importance": 4.5,
            "level": 4.0,
            "rank": 1,
            "combined_score": 4.25,
            "source": "fallback",
        },
        {
            "skill_name": "Communication",
            "skill_type": "skill",
            "importance": 4.0,
            "level": 4.0,
            "rank": 2,
            "combined_score": 4.0,
            "source": "fallback",
        },
        {
            "skill_name": "Teamwork",
            "skill_type": "skill",
            "importance": 4.0,
            "level": 3.5,
            "rank": 3,
            "combined_score": 3.75,
            "source": "fallback",
        },
        {
            "skill_name": "Critical Thinking",
            "skill_type": "skill",
            "importance": 4.2,
            "level": 3.8,
            "rank": 4,
            "combined_score": 4.0,
            "source": "fallback",
        },
        {
            "skill_name": "Time Management",
            "skill_type": "skill",
            "importance": 3.8,
            "level": 3.5,
            "rank": 5,
            "combined_score": 3.65,
            "source": "fallback",
        },
    ]

    # Add job-specific skills based on job_id
    if "15-1252" in job_id:  # Software Developer
        fallback_skills.extend(
            [
                {
                    "skill_name": "Programming",
                    "skill_type": "skill",
                    "importance": 5.0,
                    "level": 4.5,
                    "rank": 1,
                    "combined_score": 4.75,
                    "source": "fallback",
                },
                {
                    "skill_name": "Software Development",
                    "skill_type": "skill",
                    "importance": 4.8,
                    "level": 4.2,
                    "rank": 2,
                    "combined_score": 4.5,
                    "source": "fallback",
                },
            ]
        )

    return fallback_skills[:5]


def simulate_4step_flow(job_id: str):
    """Simulate the complete 4-step flow"""
    print(f"\n🔄 SIMULATING 4-STEP FLOW FOR {job_id}")
    print("=" * 60)

    # Step 1: PostgreSQL work activities
    print("📋 Step 1: PostgreSQL work activities")
    step1_skills = test_step1_postgres_work_activities(job_id)
    print(f"   Result: {len(step1_skills)} skills")

    if step1_skills:
        print("   [OK] Using Step 1 (PostgreSQL work activities)")
        final_skills = step1_skills
        final_source = "PostgreSQL work activities"
    else:
        # Step 2: Neo4j
        print("📋 Step 2: Neo4j")
        step2_skills = test_step2_neo4j(job_id)
        print(f"   Result: {len(step2_skills)} skills")

        if step2_skills:
            print("   [OK] Using Step 2 (Neo4j)")
            final_skills = step2_skills
            final_source = "Neo4j"
        else:
            # Step 3: PostgreSQL career_ksas
            print("📋 Step 3: PostgreSQL career_ksas (abilities + knowledge)")
            step3_skills = test_step3_postgres_ksas(job_id)
            print(f"   Result: {len(step3_skills)} abilities/knowledge")

            if step3_skills:
                print("   [OK] Using Step 3 (PostgreSQL KSAs)")
                final_skills = step3_skills
                final_source = "PostgreSQL career_ksas"
            else:
                # Step 4: Fallback
                print("📋 Step 4: Fallback")
                step4_skills = test_step4_fallback(job_id)
                print(f"   Result: {len(step4_skills)} fallback skills")
                print("   [OK] Using Step 4 (Fallback)")
                final_skills = step4_skills
                final_source = "Fallback"

    # Display results
    print(f"\n🎯 FINAL RESULT: {final_source}")
    print(f"📊 Skills count: {len(final_skills)}")
    print("📋 Skills list:")
    for i, skill in enumerate(final_skills[:5], 1):
        skill_name = skill.get("skill_name", "Unknown")
        skill_type = skill.get("skill_type", "Unknown")
        importance = skill.get("importance", 0)
        source = skill.get("source", "Unknown")
        ksa_type = skill.get("ksa_type", "")
        ksa_info = f" ({ksa_type})" if ksa_type else ""
        print(f"   {i}. {skill_name} - {skill_type}{ksa_info}")
        print(f"      Level/Importance: {importance:.2f} | Source: {source}")

    return final_skills, final_source


def main():
    print("🚀 TESTING NEW 4-STEP SKILLS FLOW")
    print("=" * 80)

    # Test jobs with different data availability
    test_jobs = [
        ("15-1252.00", "Software Developer - has work activities"),
        ("33-9094.00", "Job without work activities - should use KSAs"),
        ("45-2099.00", "Job without work activities - should use KSAs"),
        ("99-9999.00", "Non-existent job - should use fallback"),
    ]

    results = {}

    for job_id, description in test_jobs:
        print(f"\n{'=' * 80}")
        print(f"🧪 TESTING: {job_id} ({description})")
        print(f"{'=' * 80}")

        final_skills, final_source = simulate_4step_flow(job_id)
        results[job_id] = {"skills": final_skills, "source": final_source}

    # Summary
    print(f"\n{'=' * 80}")
    print("📊 SUMMARY OF 4-STEP FLOW TESTING")
    print(f"{'=' * 80}")

    for job_id, result in results.items():
        source = result["source"]
        skill_count = len(result["skills"])
        print(f"   {job_id}: {source} ({skill_count} skills)")

    print("\n[OK] 4-STEP FLOW TESTING COMPLETE!")
    print("   Step 1: PostgreSQL work activities")
    print("   Step 2: Neo4j")
    print("   Step 3: PostgreSQL career_ksas (abilities + knowledge)")
    print("   Step 4: Fallback")


if __name__ == "__main__":
    main()
