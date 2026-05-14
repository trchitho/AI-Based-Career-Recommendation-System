"""
Sync Course ↔ Skill relationships into Neo4j.

Neo4j schema after sync:
  (:Course {id, title, url, platform})-[:TEACHES {score: float}]->(:Skill {name})
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _get_driver():
    from app.modules.graph.neo4j_client import get_driver
    return get_driver()


def sync_courses_to_neo4j(db: "Session", batch_size: int = 100) -> dict:
    """
    Read CourseSkillMap from PostgreSQL and upsert into Neo4j.
    Safe to run multiple times (uses MERGE).
    Returns {synced_courses, synced_mappings, errors}
    """
    driver = _get_driver()
    if driver is None:
        logger.warning("Neo4j driver not available — skipping Neo4j sync")
        return {"synced_courses": 0, "synced_mappings": 0, "errors": ["Neo4j not connected"]}

    from app.modules.courses.models import CourseCatalog, CourseSkillMap

    courses = db.query(CourseCatalog).filter(CourseCatalog.is_embedded == True).all()
    mappings = db.query(CourseSkillMap).all()

    # Build lookup
    course_map = {c.id: c for c in courses}

    synced_courses = 0
    synced_mappings = 0
    errors = []

    with driver.session() as neo_session:
        # Upsert Course nodes
        for c in courses:
            try:
                neo_session.run(
                    """
                    MERGE (c:Course {external_id: $eid})
                    SET c.db_id    = $db_id,
                        c.title    = $title,
                        c.url      = $url,
                        c.platform = $platform,
                        c.level    = $level,
                        c.rating   = $rating,
                        c.is_free  = $is_free
                    """,
                    eid=c.external_id,
                    db_id=c.id,
                    title=c.title,
                    url=c.url or "",
                    platform=c.platform or "",
                    level=c.level or "",
                    rating=float(c.rating or 0),
                    is_free=bool(c.is_free),
                )
                synced_courses += 1
            except Exception as e:
                errors.append(f"Course {c.id}: {e}")

        # Upsert TEACHES relationships in batches
        chunk: list[CourseSkillMap] = []
        for m in mappings:
            chunk.append(m)
            if len(chunk) >= batch_size:
                _upsert_teaches(neo_session, chunk, course_map)
                synced_mappings += len(chunk)
                chunk = []
        if chunk:
            _upsert_teaches(neo_session, chunk, course_map)
            synced_mappings += len(chunk)

    logger.info(f"Neo4j sync done: {synced_courses} courses, {synced_mappings} mappings")
    return {"synced_courses": synced_courses, "synced_mappings": synced_mappings, "errors": errors}


def _upsert_teaches(neo_session, mappings, course_map):
    for m in mappings:
        course = course_map.get(m.course_id)
        if not course:
            continue
        try:
            neo_session.run(
                """
                MERGE (s:Skill {name: $skill})
                WITH s
                MATCH (c:Course {external_id: $eid})
                MERGE (c)-[r:TEACHES]->(s)
                SET r.score = $score
                """,
                skill=m.skill_name,
                eid=course.external_id,
                score=float(m.similarity_score),
            )
        except Exception as e:
            logger.warning(f"Failed to upsert TEACHES {course.external_id} → {m.skill_name}: {e}")


def _neo4j_has_courses() -> bool:
    """Check if Neo4j has Course nodes — skip query if not synced yet."""
    driver = _get_driver()
    if driver is None:
        return False
    try:
        with driver.session() as s:
            count = s.run("MATCH (c:Course) RETURN count(c) AS n").single()["n"]
            return count > 0
    except Exception:
        return False


def query_courses_for_skills(skills: list[str], top_k: int = 5) -> list[dict]:
    """
    Query Neo4j: find courses that TEACH any of the given skills.
    Returns empty list (skip Neo4j) if Course nodes not synced yet.
    """
    driver = _get_driver()
    if driver is None or not skills:
        return []

    # Skip Neo4j entirely if Course nodes don't exist — avoids warning spam
    if not _neo4j_has_courses():
        logger.info("[CourseRec] Neo4j has no Course nodes — using PostgreSQL fallback")
        return []

    try:
        with driver.session() as session:
            result = session.run(
                """
                UNWIND $skills AS skill
                MATCH (c:Course)-[r:TEACHES]->(s:Skill {name: skill})
                RETURN c.title    AS title,
                       c.url      AS url,
                       c.platform AS platform,
                       c.db_id    AS db_id,
                       c.level    AS level,
                       c.rating   AS rating,
                       c.is_free  AS is_free,
                       r.score    AS score,
                       skill      AS skill_name
                ORDER BY r.score DESC
                LIMIT $limit
                """,
                skills=skills,
                limit=top_k * len(skills),
            )
            return [dict(r) for r in result]
    except Exception as e:
        logger.warning(f"Neo4j query_courses_for_skills failed: {e}")
        return []
