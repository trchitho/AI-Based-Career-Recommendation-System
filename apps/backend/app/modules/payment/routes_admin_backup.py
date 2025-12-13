from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from datetime import datetime, date

from .models import Payment, PaymentStatus, PaymentMethod
from ...core.jwt import require_admin
from ..auth.models import User

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])

def _db(req: Request) -> Session:
    """Lấy Session từ req.state.db"""
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database session not available",
        )
    return db

class PaymentResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    order_id: str
    amount: int
    description: Optional[str] = None
    payment_method: str
    status: str
    transaction_id: Optional[str] = None
    gateway_order_id: Optional[str] = None
    gateway_response: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class PaymentListResponse(BaseModel):
    items: list[PaymentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class PaymentStatsResponse(BaseModel):
    total_payments: int
    total_amount: int
    completed_payments: int
    completed_amount: int
    pending_payments: int
    failed_payments: int
    refunded_payments: int
    today_payments: int
    today_amount: int

@router.get("/stats", response_model=PaymentStatsResponse)
def get_payment_stats(
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy thống kê thanh toán"""
    try:
        # Tổng số thanh toán
        total_payments = db.query(Payment).count()
        total_amount = db.query(func.sum(Payment.amount)).scalar() or 0
        
        # Thanh toán thành công
        completed_payments = db.query(Payment).filter(
            Payment.status == PaymentStatus.SUCCESS
        ).count()
        completed_amount = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.SUCCESS
        ).scalar() or 0
        
        # Thanh toán pending
        pending_payments = db.query(Payment).filter(
            Payment.status == PaymentStatus.PENDING
        ).count()
        
        # Thanh toán thất bại
        failed_payments = db.query(Payment).filter(
            Payment.status == PaymentStatus.FAILED
        ).count()
        
        # Thanh toán bị hủy
        cancelled_payments = db.query(Payment).filter(
            Payment.status == PaymentStatus.CANCELLED
        ).count()
        
        # Thanh toán hôm nay
        today = date.today()
        today_payments = db.query(Payment).filter(
            func.date(Payment.created_at) == today
        ).count()
        today_amount = db.query(func.sum(Payment.amount)).filter(
            func.date(Payment.created_at) == today
        ).scalar() or 0
        
        return PaymentStatsResponse(
            total_payments=total_payments,
            total_amount=total_amount,
            completed_payments=completed_payments,
            completed_amount=completed_amount,
            pending_payments=pending_payments,
            failed_payments=failed_payments,
            refunded_payments=cancelled_payments,
            today_payments=today_payments,
            today_amount=today_amount
        )
        
    except Exception as e:
        print(f"[admin-payments] get_payment_stats error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment stats"
        )

@router.get("", response_model=PaymentListResponse)
def get_payments(
    page: int = Query(1, ge=1, description="Số trang"),
    per_page: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo email, order_id, transaction_id"),
    status_filter: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    payment_method: Optional[str] = Query(None, description="Lọc theo phương thức thanh toán"),
    date_from: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    sort_by: str = Query("created_at", description="Sắp xếp theo field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Thứ tự sắp xếp"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy danh sách thanh toán với phân trang và tìm kiếm"""
    try:
        # Base query
        query = db.query(Payment)
        
        # Tìm kiếm
        if search:
            search_term = f"%{search}%"
            # Tìm user IDs có email match
            user_ids = db.query(User.id).filter(User.email.ilike(search_term)).all()
            user_ids = [uid[0] for uid in user_ids]
            
            search_conditions = [
                Payment.order_id.ilike(search_term),
            ]
            
            if user_ids:
                search_conditions.append(Payment.user_id.in_(user_ids))
            
            if hasattr(Payment, 'zp_trans_token'):
                search_conditions.append(Payment.zp_trans_token.ilike(search_term))
            
            if hasattr(Payment, 'app_trans_id'):
                search_conditions.append(Payment.app_trans_id.ilike(search_term))
            
            query = query.filter(or_(*search_conditions))
        
        # Lọc theo trạng thái
        if status_filter:
            try:
                status_enum = PaymentStatus(status_filter)
                query = query.filter(Payment.status == status_enum)
            except ValueError:
                pass
        
        # Lọc theo phương thức thanh toán
        if payment_method:
            try:
                method_enum = PaymentMethod(payment_method)
                query = query.filter(Payment.payment_method == method_enum)
            except ValueError:
                pass
        
        # Lọc theo ngày
        if date_from:
            query = query.filter(func.date(Payment.created_at) >= date_from)
        if date_to:
            query = query.filter(func.date(Payment.created_at) <= date_to)
        
        # Đếm tổng số
        total = query.count()
        
        # Sắp xếp
        sort_column = getattr(Payment, sort_by, Payment.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        # Phân trang
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # Tính tổng số trang
        total_pages = (total + per_page - 1) // per_page
        
        # Chuyển đổi sang response format
        payment_items = []
        for payment in items:
            # Lấy thông tin user riêng
            user = db.query(User).filter(User.id == payment.user_id).first()
            payment_items.append(PaymentResponse(
                id=payment.id,
                user_id=payment.user_id,
                user_email=user.email if user else None,
                user_name=user.full_name if user else None,
                order_id=payment.order_id,
                amount=payment.amount,
                description=payment.description,
                payment_method=payment.payment_method.value if payment.payment_method else None,
                status=payment.status.value if payment.status else None,
                transaction_id=getattr(payment, 'zp_trans_token', None),
                gateway_order_id=getattr(payment, 'app_trans_id', None),
                gateway_response=getattr(payment, 'callback_data', None),
                created_at=payment.created_at.isoformat() if payment.created_at else None,
                updated_at=payment.updated_at.isoformat() if payment.updated_at else None
            ))
        
        return PaymentListResponse(
            items=payment_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        print(f"[admin-payments] get_payments error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payments"
        )

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy chi tiết thanh toán"""
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        user = db.query(User).filter(User.id == payment.user_id).first()
        
        return PaymentResponse(
            id=payment.id,
            user_id=payment.user_id,
            user_email=user.email if user else None,
            user_name=user.full_name if user else None,
            order_id=payment.order_id,
            amount=payment.amount,
            description=payment.description,
            payment_method=payment.payment_method.value if payment.payment_method else None,
            status=payment.status.value if payment.status else None,
            transaction_id=getattr(payment, 'zp_trans_token', None),
            gateway_order_id=getattr(payment, 'app_trans_id', None),
            gateway_response=getattr(payment, 'callback_data', None),
            created_at=payment.created_at.isoformat() if payment.created_at else None,
            updated_at=payment.updated_at.isoformat() if payment.updated_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[admin-payments] get_payment_detail error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment detail"
        )