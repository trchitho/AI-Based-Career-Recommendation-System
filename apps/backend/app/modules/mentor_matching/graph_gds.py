"""
graph_gds.py
============
Neo4j Graph Data Science (GDS 2.6.9) algorithms for Mentor Matching.

Thuật toán:
  1. Jaccard Skill Similarity – skill overlap giữa Mentee & Mentor nodes
  2. Career Path Traversal     – khoảng cách đồ thị từ Mentor đến Career đích
  3. Personality Cosine        – cosine similarity RIASEC+Big5 trực tiếp trên graph
  4. Mentor PageRank           – uy tín mentor trong mạng HAS_SKILL / CAN_GUIDE_FOR
  5. sync_personality_to_graph – đồng bộ RIASEC/Big5 lên Mentor / Mentee nodes
"""
from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Helper ─────────────────────────────────────────────────────────

def _run(driver, cypher: str, **params) -> List[Dict[str, Any]]:
    if not driver:
        return []
    try:
        with driver.session() as s:
            return [r.data() for r in s.run(cypher, **params)]
    except Exception as e:
        logger.warning("[gds] query error: %s", e)
        return []


def _run_one(driver, cypher: str, **params) -> Optional[Dict[str, Any]]:
    rows = _run(driver, cypher, **params)
    return rows[0] if rows else None


# ══════════════════════════════════════════════════════════════════
# 1. Jaccard Skill Similarity (GDS-equivalent via Cypher)
# ══════════════════════════════════════════════════════════════════

def compute_jaccard_skill_similarity(
    driver,
    mentee_user_id: int,
    top_k: int = 20,
) -> List[Dict[str, Any]]:
    """
    Jaccard similarity giữa Mentee và Mentor dựa trên WANTS_SKILL / HAS_SKILL.
    Jaccard = |intersection| / |union|
    Returns: [{user_id, jaccard, shared_skills}]
    """
    cypher = """
    // Step 1: mentee skill set size
    MATCH (mentee:Mentee {user_id: $uid})-[:WANTS_SKILL]->(ms:Skill)
    WITH mentee, count(DISTINCT ms) AS mentee_total

    // Step 2: for each mentor, compute intersection & mentor skill size
    MATCH (mentee)-[:WANTS_SKILL]->(shared:Skill)<-[:HAS_SKILL]-(m:Mentor)
    WITH mentee, mentee_total, m,
         collect(DISTINCT shared.name) AS shared_skills,
         count(DISTINCT shared) AS intersection

    MATCH (m)-[:HAS_SKILL]->(ms2:Skill)
    WITH mentee_total, m, shared_skills, intersection,
         count(DISTINCT ms2) AS mentor_total

    WITH m, shared_skills,
         toFloat(intersection) / toFloat(mentee_total + mentor_total - intersection + 1) AS jaccard
    WHERE jaccard > 0
    RETURN
        m.user_id         AS user_id,
        m.name            AS name,
        round(jaccard, 4) AS jaccard,
        shared_skills     AS shared_skills
    ORDER BY jaccard DESC
    LIMIT $k
    """
    return _run(driver, cypher, uid=mentee_user_id, k=top_k)


# ══════════════════════════════════════════════════════════════════
# 2. Career Path Traversal – Graph distance mentor → target career
# ══════════════════════════════════════════════════════════════════

