from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from ...core.jwt import require_user
from ...modules.users.models import User
from .models import BlogPost, BlogComment, CommentLike, CommentRateLimit
from ..realtime.ws_comments import (
    broadcast_comment_created,
    broadcast_comment_updated, 
    broadcast_comment_deleted,
    broadcast_comment_liked
)

router = APIRouter()


class CommentCreate(BaseModel):
    post_id: int
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    parent_id: Optional[int]
    content: str
    like_count: int
    is_deleted: bool
    is_liked: bool = False
    user_name: str
    user_avatar: Optional[str]
    created_at: str
    updated_at: str
    replies: List['CommentResponse'] = []


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


def _db(request: Request) -> Session:
    return request.state.db


def check_rate_limit(session: Session, user_id: int, post_id: int) -> bool:
    """Check if user has exceeded comment rate limit (10 comments per hour per post)"""
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    # Clean up old rate limit records
    session.query(CommentRateLimit).filter(
        CommentRateLimit.window_start < one_hour_ago
    ).delete()
    
    # Check current rate limit
    rate_limit = session.query(CommentRateLimit).filter(
        and_(
            CommentRateLimit.user_id == user_id,
            CommentRateLimit.post_id == post_id,
            CommentRateLimit.window_start >= one_hour_ago
        )
    ).first()
    
    if rate_limit:
        if rate_limit.comment_count >= 10:
            return False
        rate_limit.comment_count += 1
    else:
        rate_limit = CommentRateLimit(
            user_id=user_id,
            post_id=post_id,
            comment_count=1
        )
        session.add(rate_limit)
    
    session.commit()
    return True


def build_comment_tree(comments: List[BlogComment], user_id: Optional[int], session: Session) -> List[CommentResponse]:
    """Build nested comment tree structure"""
    comment_dict = {}
    root_comments = []
    
    # Get user likes for all comments
    user_likes = set()
    if user_id:
        likes = session.query(CommentLike.comment_id).filter(
            and_(
                CommentLike.user_id == user_id,
                CommentLike.comment_id.in_([c.id for c in comments])
            )
        ).all()
        user_likes = {like[0] for like in likes}
    
    # Get user info for all comments
    user_ids = list(set(c.user_id for c in comments))
    users = session.query(User).filter(User.id.in_(user_ids)).all()
    user_dict = {u.id: u for u in users}
    
    # Convert to response objects
    for comment in comments:
        user = user_dict.get(comment.user_id)
        comment_response = CommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            parent_id=comment.parent_id,
            content=comment.content if not comment.is_deleted else "[deleted]",
            like_count=comment.like_count or 0,
            is_deleted=comment.is_deleted,
            is_liked=comment.id in user_likes,
            user_name=user.full_name if user else "Unknown User",
            user_avatar=user.avatar_url if user else None,
            created_at=comment.created_at.isoformat() if comment.created_at else "",
            updated_at=comment.updated_at.isoformat() if comment.updated_at else "",
            replies=[]
        )
        comment_dict[comment.id] = comment_response
    
    # Build tree structure
    for comment_response in comment_dict.values():
        if comment_response.parent_id is None:
            root_comments.append(comment_response)
        else:
            parent = comment_dict.get(comment_response.parent_id)
            if parent:
                parent.replies.append(comment_response)
    
    return root_comments


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CommentResponse)
async def create_comment(request: Request, payload: CommentCreate):
    """Create a new comment or reply"""
    session = _db(request)
    user_id = require_user(request)

    # Verify post exists
    post = session.get(BlogPost, payload.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check rate limiting
    if not check_rate_limit(session, user_id, payload.post_id):
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Maximum 10 comments per hour per post."
        )

    # Verify parent comment exists if provided
    if payload.parent_id:
        parent = session.get(BlogComment, payload.parent_id)
        if not parent or parent.post_id != payload.post_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    # Create comment
    comment = BlogComment(
        post_id=payload.post_id,
        user_id=user_id,
        parent_id=payload.parent_id,
        content=payload.content.strip(),
        is_deleted=False
    )
    session.add(comment)
    session.flush()  # Flush to get the ID
    session.commit()  # Commit the transaction
    session.refresh(comment)

    # Get user info
    user = session.get(User, user_id)
    
    # Build response
    response = CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        like_count=0,
        is_deleted=False,
        is_liked=False,
        user_name=user.full_name if user else "Unknown User",
        user_avatar=user.avatar_url if user else None,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[]
    )

    # Broadcast to WebSocket clients
    await broadcast_comment_created(payload.post_id, response.dict())
    
    return response


