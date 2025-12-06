"""
Subscription Service
Quản lý subscription và giới hạn cho user
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text


class SubscriptionService:
    """Service quản lý subscription"""
    
    @staticmethod
    def get_user_plan(db: Session, user_id: int) -> dict:
        """Lấy plan hiện tại của user"""
        query = text("""
            SELECT 
                sp.*,
                us.end_date,
                us.status
            FROM core.user_subscriptions us
            JOIN core.subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = :user_id 
            AND us.status = 'active'
            AND us.end_date > NOW()
            ORDER BY us.end_date DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {"user_id": user_id}).fetchone()
        
        if result:
            return dict(result._mapping)
        
        # Nếu không có subscription, trả về free plan
        free_plan = db.execute(
            text("SELECT * FROM core.subscription_plans WHERE name = 'free'")
        ).fetchone()
        
        return dict(free_plan._mapping) if free_plan else None
    
    @staticmethod
    def get_user_usage(db: Session, user_id: int) -> dict:
        """Lấy usage của user trong tháng hiện tại"""
        now = datetime.now()
        
        query = text("""
            SELECT * FROM core.user_usage
            WHERE user_id = :user_id 
            AND year = :year 
            AND month = :month
        """)
        
        result = db.execute(query, {
            "user_id": user_id,
            "year": now.year,
            "month": now.month
        }).fetchone()
        
        if result:
            return dict(result._mapping)
        
        # Tạo mới nếu chưa có
        insert_query = text("""
            INSERT INTO core.user_usage (user_id, year, month, assessments_count, careers_viewed)
            VALUES (:user_id, :year, :month, 0, '[]'::jsonb)
            RETURNING *
        """)
        
        result = db.execute(insert_query, {
            "user_id": user_id,
            "year": now.year,
            "month": now.month
        }).fetchone()
        
        db.commit()
        
        return dict(result._mapping) if result else {}
    
    @staticmethod
    def can_take_assessment(db: Session, user_id: int) -> tuple[bool, str]:
        """Kiểm tra user có thể làm bài test không"""
        plan = SubscriptionService.get_user_plan(db, user_id)
        usage = SubscriptionService.get_user_usage(db, user_id)
        
        max_assessments = plan.get('max_assessments_per_month', 5)
        current_count = usage.get('assessments_count', 0)
        
        # -1 = unlimited
        if max_assessments == -1:
            return True, ""
        
        if current_count >= max_assessments:
            return False, f"Bạn đã hết lượt làm bài test miễn phí ({max_assessments} lần/tháng). Vui lòng nâng cấp gói."
        
        return True, f"Còn {max_assessments - current_count}/{max_assessments} lượt"
    
    @staticmethod
    def increment_assessment_count(db: Session, user_id: int):
        """Tăng số lần làm bài test"""
        now = datetime.now()
        
        query = text("""
            UPDATE core.user_usage
            SET assessments_count = assessments_count + 1,
                updated_at = NOW()
            WHERE user_id = :user_id 
            AND year = :year 
            AND month = :month
        """)
        
        db.execute(query, {
            "user_id": user_id,
            "year": now.year,
            "month": now.month
        })
        db.commit()
    
    @staticmethod
    def can_view_career(db: Session, user_id: int, career_id: int) -> tuple[bool, str]:
        """Kiểm tra user có thể xem nghề nghiệp này không"""
        plan = SubscriptionService.get_user_plan(db, user_id)
        
        # Nếu có quyền xem tất cả
        if plan.get('can_view_all_careers'):
            return True, ""
        
        usage = SubscriptionService.get_user_usage(db, user_id)
        careers_viewed = usage.get('careers_viewed', [])
        
        # Nếu đã xem nghề này rồi thì OK
        if career_id in careers_viewed:
            return True, ""
        
        max_careers = plan.get('max_career_views', 1)
        
        # -1 = unlimited
        if max_careers == -1:
            return True, ""
        
        if len(careers_viewed) >= max_careers:
            return False, f"Bạn chỉ được xem {max_careers} nghề nghiệp với gói miễn phí. Vui lòng nâng cấp để xem thêm."
        
        return True, f"Còn {max_careers - len(careers_viewed)}/{max_careers} nghề"
    
    @staticmethod
    def track_career_view(db: Session, user_id: int, career_id: int):
        """Track việc xem nghề nghiệp"""
        now = datetime.now()
        
        query = text("""
            UPDATE core.user_usage
            SET careers_viewed = careers_viewed || :career_id::jsonb,
                updated_at = NOW()
            WHERE user_id = :user_id 
            AND year = :year 
            AND month = :month
            AND NOT (careers_viewed @> :career_id::jsonb)
        """)
        
        db.execute(query, {
            "user_id": user_id,
            "career_id": f'[{career_id}]',
            "year": now.year,
            "month": now.month
        })
        db.commit()
    
    @staticmethod
    def can_view_roadmap_level(db: Session, user_id: int, level: int) -> tuple[bool, str]:
        """Kiểm tra user có thể xem level roadmap này không"""
        plan = SubscriptionService.get_user_plan(db, user_id)
        
        # Nếu có quyền xem full roadmap
        if plan.get('can_view_full_roadmap'):
            return True, ""
        
        max_level = plan.get('max_roadmap_level', 1)
        
        # -1 = unlimited
        if max_level == -1:
            return True, ""
        
        if level > max_level:
            return False, f"Bạn chỉ được xem đến Level {max_level} với gói miễn phí. Vui lòng nâng cấp để xem thêm."
        
        return True, ""
    
    @staticmethod
    def create_subscription(db: Session, user_id: int, plan_name: str, payment_id: int = None) -> dict:
        """Tạo subscription mới cho user"""
        # Lấy plan
        plan_query = text("SELECT * FROM core.subscription_plans WHERE name = :plan_name")
        plan = db.execute(plan_query, {"plan_name": plan_name}).fetchone()
        
        if not plan:
            raise ValueError(f"Plan {plan_name} not found")
        
        plan_dict = dict(plan._mapping)
        
        # Tính end_date
        start_date = datetime.now()
        end_date = start_date + timedelta(days=plan_dict['duration_days'])
        
        # Hủy subscription cũ (nếu có)
        cancel_query = text("""
            UPDATE core.user_subscriptions
            SET status = 'cancelled', updated_at = NOW()
            WHERE user_id = :user_id AND status = 'active'
        """)
        db.execute(cancel_query, {"user_id": user_id})
        
        # Tạo subscription mới
        insert_query = text("""
            INSERT INTO core.user_subscriptions 
            (user_id, plan_id, start_date, end_date, status, payment_id)
            VALUES (:user_id, :plan_id, :start_date, :end_date, 'active', :payment_id)
            RETURNING *
        """)
        
        result = db.execute(insert_query, {
            "user_id": user_id,
            "plan_id": plan_dict['id'],
            "start_date": start_date,
            "end_date": end_date,
            "payment_id": payment_id
        }).fetchone()
        
        db.commit()
        
        return dict(result._mapping) if result else {}
