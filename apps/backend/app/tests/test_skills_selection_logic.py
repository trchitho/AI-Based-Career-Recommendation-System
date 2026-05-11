#!/usr/bin/env python3
"""
20 Test Cases for skills selection logic.
Self-contained pure-logic tests — no DB/app imports needed.
Run: pytest apps/backend/app/tests/test_skills_selection_logic.py -v

Key rules verified:
- technical  → career hard skills only (source != 'jd'), rotates by count
- jd_specific → JD skills only (source == 'jd'), rotates by count
- behavioral  → soft skills, rotates by count (index 0, 1, 2 ...)
- situational → soft skills, rotates with offset +1 vs behavioral
- warm_up     → soft[0] (or hard[0] fallback)
- closing     → []
- Each question returns exactly 1 skill
"""

import sys
from typing import List, Dict


# ── Pure logic (mirrors ai_pipeline_service._select_skills_for_question_type) ─

def is_hard_skill_safe(skill: dict) -> bool:
    is_hard = skill.get("is_hard_skill", False)
    if isinstance(is_hard, bool):
        return is_hard
    if isinstance(is_hard, str):
        return is_hard.lower() in ['true', 'yes', '1']
    if isinstance(is_hard, (int, float)):
        return bool(is_hard)
    return False


def safe_importance(skill: dict) -> float:
    importance = skill.get("importance")
    if importance is None:
        return 0
    try:
        value = float(importance)
        if value in (float('inf'), float('-inf')) or value != value:
            return 0
        return value
    except (ValueError, TypeError):
        return 0


def select_skills(
    skills_context: List[Dict],
    question_type: str,
    question_number: int = 1,
    jd_count_in_db: int = 0,
    technical_count_in_db: int = 0,
    behavioral_count_in_db: int = 0,
    situational_count_in_db: int = 0,
) -> List[Dict]:
    """
    Pure function version of _select_skills_for_question_type.
    *_count_in_db params simulate DB query results (count of already-asked questions).
    """
    if not skills_context:
        return []

    soft_skills = sorted(
        [s for s in skills_context if not is_hard_skill_safe(s)],
        key=safe_importance, reverse=True
    )
    # technical uses career hard skills only (NOT JD source)
    hard_skills = sorted(
        [s for s in skills_context if is_hard_skill_safe(s) and s.get("source") != "jd"],
        key=safe_importance, reverse=True
    )

    if question_type == "technical":
        if not hard_skills:
            return []
        return [hard_skills[technical_count_in_db % len(hard_skills)]]

    elif question_type == "behavioral":
        if not soft_skills:
            return []
        return [soft_skills[behavioral_count_in_db % len(soft_skills)]]

    elif question_type == "situational":
        if not soft_skills:
            return []
        offset = 1 if len(soft_skills) >= 2 else 0
        idx = (situational_count_in_db + offset) % len(soft_skills)
        return [soft_skills[idx]]

    elif question_type == "jd_specific":
        jd_skills = sorted(
            [s for s in skills_context if s.get("source") == "jd"],
            key=safe_importance, reverse=True
        )
        if not jd_skills:
            return []
        return [jd_skills[jd_count_in_db % len(jd_skills)]]

    elif question_type == "closing":
        return []

    else:  # warm_up
        return soft_skills[:1] if soft_skills else hard_skills[:1]


# ── Fixtures ──────────────────────────────────────────────────────────────────

def soft(name: str, importance: float = 4.0) -> Dict:
    return {"skill_name": name, "skill_type": "Soft", "importance": importance,
            "level": 3.0, "is_hard_skill": False}

def career_hard(name: str, importance: float = 4.5) -> Dict:
    return {"skill_name": name, "skill_type": "Hard", "importance": importance,
            "level": 4.0, "is_hard_skill": True, "source": "career"}

def jd_skill(name: str, importance: float = 4.5) -> Dict:
    return {"skill_name": name, "skill_type": "JD Requirement", "importance": importance,
            "level": 4.0, "is_hard_skill": True, "source": "jd"}


SOFT5 = [
    soft("Lam viec voi may tinh", 4.61),
    soft("Xu ly thong tin", 4.38),
    soft("Ra quyet dinh va giai quyet van de", 4.34),
    soft("Tu duy sang tao", 4.33),
    soft("Cap nhat va su dung kien thuc lien quan", 4.10),
]

