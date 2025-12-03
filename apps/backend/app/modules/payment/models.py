from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from ...core.db import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    code = Column(Text, nullable=False, unique=True)
    name_vi = Column(Text, nullable=False)
    name_en = Column(Text, nullable=False)
    description_vi = Column(Text)
    description_en = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    duration_days = Column(BigInteger, nullable=False)
    features = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    plan_id = Column(BigInteger, nullable=False)
    status = Column(Text, nullable=False)  # 'active', 'expired', 'cancelled'
    start_date = Column(TIMESTAMP(timezone=True), nullable=False)
    end_date = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    plan_id = Column(BigInteger, nullable=False)
    subscription_id = Column(BigInteger)
    payment_method = Column(Text, nullable=False)  # 'vnpay', 'momo'
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(Text, default='VND')
    status = Column(Text, nullable=False)  # 'pending', 'completed', 'failed', 'refunded'
    transaction_id = Column(Text, unique=True)
    payment_gateway_response = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class UserTestQuota(Base):
    __tablename__ = "user_test_quota"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    month_year = Column(Text, nullable=False)  # 'YYYY-MM'
    test_count = Column(BigInteger, default=0)
    free_quota = Column(BigInteger, default=5)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class SystemConfig(Base):
    __tablename__ = "system_config"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    config_key = Column(Text, nullable=False, unique=True)
    config_value = Column(JSONB, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
