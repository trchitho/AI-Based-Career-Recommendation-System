from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import BlogPost

router = APIRouter()


def _db(request: Request) -> Session:
    return request.state.db


@router.get("")
def list_posts(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    session = _db(request)
    stmt = (
        select(BlogPost)
        .where(BlogPost.status == "Published")
        .order_by(BlogPost.published_at.desc().nullslast())
        .limit(limit)
        .offset(offset)
    )
    rows = session.execute(stmt).scalars().all()
    return [p.to_dict() for p in rows]


@router.get("/{slug}")
def get_post_by_slug(request: Request, slug: str):
    session = _db(request)
    obj = session.execute(
        select(BlogPost).where(BlogPost.slug == slug)
    ).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Post not found")
    return obj.to_dict()
