# src/ai_core/recsys/bandit.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, List, Mapping


@dataclass
class FinalItem:
    career_id: str
    final_score: float

    # Giữ thêm các trường phụ (optional) để sau này dễ debug / mở rộng
    rank_score: float | None = None
    sim_score: float | None = None
    cf_score: float | None = None
    trait_score: float | None = None


def _get_career_id(item: Any) -> str:
    """
    B4 hiện đang dùng job_id (O*NET code). Spec B5 dùng career_id.
    B4 hiện tại trả về dạng dict: {"job_id": ..., "rank_score": ...}.
    Để tương thích 100%, chấp nhận:
      - object: item.career_id / item.job_id
      - dict:   item["career_id"] / item["job_id"]
    """
    # dict-like
    if isinstance(item, Mapping):
        if "career_id" in item and item["career_id"] is not None:
            return str(item["career_id"])
        if "job_id" in item and item["job_id"] is not None:
            return str(item["job_id"])

    # object-like
    if hasattr(item, "career_id"):
        val = getattr(item, "career_id")
        if val is not None:
            return str(val)
    if hasattr(item, "job_id"):
        val = getattr(item, "job_id")
        if val is not None:
            return str(val)

    raise ValueError("ScoredItem must have either 'career_id' or 'job_id'")


def _get_field_float(item: Any, name: str) -> float | None:
    """
    Lấy field float (rank_score, sim_score, ...) từ cả dict lẫn object.
    Nếu không có → None.
    """
    if isinstance(item, Mapping):
        if name in item and item[name] is not None:
            try:
                return float(item[name])
            except (TypeError, ValueError):
                return None
        return None

    if hasattr(item, name):
        val = getattr(item, name)
        if val is None:
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    return None


def recommend_with_bandit(
    ranked_items: Iterable[Any],
    user_id: int,  # hiện tại chưa dùng, để dành cho bandit thật sau này
    top_k: int,
) -> List[FinalItem]:
    """
    Bản stub: chưa dùng bandit, chỉ:
    - sort theo rank_score giảm dần
    - cắt top_k
    - final_score = rank_score

    ranked_items có thể là:
    - list[dict]: {"job_id": ..., "rank_score": ...}
    - list[object]: item.job_id / item.career_id / item.rank_score ...
    """
    # Ép về list
    items = list(ranked_items)

    # Sort giảm dần theo rank_score (B4 đã tính) – fallback rank_score=0 nếu thiếu
    items_sorted = sorted(
        items,
        key=lambda x: (_get_field_float(x, "rank_score") or 0.0),
        reverse=True,
    )

    final_items: List[FinalItem] = []

    for it in items_sorted[:top_k]:
        cid = _get_career_id(it)
        rs = _get_field_float(it, "rank_score") or 0.0

        final_items.append(
            FinalItem(
                career_id=cid,
                final_score=rs,          # bandit stub = rank_score
                rank_score=rs,
                sim_score=_get_field_float(it, "sim_score"),
                cf_score=_get_field_float(it, "cf_score"),
                trait_score=_get_field_float(it, "trait_score"),
            )
        )

    return final_items
