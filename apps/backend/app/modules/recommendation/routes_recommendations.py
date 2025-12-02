from __future__ import annotations

from typing import List, Optional, Annotated

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .service import RecService

router = APIRouter()
svc = RecService()


def _db(req: Request) -> Session:
    return req.state.db


class GenerateReq(BaseModel):
    user_id: Optional[str] = Field(
        default=None, description="User ID (có thể null cho khách / demo)"
    )
    topk: Annotated[int, Field(ge=1, le=50)] = 10


class GenerateItem(BaseModel):
    career_id: str
    title_vi: Optional[str] = None
    short_desc_vi: Optional[str] = None
    score: float


class GenerateRes(BaseModel):
    user_id: Optional[str]
    items: List[GenerateItem]


class RankReq(BaseModel):
    user_id: str
    candidate_ids: Optional[Annotated[list[str], Field(min_length=1)]] = None
    query_emb: Optional[Annotated[list[float], Field(min_length=768, max_length=768)]] = None
    topn: Annotated[int, Field(ge=1, le=200)] = 50
    topk: Annotated[int, Field(ge=1, le=50)] = 10


class RankResItem(BaseModel):
    career_id: str
    score: float


class RankRes(BaseModel):
    user_id: str
    results: List[RankResItem]


@router.post("/generate", response_model=GenerateRes)
def generate(request: Request, req: GenerateReq):
    """
    MVP: gợi ý top-k nghề đơn giản từ core.careers (id tăng dần).
    Sau này sẽ thay bằng:
      - lấy user embedding + trait từ ai.user_embeddings / ai.user_trait_preds
      - chạy NeuMF ranker + bandit online.
    """
    session = _db(request)
    items = svc.generate_for_user(session, user_id=req.user_id, topk=req.topk)
    return GenerateRes(
        user_id=req.user_id,
        items=[GenerateItem(**it) for it in items],
    )


@router.post("/rank", response_model=RankRes)
def rank(request: Request, req: RankReq):
    """
    Placeholder: nếu có candidate_ids → trả về như cũ với score=1.0.
    Nếu không có candidate_ids nhưng có query_emb → dùng retrieval pgvector.
    """
    session = _db(request)

    cand_ids: Optional[List[str]] = req.candidate_ids

    if cand_ids is None:
        if not req.query_emb:
            raise HTTPException(
                status_code=422,
                detail="Need candidate_ids or query_emb (768-dim)",
            )
        try:
            cands = svc.retrieve_candidates(session, req.query_emb, topn=req.topn)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        cand_ids = [c["career_id"] for c in cands]

    results = [
        {"career_id": cid, "score": 1.0}
        for cid in cand_ids[: req.topk]
    ]
    return RankRes(
        user_id=req.user_id,
        results=[RankResItem(**x) for x in results],
    )
