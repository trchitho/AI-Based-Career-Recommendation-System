from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from .models import BlogPost, Comment

router = APIRouter()


class CommentCreate(BaseModel):
    post_id: int
    content: str
    parent_id: int | None = None


def _db(request: Request) -> Session:
    return request.state.db


@router.post("", status_code=status.HTTP_201_CREATED)
def create_comment(request: Request, payload: CommentCreate):
    session = _db(request)
    user_id = require_user(request)

    post = session.get(BlogPost, payload.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    c = Comment(
        post_id=payload.post_id,
        user_id=user_id,
        parent_id=payload.parent_id,
        content=payload.content,
        status="Visible",
    )
    session.add(c)
    session.commit()
    session.refresh(c)
    return c.to_dict()
