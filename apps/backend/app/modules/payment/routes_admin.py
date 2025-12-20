from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, and_, text
from datetime import datetime, date

from .models import Payment, PaymentStatus, PaymentMethod
from ..users.models import User
from ...core.jwt import require_admin

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
        # Trả về dữ liệu mock nếu có lỗi database
        return PaymentStatsResponse(
            total_payments=0,
            total_amount=0,
            completed_payments=0,
            completed_amount=0,
            pending_payments=0,
            failed_payments=0,
            refunded_payments=0,
            today_payments=0,
            today_amount=0
        )

@router.get("", response_model=PaymentListResponse)
def get_payments(
    page: int = Query(1, ge=1, description="Số trang"),
    per_page: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo order_id, email, tên người dùng"),
    status_filter: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    payment_method: Optional[str] = Query(None, description="Lọc theo phương thức thanh toán"),
    date_from: Optional[str] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="Lọc theo ID người dùng"),
    sort_by: str = Query("created_at", description="Sắp xếp theo field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Thứ tự sắp xếp"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy danh sách thanh toán với phân trang và join với bảng users"""
    try:
        # Base query đơn giản
        query = db.query(Payment)
        
        # Tìm kiếm theo order_id và transaction fields
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Payment.order_id.ilike(search_term),
                    Payment.app_trans_id.ilike(search_term),
                    Payment.zp_trans_token.ilike(search_term)
                )
            )
        
        # Lọc theo user_id
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        
        # Lọc theo trạng thái
        if status_filter:
            try:
                status_enum = PaymentStatus(status_filter)
                query = query.filter(Payment.status == status_enum)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Lọc theo phương thức thanh toán
        if payment_method:
            try:
                method_enum = PaymentMethod(payment_method)
                query = query.filter(Payment.payment_method == method_enum)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Lọc theo ngày
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) >= from_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) <= to_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Đếm tổng số
        total = query.count()
        
        # Sắp xếp
        if sort_by == "created_at":
            if sort_order == "desc":
                query = query.order_by(desc(Payment.created_at))
            else:
                query = query.order_by(Payment.created_at)
        elif sort_by == "amount":
            if sort_order == "desc":
                query = query.order_by(desc(Payment.amount))
            else:
                query = query.order_by(Payment.amount)
        elif sort_by == "order_id":
            if sort_order == "desc":
                query = query.order_by(desc(Payment.order_id))
            else:
                query = query.order_by(Payment.order_id)
        else:
            # Default sort
            query = query.order_by(desc(Payment.created_at))
        
        # Phân trang
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # Tính tổng số trang
        total_pages = (total + per_page - 1) // per_page
        
        # Chuyển đổi sang response format với thông tin user
        payment_items = []
        for payment in items:
            # Lấy thông tin user riêng biệt
            user = None
            try:
                user = db.query(User).filter(User.id == payment.user_id).first()
            except Exception as e:
                print(f"Error getting user {payment.user_id}: {e}")
            
            payment_items.append(PaymentResponse(
                id=payment.id,
                user_id=payment.user_id,
                user_email=user.email if user else f"user_{payment.user_id}@unknown.com",
                user_name=user.full_name if user and user.full_name else f"User {payment.user_id}",
                order_id=payment.order_id,
                amount=payment.amount,
                description=payment.description or "",
                payment_method=payment.payment_method.value if payment.payment_method else "unknown",
                status=payment.status.value if payment.status else "unknown",
                transaction_id=payment.zp_trans_token or "",
                gateway_order_id=payment.app_trans_id or "",
                gateway_response=payment.callback_data or "",
                created_at=payment.created_at.isoformat() if payment.created_at else "",
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
        # Trả về dữ liệu mock nếu có lỗi database
        return PaymentListResponse(
            items=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=0
        )

@router.get("/user/{user_id}", response_model=PaymentListResponse)
def get_user_payment_history(
    user_id: int,
    page: int = Query(1, ge=1, description="Số trang"),
    per_page: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    status_filter: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    date_from: Optional[str] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy lịch sử thanh toán của một người dùng cụ thể"""
    try:
        # Kiểm tra user có tồn tại không
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Base query
        query = db.query(Payment).filter(Payment.user_id == user_id)
        
        # Lọc theo trạng thái
        if status_filter:
            try:
                status_enum = PaymentStatus(status_filter)
                query = query.filter(Payment.status == status_enum)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Lọc theo ngày
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) >= from_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) <= to_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Đếm tổng số
        total = query.count()
        
        # Sắp xếp theo ngày tạo mới nhất
        query = query.order_by(desc(Payment.created_at))
        
        # Phân trang
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # Tính tổng số trang
        total_pages = (total + per_page - 1) // per_page
        
        # Chuyển đổi sang response format
        payment_items = []
        for payment in items:
            payment_items.append(PaymentResponse(
                id=payment.id,
                user_id=payment.user_id,
                user_email=user.email,
                user_name=user.full_name if user.full_name else f"User {user.id}",
                order_id=payment.order_id,
                amount=payment.amount,
                description=payment.description or "",
                payment_method=payment.payment_method.value if payment.payment_method else "unknown",
                status=payment.status.value if payment.status else "unknown",
                transaction_id=getattr(payment, 'zp_trans_token', None) or "",
                gateway_order_id=getattr(payment, 'app_trans_id', None) or "",
                gateway_response=getattr(payment, 'callback_data', None) or "",
                created_at=payment.created_at.isoformat() if payment.created_at else "",
                updated_at=payment.updated_at.isoformat() if payment.updated_at else None
            ))
        
        return PaymentListResponse(
            items=payment_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[admin-payments] get_user_payment_history error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user payment history: {str(e)}"
        )

