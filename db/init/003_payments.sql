BEGIN;

-- Đảm bảo schema tồn tại
CREATE SCHEMA IF NOT EXISTS core;

-- 1. assessment_quotas
CREATE TABLE IF NOT EXISTS core.assessment_quotas (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    remaining_assessments INTEGER NOT NULL DEFAULT 5,
    quota_reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessment_quotas_user_id 
    ON core.assessment_quotas(user_id);

-- 2. subscriptions
CREATE TABLE IF NOT EXISTS core.subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
    ON core.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
    ON core.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at 
    ON core.subscriptions(expires_at);

-- 3. payment_transactions
CREATE TABLE IF NOT EXISTS core.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    subscription_id BIGINT REFERENCES core.subscriptions(id),
    order_code BIGINT NOT NULL,
    payos_payment_link_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'VND',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payos_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
    ON core.payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_code 
    ON core.payment_transactions(order_code);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
    ON core.payment_transactions(status);

-- 4. test_usage_logs
CREATE TABLE IF NOT EXISTS core.test_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    assessment_session_id BIGINT REFERENCES core.assessment_sessions(id),
    test_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_usage_logs_user_id 
    ON core.test_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_test_usage_logs_created_at 
    ON core.test_usage_logs(created_at DESC);

-- 5. transactions
CREATE TABLE IF NOT EXISTS core.transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    status TEXT NOT NULL,
    subscription_id BIGINT REFERENCES core.subscriptions(id),
    gateway_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    payment_gateway_response JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    plan_type TEXT,
    payment_url TEXT,
    return_url TEXT,
    ipn_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
    ON core.transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id 
    ON core.transactions(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
    ON core.transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
    ON core.transactions(created_at DESC);

-- 6. usage_limits
CREATE TABLE IF NOT EXISTS core.usage_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    career_views_count INTEGER NOT NULL DEFAULT 1,
    test_count_this_month INTEGER NOT NULL DEFAULT 0,
    roadmap_level_unlocked INTEGER NOT NULL DEFAULT 1,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id 
    ON core.usage_limits(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_limits_user_id_unique 
    ON core.usage_limits(user_id);

-- 7. user_career_views
CREATE TABLE IF NOT EXISTS core.user_career_views (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    career_id BIGINT NOT NULL REFERENCES core.careers(id) ON DELETE CASCADE,
    first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
    view_count BIGINT DEFAULT 1,
    last_viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_career_views_user_id 
    ON core.user_career_views(user_id);

CREATE INDEX IF NOT EXISTS idx_user_career_views_career_id 
    ON core.user_career_views(career_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_career_views_unique 
    ON core.user_career_views(user_id, career_id);

-- 8. user_usage
CREATE TABLE IF NOT EXISTS core.user_usage (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    assessments_count INTEGER DEFAULT 0,
    careers_viewed JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_month UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_month 
    ON core.user_usage(user_id, year, month);

-- 9. user_usage_limits
CREATE TABLE IF NOT EXISTS core.user_usage_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    assessment_count INTEGER DEFAULT 0,
    assessment_reset_date DATE,
    careers_viewed TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_usage_limits_user_id 
    ON core.user_usage_limits(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_usage_limits_user_id_unique 
    ON core.user_usage_limits(user_id);

-- Comments
COMMENT ON TABLE core.payment_transactions IS 'Transactions thanh toán (PayOS)';
COMMENT ON TABLE core.subscriptions IS 'Subscriptions của user';
COMMENT ON TABLE core.test_usage_logs IS 'Log sử dụng tests';
COMMENT ON TABLE core.transactions IS 'Transactions tổng quát';
COMMENT ON TABLE core.usage_limits IS 'Giới hạn sử dụng cho user';
COMMENT ON TABLE core.user_career_views IS 'Tracking career views';
COMMENT ON TABLE core.user_usage IS 'Usage tracking theo tháng';
COMMENT ON TABLE core.user_usage_limits IS 'Giới hạn usage cho user';

-- Drop + recreate payments để tránh lỗi schema cũ
DROP TABLE IF EXISTS core.payments CASCADE;
DROP SEQUENCE IF EXISTS core.payments_id_seq;

CREATE TABLE core.payments
(
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    order_id VARCHAR(100) NOT NULL,
    app_trans_id VARCHAR(100),
    amount INTEGER NOT NULL,
    description TEXT,
    payment_method VARCHAR(20) DEFAULT 'zalopay',
    status VARCHAR(20) DEFAULT 'pending',
    zp_trans_token VARCHAR(255),
    order_url TEXT,
    callback_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    CONSTRAINT payments_app_trans_id_key UNIQUE (app_trans_id),
    CONSTRAINT payments_order_id_key UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_app_trans_id
    ON core.payments (app_trans_id);

CREATE INDEX IF NOT EXISTS idx_payments_created_at
    ON core.payments (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON core.payments (order_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON core.payments (status);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
    ON core.payments (user_id);

COMMIT;
