from __future__ import annotations

from typing import List, Optional, Annotated
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .service import RecService

# Theo convention chung: /api/recommendations/**
router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])
svc = RecService()


# ----- Request / Response models -----
class RankReq(BaseModel):
    user_id: str = Field(..., description="User ID (trùng user_feats.json)")

    # FE có thể gửi sẵn candidate_ids (Top-N nghề)
    candidate_ids: Optional[Annotated[list[str], Field(min_length=1)]] = None

    # Hoặc gửi query_emb (768-dim vector) để BE tự truy xuất Top-N
    query_emb: Optional[Annotated[list[float], Field(min_length=768, max_length=768)]] = None

    topn: Annotated[int, Field(ge=1, le=200)] = 50
    topk: Annotated[int, Field(ge=1, le=50)] = 10


class RankResItem(BaseModel):
    career_id: str
    score: float


class RankRes(BaseModel):
    user_id: str
    results: List[RankResItem]


# ----- API Endpoint -----
@router.post("/rank", response_model=RankRes)
def rank(req: RankReq):
    """
    1️⃣ Nếu có candidate_ids → rank trực tiếp bằng model MLP.
    2️⃣ Nếu không → dùng query_emb để truy xuất Top-N từ pgvector rồi rerank.
    """
    cand_ids: Optional[List[str]] = req.candidate_ids

    # Nếu không có candidate_ids → tự truy xuất từ pgvector
    if cand_ids is None:
        if not req.query_emb:
            raise HTTPException(status_code=422, detail="Need candidate_ids or query_emb (768-dim)")
        try:
            cands = svc.retrieve_candidates(req.query_emb, topn=req.topn)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        cand_ids = [c["career_id"] for c in cands]

    results = svc.rerank(user_id=req.user_id, cand_ids=cand_ids, topk=req.topk)
    return RankRes(user_id=req.user_id, results=[RankResItem(**x) for x in results])
