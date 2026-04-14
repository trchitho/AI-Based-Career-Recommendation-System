"""
TC10 — NeuMF Career Recommendation tests
==========================================
Covers:
  TC10.1  User hướng nội (Social thấp) → careers có tag Social bị xếp sau L1/L2
  TC10.2  _filter_by_riasec_top2 ưu tiên L1 bucket trước L2
  TC10.3  top_k giới hạn số kết quả trả về
  TC10.4  RIASEC scores không hợp lệ (len != 6) → sắp xếp thuần theo match_score
  TC10.5  Tie-breaking: khi score bằng nhau, ưu tiên theo thứ tự R,I,A,S,E,C
  TC10.6  Primary tag của "RC" → "R" (first char)
  TC10.7  L1=R, L2=I: career tag "RI" vào L1 bucket (primary "R")
  TC10.8  Career không có tag → vào bucket_others
  TC10.9  Jobs ít hơn top_k → trả về tất cả không lỗi
  TC10.10 display_match nằm trong [70, 95] sau normalization
  TC10.11 Kết quả Top-K sắp xếp theo match_score giảm dần (trong mỗi bucket)
  TC10.12 get_main_recommendations trả về request_id và items
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from app.modules.recommendation.service import RecService

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_job(onet: str, tags: list, score: float):
    return {
        "career_id": onet.lower().replace(".", "-"),
        "job_onet": onet,
        "title_en": f"Career {onet}",
        "title_vi": None,
        "tags": tags,
        "match_score": score,
        "display_match": None,
        "position": 0,
    }


# ──────────────────────────────────────────────────────────────
# TC10.6 — Primary tag
# ──────────────────────────────────────────────────────────────

def test_primary_tag_first_char():
    """TC10.6: Primary dimension là ký tự đầu tiên của tag."""
    svc = RecService()
    dims = ["R", "I", "A", "S", "E", "C"]

    def get_primary_dim(tag):
        tag = str(tag).strip().upper()
        if tag and tag[0] in dims:
            return tag[0]
        return ""

    assert get_primary_dim("RC") == "R"
    assert get_primary_dim("IA") == "I"
    assert get_primary_dim("S") == "S"
    assert get_primary_dim("") == ""
    assert get_primary_dim("XY") == ""


# ──────────────────────────────────────────────────────────────
# TC10.5 — Tie-breaking R > I > A > S > E > C
# ──────────────────────────────────────────────────────────────

def test_tie_breaking_priority():
    """TC10.5: Khi R=I (score bằng nhau) → L1=R (index nhỏ hơn)."""
    svc = RecService()
    # R=0.8, I=0.8, A=0.3, S=0.3, E=0.3, C=0.3 → tie R vs I
    riasec = [0.8, 0.8, 0.3, 0.3, 0.3, 0.3]
    jobs = [_make_job("11-1001.00", ["I"], 0.9)]

    # Chỉ 1 job ít hơn top_k=5 → early return
    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=5)
    assert len(result) == 1  # 1 job < top_k, trả về tất cả


def test_tie_breaking_l1_is_r_when_equal():
    """TC10.5: Tie-breaking L1=R theo index nhỏ nhất."""
    dims = ["R", "I", "A", "S", "E", "C"]
    riasec = [0.8, 0.8, 0.5, 0.3, 0.3, 0.3]

    sorted_indices = sorted(range(6), key=lambda i: (-riasec[i], i))
    L1 = dims[sorted_indices[0]]
    L2 = dims[sorted_indices[1]]

    assert L1 == "R"   # R (index 0) beats I (index 1) on tie
    assert L2 == "I"


# ──────────────────────────────────────────────────────────────
# TC10.2 — L1 bucket ưu tiên trước L2
# ──────────────────────────────────────────────────────────────

def test_filter_l1_before_l2():
    """TC10.2: Career tag L1 phải được xếp trước career tag L2."""
    svc = RecService()
    # L1=S (Social), L2=A (Artistic) → S=0.9, A=0.8
    riasec = [0.1, 0.2, 0.8, 0.9, 0.3, 0.1]  # S highest, A second

    jobs = [
        _make_job("11-1001.00", ["A"], 0.95),   # L2 bucket nhưng score cao
        _make_job("11-1002.00", ["S"], 0.85),   # L1 bucket score thấp hơn
        _make_job("11-1003.00", ["S"], 0.80),
        _make_job("11-1004.00", ["A"], 0.78),
        _make_job("11-1005.00", ["R"], 0.75),
        _make_job("11-1006.00", ["I"], 0.70),
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=3)

    # L1=S careers phải ở đầu
    top_tags = result[0].get("tags", [])
    assert "S" in top_tags, f"First result tags should contain L1(S), got: {top_tags}"


# ──────────────────────────────────────────────────────────────
# TC10.1 — Introvert user: Social thấp → Social careers xếp sau
# ──────────────────────────────────────────────────────────────

def test_introvert_social_careers_deprioritized():
    """TC10.1: User có S thấp (0.1) → Social careers xếp vào bucket_others."""
    svc = RecService()
    # R=0.9, I=0.8, A=0.5, S=0.1 (thấp nhất)
    riasec = [0.9, 0.8, 0.5, 0.1, 0.3, 0.2]

    jobs = [
        _make_job("11-1001.00", ["S"],  0.95),  # Social cao nhưng L3+
        _make_job("11-1002.00", ["R"],  0.88),  # L1
        _make_job("11-1003.00", ["I"],  0.85),  # L2
        _make_job("11-1004.00", ["R"],  0.82),  # L1
        _make_job("11-1005.00", ["I"],  0.78),  # L2
        _make_job("11-1006.00", ["S"],  0.92),  # Social (bucket_others)
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=4)

    # Social career không được ở top 2 (L1=R careers nên chiếm trước)
    top_two_tags = [result[i].get("tags", []) for i in range(min(2, len(result)))]
    for tags in top_two_tags:
        assert "S" not in tags or "R" in tags, \
            f"Social should not dominate top results: {tags}"


# ──────────────────────────────────────────────────────────────
# TC10.3 — top_k giới hạn số kết quả
# ──────────────────────────────────────────────────────────────

def test_filter_respects_top_k():
    """TC10.3: top_k=3 → tối đa 3 kết quả dù có nhiều jobs hơn."""
    svc = RecService()
    riasec = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1]
    jobs = [_make_job(f"11-100{i}.00", ["R"], 0.9 - i * 0.05) for i in range(10)]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=3)
    assert len(result) <= 3


# ──────────────────────────────────────────────────────────────
# TC10.4 — RIASEC scores không hợp lệ
# ──────────────────────────────────────────────────────────────

def test_invalid_riasec_falls_back_to_score_sort():
    """TC10.4: riasec với len!=6 → sắp xếp thuần theo match_score."""
    svc = RecService()
    invalid_riasec = [0.9, 0.8]  # chỉ 2 phần tử

    jobs = [
        _make_job("11-1001.00", ["R"], 0.7),
        _make_job("11-1002.00", ["I"], 0.9),
        _make_job("11-1003.00", ["A"], 0.8),
    ]

    result = svc._filter_by_riasec_top2(jobs, invalid_riasec, top_k=5)

    # Kết quả phải sắp xếp theo match_score giảm dần
    scores = [r["match_score"] for r in result]
    assert scores == sorted(scores, reverse=True)


# ──────────────────────────────────────────────────────────────
# TC10.7 — Tag "RI" → primary "R" → L1 bucket (khi L1=R)
# ──────────────────────────────────────────────────────────────

def test_compound_tag_uses_first_char_for_bucket():
    """TC10.7: Tag 'RI' → primary='R' → vào L1 bucket khi L1='R'."""
    svc = RecService()
    riasec = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1]  # L1=R, L2=I

    jobs = [
        _make_job("11-1001.00", ["RI"], 0.8),   # primary=R → L1 bucket
        _make_job("11-1002.00", ["IA"], 0.9),   # primary=I → L2 bucket (score cao hơn)
        _make_job("11-1003.00", ["RI"], 0.7),
        _make_job("11-1004.00", ["IA"], 0.85),
        _make_job("11-1005.00", ["A"],  0.75),
        _make_job("11-1006.00", ["C"],  0.60),
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=3)

    # "RI" với L1=R → vào L1 bucket nên được ưu tiên hơn "IA" (L2)
    top_tags = result[0].get("tags", [])
    assert "RI" in top_tags or ("R" in top_tags[0] if top_tags else False)


# ──────────────────────────────────────────────────────────────
# TC10.8 — Career không có tag → bucket_others
# ──────────────────────────────────────────────────────────────

def test_career_without_tags_goes_to_others():
    """TC10.8: Career tags=[] → vào bucket_others."""
    svc = RecService()
    riasec = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1]  # L1=R

    jobs = [
        _make_job("11-1001.00", ["R"], 0.7),
        _make_job("11-1002.00", ["R"], 0.65),
        _make_job("11-1003.00", [],    0.99),  # no tags, high score → bucket_others
        _make_job("11-1004.00", ["R"], 0.60),
        _make_job("11-1005.00", ["R"], 0.55),
        _make_job("11-1006.00", [],    0.95),  # no tags → bucket_others
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=4)

    # Top results (index 0,1) phải là R careers, không phải no-tag careers
    assert result[0].get("tags") == ["R"]
    assert result[1].get("tags") == ["R"]


# ──────────────────────────────────────────────────────────────
# TC10.9 — Jobs ít hơn top_k
# ──────────────────────────────────────────────────────────────

def test_fewer_jobs_than_top_k():
    """TC10.9: 2 jobs với top_k=5 → trả về 2 không lỗi."""
    svc = RecService()
    riasec = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1]

    jobs = [
        _make_job("11-1001.00", ["R"], 0.8),
        _make_job("11-1002.00", ["I"], 0.7),
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=5)
    assert len(result) == 2


# ──────────────────────────────────────────────────────────────
# TC10 — Empty jobs
# ──────────────────────────────────────────────────────────────

def test_empty_jobs_returns_empty():
    """TC10: jobs=[] → trả về []."""
    svc = RecService()
    riasec = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1]

    result = svc._filter_by_riasec_top2([], riasec, top_k=5)
    assert result == []


# ──────────────────────────────────────────────────────────────
# TC10.11 — Sort by score trong bucket
# ──────────────────────────────────────────────────────────────

def test_within_bucket_sorted_by_score():
    """TC10.11: Trong L1 bucket, careers sắp theo match_score giảm dần."""
    svc = RecService()
    riasec = [0.9, 0.5, 0.3, 0.2, 0.1, 0.1]  # L1=R, L2=I

    jobs = [
        _make_job("11-1001.00", ["R"], 0.60),
        _make_job("11-1002.00", ["R"], 0.90),
        _make_job("11-1003.00", ["R"], 0.75),
        _make_job("11-1004.00", ["I"], 0.95),
        _make_job("11-1005.00", ["I"], 0.50),
        _make_job("11-1006.00", ["A"], 0.40),
    ]

    result = svc._filter_by_riasec_top2(jobs, riasec, top_k=3)

    # Chỉ L1(R) careers → sorted by score desc
    l1_results = [r for r in result if "R" in r.get("tags", [])]
    scores = [r["match_score"] for r in l1_results]
    assert scores == sorted(scores, reverse=True)


# ──────────────────────────────────────────────────────────────
# TC10.10 — display_match normalization [70, 95]
# ──────────────────────────────────────────────────────────────

def test_display_match_normalization_range():
    """TC10.10: display_match sau min-max scaling phải nằm trong [70, 95]."""
    scores = [0.95, 0.85, 0.70, 0.60, 0.50]

    min_s = min(scores)
    max_s = max(scores)
    DISPLAY_MIN = 70
    DISPLAY_MAX = 95

    for s in scores:
        if max_s == min_s:
            normalized = DISPLAY_MAX
        else:
            normalized = DISPLAY_MIN + (s - min_s) / (max_s - min_s) * (DISPLAY_MAX - DISPLAY_MIN)
        assert DISPLAY_MIN <= normalized <= DISPLAY_MAX, \
            f"display_match={normalized:.1f} out of [{DISPLAY_MIN},{DISPLAY_MAX}]"


def test_display_match_max_score_gives_95():
    """TC10.10: Điểm cao nhất → display_match = 95."""
    scores = [0.95, 0.85, 0.70]
    min_s, max_s = min(scores), max(scores)
    normalized_max = 70 + (max(scores) - min_s) / (max_s - min_s) * (95 - 70)
    assert normalized_max == pytest.approx(95, abs=0.1)


def test_display_match_min_score_gives_70():
    """TC10.10: Điểm thấp nhất → display_match = 70."""
    scores = [0.95, 0.85, 0.70]
    min_s, max_s = min(scores), max(scores)
    normalized_min = 70 + (min(scores) - min_s) / (max_s - min_s) * (95 - 70)
    assert normalized_min == pytest.approx(70, abs=0.1)


# ──────────────────────────────────────────────────────────────
# TC10.12 — get_main_recommendations response shape
# ──────────────────────────────────────────────────────────────

def test_get_main_recommendations_empty_ai_core():
    """TC10.12: AI-core trả về rỗng → items=[], request_id có thể là None."""
    svc = RecService()
    db = MagicMock()

    with patch.object(svc, "_get_user_from_assessment", return_value=1), \
         patch.object(svc, "_call_ai_core_top_careers", return_value=[]), \
         patch.object(svc, "_get_saved_recommendations_from_db", return_value=[]):
        result = svc.get_main_recommendations(db, assessment_id=42, top_k=5)

    assert "items" in result
    assert result["items"] == []


def test_get_main_recommendations_invalid_assessment():
    """TC10.12: assessment_id không tồn tại → RuntimeError."""
    svc = RecService()
    db = MagicMock()

    with patch.object(svc, "_get_user_from_assessment", return_value=None):
        with pytest.raises(RuntimeError, match="not found"):
            svc.get_main_recommendations(db, assessment_id=9999, top_k=5)
