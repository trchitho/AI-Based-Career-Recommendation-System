from __future__ import annotations

from typing import List, Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .service import RecService
from app.modules.auth.deps import get_current_user_optional
from app.modules.users.models import User


router = APIRouter(prefix="", tags=["recommendations"])  # giữ nguyên dòng này
svc = RecService()


def _db(req: Request) -> Session:
    # DB session đã được gắn vào request.state.db ở middleware
    return req.state.db


# ====== DTOs cho response ======

class CareerDTO(BaseModel):
    career_id: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    description: Optional[str] = None
    match_score: float
    tags: List[str] = []
    job_zone: Optional[int] = None
    position: int


class RecommendationsRes(BaseModel):
    request_id: Optional[str]
    items: List[CareerDTO]


class ClickReq(BaseModel):
    career_id: str
    position: Annotated[int, Field(ge=1, le=100)]
    request_id: Optional[str] = None
    match_score: Optional[float] = None


class ClickRes(BaseModel):
    status: str = "ok"


# ====== Routes ======

@router.get("", response_model=RecommendationsRes)
def get_main_recommendations(
    request: Request,
    top_k: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    GET /api/recommendations?top_k=20

    - Lấy user_id từ JWT nếu có.
    - (Dev) Nếu chưa login → tạm dùng user_id=9 để test pipeline.
    - Gọi RecService.get_main_recommendations.
    """
    db = _db(request)

    # Tạm fallback user_id=9 nếu chưa login (cho dev/test).
    # Sau này muốn bắt buộc đăng nhập thì đổi thành raise HTTPException(401, ...)
    if current_user is None:
        user_id = 9
    else:
        user_id = current_user.id

    try:
        result = svc.get_main_recommendations(
            db=db,
            user_id=user_id,
            top_k=top_k,
        )
    except RuntimeError as e:
        # AI-core lỗi, trả 502 để FE biết
        raise HTTPException(status_code=502, detail=str(e))

    items = [CareerDTO(**it) for it in result["items"]]
    return RecommendationsRes(request_id=result["request_id"], items=items)


@router.post("/click", response_model=ClickRes)
def log_click(
    request: Request,
    body: ClickReq,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    POST /api/recommendations/click

    Body: { career_id, position, request_id, match_score? }

    - Log event_type='click' vào analytics.career_events.
    """
    db = _db(request)

    if current_user is None:
        user_id = 9  # dev fallback
    else:
        user_id = current_user.id

    svc.log_click(
        db=db,
        user_id=user_id,
        career_id=body.career_id,
        position=body.position,
        request_id=body.request_id,
        match_score=body.match_score,
    )

    return ClickRes()
