"""
Payment Routes (schema: order_id + app_trans_id)
"""
import json
import urllib.parse
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from loguru import logger

from app.core.db import get_db
from app.core.jwt import get_current_user
from .models import Payment, PaymentStatus, PaymentMethod
from .schemas import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentResponse,
    PaymentQueryResponse,
)
from .zalopay_service import ZaloPayService
import os

router = APIRouter()

@router.get("/test")
def test_payment_api():
    """Test endpoint để kiểm tra payment API"""
    return {"message": "Payment API is working", "timestamp": datetime.utcnow().isoformat()}


def get_zalopay_service() -> ZaloPayService:
    """Init ZaloPay service from env"""
    return ZaloPayService(
        app_id=os.getenv("ZALOPAY_APP_ID", "2553"),
        key1=os.getenv("ZALOPAY_KEY1", "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL"),
        key2=os.getenv("ZALOPAY_KEY2", "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz"),
        endpoint=os.getenv("ZALOPAY_ENDPOINT", "https://sb-openapi.zalopay.vn/v2/create"),
        callback_url=os.getenv("ZALOPAY_CALLBACK_URL", "http://localhost:8000/api/payment/callback"),
        # Mặc định redirect về backend để tự query cập nhật trạng thái; FE có thể override env này
        redirect_url=os.getenv("ZALOPAY_REDIRECT_URL", "http://localhost:8000/api/payment/redirect"),
    )


