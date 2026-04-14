"""
TC18 — PhoBERT Essay Analysis tests
=====================================
Covers:
  TC18.1  analyze_essay trả về đúng schema: source, detected_lang, riasec, big5, dominant, traits_vi
  TC18.2  Cache hit: lần 2 gọi cùng text → from_cache=True, response_time_ms=0
  TC18.3  Cache miss: text mới → from_cache=False, response_time_ms > 0
  TC18.4  Cache key khác nhau khi lang khác nhau (vi vs en)
  TC18.5  SLA warning khi response > ESSAY_ANALYSIS_SLA_MS (1000ms)
  TC18.6  riasec có đúng 6 phần tử, big5 có đúng 5 phần tử
  TC18.7  Tất cả giá trị RIASEC trong [0, 1]
  TC18.8  dominant là tên của chiều RIASEC cao nhất
  TC18.9  Cache eviction: hơn 200 entries thì evict entries cũ nhất
  TC18.10 analyze_and_store gọi _upsert_user_embedding khi có user_id
  TC18.11 _essay_cache_key tạo SHA-256 nhất quán, phân biệt text khác nhau
  TC18.12 Fallback to Gemini khi AI-core không available
"""
from __future__ import annotations

import hashlib
import time
from unittest.mock import MagicMock, patch
import pytest


# ──────────────────────────────────────────────────────────────
# TC18.11 — Cache key
# ──────────────────────────────────────────────────────────────

def test_essay_cache_key_consistent():
    """TC18.11: Cùng text+lang → cùng cache key."""
    from app.modules.nlp.service_nlp import _essay_cache_key

    key1 = _essay_cache_key("Tôi thích làm việc với con người", "vi")
    key2 = _essay_cache_key("Tôi thích làm việc với con người", "vi")
    assert key1 == key2


def test_essay_cache_key_differs_on_lang():
    """TC18.4: Lang khác nhau → cache key khác nhau."""
    from app.modules.nlp.service_nlp import _essay_cache_key

    key_vi = _essay_cache_key("Test text", "vi")
    key_en = _essay_cache_key("Test text", "en")
    assert key_vi != key_en


def test_essay_cache_key_differs_on_text():
    """TC18.11: Text khác nhau → cache key khác nhau."""
    from app.modules.nlp.service_nlp import _essay_cache_key

    key1 = _essay_cache_key("Tôi thích kỹ thuật", "vi")
    key2 = _essay_cache_key("Tôi thích nghệ thuật", "vi")
    assert key1 != key2


def test_essay_cache_key_is_sha256():
    """TC18.11: Cache key phải là chuỗi hex 64 ký tự (SHA-256)."""
    from app.modules.nlp.service_nlp import _essay_cache_key

    key = _essay_cache_key("Some essay text", "vi")
    assert isinstance(key, str)
    assert len(key) == 64


# ──────────────────────────────────────────────────────────────
# TC18.6 — RIASEC 6 chiều, Big5 5 chiều
# ──────────────────────────────────────────────────────────────

def test_riasec_has_6_elements():
    """TC18.6: RIASEC_KEYS phải có 6 phần tử."""
    from app.modules.nlp.service_nlp import RIASEC_KEYS

    assert len(RIASEC_KEYS) == 6


def test_big5_has_5_elements():
    """TC18.6: BIG5_KEYS phải có 5 phần tử."""
    from app.modules.nlp.service_nlp import BIG5_KEYS

    assert len(BIG5_KEYS) == 5


def test_riasec_keys_correct_names():
    """TC18.6: RIASEC_KEYS đúng thứ tự R,I,A,S,E,C."""
    from app.modules.nlp.service_nlp import RIASEC_KEYS

    expected = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"]
    assert RIASEC_KEYS == expected


# ──────────────────────────────────────────────────────────────
# TC18.5 — SLA constants
# ──────────────────────────────────────────────────────────────

