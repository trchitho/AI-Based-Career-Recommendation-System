# src/api/routes_rank.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from src.ai_core.retrieval.service_pgvector import search_candidates_for_user
from src.ai_core.recsys.neumf.infer import infer_scores   # dùng B4
from src.ai_core.recsys.neumf.mappings import load_mappings  # để map user_feat & item_feat

router = APIRouter(prefix="/rank", tags=["ranking"])


class RankRequest(BaseModel):
    user_id: int
    top_k: int = 20


class RankedItem(BaseModel):
    job_id: str
    score: float


class RankResponse(BaseModel):
    user_id: int
    items: List[RankedItem]


@router.post("", response_model=RankResponse)
def rank_careers(payload: RankRequest):
    try:
        # B3 – lấy candidates bằng pgvector
        cands = search_candidates_for_user(payload.user_id, top_n=max(200, payload.top_k))

        # B4 – NeuMF re-rank
        user_feats, item_feats = load_mappings()
        ranked = infer_scores(
            user_id=str(payload.user_id),
            candidates=[c.job_id for c in cands],
            user_feats=user_feats,
            item_feats=item_feats,
        )

        # chọn top_k sau khi rank
        ranked = ranked[: payload.top_k]
        items = [RankedItem(job_id=j, score=float(s)) for j, s in ranked]

        return RankResponse(
            user_id=payload.user_id,
            items=items,
        )

    except Exception as e:
        print("ERROR in /rank:", e)
        raise HTTPException(status_code=500, detail=str(e))
