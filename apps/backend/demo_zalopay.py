"""
Demo ZaloPay Payment Flow
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.modules.payment.zalopay_service import ZaloPayService

# ZaloPay service
zalopay = ZaloPayService(
    app_id=os.getenv("ZALOPAY_APP_ID", "2553"),
    key1=os.getenv("ZALOPAY_KEY1", "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL"),
    key2=os.getenv("ZALOPAY_KEY2", "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz"),
    redirect_url="http://localhost:3000/payment",
)

def demo_create_order():
    """Demo tạo đơn hàng"""
    print("\n" + "="*60)
    print("DEMO: Tạo Đơn Hàng ZaloPay")
    print("="*60)
    
    result = zalopay.create_order(
        amount=299000,
        description="Demo Thanh toán Gói Premium",
        user_id=1,
        order_id=f"DEMO_{int(__import__('time').time())}",
    )
    
    if result.get("success"):
        print("\n✅ Tạo đơn hàng thành công!")
        print(f"\n📋 Order ID: {result.get('order_id')}")
        print(f"📋 App Trans ID: {result.get('app_trans_id')}")
        print(f"\n🔗 Payment URL:")
        print(f"   {result.get('order_url')}")
        print(f"\n💡 Hướng dẫn:")
        print(f"   1. Mở link trên trong browser")
        print(f"   2. Quét QR bằng ZaloPay Demo App")
        print(f"   3. Nhập OTP: 123456")
        print(f"   4. Xác nhận thanh toán")
        
        return result.get('app_trans_id')
    else:
        print(f"\n❌ Lỗi: {result.get('message')}")
        return None

def demo_query_order(app_trans_id: str):
    """Demo query trạng thái"""
    print("\n" + "="*60)
    print("DEMO: Query Trạng Thái Đơn Hàng")
    print("="*60)
    
    result = zalopay.query_order(app_trans_id)
    
    print(f"\n📊 Kết quả:")
    print(f"   Status: {result.get('status')}")
    print(f"   Return Code: {result.get('return_code')}")
    print(f"   Message: {result.get('message')}")
    
    status_icons = {
        'success': '✅',
        'failed': '❌',
        'cancelled': '🚫',
        'pending': '⏳',
    }
    
    icon = status_icons.get(result.get('status'), '❓')
    print(f"\n{icon} Trạng thái: {result.get('status').upper()}")
    
    return result

def demo_full_flow():
    """Demo full flow"""
    print("\n" + "="*60)
    print("🎬 DEMO ZALOPAY PAYMENT FLOW")
    print("="*60)
    
    # Step 1: Create order
    app_trans_id = demo_create_order()
    
    if not app_trans_id:
        return
    
    # Step 2: Wait for user input
    print("\n" + "-"*60)
    input("⏸️  Nhấn Enter sau khi thanh toán hoặc hủy...")
    
    # Step 3: Query status
    demo_query_order(app_trans_id)
    
    print("\n" + "="*60)
    print("✅ Demo hoàn tất!")
    print("="*60 + "\n")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "create":
            demo_create_order()
        elif sys.argv[1] == "query" and len(sys.argv) > 2:
            demo_query_order(sys.argv[2])
        else:
            print("Usage:")
            print("  python demo_zalopay.py create")
            print("  python demo_zalopay.py query <app_trans_id>")
    else:
        demo_full_flow()