@router.get("/posts/{post_id}", response_model=CommentListResponse)
def get_comments(
    request: Request,
    post_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get paginated comments for a post with nested replies"""
    session = _db(request)
    
    # Get current user if authenticated
    user_id = None
    try:
        user_id = require_user(request)
    except:
        pass  # Anonymous user

    # Verify post exists
    post = session.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get total count of top-level comments
    total = session.query(func.count(BlogComment.id)).filter(
        and_(
            BlogComment.post_id == post_id,
            BlogComment.parent_id.is_(None)
        )
    ).scalar()

    # Get top-level comments with pagination
    offset = (page - 1) * page_size
    top_level_comments = session.query(BlogComment).filter(
        and_(
            BlogComment.post_id == post_id,
            BlogComment.parent_id.is_(None)
        )
    ).order_by(desc(BlogComment.created_at)).offset(offset).limit(page_size).all()

    # Get all replies for these top-level comments
    if top_level_comments:
        top_level_ids = [c.id for c in top_level_comments]
        replies = session.query(BlogComment).filter(
            BlogComment.parent_id.in_(top_level_ids)
        ).order_by(BlogComment.created_at).all()
        
        all_comments = top_level_comments + replies
    else:
        all_comments = []

    # Build comment tree
    comment_tree = build_comment_tree(all_comments, user_id, session)

    return CommentListResponse(
        comments=comment_tree,
        total=total,
        page=page,
        page_size=page_size,
        has_next=total > page * page_size
    )


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(request: Request, comment_id: int, payload: CommentUpdate):
    """Update a comment (only by the author)"""
    session = _db(request)
    user_id = require_user(request)

    comment = session.get(BlogComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit deleted comment")

    # Update comment
    comment.content = payload.content.strip()
    comment.updated_at = func.now()
    session.commit()
    session.refresh(comment)

    # Get user info
    user = session.get(User, user_id)
    
    # Check if user liked this comment
    is_liked = session.query(CommentLike).filter(
        and_(CommentLike.comment_id == comment_id, CommentLike.user_id == user_id)
    ).first() is not None

    response = CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        like_count=comment.like_count or 0,
        is_deleted=False,
        is_liked=is_liked,
        user_name=user.full_name if user else "Unknown User",
        user_avatar=user.avatar_url if user else None,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        replies=[]
    )

    # Broadcast to WebSocket clients
    await broadcast_comment_updated(comment.post_id, response.dict())
    
    return response


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(request: Request, comment_id: int):
    """Soft delete a comment (only by the author)"""
    session = _db(request)
    user_id = require_user(request)

    comment = session.get(BlogComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    # Soft delete
    comment.is_deleted = True
    comment.content = "[deleted]"
    comment.updated_at = func.now()
    session.commit()

    # Broadcast to WebSocket clients
    await broadcast_comment_deleted(comment.post_id, comment_id)


@router.post("/{comment_id}/like", status_code=status.HTTP_200_OK)
async def toggle_comment_like(request: Request, comment_id: int):
    """Like or unlike a comment"""
    session = _db(request)
    user_id = require_user(request)

    comment = session.get(BlogComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot like deleted comment")

    # Check if already liked
    existing_like = session.query(CommentLike).filter(
        and_(CommentLike.comment_id == comment_id, CommentLike.user_id == user_id)
    ).first()

    if existing_like:
        # Unlike
        session.delete(existing_like)
        is_liked = False
    else:
        # Like
        like = CommentLike(comment_id=comment_id, user_id=user_id)
        session.add(like)
        is_liked = True

    session.commit()
    
    # Get accurate count from database
    like_count = session.query(func.count(CommentLike.id)).filter(
        CommentLike.comment_id == comment_id
    ).scalar()
    
    # Update comment like_count
    comment.like_count = like_count
    session.commit()

    like_data = {
        "id": comment_id,
        "like_count": like_count,
        "is_liked": is_liked,
        "user_id": user_id
    }

    # Broadcast to WebSocket clients (includes user_id so clients can filter)
    await broadcast_comment_liked(comment.post_id, like_data)

    return like_data
