#!/usr/bin/env python3
"""
Script test ZaloPay integration
Chạy: python test_zalopay.py
"""
import os
import sys
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv(".env")

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
TOKEN = os.getenv("TEST_TOKEN", "")

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_create_payment():
    """Test tạo payment"""
    print_header("TEST 1: Tạo Payment")
    
    if not TOKEN:
        print("❌ Thiếu TEST_TOKEN trong .env")
        print("   Lấy token bằng cách đăng nhập và chạy:")
        print("   export TEST_TOKEN='your_jwt_token'")
        return None
    
    url = f"{API_BASE}/api/payment/create"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "amount": 50000,
        "description": "Test payment từ script",
        "payment_method": "zalopay"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if response.status_code == 200 and result.get("success"):
            print("✅ Tạo payment thành công!")
            print(f"   Order ID: {result.get('order_id')}")
            print(f"   Order URL: {result.get('order_url')}")
            print("\n   👉 Mở URL trên để thanh toán:")
            print(f"   {result.get('order_url')}")
            return result.get('order_id')
        else:
            print(f"❌ Lỗi: {result}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def test_query_payment(order_id):
    """Test query payment status"""
    print_header("TEST 2: Query Payment Status")
    
    if not order_id:
        print("⏭️  Bỏ qua (không có order_id)")
        return
    
    url = f"{API_BASE}/api/payment/query/{order_id}"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        result = response.json()
        
        if response.status_code == 200:
            print("✅ Query thành công!")
            print(f"   Status: {result.get('status')}")
            print(f"   Success: {result.get('success')}")
            if result.get('payment'):
                payment = result['payment']
                print(f"   Amount: {payment.get('amount')} VND")
                print(f"   Created: {payment.get('created_at')}")
        else:
            print(f"❌ Lỗi: {result}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_payment_history():
    """Test lấy payment history"""
    print_header("TEST 3: Payment History")
    
    url = f"{API_BASE}/api/payment/history"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ Lấy history thành công! ({len(result)} payments)")
            for i, payment in enumerate(result[:3], 1):
                print(f"\n   Payment {i}:")
                print(f"   - Order ID: {payment.get('order_id')}")
                print(f"   - Amount: {payment.get('amount')} VND")
                print(f"   - Status: {payment.get('status')}")
                print(f"   - Created: {payment.get('created_at')}")
        else:
            print(f"❌ Lỗi: {result}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_health():
    """Test backend health"""
    print_header("TEST 0: Backend Health Check")
    
    url = f"{API_BASE}/health"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print("✅ Backend đang chạy!")
            print(f"   URL: {API_BASE}")
        else:
            print(f"❌ Backend trả về status {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Không thể kết nối backend: {e}")
        print(f"   Kiểm tra backend có chạy tại {API_BASE}?")
        sys.exit(1)

def main():
    print("\n🧪 ZaloPay Integration Test Script")
    print(f"📍 API Base: {API_BASE}")
    
    # Test 0: Health check
    test_health()
    
    if not TOKEN:
        print("\n⚠️  Cần TOKEN để test các API khác")
        print("   Lấy token bằng cách:")
        print("   1. Đăng nhập vào ứng dụng")
        print("   2. Mở DevTools → Console")
        print("   3. Chạy: localStorage.getItem('token')")
        print("   4. Export: export TEST_TOKEN='your_token'")
        print("   5. Chạy lại script này")
        sys.exit(0)
    
    # Test 1: Create payment
    order_id = test_create_payment()
    
    # Test 2: Query payment
    if order_id:
        input("\n⏸️  Nhấn Enter sau khi thanh toán xong để query status...")
        test_query_payment(order_id)
    
    # Test 3: Payment history
    test_payment_history()
    
    print("\n" + "="*60)
    print("  ✅ Hoàn thành tất cả tests!")
    print("="*60)
    print("\n📝 Ghi chú:")
    print("   - Sandbox test credentials:")
    print("     SĐT: 0123456789")
    print("     OTP: 123456")
    print("     PIN: 111111")
    print("\n   - Xem thêm: doc/ZALOPAY_STEP_BY_STEP.md")
    print()

if __name__ == "__main__":
    main()
