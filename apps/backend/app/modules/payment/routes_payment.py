"""
Payment Routes
"""
import json
import urllib.parse
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from sqlalchemy.orm import Session
from loguru import logger

from app.core.db import get_db
from app.core.jwt import get_current_user
from .models import Payment, PaymentStatus
from .schemas import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentResponse,
    PaymentQueryResponse,
)
from .zalopay_service import ZaloPayService
import os

router = APIRouter()


def get_zalopay_service() -> ZaloPayService:
    """Khởi tạo ZaloPay service từ env"""
    return ZaloPayService(
        app_id=os.getenv("ZALOPAY_APP_ID", "2553"),
        key1=os.getenv("ZALOPAY_KEY1", "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL"),
        key2=os.getenv("ZALOPAY_KEY2", "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz"),
        endpoint=os.getenv("ZALOPAY_ENDPOINT", "https://sb-openapi.zalopay.vn/v2/create"),
        callback_url=os.getenv("ZALOPAY_CALLBACK_URL", "http://localhost:8000/api/payment/callback"),
        redirect_url=os.getenv("ZALOPAY_REDIRECT_URL", "http://localhost:5173/payment"),
    )


@router.post("/create", response_model=PaymentCreateResponse)
def create_payment(
    payment_req: PaymentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Tạo đơn thanh toán mới
    """
    user_id = current_user["user_id"]
    
    # Tạo payment record
    payment = Payment(
        user_id=user_id,
        order_id=f"ORDER_{user_id}_{int(datetime.utcnow().timestamp())}",
        amount=payment_req.amount,
        description=payment_req.description,
        payment_method=payment_req.payment_method,
        status=PaymentStatus.PENDING,
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    # Gọi ZaloPay API
    zalopay = get_zalopay_service()
    result = zalopay.create_order(
        amount=payment_req.amount,
        description=payment_req.description,
        user_id=user_id,
        order_id=payment.order_id,
    )
    
    if result.get("success"):
        # Cập nhật payment với thông tin từ ZaloPay
        payment.app_trans_id = result.get("app_trans_id")
        payment.zp_trans_token = result.get("zp_trans_token")
        payment.order_url = result.get("order_url")
        db.commit()
        
        return PaymentCreateResponse(
            success=True,
            order_id=payment.order_id,
            order_url=result.get("order_url"),
        )
    else:
        # Cập nhật trạng thái failed
        payment.status = PaymentStatus.FAILED
        db.commit()
        
        return PaymentCreateResponse(
            success=False,
            order_id=payment.order_id,
            message=result.get("message", "Tạo đơn hàng thất bại"),
        )


@router.post("/callback")
async def payment_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Callback từ ZaloPay sau khi thanh toán
    """
    try:
        # Lấy dữ liệu từ body (JSON hoặc form-urlencoded)
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            callback_data = await request.json()
        else:
            # Parse form data manually để tránh dùng cgi module
            body = await request.body()
            body_str = body.decode("utf-8")
            
            # Parse simple form data
            callback_data = {}
            for pair in body_str.split("&"):
                if "=" in pair:
                    key, value = pair.split("=", 1)
                    # URL decode
                    import urllib.parse
                    callback_data[key] = urllib.parse.unquote_plus(value)
        
        logger.info(f"ZaloPay callback received: {callback_data}")
        
        # Verify callback
        zalopay = get_zalopay_service()
        if not zalopay.verify_callback(callback_data):
            logger.error("Invalid callback MAC")
            return {"return_code": -1, "return_message": "Invalid MAC"}
        
        # Parse data
        data = json.loads(callback_data["data"])
        app_trans_id = data.get("app_trans_id")
        
        # Tìm payment
        payment = db.query(Payment).filter(
            Payment.app_trans_id == app_trans_id
        ).first()
        
        if not payment:
            logger.error(f"Payment not found: {app_trans_id}")
            return {"return_code": -1, "return_message": "Payment not found"}
        
        # Cập nhật trạng thái
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = datetime.utcnow()
        payment.callback_data = json.dumps(callback_data)
        db.commit()
        
        logger.info(f"Payment {payment.order_id} marked as SUCCESS")
        
        return {"return_code": 1, "return_message": "success"}
        
    except Exception as e:
        logger.error(f"Callback error: {e}")
        return {"return_code": 0, "return_message": str(e)}


@router.get("/query/{order_id}", response_model=PaymentQueryResponse)
def query_payment(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Truy vấn trạng thái thanh toán - Tự động cập nhật từ ZaloPay
    """
    user_id = current_user["user_id"]
    
    # Tìm payment
    payment = db.query(Payment).filter(
        Payment.order_id == order_id,
        Payment.user_id == user_id,
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng",
        )
    
    # Nếu đã có kết quả cuối cùng thì return luôn (không query lại)
    if payment.status in [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED]:
        return PaymentQueryResponse(
            success=payment.status == PaymentStatus.SUCCESS,
            status=payment.status,
            payment=PaymentResponse.from_orm(payment),
        )
    
    # Query từ ZaloPay nếu còn pending
    if payment.app_trans_id:
        zalopay = get_zalopay_service()
        result = zalopay.query_order(payment.app_trans_id)
        
        logger.info(f"Query result for {order_id}: {result}")
        
        # Cập nhật trạng thái dựa trên kết quả từ ZaloPay
        result_status = result.get("status")
        
        if result_status == "success":
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = datetime.utcnow()
            db.commit()
            logger.info(f"Payment {order_id} updated to SUCCESS")
        elif result_status == "cancelled":
            # Đơn hàng bị hủy
            payment.status = PaymentStatus.CANCELLED
            db.commit()
            logger.info(f"Payment {order_id} updated to CANCELLED")
        elif result_status in ["failed", "error"]:
            # Thanh toán thất bại
            payment.status = PaymentStatus.FAILED
            db.commit()
            logger.info(f"Payment {order_id} updated to FAILED (reason: {result_status})")
        elif result_status == "pending":
            # Kiểm tra timeout: nếu đơn hàng quá 15 phút vẫn pending → failed
            from datetime import timezone
            now = datetime.now(timezone.utc)
            created = payment.created_at
            
            # Ensure both datetimes are timezone-aware
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            
            time_elapsed = (now - created).total_seconds()
            if time_elapsed > 900:  # 15 phút = 900 giây
                payment.status = PaymentStatus.FAILED
                db.commit()
                logger.info(f"Payment {order_id} marked as FAILED due to timeout")
    
    db.refresh(payment)
    
    return PaymentQueryResponse(
        success=payment.status == PaymentStatus.SUCCESS,
        status=payment.status,
        payment=PaymentResponse.from_orm(payment),
    )


@router.get("/history", response_model=List[PaymentResponse])
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """
    Lấy lịch sử thanh toán của user
    """
    user_id = current_user["user_id"]
    
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return [PaymentResponse.from_orm(p) for p in payments]
