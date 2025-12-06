"""
Script để cập nhật tất cả payments pending
Query ZaloPay và update DB
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.modules.payment.models import Payment, PaymentStatus
from app.modules.payment.zalopay_service import ZaloPayService
from datetime import datetime, timezone

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# ZaloPay service
zalopay = ZaloPayService(
    app_id=os.getenv("ZALOPAY_APP_ID", "2553"),
    key1=os.getenv("ZALOPAY_KEY1", "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL"),
    key2=os.getenv("ZALOPAY_KEY2", "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz"),
)

def update_pending_payments():
    """Update all pending payments"""
    db = SessionLocal()
    
    try:
        # Get all pending payments
        pending_payments = db.query(Payment).filter(
            Payment.status == PaymentStatus.PENDING
        ).all()
        
        print(f"Found {len(pending_payments)} pending payments")
        
        for payment in pending_payments:
            if not payment.app_trans_id:
                print(f"⚠️  {payment.order_id}: No app_trans_id, skipping")
                continue
            
            print(f"\n🔍 Checking {payment.order_id} ({payment.app_trans_id})...")
            
            # Query ZaloPay
            result = zalopay.query_order(payment.app_trans_id)
            
            print(f"   Result: {result.get('status')} (return_code: {result.get('return_code')})")
            
            # Update status
            result_status = result.get("status")
            
            if result_status == "success":
                payment.status = PaymentStatus.SUCCESS
                payment.paid_at = datetime.now(timezone.utc)
                print(f"   ✅ Updated to SUCCESS")
            elif result_status == "cancelled":
                payment.status = PaymentStatus.CANCELLED
                print(f"   🚫 Updated to CANCELLED")
            elif result_status == "failed":
                payment.status = PaymentStatus.FAILED
                print(f"   ❌ Updated to FAILED")
            elif result_status == "pending":
                # Check timeout (15 minutes)
                created = payment.created_at
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                
                time_elapsed = (datetime.now(timezone.utc) - created).total_seconds()
                
                if time_elapsed > 900:  # 15 minutes
                    payment.status = PaymentStatus.FAILED
                    print(f"   ⏱️  Timeout → Updated to FAILED")
                else:
                    print(f"   ⏳ Still pending ({int(time_elapsed)}s elapsed)")
            
            db.commit()
        
        print(f"\n✅ Done! Updated {len(pending_payments)} payments")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_pending_payments()