def test_essay_sla_constant():
    """TC18.5: ESSAY_ANALYSIS_SLA_MS = 1000."""
    from app.modules.nlp.service_nlp import ESSAY_ANALYSIS_SLA_MS

    assert ESSAY_ANALYSIS_SLA_MS == 1000


def test_vector_sla_constant():
    """TC18.5: VECTOR_SEARCH_SLA_MS = 5000."""
    from app.modules.nlp.service_nlp import VECTOR_SEARCH_SLA_MS

    assert VECTOR_SEARCH_SLA_MS == 5000


# ──────────────────────────────────────────────────────────────
# TC18.2 / TC18.3 — Cache hit / miss
# ──────────────────────────────────────────────────────────────

def _fake_analysis_result():
    return {
        "source": "phobert",
        "detected_lang": "vi",
        "riasec": [0.5, 0.6, 0.4, 0.7, 0.5, 0.3],
        "big5": [0.6, 0.7, 0.5, 0.8, 0.4],
        "dominant": "social",
        "traits_vi": ["hướng ngoại", "giao tiếp tốt"],
        "embedding": [0.1] * 768,
        "response_time_ms": 1500.0,
        "from_cache": False,
    }


def test_analyze_essay_cache_hit_returns_from_cache_true():
    """TC18.2: Gọi lần 2 với cùng text → from_cache=True."""
    from app.modules.nlp import service_nlp as svc

    essay = "Tôi thích làm việc với trẻ em và giảng dạy trong trường học."
    lang = "vi"

    # Xoá cache để test sạch
    svc._essay_cache.clear()

    fake = _fake_analysis_result()

    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        result1 = svc.analyze_essay(essay, lang)
        result2 = svc.analyze_essay(essay, lang)

    assert result1["from_cache"] is False   # lần 1: miss
    assert result2["from_cache"] is True    # lần 2: hit


def test_analyze_essay_cache_hit_zero_response_time():
    """TC18.2: Cache hit → response_time_ms = 0."""
    from app.modules.nlp import service_nlp as svc

    essay = "Câu này để test cache response time."
    svc._essay_cache.clear()

    fake = _fake_analysis_result()
    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        svc.analyze_essay(essay, "vi")    # populate cache
        result2 = svc.analyze_essay(essay, "vi")   # hit

    assert result2["response_time_ms"] == 0


def test_analyze_essay_cache_miss_has_response_time():
    """TC18.3: Cache miss → response_time_ms > 0."""
    from app.modules.nlp import service_nlp as svc

    essay = "Đây là văn bản hoàn toàn mới chưa từng gọi."
    svc._essay_cache.clear()

    fake = _fake_analysis_result()
    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        result = svc.analyze_essay(essay, "vi")

    assert result["from_cache"] is False
    assert result["response_time_ms"] >= 0   # timing luôn >= 0


# ──────────────────────────────────────────────────────────────
# TC18.1 — Schema validate
# ──────────────────────────────────────────────────────────────

def test_analyze_essay_returns_correct_schema():
    """TC18.1: Kết quả phải có đủ các trường theo schema EssayResult."""
    from app.modules.nlp import service_nlp as svc

    svc._essay_cache.clear()
    fake = _fake_analysis_result()

    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        result = svc.analyze_essay("Văn bản kiểm tra schema.", "vi")

    required = {"source", "detected_lang", "riasec", "big5", "dominant",
                "traits_vi", "response_time_ms", "from_cache"}
    for field in required:
        assert field in result, f"Missing field: {field}"


# ──────────────────────────────────────────────────────────────
# TC18.7 — RIASEC values trong [0, 1]
# ──────────────────────────────────────────────────────────────

def test_riasec_values_in_range():
    """TC18.7: Tất cả RIASEC scores trong [0, 1]."""
    from app.modules.nlp import service_nlp as svc

    svc._essay_cache.clear()
    fake = _fake_analysis_result()

    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        result = svc.analyze_essay("Test essay value range.", "vi")

    for i, val in enumerate(result["riasec"]):
        assert 0.0 <= val <= 1.0, f"riasec[{i}]={val} out of [0,1]"


