"""
app/modules/graph/graph_queries.py
===================================
Neo4j graph queries cho Mentor Matching & Career Roadmap.
Thay the SQL-only matching bang graph traversal de tim:
  - Mentor phu hop theo Skill overlap (REQUIRES / HAS_SKILL paths)
  - Career path recommendations (INTERESTED_IN / COMPLETED_ROADMAP)
  - Skill gap recommendations qua graph

Tat ca ham deu fallback ve [] neu Neo4j khong kha dung.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
#  Helper
# ─────────────────────────────────────────────────────────────

def _run(driver, cypher: str, **params) -> List[Dict[str, Any]]:
    """Execute Cypher, return list of record dicts. Returns [] on error."""
    if not driver:
        return []
    try:
        with driver.session() as s:
            result = s.run(cypher, **params)
            return [r.data() for r in result]
    except Exception as e:
        logger.warning("[graph] Query error: %s", e)
        return []


# ─────────────────────────────────────────────────────────────
#  MENTOR MATCHING via Graph
# ─────────────────────────────────────────────────────────────

def find_mentors_by_skill_overlap(
    driver,
    desired_skills: List[str],
    target_career: str = "",
    limit: int = 10,
) -> List[Dict]:
    """
    Tim mentor qua graph traversal:
      Mentee WANTS_SKILL -> Skill <- HAS_SKILL Mentor

    Score = (ky nang trung / tong ky nang muon hoc) * 100

    @param driver:         Neo4j driver
    @param desired_skills: Danh sach ky nang mentee muon hoc
    @param target_career:  Nghe nghe mentee huong toi (de boost score)
    @param limit:          So mentor toi da tra ve
    @returns: List[{user_id, name, position, company, score, matching_skills}]
    """
    if not desired_skills or not driver:
        return []

    # Normalize skills to lowercase for matching
    normalized = [s.lower().strip() for s in desired_skills if s]

    cypher = """
    UNWIND $skills AS want
    MATCH (mn:Mentor)-[:HAS_SKILL]->(sk:Skill)
    WHERE toLower(sk.name) CONTAINS want
       OR want CONTAINS toLower(sk.name)
    WITH mn, collect(DISTINCT sk.name) AS matched_skills, count(DISTINCT sk) AS match_count
    WHERE match_count > 0
    OPTIONAL MATCH (mn)-[:CAN_GUIDE_FOR]->(c:Career)
      WHERE toLower(c.title) CONTAINS toLower($career)
    WITH mn, matched_skills, match_count,
         CASE WHEN c IS NOT NULL THEN 1 ELSE 0 END AS career_boost
    RETURN
      mn.user_id            AS user_id,
      mn.name               AS name,
      mn.position           AS position,
      mn.company            AS company,
      mn.experience_years   AS experience_years,
      mn.max_mentees        AS max_mentees,
      matched_skills,
      toFloat(match_count) / toFloat($total_wanted) * 100 + career_boost * 10 AS score
    ORDER BY score DESC
    LIMIT $limit
    """

    rows = _run(
        driver, cypher,
        skills=normalized,
        career=target_career or "",
        total_wanted=max(len(normalized), 1),
        limit=limit,
    )
    return rows


def find_users_completed_similar_career(
    driver,
    target_career: str,
    exclude_user_id: int,
    limit: int = 5,
) -> List[Dict]:
    """
    Tim users da hoan thanh roadmap cua nghe tuong tu.
    Source 2 cho Mentor Matching qua graph.

    @returns: List[{user_id, career_title, progress_pct, steps_done}]
    """
    if not driver or not target_career:
        return []

    cypher = """
    MATCH (u:User)-[r:COMPLETED_ROADMAP]->(c:Career)
    WHERE toLower(c.title) CONTAINS toLower($career)
      AND u.id <> $exclude
      AND r.steps_done > 0
    RETURN
      u.id              AS user_id,
      c.title           AS career_title,
      r.progress_pct    AS progress_pct,
      r.steps_done      AS steps_done
    ORDER BY r.progress_pct DESC
    LIMIT $limit
    """

    return _run(driver, cypher, career=target_career, exclude=exclude_user_id, limit=limit)


# ─────────────────────────────────────────────────────────────
#  SKILL GAP via Graph
# ─────────────────────────────────────────────────────────────

def get_career_required_skills_from_graph(
    driver,
    career_id: str,
    min_importance: float = 0.0,
) -> List[Dict]:
    """
    Lay danh sach ky nang yeu cau cua 1 nghe tu graph.

    @param career_id:      Career ID (PostgreSQL id)
    @param min_importance: Nguong importance toi thieu (0-1)
    @returns: List[{name, category, importance, level}]
    """
    if not driver:
        return []

    cypher = """
    MATCH (c:Career {id:$cid})-[r:REQUIRES]->(sk:Skill)
    WHERE r.importance >= $min_imp
    RETURN sk.name AS name, sk.category AS category,
           r.importance AS importance, r.level AS level
    ORDER BY r.importance DESC
    """

    return _run(driver, cypher, cid=str(career_id), min_imp=min_importance)


def find_skill_gaps_for_user(
    driver,
    user_id: int,
    career_id: str,
) -> Dict:
    """
    So sanh WANTS_SKILL (mentee) voi REQUIRES (career) de tim gap.

    @returns: {matched: [skills], missing: [skills], extra: [skills]}
    """
    if not driver:
        return {"matched": [], "missing": [], "extra": []}

    cypher = """
    MATCH (c:Career {id:$cid})-[r:REQUIRES]->(sk:Skill)
    WITH collect({name:sk.name, importance:r.importance}) AS required

    OPTIONAL MATCH (mn:Mentee {user_id:$uid})-[:WANTS_SKILL]->(usk:Skill)
    WITH required, collect(DISTINCT toLower(usk.name)) AS has_skills

    UNWIND required AS req
    WITH req, has_skills,
         CASE WHEN ANY(h IN has_skills WHERE h CONTAINS toLower(req.name)
                                           OR toLower(req.name) CONTAINS h)
              THEN 'matched' ELSE 'missing' END AS status
    RETURN status, collect(req.name) AS skills, avg(req.importance) AS avg_imp
    """

    rows = _run(driver, cypher, cid=str(career_id), uid=user_id)
    result: Dict = {"matched": [], "missing": [], "extra": []}
    for row in rows:
        result[row.get("status", "missing")] = row.get("skills", [])
    return result


# ─────────────────────────────────────────────────────────────
#  CAREER RECOMMENDATIONS via Graph
# ─────────────────────────────────────────────────────────────

def recommend_careers_for_user(
    driver,
    user_id: int,
    limit: int = 5,
) -> List[Dict]:
    """
    Goi y nghe nghe cho user dua tren:
    - Nghe nghe nhung user tuong tu quan tam (collaborative filtering)
    - Ky nang cua mentors phu hop
    - Roadmap da hoan thanh

    @returns: List[{career_id, title, score, reason}]
    """
    if not driver:
        return []

    cypher = """
    // Users da hoan thanh roadmap tuong tu quan tam nghe nao?
    MATCH (u:User {id:$uid})-[:INTERESTED_IN]->(c:Career)
    MATCH (other:User)-[:INTERESTED_IN]->(c)
    WHERE other.id <> $uid
    MATCH (other)-[:INTERESTED_IN]->(rec:Career)
    WHERE NOT EXISTS {MATCH (u)-[:INTERESTED_IN]->(rec)}
    WITH rec, count(DISTINCT other) AS collab_score

    RETURN rec.id AS career_id, rec.title AS title,
           toFloat(collab_score) * 10 AS score,
           'Nguoi dung tuong tu quan tam nghe nay' AS reason
    ORDER BY score DESC
    LIMIT $limit
    """

    return _run(driver, cypher, uid=user_id, limit=limit)


def get_skill_path_to_career(
    driver,
    current_skills: List[str],
    target_career_id: str,
) -> List[Dict]:
    """
    Tim con duong ky nang tu hien tai den nghe muc tieu.
    Tra ve danh sach ky nang can hoc theo do uu tien.

    @returns: List[{skill_name, importance, category, already_have}]
    """
    if not driver:
        return []

    normalized_current = [s.lower().strip() for s in current_skills]

    cypher = """
    MATCH (c:Career {id:$cid})-[r:REQUIRES]->(sk:Skill)
    WITH sk, r.importance AS imp, r.level AS lvl
    RETURN
      sk.name AS skill_name,
      imp AS importance,
      lvl AS level,
      sk.category AS category,
      CASE WHEN ANY(cur IN $current WHERE toLower(sk.name) CONTAINS cur
                                        OR cur CONTAINS toLower(sk.name))
           THEN true ELSE false END AS already_have
    ORDER BY already_have ASC, imp DESC
    """

    return _run(driver, cypher, cid=str(target_career_id), current=normalized_current)


# ─────────────────────────────────────────────────────────────
#  STATS / MONITORING
# ─────────────────────────────────────────────────────────────

def graph_health_check(driver) -> Dict:
    """Kiem tra Neo4j va tra ve so luong nodes/edges."""
    if not driver:
        return {"connected": False, "nodes": 0, "relationships": 0}
    try:
        with driver.session() as s:
            n = s.run("MATCH (n) RETURN count(n) as c").single()["c"]
            r = s.run("MATCH ()-[r]->() RETURN count(r) as c").single()["c"]
            return {"connected": True, "nodes": n, "relationships": r}
    except Exception as e:
        return {"connected": False, "error": str(e)}
