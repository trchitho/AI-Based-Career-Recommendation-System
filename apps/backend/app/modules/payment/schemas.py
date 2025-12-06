"""
Payment Schemas (Pydantic)
"""
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from .models import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Request tạo thanh toán"""
    amount: int = Field(..., gt=0, description="Số tiền (VND)")
    description: str = Field(..., min_length=1, max_length=500)
    payment_method: PaymentMethod = PaymentMethod.ZALOPAY


class PaymentCreateResponse(BaseModel):
    """Response tạo thanh toán"""
    success: bool
    order_id: str
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
    order_id: str
    amount: int
    description: Optional[str]
    status: PaymentStatus
    payment_method: PaymentMethod
    created_at: datetime
    paid_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PaymentQueryResponse(BaseModel):
    """Response truy vấn thanh toán"""
    success: bool
    status: PaymentStatus
    message: Optional[str] = None
    payment: Optional[PaymentResponse] = None
