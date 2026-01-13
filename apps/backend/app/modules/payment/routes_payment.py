"""
Payment Routes (schema: order_id + app_trans_id)
"""
import json
import urllib.parse
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import text
from loguru import logger

from app.core.db import get_db, engine
from app.core.jwt import get_current_user
from .models import Payment, PaymentStatus, PaymentMethod
from .schemas import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentResponse,
    PaymentQueryResponse,
)
from .zalopay_service import ZaloPayService
from .vnpay_service import VNPayService
import os

router = APIRouter()

# Session factory for audit logs
_AuditSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _log_audit(
    session: Session,
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
):
    """Ghi audit log vào database - dùng session riêng"""
    try:
        new_session = _AuditSessionLocal()
        try:
            details_json = json.dumps(details) if details else None
            entity_id_val = None
            if resource_id:
                try:
                    entity_id_val = int(resource_id)
                except (ValueError, TypeError):
                    entity_id_val = None
            
            new_session.execute(text("""
                INSERT INTO core.audit_logs 
                (actor_id, action, entity, entity_id, data_json, user_id, resource_type, resource_id, details, ip_address, created_at)
                VALUES 
                (:actor_id, :action, :entity, :entity_id, CAST(:data_json AS jsonb), :user_id, :resource_type, :resource_id, CAST(:details AS jsonb), :ip_address, NOW())
            """), {
                "actor_id": user_id,
                "action": action,
                "entity": resource_type,
                "entity_id": entity_id_val,
                "data_json": details_json,
                "user_id": user_id,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details_json,
                "ip_address": ip_address,
            })
            new_session.commit()
            logger.info(f"Audit log saved: user={user_id}, action={action}")
        finally:
            new_session.close()
    except Exception as e:
        logger.error(f"Failed to log audit: {e}")


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
        redirect_url=os.getenv("ZALOPAY_REDIRECT_URL", "http://localhost:8000/api/payment/redirect"),
    )