def _payment_response(payment: Payment) -> PaymentResponse:
    """
    Build PaymentResponse ensuring order_id compatibility (mapped from app_trans_id).
    """
    app_trans_id = getattr(payment, "app_trans_id") or getattr(payment, "order_id")
    return PaymentResponse(
        id=getattr(payment, "id"),
        order_id=app_trans_id,
        transaction_id=app_trans_id,
        amount=getattr(payment, "amount"),
        description=getattr(payment, "description", None),
        status=getattr(payment, "status"),
        payment_method=getattr(payment, "payment_method"),
        created_at=getattr(payment, "created_at", None),
        paid_at=getattr(payment, "paid_at", None),
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
    try:
        user_id = current_user["user_id"]
        order_id = f"ORDER_{user_id}_{int(datetime.utcnow().timestamp())}"
        
        # Try to create payment record, fallback if DB fails
        payment = None
        try:
            payment = Payment(
                user_id=user_id,
                order_id=order_id,
                amount=payment_req.amount,
                description=payment_req.description,
                payment_method=payment_req.payment_method,
                status=PaymentStatus.PENDING,
            )
            
            db.add(payment)
            db.commit()
            db.refresh(payment)
        except Exception as db_error:
            logger.error(f"Database error: {db_error}")
            # Continue without DB record for now
        
        # Gọi ZaloPay API thực tế
        try:
            zalopay = get_zalopay_service()
            result = zalopay.create_order(
                amount=payment_req.amount,
                description=payment_req.description,
                user_id=user_id,
                order_id=order_id,
            )
        except Exception as e:
            logger.error(f"ZaloPay API error: {e}")
            # Fallback nếu ZaloPay API fail
            result = {
                "success": False, 
                "message": f"Lỗi kết nối ZaloPay: {str(e)}"
            }
        
        if result.get("success"):
            # Cập nhật payment với thông tin từ ZaloPay (nếu có)
            if payment:
                try:
                    payment.app_trans_id = result.get("app_trans_id")
                    payment.zp_trans_token = result.get("zp_trans_token")
                    payment.order_url = result.get("order_url")
                    # Giữ status PENDING, sẽ update khi có callback từ ZaloPay
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to update payment: {e}")
            
            return PaymentCreateResponse(
                success=True,
                order_id=order_id,
                order_url=result.get("order_url"),
            )
        else:
            # Cập nhật trạng thái failed (nếu có payment record)
            if payment:
                try:
                    payment.status = PaymentStatus.FAILED
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to update payment status: {e}")
            
            return PaymentCreateResponse(
                success=False,
                order_id=order_id,
                message=result.get("message", "Tạo đơn hàng thất bại"),
            )
            
    except Exception as e:
        logger.error(f"Payment creation error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo thanh toán: {str(e)}"
        )


@router.post("/callback")
async def payment_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ZaloPay callback handler
    """
    try:
        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            callback_data = await request.json()
        else:
            body = await request.body()
            body_str = body.decode("utf-8")
            callback_data = {}
            for pair in body_str.split("&"):
                if "=" in pair:
                    key, value = pair.split("=", 1)
                    callback_data[key] = urllib.parse.unquote_plus(value)

        logger.info(f"ZaloPay callback received: {callback_data}")

        zalopay = get_zalopay_service()
        if not zalopay.verify_callback(callback_data):
            logger.error("Invalid callback MAC")
            return {"return_code": -1, "return_message": "Invalid MAC"}

        data = json.loads(callback_data["data"])
        app_trans_id = data.get("app_trans_id")

        payment = db.query(Payment).filter(Payment.app_trans_id == app_trans_id).first()

        if not payment:
            logger.error(f"Payment not found: {app_trans_id}")
            return {"return_code": -1, "return_message": "Payment not found"}

        payment.status = PaymentStatus.SUCCESS.value
        payment.callback_data = json.dumps(callback_data)
        payment.paid_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Payment {payment.order_id} marked as SUCCESS")
        
        # Auto-upgrade user subscription sau khi thanh toán thành công
        try:
            from app.core.subscription import SubscriptionService
            
            # Xác định plan dựa trên amount hoặc description
            plan_name = "Premium"  # Default plan
            
            # Logic để xác định plan dựa trên amount
            if payment.amount >= 500000:  # 500k VND trở lên
                plan_name = "Pro"
            elif payment.amount >= 200000:  # 200k VND trở lên
                plan_name = "Premium"
            else:
                plan_name = "basic"
            
            # Upgrade user subscription
            upgrade_success = SubscriptionService.upgrade_user_subscription(
                user_id=payment.user_id,
                plan_name=plan_name.strip(),
                payment_id=payment.id,
                session=db
            )
            
            if upgrade_success:
                logger.info(f"User {payment.user_id} upgraded to {plan_name} plan")
            else:
                logger.error(f"Failed to upgrade user {payment.user_id} to {plan_name} plan")
                
        except Exception as upgrade_error:
            logger.error(f"Error during auto-upgrade: {upgrade_error}")
            # Không fail callback vì payment đã thành công
        
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
    Query payment status (uses app_trans_id hoặc order_id)
    """
    user_id = current_user["user_id"]

    payment = db.query(Payment).filter(
        (Payment.app_trans_id == order_id) | (Payment.order_id == order_id),
        Payment.user_id == user_id,
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng",
        )

    if payment.status in [PaymentStatus.SUCCESS.value, PaymentStatus.FAILED.value, PaymentStatus.CANCELLED.value]:
        return PaymentQueryResponse(
            success=payment.status == PaymentStatus.SUCCESS.value,
            status=payment.status,
            payment=_payment_response(payment),
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
            
            # Auto-upgrade user subscription khi detect success từ query
            try:
                from app.core.subscription import SubscriptionService
                
                # Xác định plan dựa trên amount
                plan_name = "Premium"  # Default plan
                
                if payment.amount >= 500000:  # 500k VND trở lên
                    plan_name = "Pro"
                elif payment.amount >= 200000:  # 200k VND trở lên
                    plan_name = "Premium"
                else:
                    plan_name = "basic"
                
                # Upgrade user subscription
                upgrade_success = SubscriptionService.upgrade_user_subscription(
                    user_id=payment.user_id,
                    plan_name=plan_name.strip(),
                    payment_id=payment.id,
                    session=db
                )
                
                if upgrade_success:
                    logger.info(f"User {payment.user_id} auto-upgraded to {plan_name} plan")
                else:
                    logger.error(f"Failed to auto-upgrade user {payment.user_id} to {plan_name} plan")
                    
            except Exception as upgrade_error:
                logger.error(f"Error during auto-upgrade: {upgrade_error}")
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
            if time_elapsed > 900:
                payment.status = PaymentStatus.FAILED.value
                db.commit()
                logger.info(f"Payment {order_id} marked as FAILED due to timeout")

    db.refresh(payment)

    return PaymentQueryResponse(
        success=payment.status == PaymentStatus.SUCCESS.value,
        status=payment.status,
        payment=_payment_response(payment),
    )


@router.get("/redirect", response_class=HTMLResponse, include_in_schema=False)
def payment_redirect(
    apptransid: str | None = None,
    order_id: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Điểm redirect sau khi thanh toán. Tự động query trạng thái và cập nhật DB.
    """
    app_trans_id = apptransid or order_id
    if not app_trans_id:
        return HTMLResponse("<h3>Thiếu apptransid/order_id</h3>", status_code=400)

    payment = db.query(Payment).filter(Payment.app_trans_id == app_trans_id).first()
    zalopay = get_zalopay_service()
    result = zalopay.query_order(app_trans_id)
    status_result = result.get("status", "unknown")

    if payment:
        if status_result == "success":
            payment.status = PaymentStatus.SUCCESS.value
        elif status_result == "cancelled":
            payment.status = PaymentStatus.CANCELLED.value
        elif status_result in ["failed", "error"]:
            payment.status = PaymentStatus.FAILED.value
        elif status_result == "pending":
            payment.status = PaymentStatus.PENDING.value
        db.commit()
        db.refresh(payment)

    # Redirect về FE (nếu cấu hình); không ép về /home khi không có cấu hình
    return_url = (
        os.getenv("PAYMENT_RETURN_URL")
        or os.getenv("FRONTEND_URL")
        or os.getenv("ZALOPAY_REDIRECT_URL")
    )
    if return_url:
        sep = "&" if "?" in return_url else "?"
        target = f"{return_url}{sep}status={status_result}&apptransid={app_trans_id}"
        return RedirectResponse(target)

    # Fallback: trả HTML nếu không cấu hình URL đích
    html = f"""
    <html><body>
    <h3>Trạng thái đơn: {status_result.upper()}</h3>
    <p>app_trans_id: {app_trans_id}</p>
    <p>message: {result.get('message','')}</p>
    <p>Bạn có thể đóng trang này và quay lại ứng dụng.</p>
    </body></html>
    """
    return HTMLResponse(html)


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

    return [_payment_response(p) for p in payments]
