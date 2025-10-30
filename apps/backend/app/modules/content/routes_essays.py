from fastapi import APIRouter, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from .models import Essay

router = APIRouter()


class EssayCreate(BaseModel):
    content: str = Field(min_length=1)
    lang: str | None = "vi"
    prompt_id: int | None = None


def _db(request: Request) -> Session:
    return request.state.db


@router.post("", status_code=status.HTTP_201_CREATED)
def create_essay(request: Request, payload: EssayCreate):
    session = _db(request)
    user_id = require_user(request)

    e = Essay(
        user_id=user_id,
        lang=payload.lang,
        content=payload.content,
        prompt_id=payload.prompt_id,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e.to_dict()


@router.get("/me")
def list_my_essays(
    request: Request, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)
):
    session = _db(request)
    user_id = require_user(request)
    stmt = (
        select(Essay)
        .where(Essay.user_id == user_id)
        .order_by(Essay.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = session.execute(stmt).scalars().all()
    return [e.to_dict() for e in rows]
