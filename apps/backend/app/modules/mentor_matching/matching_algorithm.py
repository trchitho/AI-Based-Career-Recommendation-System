"""
Core matching algorithm — pure Python, no external ML deps required.
"""
import math
from typing import Dict, List, Tuple


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a ** 2 for a in v1))
    mag2 = math.sqrt(sum(b ** 2 for b in v2))
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    return dot / (mag1 * mag2)


def calculate_personality_similarity(
    mentee_riasec: Dict[str, float],
    mentee_big5: Dict[str, float],
    mentor_riasec: Dict[str, float],
    mentor_big5: Dict[str, float],
) -> float:
    """
    Cosine similarity over combined RIASEC + Big Five vector.
    Returns 0.0 if either side has no data.
    """
    riasec_keys = ["R", "I", "A", "S", "E", "C"]
    big5_keys = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]

    mentee_vec = [mentee_riasec.get(k, 0.0) for k in riasec_keys] + \
                 [mentee_big5.get(k, 0.0) for k in big5_keys]
    mentor_vec = [mentor_riasec.get(k, 0.0) for k in riasec_keys] + \
                 [mentor_big5.get(k, 0.0) for k in big5_keys]

    if all(v == 0.0 for v in mentee_vec) or all(v == 0.0 for v in mentor_vec):
        return 0.5  # neutral when no personality data

    return _cosine_similarity(mentee_vec, mentor_vec)


def calculate_skill_match(
    desired_skills: List[str],
    mentor_expertise: List[str],
) -> Tuple[float, List[str]]:
    """
    Returns (match_ratio 0-1, list of matching skill names).
    Uses case-insensitive substring matching.
    """
    if not desired_skills or not mentor_expertise:
        return 0.0, []

    desired_lower = [s.lower().strip() for s in desired_skills]
    expertise_lower = [e.lower().strip() for e in mentor_expertise]

    matched = set()
    matched_labels = []

    for d in desired_lower:
        for e_idx, e in enumerate(expertise_lower):
            if d in e or e in d:
                if d not in matched:
                    matched.add(d)
                    matched_labels.append(mentor_expertise[e_idx])
                break

    score = len(matched) / len(desired_skills)
    return score, matched_labels


def calculate_career_match(
    mentee_target_career: str,
    mentor_position: str,
    mentor_expertise: List[str],
) -> float:
    """
    Returns 0-1 score of how well mentor's career aligns with mentee's goal.
    """
    if not mentee_target_career:
        return 0.0

    target = mentee_target_career.lower()
    position = (mentor_position or "").lower()
    expertise_str = " ".join(mentor_expertise or []).lower()

    keywords = [w for w in target.replace("-", " ").split() if len(w) > 3]

    hits = sum(1 for kw in keywords if kw in position or kw in expertise_str)
    if not keywords:
        return 0.3

    return min(hits / len(keywords), 1.0)


def calculate_overall_compatibility(
    skill_match: float,
    career_match: float,
    personality_sim: float,
    has_personality_data: bool,
) -> float:
    """
    Weighted overall score (0-1):
      - skill match:     50%
      - career match:    30%
      - personality:     20% (skipped when no data → redistributed)
    """
    if has_personality_data:
        return (skill_match * 0.50) + (career_match * 0.30) + (personality_sim * 0.20)
    else:
        return (skill_match * 0.60) + (career_match * 0.40)


def generate_matching_reasons(
    matching_skills: List[str],
    career_match: float,
    personality_sim: float,
    experience_years: int,
    has_personality_data: bool,
) -> List[str]:
    reasons = []

    if matching_skills:
        top = matching_skills[:3]
        reasons.append(f"Có chuyên môn về: {', '.join(top)}")

    if career_match >= 0.7:
        reasons.append("Đã thành công trong lĩnh vực nghề nghiệp bạn hướng tới")
    elif career_match >= 0.4:
        reasons.append("Có kinh nghiệm liên quan đến lĩnh vực bạn quan tâm")

    if has_personality_data and personality_sim >= 0.75:
        reasons.append("Phong cách làm việc và tính cách tương đồng cao")

    if experience_years >= 10:
        reasons.append(f"Hơn {experience_years} năm kinh nghiệm trong ngành")
    elif experience_years >= 5:
        reasons.append(f"{experience_years} năm kinh nghiệm chuyên nghiệp")

    if not reasons:
        reasons.append("Có thể chia sẻ kinh nghiệm hữu ích cho lộ trình của bạn")

    return reasons
