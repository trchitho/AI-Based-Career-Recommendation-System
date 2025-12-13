"""
Payment Schemas (Pydantic)
"""
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Union
from .models import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Request tạo thanh toán"""
    amount: int = Field(..., gt=0, description="Số tiền (VND)")
    description: str = Field(..., min_length=1, max_length=500)
    payment_method: PaymentMethod = PaymentMethod.ZALOPAY


class PaymentCreateResponse(BaseModel):
    """Response tạo thanh toán"""
    success: bool
    order_id: str  # sử dụng app_trans_id/order_id
    order_url: Optional[str] = None
    message: Optional[str] = None


class PaymentCallbackRequest(BaseModel):
    """Callback từ ZaloPay"""
    data: str
    mac: str
    type: int


class PaymentResponse(BaseModel):
    """Response thông tin thanh toán"""
    id: int
    order_id: str  # ưu tiên app_trans_id, fallback order_id
    transaction_id: Optional[str] = None  # alias to app_trans_id for compatibility
    amount: int
    description: Optional[str] = None
    status: Union[PaymentStatus, str]
    payment_method: Union[PaymentMethod, str]
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class PaymentQueryResponse(BaseModel):
    """Response truy vấn thanh toán"""
    success: bool
    status: Union[PaymentStatus, str]
    message: Optional[str] = None
    payment: Optional[PaymentResponse] = None
