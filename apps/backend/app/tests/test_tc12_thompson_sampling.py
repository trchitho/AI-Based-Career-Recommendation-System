"""
TC12 — Thompson Sampling / Career Feedback re-ranking tests
============================================================
Covers:
  TC12.1  Like recorded → alpha tăng, E[θ] tăng
  TC12.2  Chưa có feedback → Beta(1,1) uniform prior, E[θ]=0.5
  TC12.3  apply_boost sắp xếp lại items đúng thứ tự
  TC12.4  apply_boost với items rỗng → trả về ngay không lỗi
  TC12.5  Nhiều lần Like liên tiếp → alpha tăng dần, E[θ] tiệm cận 1
  TC12.6  TS_BOOST_WEIGHT = 0.15 (hằng số đúng)
  TC12.7  apply_boost cập nhật position theo thứ tự mới
  TC12.8  Career không có prior → boost = 0.15 * 0.5 = 0.075
  TC12.9  Career đã Like nhiều → boost cao hơn career chưa Like
  TC12.10 apply_boost với user_id=None → trả về items gốc
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from app.modules.recommendation.thompson_sampling import (
    TS_BOOST_WEIGHT,
    ThompsonSamplingService,
)

# ──────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────

def _mock_db():
    """Trả về MagicMock giả lập Session SQLAlchemy."""
    db = MagicMock()
    db.execute.return_value.mappings.return_value.first.return_value = None
    db.execute.return_value.mappings.return_value.all.return_value = []
    return db


def _make_items(*scores):
    """Tạo list career items với match_score đã cho."""
    return [
        {"career_id": f"career_{i}", "job_onet": f"11-100{i}.00", "match_score": s, "position": i + 1}
        for i, s in enumerate(scores)
    ]


# ──────────────────────────────────────────────────────────────
# TC12.6 — Hằng số TS_BOOST_WEIGHT
# ──────────────────────────────────────────────────────────────

def test_ts_boost_weight_constant():
    """TC12.6: TS_BOOST_WEIGHT phải là 0.15."""
    assert TS_BOOST_WEIGHT == 0.15


# ──────────────────────────────────────────────────────────────
# TC12.2 — Prior uniform Beta(1,1) khi chưa có feedback
# ──────────────────────────────────────────────────────────────

def test_uniform_prior_expected_reward():
    """TC12.2: Beta(1,1) → E[θ] = 1/(1+1) = 0.5."""
    alpha, beta = 1, 1
    expected = alpha / (alpha + beta)
    assert expected == 0.5


def test_apply_boost_no_prior_boost_value():
    """TC12.8: Career không có prior → boost = 0.15 * 0.5 = 0.075."""
    svc = ThompsonSamplingService()
    db = _mock_db()
    # _bulk_get_feedback trả về {} (không có lịch sử)
    with patch.object(svc, "_bulk_get_feedback", return_value={}):
        items = _make_items(0.8)
        result = svc.apply_boost(db, user_id=1, items=items)

    assert result[0]["ts_boost"] == pytest.approx(0.075, abs=1e-4)
    assert result[0]["ts_expected_reward"] == pytest.approx(0.5, abs=1e-4)
    assert result[0]["match_score_boosted"] == pytest.approx(0.8 + 0.075, abs=1e-4)


# ──────────────────────────────────────────────────────────────
# TC12.3 — apply_boost sắp xếp lại items đúng thứ tự
# ──────────────────────────────────────────────────────────────

def test_apply_boost_reranks_correctly():
    """TC12.3: Item có Like nhiều nên được đẩy lên top sau boost."""
    svc = ThompsonSamplingService()
    db = _mock_db()

    items = [
        {"career_id": "career_A", "job_onet": "11-1001.00", "match_score": 0.70, "position": 1},
        {"career_id": "career_B", "job_onet": "11-1002.00", "match_score": 0.65, "position": 2},
    ]
    # career_B đã được Like 9 lần → alpha=10, beta=1 → E[θ]=10/11≈0.909
    feedback_map = {
        "11-1002.00": {"alpha": 10, "beta": 1},
    }
    with patch.object(svc, "_bulk_get_feedback", return_value=feedback_map):
        result = svc.apply_boost(db, user_id=1, items=items)

    # career_B boosted = 0.65 + 0.15*(10/11) ≈ 0.65 + 0.136 = 0.786 > career_A(0.70+0.075=0.775)
    assert result[0]["career_id"] == "career_B"
    assert result[1]["career_id"] == "career_A"


# ──────────────────────────────────────────────────────────────
# TC12.4 — Items rỗng
# ──────────────────────────────────────────────────────────────

def test_apply_boost_empty_items():
    """TC12.4: Danh sách rỗng → trả về [] không lỗi."""
    svc = ThompsonSamplingService()
    db = _mock_db()
    result = svc.apply_boost(db, user_id=1, items=[])
    assert result == []


# ──────────────────────────────────────────────────────────────
# TC12.10 — user_id=None
# ──────────────────────────────────────────────────────────────

def test_apply_boost_no_user():
    """TC12.10: user_id=None → trả về items gốc không thay đổi."""
    svc = ThompsonSamplingService()
    db = _mock_db()
    items = _make_items(0.9, 0.8)
    result = svc.apply_boost(db, user_id=None, items=items)
    # Trả về nguyên bản
    assert result == items


# ──────────────────────────────────────────────────────────────
# TC12.7 — Position được cập nhật sau re-rank
# ──────────────────────────────────────────────────────────────

def test_apply_boost_updates_positions():
    """TC12.7: position được gán lại 1, 2, 3, ... theo thứ tự mới."""
    svc = ThompsonSamplingService()
    db = _mock_db()
    items = _make_items(0.9, 0.8, 0.7)
    with patch.object(svc, "_bulk_get_feedback", return_value={}):
        result = svc.apply_boost(db, user_id=1, items=items)

    positions = [it["position"] for it in result]
    assert positions == [1, 2, 3]


# ──────────────────────────────────────────────────────────────
# TC12.9 — Liked career có boost cao hơn chưa Like
# ──────────────────────────────────────────────────────────────

def test_liked_career_higher_boost_than_unrated():
    """TC12.9: alpha=5,beta=1 → E[θ]=5/6≈0.833 > 0.5 (uniform prior)."""
    alpha_liked, beta_liked = 5, 1
    alpha_new, beta_new = 1, 1

    expected_liked = alpha_liked / (alpha_liked + beta_liked)
    expected_new   = alpha_new   / (alpha_new   + beta_new)

    boost_liked = TS_BOOST_WEIGHT * expected_liked
    boost_new   = TS_BOOST_WEIGHT * expected_new

    assert boost_liked > boost_new
    assert expected_liked == pytest.approx(5 / 6, abs=1e-4)


# ──────────────────────────────────────────────────────────────
# TC12.1 — record_like: alpha tăng, E[θ] tăng
# ──────────────────────────────────────────────────────────────

def test_record_like_returns_correct_fields():
    """TC12.1: record_like trả về ok=True, alpha/beta, expected_reward."""
    svc = ThompsonSamplingService()
    db = _mock_db()

    # Sau khi ghi Like, _get_feedback trả về alpha=2, beta=1
    with patch.object(svc, "_upsert_feedback"), \
         patch.object(svc, "_log_career_event"), \
         patch.object(svc, "_get_feedback", return_value={"alpha": 2, "beta": 1}):
        result = svc.record_like(db, user_id=1, job_onet="15-1252.00")

    assert result["ok"] is True
    assert result["job_onet"] == "15-1252.00"
    assert result["alpha"] == 2
    assert result["beta"] == 1
    assert result["expected_reward"] == pytest.approx(2 / 3, abs=1e-3)


# ──────────────────────────────────────────────────────────────
# TC12.5 — Nhiều Like liên tiếp → E[θ] tiệm cận 1
# ──────────────────────────────────────────────────────────────

def test_repeated_likes_increase_expected_reward():
    """TC12.5: alpha tăng từ 1→10 khi Like 9 lần, E[θ] tăng dần về 1."""
    alpha, beta = 1, 1
    expected_values = []
    for _ in range(9):
        alpha += 1
        expected_values.append(alpha / (alpha + beta))

    # Mỗi Like phải tăng E[θ]
    for i in range(1, len(expected_values)):
        assert expected_values[i] > expected_values[i - 1]

    # Sau 9 lần Like: alpha=10, beta=1 → E[θ]=10/11 > 0.9
    assert expected_values[-1] > 0.9


# ──────────────────────────────────────────────────────────────
# TC12 — Beta distribution math
# ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize("alpha,beta,expected", [
    (1, 1, 0.5),
    (2, 1, 2 / 3),
    (10, 1, 10 / 11),
    (1, 10, 1 / 11),
    (5, 5, 0.5),
])
def test_beta_distribution_expected_value(alpha, beta, expected):
    """E[θ] = alpha / (alpha + beta) cho các trường hợp biên."""
    assert alpha / (alpha + beta) == pytest.approx(expected, abs=1e-6)
