from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.jwt import require_user, require_admin
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
    base = select(BlogPost).where(BlogPost.status == "Published")
    total = session.execute(select(func.count()).select_from(base.subquery())).scalar() or 0
    rows = session.execute(base.order_by(BlogPost.published_at.desc().nullslast()).limit(limit).offset(offset)).scalars().all()
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
    """Create a blog post by any logged-in user."""
    from ...core.jwt import get_current_user
    current_user = get_current_user(request)
    user_id = current_user["user_id"]
    user_role = current_user.get("role", "user")
    session = _db(request)
    
    # Required fields
    title = (payload.get("title") or "").strip()
    content_md = (payload.get("content_md") or payload.get("content") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not content_md:
        raise HTTPException(status_code=400, detail="content is required")
    
    # Optional fields
    excerpt = (payload.get("excerpt") or "").strip()
    category = (payload.get("category") or "").strip()
    tags = payload.get("tags", [])
    featured_image = (payload.get("featured_image") or "").strip()
    is_published = payload.get("is_published", False)
    
    # Generate slug
    slug = "-".join(title.lower().split())[:120]
    # Ensure unique slug (append timestamp suffix if needed)
    exists = session.execute(select(BlogPost).where(BlogPost.slug == slug)).scalar_one_or_none()
    if exists:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    
    # Set status based on user role and is_published
    if user_role == "admin":
        # Admin can publish immediately
        status = "Published" if is_published else "Draft"
        published_at = datetime.now(timezone.utc) if is_published else None
    else:
        # Regular users create drafts or pending posts
        if is_published:
            status = "Pending"  # Needs admin approval
            published_at = None
        else:
            status = "Draft"
            published_at = None
    
    # Convert tags to JSON string
    import json
    tags_json = json.dumps(tags) if tags else "[]"
    
    p = BlogPost(
        author_id=user_id,
        title=title,
        slug=slug,
        content_md=content_md,
        excerpt=excerpt,
        category=category,
        tags=tags_json,
        featured_image=featured_image,
        is_featured="false",
        view_count=0,
        status=status,
        published_at=published_at,
    )
    
    session.add(p)
    session.commit()
    session.refresh(p)
    return p.to_dict()


@router.put("/{post_id}")
def update_post(request: Request, post_id: int, payload: dict):
    """Update a blog post by admin user only."""
    user_id = require_admin(request)
    session = _db(request)
    
    # Find existing post
    post = session.execute(select(BlogPost).where(BlogPost.id == post_id)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update fields
    if "title" in payload:
        title = (payload["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="title cannot be empty")
        post.title = title
        
        # Update slug if title changed
        new_slug = "-".join(title.lower().split())[:120]
        if new_slug != post.slug:
            # Check if new slug exists
            exists = session.execute(select(BlogPost).where(BlogPost.slug == new_slug, BlogPost.id != post_id)).scalar_one_or_none()
            if exists:
                new_slug = f"{new_slug}-{int(datetime.now(timezone.utc).timestamp())}"
            post.slug = new_slug
    
    if "content_md" in payload:
        content_md = (payload["content_md"] or "").strip()
        if not content_md:
            raise HTTPException(status_code=400, detail="content cannot be empty")
        post.content_md = content_md
    
    if "excerpt" in payload:
        post.excerpt = (payload["excerpt"] or "").strip()
    
    if "category" in payload:
        post.category = (payload["category"] or "").strip()
    
    if "tags" in payload:
        import json
        tags = payload["tags"] or []
        post.tags = json.dumps(tags)
    
    if "featured_image" in payload:
        post.featured_image = (payload["featured_image"] or "").strip()
    
    if "is_published" in payload:
        is_published = payload["is_published"]
        if is_published:
            post.status = "Published"
            if not post.published_at:
                post.published_at = datetime.now(timezone.utc)
        else:
            post.status = "Draft"
            post.published_at = None
    
    if "status" in payload:
        # Allow direct status update (for admin actions like reject)
        status = payload["status"]
        if status in ["Draft", "Published", "Pending", "Rejected", "Archived"]:
            post.status = status
            if status == "Published" and not post.published_at:
                post.published_at = datetime.now(timezone.utc)
            elif status != "Published":
                post.published_at = None
    
    # Update timestamp
    post.updated_at = datetime.now(timezone.utc)
    
    session.commit()
    session.refresh(post)
    return post.to_dict()


@router.delete("/{post_id}")
def delete_post(request: Request, post_id: int):
    """Delete a blog post by admin user only."""
    user_id = require_admin(request)
    session = _db(request)
    
    # Find existing post
    post = session.execute(select(BlogPost).where(BlogPost.id == post_id)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    session.delete(post)
    session.commit()
    return {"message": "Post deleted successfully"}