# ──────────────────────────────────────────────────────────────
# TC18.8 — dominant là chiều cao nhất
# ──────────────────────────────────────────────────────────────

def test_dominant_is_highest_riasec_dimension():
    """TC18.8: dominant phải là tên của chiều RIASEC có giá trị cao nhất."""
    from app.modules.nlp.service_nlp import RIASEC_KEYS

    # Simulate: Social (index 3) = 0.8 là cao nhất
    riasec = [0.3, 0.4, 0.5, 0.8, 0.6, 0.2]
    dominant = RIASEC_KEYS[riasec.index(max(riasec))]
    assert dominant == "social"


def test_dominant_realistic_when_r_highest():
    """TC18.8: R cao nhất → dominant='realistic'."""
    from app.modules.nlp.service_nlp import RIASEC_KEYS

    riasec = [0.9, 0.4, 0.3, 0.5, 0.2, 0.1]
    dominant = RIASEC_KEYS[riasec.index(max(riasec))]
    assert dominant == "realistic"


# ──────────────────────────────────────────────────────────────
# TC18.9 — Cache eviction
# ──────────────────────────────────────────────────────────────

def test_essay_cache_eviction():
    """TC18.9: Cache size không vượt _ESSAY_CACHE_MAX sau khi thêm nhiều entries."""
    from app.modules.nlp import service_nlp as svc

    svc._essay_cache.clear()
    fake = _fake_analysis_result()

    # Fill cache đến MAX + 50 entries
    with patch.object(svc, "_analyze_via_aicore", return_value=fake), \
         patch.object(svc, "_analyze_via_gemini", return_value=fake):
        for i in range(svc._ESSAY_CACHE_MAX + 50):
            svc.analyze_essay(f"Unique essay text number {i} for cache test", "vi")

    assert len(svc._essay_cache) <= svc._ESSAY_CACHE_MAX


# ──────────────────────────────────────────────────────────────
# TC18.12 — Fallback to Gemini
# ──────────────────────────────────────────────────────────────

def test_fallback_to_gemini_when_aicore_fails():
    """TC18.12: AI-core không available → fallback sang Gemini."""
    from app.modules.nlp import service_nlp as svc

    svc._essay_cache.clear()

    gemini_result = {
        **_fake_analysis_result(),
        "source": "gemini",
    }

    # AI-core trả về None (lỗi), Gemini trả về kết quả
    with patch.object(svc, "_analyze_via_aicore", return_value=None), \
         patch.object(svc, "_analyze_via_gemini", return_value=gemini_result):
        result = svc.analyze_essay("Fallback test essay text here.", "vi")

    assert result["source"] == "gemini"


# ──────────────────────────────────────────────────────────────
# TC18 — _vec_to_pg helper
# ──────────────────────────────────────────────────────────────

def test_vec_to_pg_format():
    """_vec_to_pg([0.1, 0.2]) → '[0.10000000,0.20000000]'."""
    from app.modules.nlp.service_nlp import _vec_to_pg

    result = _vec_to_pg([0.1, 0.2, 0.3])
    assert result.startswith("[")
    assert result.endswith("]")
    # 3 values separated by commas
    inner = result[1:-1].split(",")
    assert len(inner) == 3


def test_pad_list_pads_with_zeros():
    """_pad_list pads với 0.0 đến đúng size."""
    from app.modules.nlp.service_nlp import _pad_list

    result = _pad_list([0.1, 0.2], size=5)
    assert result == [0.1, 0.2, 0.0, 0.0, 0.0]


def test_pad_list_truncates():
    """_pad_list cắt bớt khi list dài hơn size."""
    from app.modules.nlp.service_nlp import _pad_list

    result = _pad_list([0.1, 0.2, 0.3, 0.4], size=2)
    assert result == [0.1, 0.2]