@router.get("/users/search")
def search_users(
    q: str = Query(..., description="Tìm kiếm người dùng theo email hoặc tên"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng kết quả tối đa"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Tìm kiếm người dùng để lọc thanh toán"""
    try:
        search_term = f"%{q}%"
        users = db.query(User).filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        ).limit(limit).all()
        
        return [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            for user in users
        ]
        
    except Exception as e:
        print(f"[admin-payments] search_users error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search users: {str(e)}"
        )

@router.get("/export")
def export_payments(
    format: str = Query("csv", regex="^(csv|json)$", description="Định dạng xuất"),
    status_filter: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    payment_method: Optional[str] = Query(None, description="Lọc theo phương thức thanh toán"),
    date_from: Optional[str] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="Lọc theo ID người dùng"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Xuất dữ liệu thanh toán"""
    try:
        # Base query đơn giản
        query = db.query(Payment)
        
        # Áp dụng các filter
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        
        if status_filter:
            try:
                status_enum = PaymentStatus(status_filter)
                query = query.filter(Payment.status == status_enum)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        if payment_method:
            try:
                method_enum = PaymentMethod(payment_method)
                query = query.filter(Payment.payment_method == method_enum)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) >= from_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                query = query.filter(func.date(Payment.created_at) <= to_date)
            except ValueError:
                # Ignore invalid filter value and continue without this filter
                pass
        
        # Lấy tất cả dữ liệu (giới hạn 10000 để tránh quá tải)
        payments = query.order_by(desc(Payment.created_at)).limit(10000).all()
        
        # Chuẩn bị dữ liệu
        export_data = []
        for payment in payments:
            user = None
            try:
                user = db.query(User).filter(User.id == payment.user_id).first()
            except Exception as e:
                print(f"Error getting user {payment.user_id}: {e}")
                
            export_data.append({
                "id": payment.id,
                "order_id": payment.order_id,
                "user_id": payment.user_id,
                "user_email": user.email if user else "",
                "user_name": user.full_name if user and user.full_name else "",
                "amount": payment.amount,
                "description": payment.description or "",
                "payment_method": payment.payment_method.value if payment.payment_method else "",
                "status": payment.status.value if payment.status else "",
                "transaction_id": payment.zp_trans_token or "",
                "gateway_order_id": payment.app_trans_id or "",
                "created_at": payment.created_at.isoformat() if payment.created_at else "",
                "updated_at": payment.updated_at.isoformat() if payment.updated_at else ""
            })
        
        if format == "json":
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content={
                    "data": export_data,
                    "total": len(export_data),
                    "exported_at": datetime.now().isoformat()
                }
            )
        else:  # CSV
            import csv
            import io
            from fastapi.responses import StreamingResponse
            
            output = io.StringIO()
            if export_data:
                writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
            
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=payments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
            )
        
    except Exception as e:
        print(f"[admin-payments] export_payments error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export payments: {str(e)}"
        )

@router.get("/test")
def test_endpoint():
    """Test endpoint để kiểm tra API hoạt động"""
    return {"message": "Payment admin API is working", "timestamp": datetime.now().isoformat()}

@router.get("/mock-stats", response_model=PaymentStatsResponse)
def get_mock_payment_stats():
    """Mock stats để test frontend"""
    return PaymentStatsResponse(
        total_payments=150,
        total_amount=15000000,
        completed_payments=120,
        completed_amount=12000000,
        pending_payments=20,
        failed_payments=8,
        refunded_payments=2,
        today_payments=5,
        today_amount=500000
    )

@router.get("/mock-payments", response_model=PaymentListResponse)
def get_mock_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Mock payments để test frontend"""
    
    # Tạo dữ liệu mock
    mock_payments = []
    for i in range(1, 26):  # 25 payments
        mock_payments.append(PaymentResponse(
            id=i,
            user_id=i % 5 + 1,
            user_email=f"user{i % 5 + 1}@example.com",
            user_name=f"User {i % 5 + 1}",
            order_id=f"ORDER_{i:03d}",
            amount=100000 + (i * 10000),
            description="Premium subscription",
            payment_method=["zalopay", "vnpay", "momo"][i % 3],
            status=["success", "pending", "failed", "cancelled"][i % 4],
            transaction_id=f"TXN_{i:06d}",
            gateway_order_id=f"GW_{i:06d}",
            gateway_response="{}",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        ))
    
    # Phân trang
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    items = mock_payments[start_idx:end_idx]
    
    total = len(mock_payments)
    total_pages = (total + per_page - 1) // per_page
    
    return PaymentListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )