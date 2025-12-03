-- =====================================================
-- PAYMENT SYSTEM SCHEMA
-- Hệ thống thanh toán VNPay/Momo cho Career AI
-- =====================================================

-- 1. Bảng gói dịch vụ (subscription plans)
CREATE TABLE IF NOT EXISTS core.subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_vi TEXT,
    description_en TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL, -- số ngày có hiệu lực
    features JSONB NOT NULL, -- các tính năng: {view_all_careers, unlimited_tests, full_roadmap}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng đăng ký của người dùng
CREATE TABLE IF NOT EXISTS core.user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES core.subscription_plans(id),
    status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'cancelled'
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng lịch sử thanh toán
CREATE TABLE IF NOT EXISTS core.payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES core.subscription_plans(id),
    subscription_id BIGINT REFERENCES core.user_subscriptions(id),
    payment_method VARCHAR(20) NOT NULL, -- 'vnpay', 'momo'
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
    transaction_id VARCHAR(255) UNIQUE, -- ID từ VNPay/Momo
    payment_gateway_response JSONB, -- response từ gateway
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng theo dõi số lần làm test miễn phí
CREATE TABLE IF NOT EXISTS core.user_test_quota (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- format: 'YYYY-MM'
    test_count INTEGER DEFAULT 0,
    free_quota INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- 5. Bảng cấu hình giá và hạn mức
CREATE TABLE IF NOT EXISTS core.system_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_subscription_plans_price ON core.subscription_plans(price);
CREATE INDEX idx_user_subscriptions_user_id ON core.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON core.user_subscriptions(status);
CREATE INDEX idx_payments_user_id ON core.payments(user_id);
CREATE INDEX idx_payments_status ON core.payments(status);
CREATE INDEX idx_user_test_quota_user_month ON core.user_test_quota(user_id, month_year);

-- =====================================================
-- SEED DATA - Gói dịch vụ mặc định
-- =====================================================
INSERT INTO core.subscription_plans (code, name_vi, name_en, description_vi, description_en, price, duration_days, features) VALUES
('BASIC_1M', 'Gói Cơ Bản 1 Tháng', 'Basic 1 Month', 
 'Xem tất cả nghề nghiệp phù hợp, làm test không giới hạn, xem roadmap đầy đủ', 
 'View all career matches, unlimited tests, full roadmap access',
 99000, 30, 
 '{"view_all_careers": true, "unlimited_tests": true, "full_roadmap": true}'::jsonb),

('BASIC_3M', 'Gói Cơ Bản 3 Tháng', 'Basic 3 Months', 
 'Xem tất cả nghề nghiệp phù hợp, làm test không giới hạn, xem roadmap đầy đủ - Tiết kiệm 20%', 
 'View all career matches, unlimited tests, full roadmap access - Save 20%',
 237000, 90, 
 '{"view_all_careers": true, "unlimited_tests": true, "full_roadmap": true}'::jsonb),

('PREMIUM_6M', 'Gói Premium 6 Tháng', 'Premium 6 Months', 
 'Tất cả tính năng + Tư vấn cá nhân hóa - Tiết kiệm 30%', 
 'All features + Personalized consultation - Save 30%',
 417000, 180, 
 '{"view_all_careers": true, "unlimited_tests": true, "full_roadmap": true, "personal_consultation": true}'::jsonb),

('PREMIUM_1Y', 'Gói Premium 1 Năm', 'Premium 1 Year', 
 'Tất cả tính năng + Tư vấn cá nhân hóa - Tiết kiệm 40%', 
 'All features + Personalized consultation - Save 40%',
 713000, 365, 
 '{"view_all_careers": true, "unlimited_tests": true, "full_roadmap": true, "personal_consultation": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED DATA - Cấu hình hệ thống
-- =====================================================
INSERT INTO core.system_config (config_key, config_value, description) VALUES
('free_test_quota', '{"monthly_limit": 5, "reset_day": 1}'::jsonb, 'Số lần làm test miễn phí mỗi tháng'),
('free_career_view', '{"limit": 1}'::jsonb, 'Số nghề nghiệp được xem miễn phí'),
('free_roadmap_level', '{"max_level": 1}'::jsonb, 'Level roadmap được xem miễn phí')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- FUNCTIONS - Kiểm tra quyền truy cập
-- =====================================================

-- Function: Kiểm tra user có subscription active không
CREATE OR REPLACE FUNCTION core.check_user_has_active_subscription(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM core.user_subscriptions
        WHERE user_id = p_user_id
        AND status = 'active'
        AND end_date > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Kiểm tra user còn quota test miễn phí không
CREATE OR REPLACE FUNCTION core.check_user_test_quota(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_month_year VARCHAR(7);
    v_test_count INTEGER;
    v_free_quota INTEGER;
BEGIN
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Lấy hoặc tạo record cho tháng hiện tại
    INSERT INTO core.user_test_quota (user_id, month_year, test_count, free_quota)
    VALUES (p_user_id, v_month_year, 0, 5)
    ON CONFLICT (user_id, month_year) DO NOTHING;
    
    SELECT test_count, free_quota INTO v_test_count, v_free_quota
    FROM core.user_test_quota
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    RETURN v_test_count < v_free_quota;
END;
$$ LANGUAGE plpgsql;

-- Function: Tăng số lần làm test
CREATE OR REPLACE FUNCTION core.increment_user_test_count(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_month_year VARCHAR(7);
BEGIN
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    INSERT INTO core.user_test_quota (user_id, month_year, test_count, free_quota)
    VALUES (p_user_id, v_month_year, 1, 5)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        test_count = core.user_test_quota.test_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Lấy thông tin quyền của user
CREATE OR REPLACE FUNCTION core.get_user_permissions(p_user_id BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_has_subscription BOOLEAN;
    v_has_test_quota BOOLEAN;
    v_test_count INTEGER;
    v_free_quota INTEGER;
    v_month_year VARCHAR(7);
BEGIN
    v_has_subscription := core.check_user_has_active_subscription(p_user_id);
    v_has_test_quota := core.check_user_test_quota(p_user_id);
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    SELECT test_count, free_quota INTO v_test_count, v_free_quota
    FROM core.user_test_quota
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    IF v_test_count IS NULL THEN
        v_test_count := 0;
        v_free_quota := 5;
    END IF;
    
    RETURN jsonb_build_object(
        'has_active_subscription', v_has_subscription,
        'can_take_test', v_has_subscription OR v_has_test_quota,
        'can_view_all_careers', v_has_subscription,
        'can_view_full_roadmap', v_has_subscription,
        'test_count_this_month', v_test_count,
        'free_test_quota', v_free_quota,
        'remaining_free_tests', GREATEST(0, v_free_quota - v_test_count)
    );
END;
$$ LANGUAGE plpgsql;
