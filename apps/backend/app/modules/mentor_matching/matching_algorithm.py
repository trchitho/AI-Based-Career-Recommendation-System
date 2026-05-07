"""
matching_algorithm.py
=====================
Core scoring pipeline — kết hợp 5 signals:

  Signal               Weight   Source
  ─────────────────────────────────────────────────────────────
  1. Skill match        30%     Keyword overlap (fast)
  2. Semantic skill     20%     vi-SBERT cosine similarity
  3. Career match       20%     Keyword + graph path
  4. Personality        15%     Cosine(RIASEC + Big5) vector
  5. Graph (Jaccard +   15%     Neo4j GDS
     PageRank)
"""
import math
from typing import Dict, List, Optional, Tuple


# ── Helpers ────────────────────────────────────────────────────────

def _cosine(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot  = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a ** 2 for a in v1))
    mag2 = math.sqrt(sum(b ** 2 for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"]
RIASEC_ALT  = ["realistic","investigative","artistic","social","enterprising","conventional"]
BIG5_KEYS   = ["openness","conscientiousness","extraversion","agreeableness","neuroticism"]


def _vec(scores: dict, keys: list, alt: Optional[list] = None) -> List[float]:
    result = []
    for i, k in enumerate(keys):
        v = scores.get(k)
        if v is None and alt:
            v = scores.get(alt[i])
        result.append(float(v) if v is not None else 0.0)
    return result


# ── Signal 1: Keyword Skill Match ─────────────────────────────────

def calculate_skill_match(
    desired_skills: List[str],
    mentor_expertise: List[str],
) -> Tuple[float, List[str]]:
    """Case-insensitive substring overlap. Returns (score 0-1, matched names)."""
    if not desired_skills or not mentor_expertise:
        return 0.0, []

    d_lower = [s.lower().strip() for s in desired_skills]
    e_lower = [e.lower().strip() for e in mentor_expertise]

    matched, matched_labels = set(), []
    for d in d_lower:
        for idx, e in enumerate(e_lower):
            if d in e or e in d:
                if d not in matched:
                    matched.add(d)
                    matched_labels.append(mentor_expertise[idx])
                break

    return len(matched) / len(desired_skills), matched_labels


# ── Signal 2: Semantic Skill Similarity (vi-SBERT) ────────────────

def calculate_semantic_skill_similarity(
    mentee_skills: List[str],
    mentor_skills: List[str],
) -> float:
    """
    SBERT cosine similarity giữa trung bình embedding của 2 tập kỹ năng.
    Fallback về 0.0 nếu sentence-transformers chưa tải.
    """
    if not mentee_skills or not mentor_skills:
        return 0.0
    try:
        from app.modules.skill_gap.vector_service import embed
        import numpy as np

        mv = embed(mentee_skills).mean(axis=0)
        nv = embed(mentor_skills).mean(axis=0)
        return float(np.clip(float(mv @ nv), 0.0, 1.0))
    except Exception:
        return 0.0


# ── Signal 3: Career Match ────────────────────────────────────────

def calculate_career_match(
    mentee_target: str,
    mentor_position: str,
    mentor_expertise: List[str],
) -> float:
    if not mentee_target:
        return 0.0
    target = mentee_target.lower()
    pos    = (mentor_position or "").lower()
    exp    = " ".join(mentor_expertise or []).lower()
    kws    = [w for w in target.replace("-", " ").split() if len(w) > 3]
    if not kws:
        return 0.3
    hits = sum(1 for kw in kws if kw in pos or kw in exp)
    return min(hits / len(kws), 1.0)


# ── Signal 4: Personality Cosine (RIASEC + Big5) ─────────────────

def calculate_personality_similarity(
    mentee_riasec: Dict[str, float],
    mentee_big5:   Dict[str, float],
    mentor_riasec: Dict[str, float],
    mentor_big5:   Dict[str, float],
) -> float:
    mv = _vec(mentee_riasec, RIASEC_KEYS, RIASEC_ALT) + _vec(mentee_big5, BIG5_KEYS)
    nv = _vec(mentor_riasec, RIASEC_KEYS, RIASEC_ALT) + _vec(mentor_big5, BIG5_KEYS)
    if all(x == 0 for x in mv) or all(x == 0 for x in nv):
        return 0.5
    return _cosine(mv, nv)


# ── Signal 5: Graph Score (Jaccard + Path + PageRank) ────────────

def calculate_graph_score(graph_signals: Dict[str, float]) -> float:
    """
    Kết hợp 3 graph signals:
      jaccard    40%  — Jaccard skill overlap (Neo4j GDS)
      path_score 40%  — career path traversal distance
      pagerank   20%  — mentor influence score
    """
    j  = float(graph_signals.get("jaccard",    0.0))
    p  = float(graph_signals.get("path_score", 0.0))
    pr = float(graph_signals.get("pagerank",   0.0))
    return j * 0.40 + p * 0.40 + pr * 0.20


# ── Final Combined Score ──────────────────────────────────────────

def calculate_overall_compatibility(
    skill_match:      float,
    career_match:     float,
    personality_sim:  float,
    has_personality:  bool,
    semantic_skill:   float = 0.0,
    graph_score:      float = 0.0,
    has_graph:        bool  = False,
) -> float:
    """
    Weighted final score [0-1].

    Full (graph + personality):  skill 30 | semantic 20 | career 20 | personality 15 | graph 15
    No graph:                    skill 35 | semantic 25 | career 25 | personality 15
    No personality:              skill 40 | semantic 25 | career 25 | graph 10
    Base (keyword only):         skill 60 | career 40
    """
    if has_graph and has_personality:
        return (skill_match * 0.30 + semantic_skill * 0.20 + career_match * 0.20
                + personality_sim * 0.15 + graph_score * 0.15)
    if has_graph:
        return (skill_match * 0.40 + semantic_skill * 0.25
                + career_match * 0.25 + graph_score * 0.10)
    if has_personality:
        return (skill_match * 0.35 + semantic_skill * 0.25
                + career_match * 0.25 + personality_sim * 0.15)
    return skill_match * 0.60 + career_match * 0.40


# ── Reason Generator ─────────────────────────────────────────────

def generate_matching_reasons(
    matching_skills:  List[str],
    career_match:     float,
    personality_sim:  float,
    experience_years: int,
    has_personality:  bool,
    semantic_skill:   float = 0.0,
    graph_signals:    Optional[Dict[str, float]] = None,
) -> List[str]:
    reasons = []

    if matching_skills:
        reasons.append(f"Chuyên môn về: {', '.join(matching_skills[:3])}")

    if semantic_skill >= 0.75:
        reasons.append("Kỹ năng tương đồng cao (phân tích ngữ nghĩa vi-SBERT)")
    elif semantic_skill >= 0.55:
        reasons.append("Kỹ năng có liên quan về mặt ngữ nghĩa")

    if career_match >= 0.7:
        reasons.append("Thành công trong lĩnh vực bạn hướng tới")
    elif career_match >= 0.4:
        reasons.append("Có kinh nghiệm liên quan đến lĩnh vực bạn quan tâm")

    if has_personality and personality_sim >= 0.75:
        reasons.append("Tính cách & phong cách làm việc tương đồng cao (RIASEC + Big5)")
    elif has_personality and personality_sim >= 0.55:
        reasons.append("Có điểm tương đồng về tính cách")

    if graph_signals:
        if graph_signals.get("jaccard", 0) >= 0.4:
            reasons.append("Trùng khớp kỹ năng cao trên đồ thị tri thức (GDS Jaccard)")
        if graph_signals.get("path_score", 0) >= 0.5:
            reasons.append("Lộ trình sự nghiệp gần với mục tiêu của bạn (Graph Traversal)")
        if graph_signals.get("pagerank", 0) >= 0.7:
            reasons.append("Mentor có uy tín cao trong mạng kiến thức (PageRank)")

    if experience_years >= 10:
        reasons.append(f"Hơn {experience_years} năm kinh nghiệm trong ngành")
    elif experience_years >= 5:
        reasons.append(f"{experience_years} năm kinh nghiệm chuyên nghiệp")

    if not reasons:
        reasons.append("Có thể chia sẻ kinh nghiệm hữu ích cho lộ trình của bạn")

    return reasons
