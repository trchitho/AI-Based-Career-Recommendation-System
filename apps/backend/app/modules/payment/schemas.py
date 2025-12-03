from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class SubscriptionPlanResponse(BaseModel):
    id: int
    code: str
    name_vi: str
    name_en: str
    description_vi: Optional[str]
    description_en: Optional[str]
    price: Decimal
    duration_days: int
    features: dict
    is_active: bool


class UserPermissionsResponse(BaseModel):
    has_active_subscription: bool
    can_take_test: bool
    can_view_all_careers: bool
    can_view_full_roadmap: bool
    test_count_this_month: int
    free_test_quota: int
    remaining_free_tests: int


class CreatePaymentRequest(BaseModel):
    plan_id: int
    payment_method: str  # 'vnpay' or 'momo'
    return_url: str


class PaymentResponse(BaseModel):
    payment_id: int
    payment_url: str
    transaction_id: str


class PaymentCallbackRequest(BaseModel):
    transaction_id: str
    status: str
    gateway_response: dict


class UserSubscriptionResponse(BaseModel):
    id: int
    plan_id: int
    plan_name: str
    status: str
    start_date: datetime
    end_date: datetime
    days_remaining: int