def find_mentors_via_career_path(
    driver,
    target_career: str,
    top_k: int = 15,
) -> List[Dict[str, Any]]:
    """
    Graph Traversal: tìm Mentor gần Career đích nhất.
    Hops=1: CAN_GUIDE_FOR → Career
    Hops=2: HAS_SKILL → Skill ← REQUIRES Career
    Returns: [{user_id, path_hops, path_score}]
    """
    if not target_career:
        return []

    # Direct CAN_GUIDE_FOR
    cypher_direct = """
    MATCH (m:Mentor)-[:CAN_GUIDE_FOR]->(c:Career)
    WHERE toLower(c.title) CONTAINS toLower($career)
    RETURN m.user_id AS user_id, 1 AS path_hops,
           1.0 AS path_score
    LIMIT $k
    """

    # Via shared skills (hops=2)
    cypher_skill = """
    MATCH (m:Mentor)-[:HAS_SKILL]->(sk:Skill)<-[:REQUIRES]-(c:Career)
    WHERE toLower(c.title) CONTAINS toLower($career)
    WITH m, count(DISTINCT sk) AS shared_skill_count
    RETURN m.user_id AS user_id, 2 AS path_hops,
           round(toFloat(shared_skill_count) / 20.0, 4) AS path_score
    ORDER BY shared_skill_count DESC
    LIMIT $k
    """

    direct = _run(driver, cypher_direct, career=target_career, k=top_k)
    via_skill = _run(driver, cypher_skill, career=target_career, k=top_k)

    # Merge: prefer direct, cap path_score at 1.0
    seen: dict = {}
    for r in direct + via_skill:
        uid = r.get("user_id")
        if uid is None:
            continue
        if uid not in seen or r["path_hops"] < seen[uid]["path_hops"]:
            seen[uid] = {
                "user_id": uid,
                "path_hops": r["path_hops"],
                "path_score": min(float(r["path_score"]), 1.0),
            }

    result = sorted(seen.values(), key=lambda x: x["path_score"], reverse=True)
    return result[:top_k]


# ══════════════════════════════════════════════════════════════════
# 3. Personality Cosine Similarity on Graph
# ══════════════════════════════════════════════════════════════════

