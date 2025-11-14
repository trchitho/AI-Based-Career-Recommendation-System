from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import BlogPost
from ...core.jwt import require_user
from datetime import datetime, timezone

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
    base = select(BlogPost).where(BlogPost.status == "Published")
    total = session.execute(select(func.count()).select_from(base.subquery())).scalar() or 0
    rows = (
        session.execute(
            base.order_by(BlogPost.published_at.desc().nullslast()).limit(limit).offset(offset)
        )
        .scalars()
        .all()
    )
    return {"items": [p.to_dict() for p in rows], "total": int(total), "limit": limit, "offset": offset}

@router.get("/{slug}")
def get_post_by_slug(request: Request, slug: str):
    session = _db(request)
    obj = session.execute(select(BlogPost).where(BlogPost.slug == slug)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Post not found")
    return obj.to_dict()


@router.post("")
def create_post(request: Request, payload: dict):
    """Create a published blog post by logged-in user."""
    user_id = require_user(request)
    session = _db(request)
    title = (payload.get("title") or "").strip()
    content_md = (payload.get("content_md") or payload.get("content") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not content_md:
        raise HTTPException(status_code=400, detail="content is required")
    slug = "-".join(title.lower().split())[:120]
    # Ensure unique slug (append timestamp suffix if needed)
    exists = session.execute(select(BlogPost).where(BlogPost.slug == slug)).scalar_one_or_none()
    if exists:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    p = BlogPost(
        author_id=user_id,
        title=title,
        slug=slug,
        content_md=content_md,
        status="Published",
        published_at=datetime.now(timezone.utc),
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return p.to_dict()
