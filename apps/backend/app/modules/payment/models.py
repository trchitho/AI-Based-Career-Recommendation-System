"""
Payment Models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()


class PaymentStatus(str, enum.Enum):
    """Trạng thái thanh toán"""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    """Phương thức thanh toán"""
    ZALOPAY = "zalopay"
    MOMO = "momo"
    VNPAY = "vnpay"


class Payment(Base):
    """
    Payment model aligned with current DB schema (core.payments).
    Legacy fields like order_id/app_trans_id/order_url are not present in DB,
    so we map against transaction_id and payment_gateway_response.
    """
    __tablename__ = "payments"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)

    # Current schema columns
    subscription_id = Column(Integer, nullable=True)
    payment_method = Column(String(50), default=PaymentMethod.ZALOPAY.value)
    amount = Column(Integer, nullable=False)
    currency = Column(String(10), default="VND")
    status = Column(String(50), default=PaymentStatus.PENDING.value, index=True)
    transaction_id = Column(String(200), unique=True, nullable=False, index=True)
    payment_gateway_response = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Payment {self.transaction_id} - {self.status}>"
