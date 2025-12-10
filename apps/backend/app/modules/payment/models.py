"""Payment Models"""
from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, BigInteger
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    order_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    app_trans_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    amount: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(20), default=PaymentMethod.ZALOPAY.value)
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDING.value, index=True)
    zp_trans_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    order_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    callback_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Payment {self.app_trans_id or self.order_id} - {self.status}>"
