#!/usr/bin/env python3
"""
Script để test VNPay URL generation
Usage: python test_vnpay_url.py
"""

import hashlib
import hmac
import urllib.parse
from datetime import datetime

# Config từ .env
TMN_CODE = "HWNP0DTI"
HASH_SECRET = "I3703I0A6BU7GFKI79LCIX58PCT1C8U8"
VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
RETURN_URL = "https://madonna-unpreposterous-unnationally.ngrok-free.dev/api/payment/vnpay/callback"

def create_vnpay_url(payment_id: int, amount: float, order_desc: str):
    """Tạo VNPay URL"""
    
    # Parameters
    vnp_params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': TMN_CODE,
        'vnp_Amount': int(amount * 100),  # VNPay yêu cầu amount * 100
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': str(payment_id),
        'vnp_OrderInfo': order_desc,
        'vnp_OrderType': 'other',
        'vnp_Locale': 'vn',
        'vnp_ReturnUrl': RETURN_URL,
        'vnp_CreateDate': datetime.now().strftime('%Y%m%d%H%M%S'),
        'vnp_IpAddr': '127.0.0.1'
    }
    
    # Sort parameters
    sorted_params = sorted(vnp_params.items())
    
    # Tạo hash data (KHÔNG URL encode)
    hash_data = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Tạo secure hash
    secure_hash = hmac.new(
        HASH_SECRET.encode('utf-8'),
        hash_data.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()
    
    # Tạo query string (CÓ URL encode)
    query_string = '&'.join([f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted_params])
    
    # Final URL
    final_url = f"{VNPAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"
    
    return final_url, vnp_params, hash_data, secure_hash


def main():
    print("=" * 80)
    print("VNPay URL Generator - Test Script")
    print("=" * 80)
    print()
    
    # Test data
    payment_id = 999
    amount = 99000  # 99,000 VND
    order_desc = "Test payment - Goi Co Ban 1 Thang"
    
    print(f"📝 Test Data:")
    print(f"   Payment ID: {payment_id}")
    print(f"   Amount: {amount:,} VND")
    print(f"   Description: {order_desc}")
    print()
    
    # Generate URL
    url, params, hash_data, secure_hash = create_vnpay_url(payment_id, amount, order_desc)
    
    print(f"🔧 Configuration:")
    print(f"   TMN Code: {TMN_CODE}")
    print(f"   Hash Secret: {HASH_SECRET[:10]}...")
    print(f"   VNPay URL: {VNPAY_URL}")
    print(f"   Return URL: {RETURN_URL}")
    print()
    
    print(f"📋 Parameters:")
    for key, value in sorted(params.items()):
        print(f"   {key}: {value}")
    print()
    
    print(f"🔐 Hash Data (for signature):")
    print(f"   {hash_data}")
    print()
    
    print(f"🔑 Secure Hash:")
    print(f"   {secure_hash}")
    print()
    
    print(f"🌐 Final URL:")
    print(f"   {url}")
    print()
    
    print("=" * 80)
    print("✅ Copy URL trên và paste vào browser để test")
    print("=" * 80)
    print()
    
    # Verify
    print("🧪 Verification:")
    print(f"   Amount in params: {params['vnp_Amount']:,} (should be {int(amount * 100):,})")
    print(f"   URL length: {len(url)} characters")
    print(f"   Hash length: {len(secure_hash)} characters (should be 128)")
    print()
    
    # Test card info
    print("💳 Test Card Info:")
    print("   Số thẻ: 9704198526191432198")
    print("   Tên: NGUYEN VAN A")
    print("   Ngày phát hành: 07/15")
    print("   OTP: 123456")
    print()


if __name__ == "__main__":
    main()
