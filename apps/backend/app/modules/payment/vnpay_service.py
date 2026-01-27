"""
VNPay Payment Service
Tích hợp VNPay API cho thanh toán thẻ Visa/Mastercard/ATM
"""
import hashlib
import hmac
import urllib.parse
from datetime import datetime
from typing import Dict, Any

from loguru import logger


class VNPayService:
    """Service xử lý thanh toán VNPay"""

    def __init__(
        self,
        tmn_code: str,
        hash_secret: str,
        payment_url: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        return_url: str = "",
        api_url: str = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
    ):
        self.tmn_code = tmn_code
        self.hash_secret = hash_secret
        self.payment_url = payment_url
        self.return_url = return_url
        self.api_url = api_url

    def create_payment_url(
        self,
        amount: int,
        order_id: str,
        order_info: str,
        ip_addr: str = "127.0.0.1",
        bank_code: str = "",
        locale: str = "vn",
    ) -> Dict[str, Any]:
        """
        Tạo URL thanh toán VNPay
        
        Args:
            amount: Số tiền (VND) - VNPay yêu cầu nhân 100
            order_id: Mã đơn hàng (unique)
            order_info: Mô tả đơn hàng
            ip_addr: IP của khách hàng
            bank_code: Mã ngân hàng (để trống = chọn trên VNPay)
            locale: Ngôn ngữ (vn/en)
            
        Returns:
            Dict chứa payment_url
        """
        try:
            # VNPay yêu cầu amount * 100
            vnp_amount = amount * 100
            
            # Tạo thời gian
            create_date = datetime.now().strftime('%Y%m%d%H%M%S')
            expire_date = datetime.now().strftime('%Y%m%d%H%M%S')
            
            # Params theo thứ tự alphabet
            vnp_params = {
                "vnp_Amount": str(vnp_amount),
                "vnp_Command": "pay",
                "vnp_CreateDate": create_date,
                "vnp_CurrCode": "VND",
                "vnp_IpAddr": ip_addr,
                "vnp_Locale": locale,
                "vnp_OrderInfo": order_info,
                "vnp_OrderType": "other",
                "vnp_ReturnUrl": self.return_url,
                "vnp_TmnCode": self.tmn_code,
                "vnp_TxnRef": order_id,
                "vnp_Version": "2.1.0",
            }
            
            if bank_code:
                vnp_params["vnp_BankCode"] = bank_code
            
            # Sort params theo key
            sorted_params = sorted(vnp_params.items())
            
            # Tạo query string
            query_string = urllib.parse.urlencode(sorted_params)
            
            # Tạo secure hash
            hash_data = query_string
            secure_hash = hmac.new(
                self.hash_secret.encode('utf-8'),
                hash_data.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            # URL thanh toán
            payment_url = f"{self.payment_url}?{query_string}&vnp_SecureHash={secure_hash}"
            
            logger.info(f"VNPay payment URL created for order {order_id}")
            logger.info(f"VNPay return_url: {self.return_url}")
            logger.info(f"VNPay payment_url: {payment_url[:200]}...")  # Log first 200 chars
            
            return {
                "success": True,
                "payment_url": payment_url,
                "order_id": order_id,
            }
            
        except Exception as e:
            logger.error(f"VNPay create payment URL error: {e}")
            return {
                "success": False,
                "message": f"Lỗi tạo URL thanh toán: {str(e)}",
            }

    def verify_return(self, params: Dict[str, str]) -> Dict[str, Any]:
        """
        Xác thực response từ VNPay khi redirect về
        
        Args:
            params: Query params từ VNPay redirect
            
        Returns:
            Dict chứa kết quả xác thực
        """
        try:
            vnp_secure_hash = params.pop("vnp_SecureHash", "")
            params.pop("vnp_SecureHashType", None)
            
            # Sort và tạo hash để verify
            sorted_params = sorted(params.items())
            hash_data = urllib.parse.urlencode(sorted_params)
            
            computed_hash = hmac.new(
                self.hash_secret.encode('utf-8'),
                hash_data.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            if not hmac.compare_digest(vnp_secure_hash.lower(), computed_hash.lower()):
                return {
                    "success": False,
                    "message": "Invalid signature",
                }
            
            # Kiểm tra response code
            response_code = params.get("vnp_ResponseCode", "")
            transaction_status = params.get("vnp_TransactionStatus", "")
            
            if response_code == "00" and transaction_status == "00":
                return {
                    "success": True,
                    "status": "success",
                    "order_id": params.get("vnp_TxnRef"),
                    "amount": int(params.get("vnp_Amount", 0)) // 100,
                    "transaction_no": params.get("vnp_TransactionNo"),
                    "bank_code": params.get("vnp_BankCode"),
                    "pay_date": params.get("vnp_PayDate"),
                }
            else:
                return {
                    "success": False,
                    "status": "failed",
                    "order_id": params.get("vnp_TxnRef"),
                    "response_code": response_code,
                    "message": self._get_response_message(response_code),
                }
                
        except Exception as e:
            logger.error(f"VNPay verify return error: {e}")
            return {
                "success": False,
                "message": f"Lỗi xác thực: {str(e)}",
            }

    def _get_response_message(self, code: str) -> str:
        """Lấy message từ response code"""
        messages = {
            "00": "Giao dịch thành công",
            "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ",
            "09": "Thẻ/Tài khoản chưa đăng ký InternetBanking",
            "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
            "11": "Đã hết hạn chờ thanh toán",
            "12": "Thẻ/Tài khoản bị khóa",
            "13": "Nhập sai mật khẩu xác thực (OTP)",
            "24": "Khách hàng hủy giao dịch",
            "51": "Tài khoản không đủ số dư",
            "65": "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
            "75": "Ngân hàng thanh toán đang bảo trì",
            "79": "Nhập sai mật khẩu thanh toán quá số lần quy định",
            "99": "Lỗi không xác định",
        }
        return messages.get(code, f"Lỗi không xác định (code: {code})")
