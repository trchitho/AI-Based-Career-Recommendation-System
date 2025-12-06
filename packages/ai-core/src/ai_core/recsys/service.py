# src/ai_core/recsys/service.py
"""
Service layer cho B4 – Ranker (NeuMF/MLP).

Mục tiêu:
- Cung cấp một API ổn định cho các chỗ khác gọi:
    infer_scores(user_id: int, candidate_ids: Iterable[str]) -> List[ScoreDict]
- Ẩn đi chi tiết triển khai Ranker (model, feature loader, v.v.).
"""

from __future__ import annotations

from typing import Iterable, List, TypedDict, Any

# CHÚ Ý:
# File này chỉ phụ thuộc vào Ranker, không import InferRuntime/ScoredItem
# để tránh lỗi ModuleNotFound trong repo hiện tại.
from .neumf.infer import Ranker


class ScoreDict(TypedDict):
    """
    Kiểu trả về chuẩn của B4 cho mỗi job.

    job_id:  O*NET code hoặc mã nghề trong catalog (ví dụ: "15-1244.00")
    rank_score: Điểm xếp hạng cuối cùng từ NeuMF/MLP (đã combine sim/cf/trait nếu có)
    """
    job_id: str
    rank_score: float


# Singleton Ranker (lazy init) – chỉ load model/feature 1 lần
_rk: Ranker | None = None


def get_ranker() -> Ranker:
    """
    Trả về instance Ranker dùng chung trong process.

    Ranker chịu trách nhiệm:
    - load feature (user_feats, item_feats)
    - load model best.pt
    - infer điểm cho (user_id, job_id)
    """
    global _rk
    if _rk is None:
        # Ranker() tự lo đường dẫn model/feats theo thiết kế trong .neumf.infer
        _rk = Ranker()
    return _rk


def infer_scores(user_id: int, candidate_ids: Iterable[str]) -> List[ScoreDict]:
    """
    API chính của B4 cho các layer khác (AI-core endpoint, backend BFF) gọi.

    Parameters
    ----------
    user_id : int
        ID người dùng cần recommend.
    candidate_ids : Iterable[str]
        Danh sách career_id/job_id (thường là O*NET code) từ B3 (retrieval).

    Returns
    -------
    List[ScoreDict]
        Mỗi phần tử có dạng:
        {
            "job_id": "15-1244.00",
            "rank_score": 0.4387
        }
    """
    rk = get_ranker()

    # Ranker.infer_scores dự kiến trả về List[Tuple[str, float]]
    # [(job_id, score), ...]
    scored = rk.infer_scores(user_id, list(candidate_ids))

    return [
        ScoreDict(job_id=jid, rank_score=float(score))
        for jid, score in scored
    ]


def infer_scores_from_candidates(user_id: int, candidates: Iterable[Any]) -> List[ScoreDict]:
    """
    Helper tiện dụng khi B3 trả về list object/dict thay vì list[str].

    Chấp nhận:
    - object có thuộc tính job_id hoặc career_id
    - dict có key 'job_id' hoặc 'career_id'

    Dùng được cho flow:
        candidates = search_candidates_for_user(user_id, top_n=200)
        scored = infer_scores_from_candidates(user_id, candidates)
    """
    candidate_ids: List[str] = []

    for c in candidates:
        jid: str | None = None

        # object-style: c.job_id / c.career_id
        if hasattr(c, "job_id"):
            jid = getattr(c, "job_id")
        elif hasattr(c, "career_id"):
            jid = getattr(c, "career_id")
        # dict-style: c["job_id"] / c["career_id"]
        elif isinstance(c, dict):
            if "job_id" in c:
                jid = str(c["job_id"])
            elif "career_id" in c:
                jid = str(c["career_id"])

        if jid is None:
            raise ValueError(
                "Candidate must have 'job_id' or 'career_id' "
                f"(got: {type(c)!r})"
            )

        candidate_ids.append(str(jid))

    return infer_scores(user_id=user_id, candidate_ids=candidate_ids)