JD10 = [
    jd_skill("Java SE 8", 4.5),
    jd_skill("JDBC", 4.5),
    jd_skill("HTML5", 4.5),
    jd_skill("CSS3", 4.5),
    jd_skill("Bootstrap 4", 4.5),
    jd_skill("JS", 4.5),
    jd_skill("jQuery", 4.5),
    jd_skill("AJAX", 4.5),
    jd_skill("Maven", 4.0),
    jd_skill("Gradle", 4.0),
]

HARD3 = [
    career_hard("Lap trinh Python", 4.5),
    career_hard("Thiet ke co so du lieu", 4.3),
    career_hard("Phan tich yeu cau", 4.1),
]

# Case có JD: soft skills + JD hard skills (NO career hard skills)
WITH_JD = SOFT5 + JD10

# Case không có JD: soft skills + career hard skills
NO_JD = SOFT5 + HARD3

# Case có cả JD lẫn career hard skills (mixed)
MIXED = SOFT5 + HARD3 + JD10


# ── TEST CASES ────────────────────────────────────────────────────────────────

class TestSkillsSelectionLogic:

    # TC01: warm_up → 1 soft skill (highest importance)
    def test_tc01_warmup_returns_one_soft_skill(self):
        result = select_skills(WITH_JD, "warm_up", 1)
        assert len(result) == 1
        assert result[0]["is_hard_skill"] == False
        assert result[0]["skill_name"] == "Lam viec voi may tinh"

    # TC02: behavioral Q1 (0 asked) → soft[0]
    def test_tc02_behavioral_first_returns_top_soft(self):
        result = select_skills(WITH_JD, "behavioral", 2, behavioral_count_in_db=0)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Lam viec voi may tinh"

    # TC03: behavioral Q2 (1 asked) → soft[1], different from Q1
    def test_tc03_behavioral_second_rotates_to_next_soft(self):
        result = select_skills(WITH_JD, "behavioral", 5, behavioral_count_in_db=1)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Xu ly thong tin"
        assert result[0]["skill_name"] != "Lam viec voi may tinh"

    # TC04: situational Q1 (0 asked) → soft[1] (offset +1 vs behavioral)
    def test_tc04_situational_first_offset_from_behavioral(self):
        result = select_skills(WITH_JD, "situational", 3, situational_count_in_db=0)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Xu ly thong tin"  # index 1

    # TC05: situational Q2 (1 asked) → soft[2]
    def test_tc05_situational_second_rotates(self):
        result = select_skills(WITH_JD, "situational", 6, situational_count_in_db=1)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Ra quyet dinh va giai quyet van de"  # index 2

    # TC06: technical with JD → uses career hard skills ONLY (not JD)
    def test_tc06_technical_with_jd_uses_career_hard_only(self):
        result = select_skills(MIXED, "technical", 2, technical_count_in_db=0)
        assert len(result) == 1
        assert result[0]["source"] == "career"
        assert result[0]["skill_name"] == "Lap trinh Python"

    # TC07: technical Q1 (0 asked) → career hard[0]
    def test_tc07_technical_first_question_index_0(self):
        result = select_skills(NO_JD, "technical", 2, technical_count_in_db=0)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Lap trinh Python"

    # TC08: technical Q2 (1 asked) → career hard[1]
    def test_tc08_technical_second_question_index_1(self):
        result = select_skills(NO_JD, "technical", 3, technical_count_in_db=1)
        assert len(result) == 1
        assert result[0]["skill_name"] == "Thiet ke co so du lieu"

    # TC09: jd_specific Q1 (0 asked) → JD[0]
    def test_tc09_jd_specific_first_question_index_0(self):
        result = select_skills(WITH_JD, "jd_specific", 2, jd_count_in_db=0)
        assert len(result) == 1
        assert result[0]["source"] == "jd"
        assert result[0]["skill_name"] == "Java SE 8"

    # TC10: jd_specific Q2 (1 asked) → JD[1]
    def test_tc10_jd_specific_second_question_index_1(self):
        result = select_skills(WITH_JD, "jd_specific", 3, jd_count_in_db=1)
        assert len(result) == 1
        assert result[0]["skill_name"] == "JDBC"

    # TC11: jd_specific Q3 (2 asked) → JD[2]
    def test_tc11_jd_specific_third_question_index_2(self):
        result = select_skills(WITH_JD, "jd_specific", 4, jd_count_in_db=2)
        assert len(result) == 1
        assert result[0]["skill_name"] == "HTML5"

    # TC12: closing → empty
    def test_tc12_closing_returns_empty(self):
        assert select_skills(WITH_JD, "closing", 10) == []

    # TC13: empty skills_context → empty for all types
    def test_tc13_empty_skills_context_all_empty(self):
        for qtype in ["warm_up", "behavioral", "situational", "technical", "jd_specific", "closing"]:
            assert select_skills([], qtype, 1) == [], f"Expected [] for {qtype}"

    # TC14: no JD skills → jd_specific returns empty
    def test_tc14_no_jd_skills_jd_specific_empty(self):
        assert select_skills(NO_JD, "jd_specific", 2) == []

    # TC15: no career hard skills (only JD) → technical returns empty
    def test_tc15_no_career_hard_skills_technical_empty(self):
        assert select_skills(WITH_JD, "technical", 2) == []

    # TC16: each non-closing type returns exactly 1 skill
    def test_tc16_each_type_returns_exactly_one_skill(self):
        for qtype in ["warm_up", "behavioral", "situational", "jd_specific"]:
            result = select_skills(WITH_JD, qtype, 2)
            assert len(result) == 1, f"Expected 1 for {qtype}, got {len(result)}"
        for qtype in ["technical"]:
            result = select_skills(NO_JD, qtype, 2)
            assert len(result) == 1, f"Expected 1 for {qtype}, got {len(result)}"

    # TC17: jd_specific wraps around (10 % 10 = 0)
    def test_tc17_jd_specific_index_wraps_around(self):
        result = select_skills(WITH_JD, "jd_specific", 12, jd_count_in_db=10)
        assert result[0]["skill_name"] == "Java SE 8"

    # TC18: technical wraps around (3 % 3 = 0)
    def test_tc18_technical_index_wraps_around(self):
        result = select_skills(NO_JD, "technical", 5, technical_count_in_db=3)
        assert result[0]["skill_name"] == "Lap trinh Python"

    # TC19: is_hard_skill edge cases (string/int) handled correctly
    def test_tc19_is_hard_skill_edge_cases(self):
        skills = [
            {"skill_name": "Soft A", "importance": 4.0, "is_hard_skill": 0},
            {"skill_name": "Hard B", "importance": 4.5, "is_hard_skill": "true", "source": "career"},
            {"skill_name": "Hard C", "importance": 4.3, "is_hard_skill": 1, "source": "career"},
        ]
        # behavioral → soft only
        r = select_skills(skills, "behavioral", 1)
        assert r[0]["skill_name"] == "Soft A"
        # technical → career hard only, highest importance
        r = select_skills(skills, "technical", 2, technical_count_in_db=0)
        assert r[0]["skill_name"] == "Hard B"

    # TC20: 12-question JD session — 3 jd_specific + 2 behavioral + 2 situational all unique
    def test_tc20_full_session_all_skills_unique_per_type(self):
        # jd_specific: 3 different JD skills
        jd_seen = set()
        for i in range(3):
            r = select_skills(WITH_JD, "jd_specific", i + 2, jd_count_in_db=i)
            assert len(r) == 1
            assert r[0]["skill_name"] not in jd_seen, f"Duplicate jd skill at i={i}"
            jd_seen.add(r[0]["skill_name"])

        # behavioral: 2 different soft skills
        b_seen = set()
        for i in range(2):
            r = select_skills(WITH_JD, "behavioral", i + 5, behavioral_count_in_db=i)
            assert len(r) == 1
            assert r[0]["skill_name"] not in b_seen, f"Duplicate behavioral skill at i={i}"
            b_seen.add(r[0]["skill_name"])

        # situational: 2 different soft skills, offset from behavioral
        s_seen = set()
        for i in range(2):
            r = select_skills(WITH_JD, "situational", i + 7, situational_count_in_db=i)
            assert len(r) == 1
            assert r[0]["skill_name"] not in s_seen, f"Duplicate situational skill at i={i}"
            s_seen.add(r[0]["skill_name"])

        # behavioral Q1 and situational Q1 should be different
        b0 = select_skills(WITH_JD, "behavioral", 5, behavioral_count_in_db=0)[0]["skill_name"]
        s0 = select_skills(WITH_JD, "situational", 7, situational_count_in_db=0)[0]["skill_name"]
        assert b0 != s0, f"behavioral Q1 and situational Q1 should differ: both={b0}"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