def _cosine(v1: list, v2: list) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.5
    dot  = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a ** 2 for a in v1))
    mag2 = math.sqrt(sum(b ** 2 for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.5
    return round(dot / (mag1 * mag2), 4)


RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"]
RIASEC_ALT  = ["realistic","investigative","artistic","social","enterprising","conventional"]
BIG5_KEYS   = ["openness","conscientiousness","extraversion","agreeableness","neuroticism"]


def _read_vec(scores: dict, keys: list, alt_keys: list | None = None) -> list:
    """Read score vector, try alternate key names."""
    result = []
    for i, k in enumerate(keys):
        v = scores.get(k)
        if v is None and alt_keys:
            v = scores.get(alt_keys[i])
        result.append(float(v) if v is not None else 0.0)
    return result


def compute_personality_cosine(
    mentee_riasec: dict,
    mentee_big5: dict,
    mentor_riasec: dict,
    mentor_big5: dict,
) -> float:
    """
    Cosine similarity trên vector 11 chiều (RIASEC 6 + Big5 5).
    """
    mv = _read_vec(mentee_riasec, RIASEC_KEYS, RIASEC_ALT) + _read_vec(mentee_big5, BIG5_KEYS)
    nv = _read_vec(mentor_riasec, RIASEC_KEYS, RIASEC_ALT) + _read_vec(mentor_big5, BIG5_KEYS)
    if all(x == 0 for x in mv) or all(x == 0 for x in nv):
        return 0.5   # neutral when no data
    return _cosine(mv, nv)


# ══════════════════════════════════════════════════════════════════
# 4. Mentor PageRank (GDS native)
# ══════════════════════════════════════════════════════════════════

def compute_mentor_pagerank(driver, top_k: int = 30) -> Dict[int, float]:
    """
    Dùng GDS PageRank (GDS 2.6+ syntax) trên subgraph Mentor+Skill+Career.
    Dùng gds.graph.project aggregation thay thế cho gds.graph.project.cypher (deprecated).

    Returns: {user_id: normalized_pagerank_score}
    """
    graph_name = "mentor_pagerank_tmp"
    drop_q = f"CALL gds.graph.drop('{graph_name}', false) YIELD graphName"

    # New GDS 2.x syntax: gds.graph.project as aggregation function
    setup = f"""
    MATCH (source:Mentor)-[r:HAS_SKILL|CAN_GUIDE_FOR]->(target)
    WHERE target:Skill OR target:Career
    WITH gds.graph.project(
        '{graph_name}',
        source,
        target,
        {{
            sourceNodeLabels: labels(source),
            targetNodeLabels: labels(target),
            relationshipType: type(r)
        }}
    ) AS g
    RETURN g.graphName AS graphName, g.nodeCount AS nodeCount
    """

    pagerank_q = f"""
    CALL gds.pageRank.stream('{graph_name}', {{dampingFactor: 0.85, maxIterations: 20}})
    YIELD nodeId, score
    WITH gds.util.asNode(nodeId) AS node, score
    WHERE node:Mentor
    RETURN node.user_id AS user_id, score
    ORDER BY score DESC
    LIMIT {top_k}
    """

    result: Dict[int, float] = {}
    try:
        # Drop stale graph if exists
        _run(driver, drop_q)
        _run(driver, setup)
        rows = _run(driver, pagerank_q)
        if rows:
            max_score = max(r["score"] for r in rows) or 1.0
            for r in rows:
                uid = r.get("user_id")
                if uid is not None:
                    result[int(uid)] = round(r["score"] / max_score, 4)
        _run(driver, drop_q)
        logger.info("[gds] PageRank computed for %d mentors", len(result))
    except Exception as e:
        logger.warning("[gds] PageRank failed: %s", e)
        try:
            _run(driver, drop_q)
        except Exception:
            pass
    return result


# ══════════════════════════════════════════════════════════════════
# 5. Sync personality scores to Neo4j
# ══════════════════════════════════════════════════════════════════

def sync_personality_to_graph(driver, db) -> dict:
    """
    Đồng bộ RIASEC + Big5 scores từ PostgreSQL lên Mentor / Mentee nodes.
    Gọi sau khi build graph hoặc khi user cập nhật assessment.
    """
    from sqlalchemy import text

    mentor_rows = db.execute(text("""
        SELECT user_id,
               riasec_scores::text AS riasec,
               big_five_scores::text AS big5
        FROM   core.mentor_profiles
        WHERE  riasec_scores IS NOT NULL OR big_five_scores IS NOT NULL
    """)).fetchall()

    mentee_rows = db.execute(text("""
        SELECT user_id,
               riasec_scores::text AS riasec,
               big_five_scores::text AS big5
        FROM   core.mentee_profiles
        WHERE  riasec_scores IS NOT NULL OR big_five_scores IS NOT NULL
    """)).fetchall()

    mentor_count = mentee_count = 0

    import json
    with driver.session() as s:
        for row in mentor_rows:
            try:
                riasec = json.loads(row.riasec or "{}")
                big5   = json.loads(row.big5   or "{}")
                s.run(
                    """
                    MATCH (m:Mentor {user_id: $uid})
                    SET m.riasec_scores  = $riasec,
                        m.big_five_scores = $big5
                    """,
                    uid=row.user_id, riasec=str(riasec), big5=str(big5),
                )
                mentor_count += 1
            except Exception:
                pass

        for row in mentee_rows:
            try:
                riasec = json.loads(row.riasec or "{}")
                big5   = json.loads(row.big5   or "{}")
                s.run(
                    """
                    MATCH (mn:Mentee {user_id: $uid})
                    SET mn.riasec_scores  = $riasec,
                        mn.big_five_scores = $big5
                    """,
                    uid=row.user_id, riasec=str(riasec), big5=str(big5),
                )
                mentee_count += 1
            except Exception:
                pass

    logger.info("[gds] Synced %d mentors, %d mentees to graph", mentor_count, mentee_count)
    return {"mentors_synced": mentor_count, "mentees_synced": mentee_count}


# ══════════════════════════════════════════════════════════════════
# 6. Combined graph score for a single mentor
# ══════════════════════════════════════════════════════════════════

def build_graph_score_map(
    driver,
    mentee_user_id: int,
    target_career: str,
    mentee_riasec: dict,
    mentee_big5: dict,
) -> Dict[int, Dict[str, float]]:
    """
    Tính toán tất cả graph signals và trả về map:
      {mentor_user_id: {jaccard, path_score, pagerank}}
    """
    jaccard_rows = compute_jaccard_skill_similarity(driver, mentee_user_id, top_k=50)
    path_rows    = find_mentors_via_career_path(driver, target_career, top_k=50)
    pagerank_map = compute_mentor_pagerank(driver, top_k=50)

    # Index by user_id
    jaccard_map  = {int(r["user_id"]): float(r["jaccard"])     for r in jaccard_rows if r.get("user_id")}
    path_map     = {int(r["user_id"]): float(r["path_score"])  for r in path_rows    if r.get("user_id")}

    all_ids = set(jaccard_map) | set(path_map) | set(pagerank_map)
    result: Dict[int, Dict[str, float]] = {}

    for uid in all_ids:
        result[uid] = {
            "jaccard":    jaccard_map.get(uid, 0.0),
            "path_score": path_map.get(uid, 0.0),
            "pagerank":   pagerank_map.get(uid, 0.0),
        }

    return result
