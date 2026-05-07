#!/usr/bin/env python3
"""
Test the fixed services.py logic
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from neo4j import GraphDatabase


class TestNeo4jService:
    """Test version of Neo4jService with fixed logic"""

    def __init__(self):
        self._uri = "bolt://localhost:7687"
        self._auth = ("neo4j", "password123456")
        self.driver = None
        self._connect()

    def _connect(self):
        try:
            self.driver = GraphDatabase.driver(
                self._uri,
                auth=self._auth,
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=30,
                connection_timeout=30,
            )

            # Test connection
            with self.driver.session() as s:
                s.run("RETURN 1").consume()
            print("[OK] Neo4j connection successful")
        except Exception as e:
            print(f"[WARN] Neo4j connection failed: {e}")
            self.driver = None

    def _get_session(self):
        """Get a Neo4j session with proper error handling"""
        try:
            if self.driver is None:
                self._connect()

            if self.driver is None:
                return None

            # Verify driver is still valid
            self.driver.verify_connectivity()
            return self.driver.session()

        except Exception as e:
            print(f"[WARN] Neo4j session error: {e}")
            self.driver = None
            self._connect()

            if self.driver:
                try:
                    return self.driver.session()
                except Exception:
                    return None
            return None

    def get_job_skills(self, job_id: str, limit: int = 8):
        """Fixed version of get_job_skills"""
        if not self.driver:
            print("[WARN] Neo4j driver not available, using fallback")
            return self._get_fallback_skills(job_id, limit)

        try:
            neo4j_session = self._get_session()
            if not neo4j_session:
                print("[WARN] Neo4j session not available, using fallback")
                return self._get_fallback_skills(job_id, limit)

            with neo4j_session as session:
                # Simplified query - just get top skills by importance
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
                    LIMIT $limit
                """,
                    job_id=job_id,
                    limit=limit,
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
                        }
                    )

                print(f"[OK] Neo4j returned {len(skills)} skills for job {job_id}")

                if skills:
                    return skills[:limit]

        except Exception as e:
            print(f"[WARN] Neo4j skills query failed: {e}")
            return self._get_fallback_skills(job_id, limit)

        print(f"[WARN] Neo4j returned no skills for job {job_id}, using fallback")
        return self._get_fallback_skills(job_id, limit)

    def _get_fallback_skills(self, job_id: str, limit: int = 8):
        """Fallback skills when Neo4j is not available"""
        fallback_skills = [
            {
                "skill_name": "Problem Solving",
                "skill_type": "skill",
                "importance": 4.5,
                "level": 4.0,
                "rank": 1,
                "combined_score": 4.25,
            },
            {
                "skill_name": "Communication",
                "skill_type": "skill",
                "importance": 4.0,
                "level": 4.0,
                "rank": 2,
                "combined_score": 4.0,
            },
            {"skill_name": "Teamwork", "skill_type": "skill", "importance": 4.0, "level": 3.5, "rank": 3, "combined_score": 3.75},
            {
                "skill_name": "Critical Thinking",
                "skill_type": "skill",
                "importance": 4.2,
                "level": 3.8,
                "rank": 4,
                "combined_score": 4.0,
            },
            {
                "skill_name": "Time Management",
                "skill_type": "skill",
                "importance": 3.8,
                "level": 3.5,
                "rank": 5,
                "combined_score": 3.65,
            },
        ]

        return fallback_skills[:limit]

    def close(self):
        if self.driver:
            self.driver.close()


def test_fixed_logic():
    """Test the fixed Neo4j logic"""
    print("🧪 TESTING FIXED NEO4J SERVICES LOGIC")
    print("=" * 60)

    service = TestNeo4jService()
    job_id = "13-1199.00"

    print(f"📊 Testing job_id: {job_id}")

    # Test the fixed get_job_skills method
    skills = service.get_job_skills(job_id, limit=8)

    print("\n📋 RESULTS:")
    print(f"   Total skills returned: {len(skills)}")

    for i, skill in enumerate(skills, 1):
        print(f"   {i}. {skill['skill_name']}")
        print(f"      Type: {skill['skill_type']}, Importance: {skill['importance']}")

    # Check if we got Neo4j data or fallback
    neo4j_indicators = ["Communicating effectively trong writing", "Sử dụng logic và lý luận", "Identifying complex problems"]

    is_neo4j_data = any(indicator in skill["skill_name"] for skill in skills for indicator in neo4j_indicators)

    if is_neo4j_data:
        print("\n[OK] SUCCESS: Got real Neo4j data!")
        print("   This should fix the UI fallback issue")
    else:
        print("\n[ERR] STILL USING FALLBACK:")
        print("   Need to investigate further")

    service.close()
    return skills


if __name__ == "__main__":
    print("🚀 TESTING FIXED SERVICES.PY LOGIC")
    print("=" * 70)

    skills = test_fixed_logic()

    print("\n🎉 TESTING COMPLETE!")
    print("💡 If you see Vietnamese skills above, the fix worked!")
