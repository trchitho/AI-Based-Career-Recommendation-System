# src/api/routes_recs.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from ai_core.retrieval.service_pgvector import search_candidates_for_embedding
from ai_core.recsys.bandit import FinalItem, recommend_with_bandit
from ai_core.recsys.service import infer_scores
from ai_core.traits.loader import load_traits_and_embedding_for_assessment

router = APIRouter(prefix="/recs", tags=["recommendations"])


class TopCareersRequest(BaseModel):
    assessment_id: int
    top_k: int = 20


class CareerItem(BaseModel):
    career_id: str
    final_score: float


class TopCareersResponse(BaseModel):
    items: List[CareerItem]


@router.post("/top_careers", response_model=TopCareersResponse)
def top_careers(req: TopCareersRequest):
    """
    Recommend theo ASSESSMENT.
    B3: vector = embedding của bài essay thuộc assessment_id
    B4: ranker dùng đúng snapshot traits
    B5: bandit (stub)

    Nếu NeuMF không có user_id trong user_feats (cold-start)
    thì fallback: dùng luôn thứ tự retrieval làm recommendation.
    """

    # ---- 1) Lấy vector + traits theo assessment ----
    try:
        snapshot = load_traits_and_embedding_for_assessment(req.assessment_id)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error loading assessment snapshot: {e}",
        )

    user_vec = snapshot.embedding_vector  # np.ndarray
    user_id = snapshot.user_id            # dùng cho Ranker (train theo user_id)
    # traits = snapshot.traits            # để dành sau này nếu mix traits

    # ---- 2) Retrieval B3 ----
    candidates = search_candidates_for_embedding(user_vec, top_n=200)
    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates from retrieval")

    candidate_ids = [c.job_id for c in candidates]

    # ---- 3) Rank B4 + Bandit B5, có fallback cold-start ----
    final_items: list[FinalItem]

    try:
        scored = infer_scores(user_id, candidate_ids)
        if not scored:
            raise ValueError("Ranker returned empty list")

        # NeuMF OK -> dùng bandit như bình thường
        final_items = recommend_with_bandit(
            ranked_items=scored,
            user_id=user_id,
            top_k=req.top_k,
        )

    except ValueError as e:
        print(f"[WARN] NeuMF cold-start for user_id={user_id}: {e}")
        print(f"[INFO] Using retrieval scores for cold-start (deterministic)")

        # Cold-start: dùng retrieval scores (đã deterministic từ pgvector)
        # CRITICAL: Sort với tie-breaker rõ ràng để đảm bảo 100% deterministic
        sorted_candidates = sorted(
            candidates,  # Lấy tất cả candidates để có đủ room cho filtering
            key=lambda c: (
                -getattr(c, "score_sim", getattr(c, "score", getattr(c, "sim", 0.0))),
                c.job_id  # Tie-breaker: alphabetical order by job_id
            )
        )

        # Trả về TẤT CẢ sorted candidates (không cắt ở đây)
        # Backend sẽ filter theo RIASEC L1/L2 và cắt top_k sau
        final_items = []
        for c in sorted_candidates:
            base = getattr(c, "score_sim", None)
            if base is None:
                base = getattr(c, "score", None)
            if base is None:
                base = getattr(c, "sim", 0.0)

            final_items.append(
                FinalItem(
                    career_id=c.job_id,
                    final_score=float(base),
                )
            )
    # ---- 4) Trả kết quả ----
    return TopCareersResponse(
        items=[
            CareerItem(career_id=i.career_id, final_score=i.final_score)
            for i in final_items
        ]
    )
