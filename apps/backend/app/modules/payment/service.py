import hashlib
import hmac
import urllib.parse
from datetime import datetime, timedelta
from typing import Optional

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

from ...core.config import settings
from .models import Payment, SubscriptionPlan, UserSubscription


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_plans(self):
        """Lấy tất cả gói dịch vụ đang active"""
        return self.db.query(SubscriptionPlan).filter(
            SubscriptionPlan.is_active == True
        ).all()

    def get_plan_by_id(self, plan_id: int) -> Optional[SubscriptionPlan]:
        """Lấy thông tin gói dịch vụ theo ID"""
        return self.db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == plan_id
        ).first()

    def get_user_permissions(self, user_id: int) -> dict:
        """Lấy quyền của user (gọi function PostgreSQL)"""
        result = self.db.execute(
            text("SELECT core.get_user_permissions(:user_id)"),
            {"user_id": user_id}
        )
        return result.scalar()

    def check_test_quota(self, user_id: int) -> bool:
        """Kiểm tra user còn quota test miễn phí không"""
        result = self.db.execute(
            text("SELECT core.check_user_test_quota(:user_id)"),
            {"user_id": user_id}
        )
        return result.scalar()

    def increment_test_count(self, user_id: int):
        """Tăng số lần làm test của user"""
        self.db.execute(
            text("SELECT core.increment_user_test_count(:user_id)"),
            {"user_id": user_id}
        )
        self.db.commit()

    def get_user_active_subscription(self, user_id: int) -> Optional[UserSubscription]:
        """Lấy subscription đang active của user"""
        return self.db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == 'active',
            UserSubscription.end_date > datetime.now()
        ).first()

    def create_payment(self, user_id: int, plan_id: int, payment_method: str) -> Payment:
        """Tạo payment record"""
        plan = self.get_plan_by_id(plan_id)
        if not plan:
            raise ValueError("Plan not found")

        payment = Payment(
            user_id=user_id,
            payment_method=payment_method,
            amount=plan.price,
            currency='VND',
            status='pending'
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def update_payment_status(
        self, 
        payment_id: int, 
        status: str, 
        transaction_id: str, 
        gateway_response: dict
    ):
        """Cập nhật trạng thái payment"""
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if payment:
            payment.status = status
            payment.transaction_id = transaction_id
            payment.payment_gateway_response = gateway_response
            self.db.commit()
            return payment
        return None

    def activate_subscription(self, payment_id: int):
        """Kích hoạt subscription sau khi thanh toán thành công"""
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment or payment.status != 'completed':
            return None

        # Lấy plan từ payment
        plan = self.db.query(SubscriptionPlan).filter(
            SubscriptionPlan.price == payment.amount
        ).first()
        
        if not plan:
            return None

        # Tạo subscription
        start_date = datetime.now()
        end_date = start_date + timedelta(days=plan.duration_days)

        subscription = UserSubscription(
            user_id=payment.user_id,
            plan_id=plan.id,
            status='active',
            start_date=start_date,
            end_date=end_date
        )
        self.db.add(subscription)
        
        # Cập nhật payment với subscription_id
        payment.subscription_id = subscription.id
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription


class VNPayService:
    """Service xử lý thanh toán VNPay"""
    
    def __init__(self):
        self.vnp_tmn_code = getattr(settings, 'VNPAY_TMN_CODE', 'YOUR_TMN_CODE')
        self.vnp_hash_secret = getattr(settings, 'VNPAY_HASH_SECRET', 'YOUR_HASH_SECRET')
        self.vnp_url = getattr(settings, 'VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
        self.vnp_return_url = getattr(settings, 'VNPAY_RETURN_URL', '')

    def create_payment_url(
        self, 
        payment_id: int, 
        amount: float, 
        order_desc: str, 
        return_url: str = None
    ) -> str:
        """Tạo URL thanh toán VNPay"""
        # Sử dụng return_url từ config nếu không được truyền vào
        if not return_url:
            return_url = self.vnp_return_url
        
        vnp_params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': self.vnp_tmn_code,
            'vnp_Amount': int(amount * 100),  # VNPay yêu cầu amount * 100
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': str(payment_id),
            'vnp_OrderInfo': order_desc,
            'vnp_OrderType': 'other',
            'vnp_Locale': 'vn',
            'vnp_ReturnUrl': return_url,
            'vnp_CreateDate': datetime.now().strftime('%Y%m%d%H%M%S'),
            'vnp_IpAddr': '127.0.0.1'
        }

        # Sắp xếp params và tạo secure hash
        sorted_params = sorted(vnp_params.items())
        query_string = '&'.join([f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params])
        
        # Tạo secure hash
        hash_data = '&'.join([f"{k}={v}" for k, v in sorted_params])
        secure_hash = hmac.new(
            self.vnp_hash_secret.encode('utf-8'),
            hash_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

        return f"{self.vnp_url}?{query_string}&vnp_SecureHash={secure_hash}"

    def verify_payment(self, params: dict) -> bool:
        """Xác thực callback từ VNPay"""
        vnp_secure_hash = params.pop('vnp_SecureHash', None)
        if not vnp_secure_hash:
            return False

        sorted_params = sorted(params.items())
        hash_data = '&'.join([f"{k}={v}" for k, v in sorted_params])
        
        calculated_hash = hmac.new(
            self.vnp_hash_secret.encode('utf-8'),
            hash_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

        return calculated_hash == vnp_secure_hash


class MomoService:
    """Service xử lý thanh toán Momo"""
    
    def __init__(self):
        self.partner_code = getattr(settings, 'MOMO_PARTNER_CODE', 'YOUR_PARTNER_CODE')
        self.access_key = getattr(settings, 'MOMO_ACCESS_KEY', 'YOUR_ACCESS_KEY')
        self.secret_key = getattr(settings, 'MOMO_SECRET_KEY', 'YOUR_SECRET_KEY')
        self.endpoint = getattr(settings, 'MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create')

    def create_payment_url(
        self, 
        payment_id: int, 
        amount: float, 
        order_desc: str, 
        return_url: str
    ) -> str:
        """Tạo URL thanh toán Momo"""
        order_id = f"ORDER_{payment_id}"
        request_id = f"REQ_{payment_id}_{int(datetime.now().timestamp())}"
        
        raw_signature = (
            f"accessKey={self.access_key}"
            f"&amount={int(amount)}"
            f"&extraData="
            f"&ipnUrl={return_url}"
            f"&orderId={order_id}"
            f"&orderInfo={order_desc}"
            f"&partnerCode={self.partner_code}"
            f"&redirectUrl={return_url}"
            f"&requestId={request_id}"
            f"&requestType=captureWallet"
        )
        
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            raw_signature.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        payload = {
            'partnerCode': self.partner_code,
            'accessKey': self.access_key,
            'requestId': request_id,
            'amount': str(int(amount)),
            'orderId': order_id,
            'orderInfo': order_desc,
            'redirectUrl': return_url,
            'ipnUrl': return_url,
            'extraData': '',
            'requestType': 'captureWallet',
            'signature': signature,
            'lang': 'vi'
        }

        response = requests.post(self.endpoint, json=payload)
        result = response.json()
        
        if result.get('resultCode') == 0:
            return result.get('payUrl', '')
        
        raise ValueError(f"Momo error: {result.get('message')}")

    def verify_payment(self, params: dict) -> bool:
        """Xác thực callback từ Momo"""
        signature = params.get('signature', '')
        
        raw_signature = (
            f"accessKey={self.access_key}"
            f"&amount={params.get('amount')}"
            f"&extraData={params.get('extraData', '')}"
            f"&message={params.get('message')}"
            f"&orderId={params.get('orderId')}"
            f"&orderInfo={params.get('orderInfo')}"
            f"&orderType={params.get('orderType')}"
            f"&partnerCode={params.get('partnerCode')}"
            f"&payType={params.get('payType')}"
            f"&requestId={params.get('requestId')}"
            f"&responseTime={params.get('responseTime')}"
            f"&resultCode={params.get('resultCode')}"
            f"&transId={params.get('transId')}"
        )
        
        calculated_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            raw_signature.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return calculated_signature == signature