def get_vnpay_service() -> VNPayService:
    """Init VNPay service from env"""
    return VNPayService(
        tmn_code=os.getenv("VNPAY_TMN_CODE", "CGXZLS0Z"),
        hash_secret=os.getenv("VNPAY_HASH_SECRET", "XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN"),
        payment_url=os.getenv("VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
        return_url=os.getenv("VNPAY_RETURN_URL", "http://localhost:8000/api/payment/vnpay/return"),
        api_url=os.getenv("VNPAY_API_URL", "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"),
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
    Tạo đơn thanh toán mới - hỗ trợ ZaloPay, VNPay, MoMo
    """
    try:
        user_id = current_user["user_id"]
        order_id = f"ORDER_{user_id}_{int(datetime.utcnow().timestamp())}"
        payment_method = payment_req.payment_method or "vnpay"
        
        # Get client IP
        client_ip = request.client.host if request.client else "127.0.0.1"
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        
        # Create payment record
        payment = None
        try:
            payment = Payment(
                user_id=user_id,
                order_id=order_id,
                amount=payment_req.amount,
                description=payment_req.description,
                payment_method=payment_method,
                status=PaymentStatus.PENDING,
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)
        except Exception as db_error:
            logger.error(f"Database error: {db_error}")
        
        result = {"success": False, "message": "Unknown payment method"}
        
        # Route to appropriate payment provider
        if payment_method == "vnpay":
            # VNPay - thẻ Visa/Mastercard/ATM
            vnpay = get_vnpay_service()
            result = vnpay.create_payment_url(
                amount=payment_req.amount,
                order_id=order_id,
                order_info=payment_req.description or f"Thanh toan don hang {order_id}",
                ip_addr=client_ip,
            )
            if result.get("success"):
                result["order_url"] = result.get("payment_url")
                
        elif payment_method == "zalopay":
            # ZaloPay
            zalopay = get_zalopay_service()
            result = zalopay.create_order(
                amount=payment_req.amount,
                description=payment_req.description,
                user_id=user_id,
                order_id=order_id,
            )
            
        elif payment_method == "momo":
            # MoMo - placeholder (cần đăng ký merchant)
            result = {
                "success": False,
                "message": "MoMo chưa được tích hợp. Vui lòng chọn VNPay hoặc ZaloPay.",
            }
        
        if result.get("success"):
            # Update payment record
            if payment:
                try:
                    payment.app_trans_id = result.get("app_trans_id") or order_id
                    payment.order_url = result.get("order_url")
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to update payment: {e}")
            
            # Audit log
            _log_audit(
                session=db,
                user_id=user_id,
                action="payment_create",
                resource_type="payment",
                resource_id=order_id,
                details={"amount": payment_req.amount, "method": payment_method},
                ip_address=client_ip,
            )
            
            return PaymentCreateResponse(
                success=True,
                order_id=order_id,
                order_url=result.get("order_url"),
            )
        else:
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


@router.get("/vnpay/return")
def vnpay_return(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    VNPay return URL handler - xử lý khi user thanh toán xong hoặc hủy
    """
    try:
        params = dict(request.query_params)
        logger.info(f"VNPay return params: {params}")
        
        # Frontend chạy trên port 3000
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        order_id = params.get("vnp_TxnRef", "")
        response_code = params.get("vnp_ResponseCode", "")
        
        # Xử lý trường hợp hủy giao dịch (code 24)
        if response_code == "24":
            logger.info(f"Payment {order_id} cancelled by user")
            # Update payment status
            payment = db.query(Payment).filter(Payment.order_id == order_id).first()
            if payment:
                payment.status = PaymentStatus.CANCELLED.value
                db.commit()
            # Redirect về trang pricing
            return RedirectResponse(url=f"{frontend_url}/pricing?status=cancelled&order_id={order_id}")
        
        vnpay = get_vnpay_service()
        result = vnpay.verify_return(params.copy())
        
        # Find payment record
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        
        if payment:
            if result.get("success") and result.get("status") == "success":
                payment.status = PaymentStatus.SUCCESS.value
                payment.paid_at = datetime.utcnow()
                payment.transaction_id = params.get("vnp_TransactionNo")
                db.commit()
                
                logger.info(f"Payment {order_id} marked as SUCCESS via VNPay")
                
                # Auto-upgrade subscription
                try:
                    from app.core.subscription import SubscriptionService
                    
                    plan_name = "Basic"
                    if payment.amount >= 280000:
                        plan_name = "Pro"
                    elif payment.amount >= 180000:
                        plan_name = "Premium"
                    elif payment.amount >= 80000:
                        plan_name = "Basic"
                    
                    SubscriptionService.upgrade_user_subscription(
                        user_id=payment.user_id,
                        plan_name=plan_name,
                        payment_id=payment.id,
                        session=db
                    )
                    logger.info(f"User {payment.user_id} upgraded to {plan_name}")
                except Exception as e:
                    logger.error(f"Auto-upgrade error: {e}")
                    
                # Redirect về trang thành công
                return RedirectResponse(url=f"{frontend_url}/payment/return?status=success&order_id={order_id}")
            else:
                payment.status = PaymentStatus.FAILED.value
                db.commit()
                logger.info(f"Payment {order_id} marked as FAILED: {result.get('message', '')}")
                # Redirect về trang pricing với thông báo lỗi
                return RedirectResponse(url=f"{frontend_url}/pricing?status=failed&order_id={order_id}")
        
        # Fallback redirect
        return RedirectResponse(url=f"{frontend_url}/pricing?status=error")
        
    except Exception as e:
        logger.error(f"VNPay return error: {e}")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/pricing?status=error")


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
        
        # Ghi audit log cho payment success
        _log_audit(
            session=db,
            user_id=payment.user_id,
            action="payment_success",
            resource_type="payment",
            resource_id=payment.order_id,
            details={"amount": payment.amount, "app_trans_id": app_trans_id},
            ip_address=None,
        )
        
        # Auto-upgrade user subscription sau khi thanh toán thành công
        try:
            from app.core.subscription import SubscriptionService
            
            # Xác định plan dựa trên amount hoặc description
            plan_name = "Premium"  # Default plan
            
            # Logic để xác định plan dựa trên amount
            # Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
            if payment.amount >= 280000:  # 280k VND trở lên = Pro
                plan_name = "Pro"
            elif payment.amount >= 180000:  # 180k VND trở lên = Premium
                plan_name = "Premium"
            elif payment.amount >= 80000:  # 80k VND trở lên = Basic
                plan_name = "Basic"
            else:
                plan_name = "Basic"  # Default to Basic for any paid plan
            
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


@router.post("/force-check/{order_id}")
def force_check_payment(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Force check payment status from ZaloPay (for cases where callback fails)
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

    # Only force check if payment is still pending
    if payment.status != PaymentStatus.PENDING.value:
        return {"message": "Payment already processed", "status": payment.status}
    
    # Query từ ZaloPay
    if payment.app_trans_id:
        zalopay = get_zalopay_service()
        result = zalopay.query_order(payment.app_trans_id)
        
        logger.info(f"Force check result for {order_id}: {result}")
        
        # Cập nhật trạng thái dựa trên kết quả từ ZaloPay
        result_status = result.get("status")
        
        if result_status == 1:  # Success
            payment.status = PaymentStatus.SUCCESS.value
            payment.paid_at = datetime.utcnow()
            
            # Auto-upgrade user subscription
            try:
                from app.core.subscription import SubscriptionService
                
                # Determine plan based on amount
                # Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
                plan_name = "Premium"  # Default plan
                
                if payment.amount >= 280000:  # 280k VND = Pro
                    plan_name = "Pro"
                elif payment.amount >= 180000:  # 180k VND = Premium
                    plan_name = "Premium"
                elif payment.amount >= 80000:  # 80k VND = Basic
                    plan_name = "Basic"
                else:
                    plan_name = "Basic"
                
                # Upgrade user subscription
                upgrade_success = SubscriptionService.upgrade_user_subscription(
                    user_id=payment.user_id,
                    plan_name=plan_name.strip(),
                    payment_id=payment.id,
                    session=db
                )
                
                if upgrade_success:
                    logger.info(f"User {payment.user_id} upgraded to {plan_name} plan via force check")
                else:
                    logger.error(f"Failed to upgrade user {payment.user_id} to {plan_name} plan via force check")
                    
            except Exception as upgrade_error:
                logger.error(f"Error during auto-upgrade in force check: {upgrade_error}")
            
            db.commit()
            logger.info(f"Payment {payment.order_id} marked as SUCCESS via force check")
            
        elif result_status == 2:  # Failed
            payment.status = PaymentStatus.FAILED.value
            db.commit()
            logger.info(f"Payment {payment.order_id} marked as FAILED via force check")
        elif result_status == 3:  # Cancelled  
            payment.status = PaymentStatus.CANCELLED.value
            db.commit()
            logger.info(f"Payment {payment.order_id} marked as CANCELLED via force check")
        else:
            # If still pending after force check, check for timeout
            from datetime import timezone
            now = datetime.now(timezone.utc)
            created = payment.created_at
            
            # Ensure both datetimes are timezone-aware
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            
            time_elapsed = (now - created).total_seconds()
            if time_elapsed > 900:  # 15 minutes timeout
                payment.status = PaymentStatus.FAILED.value
                db.commit()
                logger.info(f"Payment {payment.order_id} marked as FAILED due to timeout after force check")
        
        # Return updated status
        return {
            "message": "Status updated", 
            "status": payment.status,
            "zalopay_result": result
        }
    
    return {"message": "No app_trans_id to query", "status": payment.status}


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
                # Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
                plan_name = "Basic"  # Default plan
                
                if payment.amount >= 280000:  # 280k VND trở lên = Pro
                    plan_name = "Pro"
                elif payment.amount >= 180000:  # 180k VND trở lên = Premium
                    plan_name = "Premium"
                elif payment.amount >= 80000:  # 80k VND trở lên = Basic
                    plan_name = "Basic"
                else:
                    plan_name = "Basic"  # Default to Basic for any paid plan
                
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
            if time_elapsed > 900:  # 15 minutes
                payment.status = PaymentStatus.FAILED.value
                db.commit()
                logger.info(f"Payment {order_id} marked as FAILED due to timeout")
        else:
            # Unknown status, check timeout anyway
            from datetime import timezone
            now = datetime.now(timezone.utc)
            created = payment.created_at
            
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            
            time_elapsed = (now - created).total_seconds()
            if time_elapsed > 900:  # 15 minutes
                payment.status = PaymentStatus.FAILED.value
                db.commit()
                logger.info(f"Payment {order_id} marked as FAILED due to timeout (unknown status: {result_status})")

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
    ZaloPay redirect handler - xử lý khi user thanh toán xong hoặc hủy
    """
    # Frontend chạy trên port 3000
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    app_trans_id = apptransid or order_id
    if not app_trans_id:
        return RedirectResponse(url=f"{frontend_url}/pricing?status=error&message=missing_order_id")

    # Query trạng thái từ ZaloPay
    zalopay = get_zalopay_service()
    result = zalopay.query_order(app_trans_id)
    status_result = result.get("status", "unknown")
    
    logger.info(f"ZaloPay redirect - order: {app_trans_id}, status: {status_result}")

    # Tìm payment record
    payment = db.query(Payment).filter(
        (Payment.app_trans_id == app_trans_id) | (Payment.order_id == order_id)
    ).first()

    if payment:
        if status_result == "success":
            payment.status = PaymentStatus.SUCCESS.value
            payment.paid_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Payment {app_trans_id} marked as SUCCESS via ZaloPay redirect")
            
            # Auto-upgrade subscription
            try:
                from app.core.subscription import SubscriptionService
                
                plan_name = "Basic"
                if payment.amount >= 280000:
                    plan_name = "Pro"
                elif payment.amount >= 180000:
                    plan_name = "Premium"
                elif payment.amount >= 80000:
                    plan_name = "Basic"
                
                SubscriptionService.upgrade_user_subscription(
                    user_id=payment.user_id,
                    plan_name=plan_name,
                    payment_id=payment.id,
                    session=db
                )
                logger.info(f"User {payment.user_id} upgraded to {plan_name} via ZaloPay")
            except Exception as e:
                logger.error(f"Auto-upgrade error: {e}")
            
            # Redirect về trang thành công
            return RedirectResponse(url=f"{frontend_url}/payment/return?status=success&order_id={app_trans_id}")
            
        elif status_result == "cancelled":
            payment.status = PaymentStatus.CANCELLED.value
            db.commit()
            logger.info(f"Payment {app_trans_id} cancelled via ZaloPay")
            # Redirect về trang pricing
            return RedirectResponse(url=f"{frontend_url}/pricing?status=cancelled")
            
        elif status_result in ["failed", "error"]:
            payment.status = PaymentStatus.FAILED.value
            db.commit()
            logger.info(f"Payment {app_trans_id} failed via ZaloPay")
            return RedirectResponse(url=f"{frontend_url}/pricing?status=failed")
            
        elif status_result == "pending":
            # Vẫn đang pending - redirect về trang chờ
            return RedirectResponse(url=f"{frontend_url}/payment/return?status=pending&order_id={app_trans_id}")
        
        db.commit()

    # Fallback redirect
    return RedirectResponse(url=f"{frontend_url}/pricing?status={status_result}&order_id={app_trans_id}")


@router.get("/history", response_model=List[PaymentResponse])
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """
    Lấy lịch sử thanh toán của user
    Auto-sync: Nếu có payment SUCCESS nhưng chưa có subscription, tự động upgrade
    """
    user_id = current_user["user_id"]
    
    # Auto-sync: Check if user has SUCCESS payment but no active paid subscription
    try:
        from app.core.subscription import SubscriptionService
        
        # Get current subscription
        current_sub = SubscriptionService.get_user_subscription(user_id, db)
        
        # If user is on Free plan, check for SUCCESS payments
        if current_sub.get("plan_name") == "Free":
            # Find latest SUCCESS payment (case-insensitive)
            from sqlalchemy import func
            success_payment = (
                db.query(Payment)
                .filter(
                    Payment.user_id == user_id,
                    func.upper(Payment.status) == "SUCCESS"
                )
                .order_by(Payment.created_at.desc())
                .first()
            )
            
            if success_payment:
                # Determine plan based on amount
                # Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
                plan_name = "Basic"
                if success_payment.amount >= 280000:
                    plan_name = "Pro"
                elif success_payment.amount >= 180000:
                    plan_name = "Premium"
                elif success_payment.amount >= 80000:
                    plan_name = "Basic"
                
                # Auto-upgrade
                upgrade_success = SubscriptionService.upgrade_user_subscription(
                    user_id=user_id,
                    plan_name=plan_name,
                    payment_id=success_payment.id,
                    session=db
                )
                
                if upgrade_success:
                    logger.info(f"Auto-synced user {user_id} to {plan_name} plan from history endpoint")
                else:
                    logger.warning(f"Failed to auto-sync user {user_id} to {plan_name} plan")
                    
    except Exception as sync_error:
        logger.error(f"Auto-sync error in history: {sync_error}")
        # Don't fail the request, just log the error
    
    # Update expired PENDING payments to FAILED (15 minutes timeout)
    try:
        from datetime import timezone
        from sqlalchemy import func
        now = datetime.now(timezone.utc)
        
        pending_payments = (
            db.query(Payment)
            .filter(
                Payment.user_id == user_id,
                func.upper(Payment.status) == "PENDING"
            )
            .all()
        )
        
        for payment in pending_payments:
            created = payment.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            
            time_elapsed = (now - created).total_seconds()
            if time_elapsed > 900:  # 15 minutes
                payment.status = PaymentStatus.FAILED.value
                logger.info(f"Payment {payment.order_id} marked as FAILED due to timeout")
        
        db.commit()
    except Exception as timeout_error:
        logger.error(f"Timeout check error: {timeout_error}")
        db.rollback()

    payments = (
        db.query(Payment)
        .filter(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_payment_response(p) for p in payments]


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/payments")
def admin_list_payments(
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str = None,
    status_filter: str = None,
    payment_method: str = None,
    date_from: str = None,
    date_to: str = None,
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin: Lấy danh sách tất cả payments với filter và pagination
    """
    # Check admin role
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        # Build query
        where_clauses = []
        params = {}
        
        if search:
            where_clauses.append("""
                (p.order_id ILIKE :search 
                OR p.app_trans_id ILIKE :search 
                OR u.email ILIKE :search 
                OR u.full_name ILIKE :search)
            """)
            params["search"] = f"%{search}%"
        
        if status_filter:
            where_clauses.append("p.status = :status_filter")
            params["status_filter"] = status_filter
        
        if payment_method:
            where_clauses.append("p.payment_method = :payment_method")
            params["payment_method"] = payment_method
        
        if date_from:
            where_clauses.append("p.created_at >= :date_from")
            params["date_from"] = date_from
        
        if date_to:
            where_clauses.append("p.created_at <= :date_to::date + interval '1 day'")
            params["date_to"] = date_to
        
        if user_id:
            where_clauses.append("p.user_id = :user_id")
            params["user_id"] = user_id
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Validate sort_by
        valid_sort_columns = ["created_at", "amount", "order_id", "status"]
        if sort_by not in valid_sort_columns:
            sort_by = "created_at"
        
        sort_direction = "DESC" if sort_order.lower() == "desc" else "ASC"
        
        # Count total
        count_sql = text(f"""
            SELECT COUNT(*) 
            FROM core.payments p
            LEFT JOIN core.users u ON p.user_id = u.id
            WHERE {where_sql}
        """)
        total = db.execute(count_sql, params).scalar() or 0
        
        # Get paginated data
        offset = (page - 1) * per_page
        params["limit"] = per_page
        params["offset"] = offset
        
        data_sql = text(f"""
            SELECT 
                p.id,
                p.user_id,
                u.email as user_email,
                u.full_name as user_name,
                p.order_id,
                p.app_trans_id,
                p.amount,
                p.description,
                p.payment_method,
                p.status,
                p.created_at,
                p.paid_at as updated_at,
                p.callback_data as gateway_response
            FROM core.payments p
            LEFT JOIN core.users u ON p.user_id = u.id
            WHERE {where_sql}
            ORDER BY p.{sort_by} {sort_direction}
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(data_sql, params)
        rows = result.fetchall()
        
        items = []
        for row in rows:
            items.append({
                "id": row.id,
                "user_id": row.user_id,
                "user_email": row.user_email,
                "user_name": row.user_name,
                "order_id": row.order_id or row.app_trans_id,
                "amount": row.amount,
                "description": row.description,
                "payment_method": row.payment_method,
                "status": row.status,
                "transaction_id": row.app_trans_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "gateway_response": json.loads(row.gateway_response) if row.gateway_response else None,
            })
        
        total_pages = (total + per_page - 1) // per_page
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"Error listing admin payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/payments/stats")
def admin_payment_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin: Thống kê payments
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        # Dùng LOWER() để so sánh không phân biệt hoa thường
        stats_sql = text("""
            SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) FILTER (WHERE LOWER(status) = 'success') as completed_payments,
                COALESCE(SUM(amount) FILTER (WHERE LOWER(status) = 'success'), 0) as completed_amount,
                COUNT(*) FILTER (WHERE LOWER(status) = 'pending') as pending_payments,
                COUNT(*) FILTER (WHERE LOWER(status) IN ('failed', 'failure')) as failed_payments,
                COUNT(*) FILTER (WHERE LOWER(status) IN ('cancelled', 'refunded')) as refunded_payments,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_payments,
                COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) as today_amount
            FROM core.payments
        """)
        
        result = db.execute(stats_sql).fetchone()
        
        return {
            "total_payments": result.total_payments or 0,
            "total_amount": float(result.total_amount or 0),
            "completed_payments": result.completed_payments or 0,
            "completed_amount": float(result.completed_amount or 0),
            "pending_payments": result.pending_payments or 0,
            "failed_payments": result.failed_payments or 0,
            "refunded_payments": result.refunded_payments or 0,
            "today_payments": result.today_payments or 0,
            "today_amount": float(result.today_amount or 0),
        }
        
    except Exception as e:
        logger.error(f"Error getting payment stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/payments/export")
def admin_export_payments(
    format: str = "json",
    status_filter: str = None,
    payment_method: str = None,
    date_from: str = None,
    date_to: str = None,
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin: Export payments to CSV or JSON
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        from fastapi.responses import Response
        import csv
        import io
        
        # Build query
        where_clauses = []
        params = {}
        
        if status_filter:
            where_clauses.append("p.status = :status_filter")
            params["status_filter"] = status_filter
        
        if payment_method:
            where_clauses.append("p.payment_method = :payment_method")
            params["payment_method"] = payment_method
        
        if date_from:
            where_clauses.append("p.created_at >= :date_from")
            params["date_from"] = date_from
        
        if date_to:
            where_clauses.append("p.created_at <= :date_to::date + interval '1 day'")
            params["date_to"] = date_to
        
        if user_id:
            where_clauses.append("p.user_id = :user_id")
            params["user_id"] = user_id
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        data_sql = text(f"""
            SELECT 
                p.id,
                p.user_id,
                u.email as user_email,
                u.full_name as user_name,
                p.order_id,
                p.app_trans_id,
                p.amount,
                p.description,
                p.payment_method,
                p.status,
                p.created_at,
                p.paid_at
            FROM core.payments p
            LEFT JOIN core.users u ON p.user_id = u.id
            WHERE {where_sql}
            ORDER BY p.created_at DESC
            LIMIT 10000
        """)
        
        result = db.execute(data_sql, params)
        rows = result.fetchall()
        
        if format == "csv":
            output = io.StringIO()
            
            # Thêm sep=, ở dòng đầu để Excel tự nhận diện delimiter
            output.write("sep=,\n")
            
            writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_ALL)
            
            # Header
            writer.writerow([
                "ID", "User ID", "Email", "Ten", "Order ID", "Transaction ID",
                "So tien", "Mo ta", "Phuong thuc", "Trang thai", "Ngay tao", "Ngay thanh toan"
            ])
            
            # Data
            for row in rows:
                # Format datetime đẹp hơn cho Excel
                created_str = row.created_at.strftime("%d/%m/%Y %H:%M:%S") if row.created_at else ""
                paid_str = row.paid_at.strftime("%d/%m/%Y %H:%M:%S") if row.paid_at else ""
                
                writer.writerow([
                    row.id,
                    row.user_id,
                    row.user_email or "",
                    row.user_name or "",
                    row.order_id or row.app_trans_id or "",
                    row.app_trans_id or "",
                    row.amount,
                    row.description or "",
                    row.payment_method or "",
                    row.status or "",
                    created_str,
                    paid_str,
                ])
            
            csv_content = output.getvalue()
            output.close()
            
            # Thêm BOM UTF-8 để Excel nhận diện encoding đúng
            csv_bytes = b'\xef\xbb\xbf' + csv_content.encode('utf-8')
            
            return Response(
                content=csv_bytes,
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f"attachment; filename=payments_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"
                }
            )
        else:
            # JSON format
            items = []
            for row in rows:
                items.append({
                    "id": row.id,
                    "user_id": row.user_id,
                    "user_email": row.user_email,
                    "user_name": row.user_name,
                    "order_id": row.order_id or row.app_trans_id,
                    "transaction_id": row.app_trans_id,
                    "amount": row.amount,
                    "description": row.description,
                    "payment_method": row.payment_method,
                    "status": row.status,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "paid_at": row.paid_at.isoformat() if row.paid_at else None,
                })
            
            return items
        
    except Exception as e:
        logger.error(f"Error exporting payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/payments/users/search")
def admin_search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin: Tìm kiếm users để filter payments
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        search_sql = text("""
            SELECT DISTINCT u.id, u.email, u.full_name
            FROM core.users u
            WHERE u.email ILIKE :search OR u.full_name ILIKE :search
            LIMIT 20
        """)
        
        result = db.execute(search_sql, {"search": f"%{q}%"})
        rows = result.fetchall()
        
        return [
            {
                "id": row.id,
                "email": row.email,
                "full_name": row.full_name
            }
            for row in rows
        ]
        
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/payments/user/{user_id}")
def admin_user_payments(
    user_id: int,
    page: int = 1,
    per_page: int = 10,
    status_filter: str = None,
    date_from: str = None,
    date_to: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Admin: Lấy lịch sử thanh toán của một user cụ thể
    """
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        # Build query
        where_clauses = ["p.user_id = :user_id"]
        params = {"user_id": user_id}
        
        if status_filter:
            where_clauses.append("p.status = :status_filter")
            params["status_filter"] = status_filter
        
        if date_from:
            where_clauses.append("p.created_at >= :date_from")
            params["date_from"] = date_from
        
        if date_to:
            where_clauses.append("p.created_at <= :date_to::date + interval '1 day'")
            params["date_to"] = date_to
        
        where_sql = " AND ".join(where_clauses)
        
        # Count total
        count_sql = text(f"""
            SELECT COUNT(*) 
            FROM core.payments p
            WHERE {where_sql}
        """)
        total = db.execute(count_sql, params).scalar() or 0
        
        # Get paginated data
        offset = (page - 1) * per_page
        params["limit"] = per_page
        params["offset"] = offset
        
        data_sql = text(f"""
            SELECT 
                p.id,
                p.user_id,
                u.email as user_email,
                u.full_name as user_name,
                p.order_id,
                p.app_trans_id,
                p.amount,
                p.description,
                p.payment_method,
                p.status,
                p.created_at,
                p.paid_at as updated_at
            FROM core.payments p
            LEFT JOIN core.users u ON p.user_id = u.id
            WHERE {where_sql}
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(data_sql, params)
        rows = result.fetchall()
        
        items = []
        for row in rows:
            items.append({
                "id": row.id,
                "user_id": row.user_id,
                "user_email": row.user_email,
                "user_name": row.user_name,
                "order_id": row.order_id or row.app_trans_id,
                "amount": row.amount,
                "description": row.description,
                "payment_method": row.payment_method,
                "status": row.status,
                "transaction_id": row.app_trans_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            })
        
        total_pages = (total + per_page - 1) // per_page
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"Error getting user payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
