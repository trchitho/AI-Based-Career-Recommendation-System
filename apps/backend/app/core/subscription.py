"""
Subscription and Usage Tracking Service
Quản lý gói đăng ký và theo dõi usage của user
"""

from datetime import datetime, timezone, date
from typing import Dict, Any, Optional
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from .db import SessionLocal


class SubscriptionService:
    """Service để quản lý subscription và usage tracking"""
    
    # Enhanced limits for 4-tier system
    FREE_LIMITS = {
        "assessments_per_month": 5,
        "career_views": 1,
        "roadmap_max_level": 1,
        "ai_analysis": "basic",
        "pdf_export": False,
        "ai_assistant": False,
        "history_comparison": False
    }
    
    BASIC_LIMITS = {
        "assessments_per_month": 20,
        "career_views": 25,  # Basic plan: 25 career views (not 5!)
        "roadmap_max_level": 2,
        "ai_analysis": "summary",
        "pdf_export": False,
        "ai_assistant": False,
        "history_comparison": False
    }
    
    PREMIUM_LIMITS = {
        "assessments_per_month": -1,  # Unlimited
        "career_views": -1,           # Unlimited
        "roadmap_max_level": -1,      # All levels
        "ai_analysis": "detailed",
        "pdf_export": False,
        "ai_assistant": False,
        "history_comparison": False
    }
    
    PRO_LIMITS = {
        "assessments_per_month": -1,  # Unlimited
        "career_views": -1,           # Unlimited
        "roadmap_max_level": -1,      # All levels
        "ai_analysis": "detailed",
        "pdf_export": True,
        "ai_assistant": True,         # Gemini API
        "history_comparison": True,
        "course_recommendations": True
    }
    
    @staticmethod
    def get_user_subscription(user_id: int, session: Session) -> Dict[str, Any]:
        """Lấy thông tin subscription hiện tại của user"""
        
        # Query active subscription
        query = text("""
        SELECT 
            us.id as subscription_id,
            sp.name as plan_name,
            sp.limits,
            sp.features,
            us.status,
            us.expires_at
        FROM core.user_subscriptions us
        JOIN core.subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = :user_id 
        AND us.status = 'active'
        AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
        ORDER BY us.created_at DESC
        LIMIT 1
        """)
        
        result = session.execute(query, {"user_id": user_id}).fetchone()
        
        if result:
            # Determine limits based on plan name
            plan_name = result.plan_name
            if plan_name in ['Basic', 'Cơ Bản', 'Gói Cơ Bản']:
                limits = SubscriptionService.BASIC_LIMITS
            elif plan_name in ['Premium', 'Gói Premium']:
                limits = SubscriptionService.PREMIUM_LIMITS
            elif plan_name in ['Pro', 'Gói Pro', 'CareerAI Professional']:
                limits = SubscriptionService.PRO_LIMITS
            else:
                limits = result.limits or SubscriptionService.FREE_LIMITS
            
            return {
                "subscription_id": result.subscription_id,
                "plan_name": result.plan_name,
                "limits": limits,
                "features": result.features or {},
                "status": result.status,
                "expires_at": result.expires_at,
                "is_premium": result.plan_name != "Free"
            }
        else:
            # Default to free plan
            return {
                "subscription_id": None,
                "plan_name": "Free",
                "limits": SubscriptionService.FREE_LIMITS,
                "features": {"career_recommendations": True, "basic_assessment": True, "basic_roadmap": True},
                "status": "active",
                "expires_at": None,
                "is_premium": False
            }
    
    @staticmethod
    def get_user_usage(user_id: int, feature_type: str, session: Session) -> Dict[str, Any]:
        """Lấy thông tin usage của user cho feature cụ thể"""
        
        # Reset monthly usage if needed
        if feature_type == "assessment":
            SubscriptionService._reset_monthly_usage_if_needed(user_id, session)
        
        query = text("""
        SELECT usage_count, last_reset_date
        FROM core.user_usage_tracking
        WHERE user_id = :user_id AND feature_type = :feature_type
        """)
        
        result = session.execute(query, {
            "user_id": user_id, 
            "feature_type": feature_type
        }).fetchone()
        
        if result:
            return {
                "usage_count": result.usage_count,
                "last_reset_date": result.last_reset_date
            }
        else:
            # Create new tracking record
            insert_query = text("""
            INSERT INTO core.user_usage_tracking (user_id, feature_type, usage_count)
            VALUES (:user_id, :feature_type, 0)
            ON CONFLICT (user_id, feature_type) DO NOTHING
            """)
            session.execute(insert_query, {
                "user_id": user_id,
                "feature_type": feature_type
            })
            session.commit()
            
            return {
                "usage_count": 0,
                "last_reset_date": date.today()
            }
    
    @staticmethod
    def increment_usage(user_id: int, feature_type: str, session: Session) -> bool:
        """Tăng usage count cho feature. Return True nếu thành công"""
        
        # Reset monthly usage if needed
        if feature_type == "assessment":
            SubscriptionService._reset_monthly_usage_if_needed(user_id, session)
        
        query = text("""
        INSERT INTO core.user_usage_tracking (user_id, feature_type, usage_count)
        VALUES (:user_id, :feature_type, 1)
        ON CONFLICT (user_id, feature_type) 
        DO UPDATE SET 
            usage_count = core.user_usage_tracking.usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
        """)
        
        try:
            session.execute(query, {
                "user_id": user_id,
                "feature_type": feature_type
            })
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error incrementing usage: {e}")
            return False
    
    @staticmethod
    def check_feature_access(user_id: int, feature_type: str, session: Session, 
                           level: Optional[int] = None) -> Dict[str, Any]:
        """
        Kiểm tra xem user có thể access feature không
        
        Args:
            user_id: ID của user
            feature_type: Loại feature ('career_view', 'assessment', 'roadmap_level')
            level: Level cho roadmap (optional)
            
        Returns:
            Dict với keys: allowed, reason, current_usage, limit
        """
        
        # Lấy subscription info
        subscription = SubscriptionService.get_user_subscription(user_id, session)
        limits = subscription["limits"]
        is_premium = subscription["is_premium"]
        
        # Lấy usage hiện tại
        usage = SubscriptionService.get_user_usage(user_id, feature_type, session)
        current_usage = usage["usage_count"]
        
        # Kiểm tra theo từng feature type
        if feature_type == "career_view":
            limit = limits.get("career_views", 1)
            # Only Premium/Pro have unlimited (-1), Basic has 25 limit
            if limit == -1:  # Unlimited (Premium/Pro only)
                return {
                    "allowed": True,
                    "reason": "Premium access",
                    "current_usage": current_usage,
                    "limit": -1
                }
            else:
                allowed = current_usage < limit
                return {
                    "allowed": allowed,
                    "reason": "Plan limit reached" if not allowed else "Within limit",
                    "current_usage": current_usage,
                    "limit": limit
                }
        
        elif feature_type == "assessment":
            limit = limits.get("assessments_per_month", 5)
            if limit == -1:  # Unlimited (Premium/Pro only)
                return {
                    "allowed": True,
                    "reason": "Premium access",
                    "current_usage": current_usage,
                    "limit": -1
                }
            else:
                allowed = current_usage < limit
                return {
                    "allowed": allowed,
                    "reason": "Monthly limit reached" if not allowed else "Within monthly limit",
                    "current_usage": current_usage,
                    "limit": limit
                }
        
        elif feature_type == "roadmap_level":
            max_level = limits.get("roadmap_max_level", 1)
            if max_level == -1:  # Unlimited (Premium/Pro only)
                return {
                    "allowed": True,
                    "reason": "Premium access",
                    "current_usage": level or 1,
                    "limit": -1
                }
            else:
                allowed = (level or 1) <= max_level
                return {
                    "allowed": allowed,
                    "reason": f"Plan only allows level {max_level}" if not allowed else "Within level limit",
                    "current_usage": level or 1,
                    "limit": max_level
                }
        
        else:
            return {
                "allowed": False,
                "reason": "Unknown feature type",
                "current_usage": 0,
                "limit": 0
            }
    
    @staticmethod
    def upgrade_user_subscription(user_id: int, plan_name: str, payment_id: int, session: Session) -> bool:
        """
        Upgrade user subscription sau khi thanh toán thành công
        
        Args:
            user_id: ID của user
            plan_name: Tên gói subscription (Premium, Pro, etc.)
            payment_id: ID của payment record
            session: Database session
            
        Returns:
            bool: True nếu upgrade thành công
        """
        try:
            # Tìm plan theo tên
            plan_query = text("""
            SELECT id, name, limits, features, price_monthly
            FROM core.subscription_plans
            WHERE name = :plan_name AND is_active = true
            """)
            
            plan_result = session.execute(plan_query, {"plan_name": plan_name}).fetchone()
            
            if not plan_result:
                print(f"Plan {plan_name} not found")
                return False
            
            # Deactivate current subscription nếu có
            deactivate_query = text("""
            UPDATE core.user_subscriptions 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id AND status = 'active'
            """)
            
            session.execute(deactivate_query, {"user_id": user_id})
            
            # Tạo subscription mới
            # Tính expires_at: 1 năm từ bây giờ (không phải 1 tháng)
            now = datetime.now(timezone.utc)
            expires_at = datetime(now.year + 1, now.month, now.day, now.hour, now.minute, now.second, tzinfo=timezone.utc)
            
            create_subscription_query = text("""
            INSERT INTO core.user_subscriptions 
            (user_id, plan_id, status, payment_id, expires_at, created_at, updated_at)
            VALUES (:user_id, :plan_id, 'active', :payment_id, :expires_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """)
            
            session.execute(create_subscription_query, {
                "user_id": user_id,
                "plan_id": plan_result.id,
                "payment_id": payment_id,
                "expires_at": expires_at
            })
            
            session.commit()
            
            print(f"User {user_id} upgraded to {plan_name} successfully")
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error upgrading user subscription: {e}")
            return False
    
    @staticmethod
    def _reset_monthly_usage_if_needed(user_id: int, session: Session):
        """Reset usage nếu đã sang tháng mới"""
        
        query = text("""
        UPDATE core.user_usage_tracking 
        SET usage_count = 0, 
            last_reset_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :user_id 
        AND feature_type = 'assessment'
        AND last_reset_date < DATE_TRUNC('month', CURRENT_DATE)
        """)
        
        session.execute(query, {"user_id": user_id})
        session.commit()


def require_feature_access(user_id: int, feature_type: str, level: Optional[int] = None):
    """
    Decorator/function để check feature access và raise exception nếu không được phép
    """
    session = SessionLocal()
    try:
        access = SubscriptionService.check_feature_access(user_id, feature_type, session, level)
        
        if not access["allowed"]:
            raise HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "message": access["reason"],
                    "feature": feature_type,
                    "current_usage": access["current_usage"],
                    "limit": access["limit"],
                    "upgrade_required": True
                }
            )
        
        return access
    finally:
        session.close()