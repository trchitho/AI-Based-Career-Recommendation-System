-- SQL script để tạo bảng theo dõi usage của user
-- Hỗ trợ hệ thống freemium

-- 1. Tạo bảng user_usage_tracking
CREATE TABLE IF NOT EXISTS core.user_usage_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    feature_type TEXT NOT NULL, -- 'assessment', 'career_view', 'roadmap_level'
    usage_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per user per feature
    UNIQUE(user_id, feature_type)
);

DROP TABLE IF EXISTS core.subscription_plans CASCADE;

-- 2. Tạo bảng subscription_plans
CREATE TABLE IF NOT EXISTS core.subscription_plans (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo bảng user_subscriptions
CREATE TABLE IF NOT EXISTS core.user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT REFERENCES core.subscription_plans(id),
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Thêm dữ liệu mẫu cho subscription plans
INSERT INTO core.subscription_plans (name, price_monthly, price_yearly, features, limits) VALUES
('Free', 0, 0, 
 '{"career_recommendations": true, "basic_assessment": true, "basic_roadmap": true, "blog_access": true}',
 '{"career_detail_level": "basic", "assessments_per_month": 5, "roadmap_max_level": 1}'
),
('Premium', 99000, 990000,
 '{"career_recommendations": true, "unlimited_assessment": true, "full_roadmap": true, "blog_access": true, "priority_support": true, "advanced_analytics": true}',
 '{"career_detail_level": "full", "assessments_per_month": -1, "roadmap_max_level": -1}'
),
('Pro', 199000, 1990000,
 '{"career_recommendations": true, "unlimited_assessment": true, "full_roadmap": true, "blog_access": true, "priority_support": true, "advanced_analytics": true, "ai_career_coach": true, "custom_reports": true}',
 '{"career_detail_level": "full", "assessments_per_month": -1, "roadmap_max_level": -1}'
)
ON CONFLICT (name) DO NOTHING;

-- 5. Tạo index cho hiệu suất
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_user_id ON core.user_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_feature ON core.user_usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON core.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON core.user_subscriptions(status);

-- 6. Tạo function để reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE core.user_usage_tracking 
    SET usage_count = 0, 
        last_reset_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE feature_type = 'assessment' 
    AND last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 7. Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_usage_tracking_updated_at ON core.user_usage_tracking;
CREATE TRIGGER trigger_update_usage_tracking_updated_at
    BEFORE UPDATE ON core.user_usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_tracking_updated_at();

DROP TRIGGER IF EXISTS trigger_update_user_subscriptions_updated_at ON core.user_subscriptions;
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
    BEFORE UPDATE ON core.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_tracking_updated_at();

COMMIT;