"""
ZaloPay Payment Service
Tích hợp ZaloPay API cho thanh toán
"""
import hashlib
import hmac
import json
import time
from datetime import datetime
from typing import Dict, Any

import requests
from loguru import logger


class ZaloPayService:
    """Service xử lý thanh toán ZaloPay"""

    def __init__(
        self,
        app_id: str,
        key1: str,
        key2: str,
        endpoint: str = "https://sb-openapi.zalopay.vn/v2/create",
        callback_url: str = "",
        redirect_url: str = "",
    ):
        self.app_id = app_id
        self.key1 = key1
        self.key2 = key2
        self.endpoint = endpoint
        self.callback_url = callback_url
        self.redirect_url = redirect_url

    def create_order(
        self,
        amount: int,
        description: str,
        user_id: int,
        order_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Tạo đơn hàng ZaloPay
        
        Args:
            amount: Số tiền (VND)
            description: Mô tả đơn hàng
            user_id: ID người dùng
            order_id: Mã đơn hàng (tự động tạo nếu không có)
            
        Returns:
            Dict chứa order_url và thông tin đơn hàng
        """
        if not order_id:
            order_id = f"{int(time.time() * 1000)}"

        app_trans_id = f"{datetime.now().strftime('%y%m%d')}_{order_id}"

        # Redirect URL: Khi user hoàn tất/hủy thanh toán, ZaloPay sẽ redirect về đây
        # Đính kèm app_trans_id để BE/FE có thể query lại trạng thái
        redirect_url = (
            f"{self.redirect_url}?apptransid={app_trans_id}&order_id={order_id}"
            if self.redirect_url
            else self.callback_url
        )
        embed_data = json.dumps({"redirecturl": redirect_url})
        
        items = json.dumps([{
            "itemid": "premium_plan",
            "itemname": description,
            "itemprice": amount,
            "itemquantity": 1
        }])

        order = {
            "app_id": self.app_id,
            "app_trans_id": app_trans_id,
            "app_user": str(user_id),
            "app_time": int(time.time() * 1000),
            "amount": amount,
            "description": description,
            "bank_code": "",
            "item": items,
            "embed_data": embed_data,
            "callback_url": self.callback_url,
        }

        # Tạo MAC
        data = f"{order['app_id']}|{order['app_trans_id']}|{order['app_user']}|{order['amount']}|{order['app_time']}|{order['embed_data']}|{order['item']}"
        order["mac"] = hmac.new(
            self.key1.encode(), data.encode(), hashlib.sha256
        ).hexdigest()

        try:
            response = requests.post(self.endpoint, data=order, timeout=30)
            result = response.json()
            
            logger.info(f"ZaloPay create order response: {result}")
            
            if result.get("return_code") == 1:
                return {
                    "success": True,
                    "order_url": result.get("order_url"),
                    "zp_trans_token": result.get("zp_trans_token"),
                    "app_trans_id": app_trans_id,
                    "order_id": order_id,
                }
            else:
                return {
                    "success": False,
                    "message": result.get("return_message", "Tạo đơn hàng thất bại"),
                    "return_code": result.get("return_code"),
                }
        except Exception as e:
            logger.error(f"ZaloPay create order error: {e}")
            return {
                "success": False,
                "message": f"Lỗi kết nối ZaloPay: {str(e)}",
            }

    def verify_callback(self, callback_data: Dict[str, Any]) -> bool:
        """
        Xác thực callback từ ZaloPay
        
        Args:
            callback_data: Dữ liệu callback từ ZaloPay
            
        Returns:
            True nếu hợp lệ, False nếu không
        """
        try:
            mac = callback_data.get("mac", "")
            data = callback_data.get("data", "")
            
            # Tính MAC để verify
            computed_mac = hmac.new(
                self.key2.encode(), data.encode(), hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(mac, computed_mac)
        except Exception as e:
            logger.error(f"ZaloPay verify callback error: {e}")
            return False

    def query_order(self, app_trans_id: str) -> Dict[str, Any]:
        """
        Truy vấn trạng thái đơn hàng
        
        Args:
            app_trans_id: Mã giao dịch
            
        Returns:
            Dict chứa thông tin trạng thái đơn hàng
            
        ZaloPay return_code:
            1: Thanh toán thành công
            2: Thanh toán thất bại
            3: Đơn hàng chưa thanh toán hoặc giao dịch đang xử lý
            -49: Đơn hàng hết hạn/đã hủy
        """
        query_endpoint = "https://sb-openapi.zalopay.vn/v2/query"
        
        data = f"{self.app_id}|{app_trans_id}|{self.key1}"
        mac = hmac.new(self.key1.encode(), data.encode(), hashlib.sha256).hexdigest()
        
        params = {
            "app_id": self.app_id,
            "app_trans_id": app_trans_id,
            "mac": mac,
        }
        
        try:
            response = requests.post(query_endpoint, data=params, timeout=30)
            result = response.json()
            
            logger.info(f"ZaloPay query order response: {result}")
            
            return_code = result.get("return_code")
            
            # Xác định status dựa trên return_code
            if return_code == 1:
                status = "success"
            elif return_code == 2:
                status = "failed"
            elif return_code == -49:
                # Đơn hàng hết hạn hoặc đã hủy
                status = "cancelled"
            elif return_code == 3:
                # Đang pending
                status = "pending"
            else:
                # Các mã lỗi khác coi như failed
                status = "failed"
            
            return {
                "success": return_code == 1,
                "status": status,
                "return_code": return_code,
                "message": result.get("return_message", ""),
                "data": result,
            }
        except Exception as e:
            logger.error(f"ZaloPay query order error: {e}")
            return {
                "success": False,
                "status": "error",
                "message": f"Lỗi truy vấn đơn hàng: {str(e)}",
            }
