# app/modules/recommendation/routes_recommendations.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .service import RecService, CareerEventsService
from app.modules.auth.deps import get_current_user_optional
from app.modules.users.models import User

router = APIRouter(prefix="", tags=["recommendations"])
svc = RecService()


def _db(req: Request) -> Session:
    return req.state.db


# ===== DTO =====

class CareerDTO(BaseModel):
    career_id: str
    slug: Optional[str] = None
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    description: Optional[str] = None
    match_score: float
    display_match: Optional[float] = None
    tags: List[str] = []
    job_zone: Optional[int] = None
    position: int


class RecommendationsRes(BaseModel):
    request_id: Optional[str]
    items: List[CareerDTO]


# ===== ROUTES =====


@router.get("", response_model=RecommendationsRes)
def get_recommendations(
    request: Request,
    assessment_id: int = Query(..., ge=1),
    top_k: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    GET /api/recommendations?assessment_id=97&top_k=5
    """
    db = _db(request)

    try:
        result = svc.get_main_recommendations(
            db=db,
            assessment_id=assessment_id,
            top_k=top_k,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    items = [CareerDTO(**it) for it in result["items"]]
    return RecommendationsRes(request_id=result["request_id"], items=items)


class ClickPayload(BaseModel):
    career_id: str      # slug hoặc onet_code FE gửi lên
    position: int
    request_id: Optional[str] = None
    match_score: Optional[float] = None


@router.post("/click")
def log_click(
    request: Request,
    payload: ClickPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Khi user bấm "View Learning Roadmap" trên một nghề.

    Body:
    {
      "career_id": "signal-and-track-switch-repairers-49-9097-00",
      "position": 1,
      "match_score": 0.95,
      "request_id": "uuid từ /api/recommendations"
    }
    
    CRITICAL: user_id lấy từ JWT (current_user), không nhận từ client.
    Nếu không có user đăng nhập, vẫn log với user_id = None (guest click).
    """
    db = _db(request)

    # map slug -> onet_code (job_id dùng train B4)
    job_onet = svc.get_onet_code_by_slug(db, payload.career_id)
    if not job_onet:
        # Không tìm thấy nghề → không 500, chỉ bỏ qua
        return {"status": "ignored"}

    events = CareerEventsService(db)

    session_id = request.headers.get("X-Session-Id")
    # CRITICAL: user_id chỉ lấy từ JWT, không nhận từ header X-User-Id
    user_id = current_user.id if current_user else None

    events.log_click(
        user_id=user_id,
        session_id=session_id,
        job_onet=job_onet,
        rank_pos=payload.position,
        score_shown=payload.match_score,
        request_id=payload.request_id,  # để sau join lại request
    )

    return {"status": "ok"}
