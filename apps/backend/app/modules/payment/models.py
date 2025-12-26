"""
Payment Models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, DateTime, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


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
    """Payment model khớp schema core.payments"""

    __tablename__ = "payments"
    __table_args__ = {"schema": "core"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)  # Remove FK constraint temporarily
    
    # Thông tin đơn hàng
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    app_trans_id = Column(String(100), unique=True, nullable=True, index=True)
    
    # Thông tin thanh toán
    amount = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    payment_method = Column(String(50), default="zalopay")  # Changed to String for flexibility
    status = Column(String(50), default="PENDING", index=True)  # Changed to String for flexibility
    
    # Thông tin từ gateway
    zp_trans_token = Column(String(255), nullable=True)
    order_url = Column(Text, nullable=True)
    
    # Callback data
    callback_data = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    
    # Relationships - tạm thời comment out để tránh lỗi
    # user = relationship("User", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment {self.order_id} - {self.status}>"
