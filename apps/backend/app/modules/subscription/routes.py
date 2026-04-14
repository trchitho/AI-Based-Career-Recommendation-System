"""
Subscription API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Any

from app.core.db import get_db
from app.core.subscription import SubscriptionService

router = APIRouter(tags=["Subscription"])


def _current_user_id(req: Request) -> int:
    """
    Lấy user_id từ request state hoặc JWT token
    """
    # 1) req.state.user_id
    uid: Any = getattr(req.state, "user_id", None)
    
    # 2) req.state.user
    user_obj = getattr(req.state, "user", None)
    if uid is None and user_obj is not None:
        uid = getattr(user_obj, "id", None) or getattr(user_obj, "user_id", None)
    
    # 3) header X-User-Id
    if uid is None:
        hdr = req.headers.get("X-User-Id")
        if hdr:
            try:
                uid = int(hdr)
            except:
                pass
    
    # 4) Decode JWT token (fallback)
    if uid is None:
        auth_header = req.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                import base64
                import json
                # Decode payload (không verify signature - chỉ để lấy user_id)
                parts = token.split(".")
                if len(parts) >= 2:
                    payload_b64 = parts[1]
                    # Thêm padding nếu cần
                    padding = 4 - len(payload_b64) % 4
                    if padding != 4:
                        payload_b64 += "=" * padding
                    payload_json = base64.urlsafe_b64decode(payload_b64)
                    payload = json.loads(payload_json)
                    uid = payload.get("sub") or payload.get("user_id")
                    if uid:
                        try:
                            uid = int(uid)
                        except:
                            pass
            except:
                pass
    
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return int(uid)


@router.get("/status")
def get_subscription_status(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Lấy thông tin subscription hiện tại của user
    
    Returns:
    - plan_name: Tên gói (Free, Basic, Premium, Pro)
    - is_premium: True nếu là gói trả phí
    - limits: Giới hạn của gói
    - features: Các tính năng
    - expires_at: Ngày hết hạn (nếu có)
    """
    try:
        subscription = SubscriptionService.get_user_subscription(user_id, db)
        
        return {
            "success": True,
            "plan_name": subscription.get("plan_name", "Free"),
            "is_premium": subscription.get("is_premium", False),
            "limits": subscription.get("limits", {}),
            "features": subscription.get("features", {}),
            "expires_at": subscription.get("expires_at"),
            "status": subscription.get("status", "active"),
        }
    except Exception as e:
        print(f"Error getting subscription status: {e}")
        # Return Free plan as safe default
        return {
            "success": True,
            "plan_name": "Free",
            "is_premium": False,
            "limits": SubscriptionService.FREE_LIMITS,
            "features": {},
            "expires_at": None,
            "status": "active",
        }


@router.get("/usage")
def get_subscription_usage(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Lấy thông tin subscription và usage của user
    
    Returns:
    - subscription: Thông tin gói
    - usage: Danh sách usage theo feature
    """
    try:
        subscription = SubscriptionService.get_user_subscription(user_id, db)
        
        # Get usage for common features
        usage_list = []
        
        # Assessment usage
        assessment_usage = SubscriptionService.get_user_usage(user_id, "assessment", db)
        assessment_limit = subscription.get("limits", {}).get("assessments_per_month", 5)
        usage_list.append({
            "feature": "assessment",
            "current_usage": assessment_usage.get("usage_count", 0),
            "limit": assessment_limit,
            "remaining": max(0, assessment_limit - assessment_usage.get("usage_count", 0)) if assessment_limit != -1 else -1,
            "allowed": assessment_limit == -1 or assessment_usage.get("usage_count", 0) < assessment_limit
        })
        
        # Career view usage
        career_usage = SubscriptionService.get_user_usage(user_id, "career_view", db)
        career_limit = subscription.get("limits", {}).get("career_views", 1)
        usage_list.append({
            "feature": "career_view",
            "current_usage": career_usage.get("usage_count", 0),
            "limit": career_limit,
            "remaining": max(0, career_limit - career_usage.get("usage_count", 0)) if career_limit != -1 else -1,
            "allowed": career_limit == -1 or career_usage.get("usage_count", 0) < career_limit
        })
        
        return {
            "subscription": {
                "subscription_id": subscription.get("subscription_id"),
                "plan_name": subscription.get("plan_name", "Free"),
                "limits": subscription.get("limits", {}),
                "features": subscription.get("features", {}),
                "status": subscription.get("status", "active"),
                "expires_at": subscription.get("expires_at"),
                "is_premium": subscription.get("is_premium", False),
            },
            "usage": usage_list
        }
    except Exception as e:
        print(f"Error getting subscription usage: {e}")
        # Return Free plan as safe default
        return {
            "subscription": {
                "subscription_id": None,
                "plan_name": "Free",
                "limits": SubscriptionService.FREE_LIMITS,
                "features": {},
                "status": "active",
                "expires_at": None,
                "is_premium": False,
            },
            "usage": []
        }


@router.get("/subscription")
def get_current_subscription(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Lấy thông tin subscription hiện tại (alias for /status)
    Endpoint này để tương thích với PaymentPage
    
    Returns:
    - Thông tin subscription đầy đủ
    """
    try:
        subscription = SubscriptionService.get_user_subscription(user_id, db)
        
        return {
            "subscription_id": subscription.get("subscription_id"),
            "plan_name": subscription.get("plan_name", "Free"),
            "limits": subscription.get("limits", {}),
            "features": subscription.get("features", {}),
            "status": subscription.get("status", "active"),
            "expires_at": subscription.get("expires_at"),
            "is_premium": subscription.get("is_premium", False),
        }
    except Exception as e:
        print(f"Error getting subscription: {e}")
        # Return Free plan as safe default
        return {
            "subscription_id": None,
            "plan_name": "Free",
            "limits": SubscriptionService.FREE_LIMITS,
            "features": {},
            "status": "active",
            "expires_at": None,
            "is_premium": False,
        }


@router.get("/check-feature/{feature_type}")
def check_feature_access(
    feature_type: str,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Kiểm tra xem user có quyền truy cập feature không
    
    Args:
    - feature_type: Loại feature (career_view, assessment, roadmap_level, skill_gap_analysis)
    
    Returns:
    - allowed: True nếu được phép
    - reason: Lý do (nếu không được phép)
    - current_usage: Usage hiện tại
    - limit: Giới hạn
    """
    try:
        access = SubscriptionService.check_feature_access(user_id, feature_type, db)
        
        return {
            "success": True,
            "allowed": access.get("allowed", False),
            "reason": access.get("reason", ""),
            "current_usage": access.get("current_usage", 0),
            "limit": access.get("limit", 0),
        }
    except Exception as e:
        print(f"Error checking feature access: {e}")
        return {
            "success": False,
            "allowed": False,
            "reason": "Error checking access",
            "current_usage": 0,
            "limit": 0,
        }
