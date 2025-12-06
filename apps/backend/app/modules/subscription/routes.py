"""
Subscription Routes
API endpoints để check giới hạn và quản lý subscription
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.jwt import get_current_user
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("/my-plan")
def get_my_plan(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lấy thông tin plan hiện tại"""
    user_id = current_user["user_id"]
    
    plan = SubscriptionService.get_user_plan(db, user_id)
    usage = SubscriptionService.get_user_usage(db, user_id)
    
    return {
        "plan": plan,
        "usage": usage,
    }


@router.get("/check/assessment")
def check_assessment_limit(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Kiểm tra có thể làm bài test không"""
    user_id = current_user["user_id"]
    
    can_take, message = SubscriptionService.can_take_assessment(db, user_id)
    
    return {
        "allowed": can_take,
        "message": message,
    }


@router.get("/check/career/{career_id}")
def check_career_access(
    career_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Kiểm tra có thể xem nghề nghiệp này không"""
    user_id = current_user["user_id"]
    
    can_view, message = SubscriptionService.can_view_career(db, user_id, career_id)
    
    return {
        "allowed": can_view,
        "message": message,
    }


@router.get("/check/roadmap-level/{level}")
def check_roadmap_level(
    level: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Kiểm tra có thể xem level roadmap này không"""
    user_id = current_user["user_id"]
    
    can_view, message = SubscriptionService.can_view_roadmap_level(db, user_id, level)
    
    return {
        "allowed": can_view,
        "message": message,
    }


@router.post("/track/assessment")
def track_assessment(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Track việc làm bài test"""
    user_id = current_user["user_id"]
    
    # Kiểm tra trước
    can_take, message = SubscriptionService.can_take_assessment(db, user_id)
    if not can_take:
        raise HTTPException(status_code=403, detail=message)
    
    # Increment counter
    SubscriptionService.increment_assessment_count(db, user_id)
    
    return {"success": True, "message": "Tracked"}


@router.post("/track/career/{career_id}")
def track_career_view(
    career_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Track việc xem nghề nghiệp"""
    user_id = current_user["user_id"]
    
    # Kiểm tra trước
    can_view, message = SubscriptionService.can_view_career(db, user_id, career_id)
    if not can_view:
        raise HTTPException(status_code=403, detail=message)
    
    # Track view
    SubscriptionService.track_career_view(db, user_id, career_id)
    
    return {"success": True, "message": "Tracked"}
