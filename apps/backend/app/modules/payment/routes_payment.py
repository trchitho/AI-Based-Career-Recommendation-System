from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ...core.db import engine
from ...core.jwt import require_user
from .schemas import (
    CreatePaymentRequest,
    PaymentResponse,
    SubscriptionPlanResponse,
    UserPermissionsResponse,
)
from .service import MomoService, PaymentService, VNPayService

router = APIRouter(tags=["payment"])


def get_db():
    with Session(engine) as session:
        yield session


@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def get_subscription_plans(db: Session = Depends(get_db)):
    """Lấy danh sách các gói dịch vụ"""
    service = PaymentService(db)
    plans = service.get_all_plans()
    return plans


@router.get("/permissions", response_model=UserPermissionsResponse)
def get_user_permissions(
    request: Request,
    db: Session = Depends(get_db)
):
    """Lấy quyền của user hiện tại"""
    user_id = require_user(request)
    service = PaymentService(db)
    permissions = service.get_user_permissions(user_id)
    return permissions


@router.get("/subscription")
def get_user_subscription(
    request: Request,
    db: Session = Depends(get_db)
):
    """Lấy thông tin subscription của user"""
    user_id = require_user(request)
    service = PaymentService(db)
    subscription = service.get_user_active_subscription(user_id)
    
    if not subscription:
        return {"message": "No active subscription"}
    
    days_remaining = (subscription.end_date - datetime.now()).days
    
    return {
        "id": subscription.id,
        "plan_id": subscription.plan_id,
        "status": subscription.status,
        "start_date": subscription.start_date,
        "end_date": subscription.end_date,
        "days_remaining": days_remaining
    }


@router.post("/create", response_model=PaymentResponse)
def create_payment(
    payment_request: CreatePaymentRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Tạo payment và trả về URL thanh toán"""
    user_id = require_user(request)
    service = PaymentService(db)
    
    # Lấy thông tin plan
    plan = service.get_plan_by_id(payment_request.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Tạo payment record
    payment = service.create_payment(
        user_id=user_id,
        plan_id=payment_request.plan_id,
        payment_method=payment_request.payment_method
    )
    
    # Tạo URL thanh toán
    order_desc = f"Thanh toan goi {plan.name_vi}"
    
    try:
        if payment_request.payment_method == 'vnpay':
            vnpay = VNPayService()
            payment_url = vnpay.create_payment_url(
                payment_id=payment.id,
                amount=float(plan.price),
                order_desc=order_desc,
                return_url=payment_request.return_url
            )
        elif payment_request.payment_method == 'momo':
            momo = MomoService()
            payment_url = momo.create_payment_url(
                payment_id=payment.id,
                amount=float(plan.price),
                order_desc=order_desc,
                return_url=payment_request.return_url
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid payment method")
        
        return {
            "payment_id": payment.id,
            "payment_url": payment_url,
            "transaction_id": str(payment.id)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback/vnpay")
def vnpay_callback(
    request: Request,
    vnp_TxnRef: str,
    vnp_ResponseCode: str,
    vnp_TransactionNo: str = None,
    db: Session = Depends(get_db)
):
    """Callback từ VNPay sau khi thanh toán"""
    # Verify signature
    vnpay = VNPayService()
    params = dict(request.query_params)
    
    if not vnpay.verify_payment(params):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    service = PaymentService(db)
    
    # Cập nhật trạng thái payment
    status = 'completed' if vnp_ResponseCode == '00' else 'failed'
    
    payment = service.update_payment_status(
        payment_id=int(vnp_TxnRef),
        status=status,
        transaction_id=vnp_TransactionNo or vnp_TxnRef,
        gateway_response={'response_code': vnp_ResponseCode}
    )
    
    # Nếu thanh toán thành công, kích hoạt subscription
    if status == 'completed':
        service.activate_subscription(payment.id)
    
    return {
        "status": status,
        "message": "Payment processed successfully" if status == 'completed' else "Payment failed"
    }


@router.post("/callback/momo")
def momo_callback(
    orderId: str,
    resultCode: int,
    transId: str = None,
    db: Session = Depends(get_db)
):
    """Callback từ Momo sau khi thanh toán"""
    service = PaymentService(db)
    
    # Extract payment_id từ orderId (format: ORDER_{payment_id})
    payment_id = int(orderId.split('_')[1])
    
    # Cập nhật trạng thái payment
    status = 'completed' if resultCode == 0 else 'failed'
    
    payment = service.update_payment_status(
        payment_id=payment_id,
        status=status,
        transaction_id=transId or orderId,
        gateway_response={'result_code': resultCode}
    )
    
    # Nếu thanh toán thành công, kích hoạt subscription
    if status == 'completed':
        service.activate_subscription(payment.id)
    
    return {
        "status": status,
        "message": "Payment processed successfully" if status == 'completed' else "Payment failed"
    }


@router.post("/check-test-quota")
def check_test_quota(
    request: Request,
    db: Session = Depends(get_db)
):
    """Kiểm tra xem user có thể làm test không"""
    user_id = require_user(request)
    service = PaymentService(db)
    permissions = service.get_user_permissions(user_id)
    
    if not permissions["can_take_test"]:
        raise HTTPException(
            status_code=403, 
            detail="You have reached your free test limit. Please upgrade to continue."
        )
    
    return {"can_take_test": True, "permissions": permissions}


@router.post("/increment-test-count")
def increment_test_count(
    request: Request,
    db: Session = Depends(get_db)
):
    """Tăng số lần làm test (gọi sau khi user hoàn thành test)"""
    user_id = require_user(request)
    service = PaymentService(db)
    
    # Chỉ tăng nếu user không có subscription
    subscription = service.get_user_active_subscription(user_id)
    if not subscription:
        service.increment_test_count(user_id)
    
    return {"message": "Test count updated"}


@router.get("/debug/vnpay-url")
def debug_vnpay_url(plan_id: int = 1):
    """Debug endpoint để xem VNPay URL được tạo như thế nào"""
    from ...core.config import settings
    
    vnpay = VNPayService()
    
    # Tạo test URL
    test_url = vnpay.create_payment_url(
        payment_id=999,
        amount=99000,
        order_desc="Test payment",
        return_url=None  # Sẽ dùng từ config
    )
    
    return {
        "vnpay_url": test_url,
        "config": {
            "tmn_code": settings.VNPAY_TMN_CODE,
            "hash_secret": settings.VNPAY_HASH_SECRET[:10] + "...",
            "vnpay_url": settings.VNPAY_URL,
            "return_url": settings.VNPAY_RETURN_URL
        }
    }
