# src/api/routes_recs.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_core.retrieval.service_pgvector import search_candidates_for_user
from ai_core.recsys.bandit import FinalItem, recommend_with_bandit
from ai_core.recsys.service import (
    infer_scores_from_candidates,
)  # dùng helper cho Candidate objects


router = APIRouter(prefix="/recs", tags=["recommendations"])


class TopCareersRequest(BaseModel):
    user_id: int
    top_k: int = 20


class CareerItem(BaseModel):
    career_id: str
    final_score: float


class TopCareersResponse(BaseModel):
    items: List[CareerItem]


@router.post("/top_careers", response_model=TopCareersResponse)
def top_careers(req: TopCareersRequest) -> TopCareersResponse:
    """
    Glue B3 + B4 + B5 thành 1 API duy nhất cho backend gọi.
    """

    # ---- B3: retrieval bằng pgvector ----
    candidates = search_candidates_for_user(user_id=req.user_id, top_n=200)
    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates for this user")

    # ---- B4: NeuMF ranker ----
    # B3 trả về list[Candidate] → dùng helper infer_scores_from_candidates
    scored = infer_scores_from_candidates(req.user_id, candidates)

    if not scored:
        raise HTTPException(status_code=500, detail="Ranking returned empty list")

    # ---- B5: bandit stub ----
    final_items: list[FinalItem] = recommend_with_bandit(
        ranked_items=scored,
        user_id=req.user_id,
        top_k=req.top_k,
    )

    # Chỉ expose career_id + final_score cho backend
    return TopCareersResponse(
        items=[
            CareerItem(career_id=item.career_id, final_score=item.final_score)
            for item in final_items
        ]
    )
