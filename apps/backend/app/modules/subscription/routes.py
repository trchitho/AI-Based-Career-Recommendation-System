"""
Subscription API Routes
"""

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from ...core.jwt import require_user
from ...core.subscription import SubscriptionService

router = APIRouter()


def _db(request: Request) -> Session:
    return request.state.db


@router.get("/usage")
def get_user_usage(request: Request):
    """Lấy thông tin usage hiện tại của user"""
    user_id = require_user(request)
    session = _db(request)
    
    # Lấy subscription info
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    
    # Lấy usage cho các features
    features = ["career_view", "assessment", "roadmap_level"]
    usage_data = []
    
    for feature in features:
        usage = SubscriptionService.get_user_usage(user_id, feature, session)
        access = SubscriptionService.check_feature_access(user_id, feature, session)
        
        usage_data.append({
            "feature": feature,
            "current_usage": usage["usage_count"],
            "limit": access["limit"],
            "remaining": max(0, access["limit"] - usage["usage_count"]) if access["limit"] != -1 else -1,
            "allowed": access["allowed"]
        })
    
    return {
        "subscription": subscription,
        "usage": usage_data
    }


@router.get("/plans")
def get_subscription_plans(request: Request):
    """Lấy danh sách các gói subscription"""
    session = _db(request)
    
    query = text("""
    SELECT id, name, price_monthly, price_yearly, features, limits, is_active
    FROM core.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly ASC
    """)
    
    result = session.execute(query).fetchall()
    
    plans = []
    for row in result:
        plans.append({
            "id": row.id,
            "name": row.name,
            "price_monthly": float(row.price_monthly) if row.price_monthly else 0,
            "price_yearly": float(row.price_yearly) if row.price_yearly else 0,
            "features": row.features or {},
            "limits": row.limits or {},
            "is_active": row.is_active
        })
    
    return {"plans": plans}


@router.post("/check-access")
def check_feature_access(request: Request, payload: dict):
    """Kiểm tra quyền truy cập feature"""
    user_id = require_user(request)
    session = _db(request)
    
    feature_type = payload.get("feature_type")
    level = payload.get("level")
    
    if not feature_type:
        raise HTTPException(status_code=400, detail="feature_type is required")
    
    access = SubscriptionService.check_feature_access(user_id, feature_type, session, level)
    
    return access


@router.get("/subscription")
def get_user_subscription(request: Request):
    """Lấy thông tin subscription hiện tại của user"""
    user_id = require_user(request)
    session = _db(request)
    
    subscription = SubscriptionService.get_user_subscription(user_id, session)
    
    return subscription


@router.post("/debug/upgrade")
def debug_upgrade_user(request: Request, payload: dict):
    """Debug endpoint để manual upgrade user"""
    user_id = require_user(request)
    session = _db(request)
    
    plan_name = payload.get("plan_name", "Premium")
    
    try:
        from ...core.subscription import SubscriptionService
        
        # Create a fake payment ID for debug
        fake_payment_id = 999999
        
        success = SubscriptionService.upgrade_user_subscription(
            user_id=user_id,
            plan_name=plan_name,
            payment_id=fake_payment_id,
            session=session
        )
        
        if success:
            return {"success": True, "message": f"User upgraded to {plan_name}"}
        else:
            return {"success": False, "message": "Upgrade failed"}
            
    except Exception as e:
        return {"success": False, "message": str(e)}