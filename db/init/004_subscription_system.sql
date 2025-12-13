-- Migration: Subscription System
-- Hệ thống quản lý subscription và giới hạn cho user miễn phí

-- Bảng subscription plans
CREATE TABLE IF NOT EXISTS core.subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    
    -- Giới hạn tính năng
    max_assessments_per_month INTEGER DEFAULT 5,
    max_career_views INTEGER DEFAULT 1,
    max_roadmap_level INTEGER DEFAULT 1,
    can_view_all_careers BOOLEAN DEFAULT FALSE,
    can_view_full_roadmap BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    description TEXT,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng user subscriptions
CREATE TABLE IF NOT EXISTS core.user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES core.subscription_plans(id),
    
    -- Thời gian
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Trạng thái
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    
    -- Payment reference
    payment_id INTEGER REFERENCES core.payments(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_active_subscription UNIQUE (user_id, status)
);

-- Bảng usage tracking
CREATE TABLE IF NOT EXISTS core.user_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    
    -- Tracking theo tháng
    month INTEGER NOT NULL, -- 1-12
    year INTEGER NOT NULL,
    
    -- Counters
    assessments_count INTEGER DEFAULT 0,
    careers_viewed JSONB DEFAULT '[]'::jsonb, -- Array of career IDs
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_month UNIQUE (user_id, year, month)
);

-- Insert default plans
INSERT INTO core.subscription_plans (name, display_name, price, duration_days, max_assessments_per_month, max_career_views, max_roadmap_level, can_view_all_careers, can_view_full_roadmap, description, features)
VALUES 
    ('free', 'Miễn phí', 0, 30, 5, 1, 1, FALSE, FALSE, 
     'Gói miễn phí với giới hạn cơ bản',
     '["5 bài test/tháng", "Xem 1 nghề nghiệp", "Roadmap Level 1"]'::jsonb),
    
    ('basic', 'Gói Cơ Bản', 99000, 30, 20, 5, 2, FALSE, FALSE,
     'Gói cơ bản cho người dùng cá nhân',
     '["20 bài test/tháng", "Xem 5 nghề nghiệp", "Roadmap Level 1-2"]'::jsonb),
    
    ('premium', 'Gói Premium', 299000, 30, -1, -1, -1, TRUE, TRUE,
     'Gói premium không giới hạn',
     '["Không giới hạn bài test", "Xem tất cả nghề nghiệp", "Roadmap đầy đủ", "Hỗ trợ ưu tiên"]'::jsonb),
    
    ('enterprise', 'Gói Doanh Nghiệp', 999000, 30, -1, -1, -1, TRUE, TRUE,
     'Gói doanh nghiệp với tính năng cao cấp',
     '["Tất cả tính năng Premium", "API access", "Quản lý team", "Hỗ trợ 24/7"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price = EXCLUDED.price,
    max_assessments_per_month = EXCLUDED.max_assessments_per_month,
    max_career_views = EXCLUDED.max_career_views,
    max_roadmap_level = EXCLUDED.max_roadmap_level,
    can_view_all_careers = EXCLUDED.can_view_all_careers,
    can_view_full_roadmap = EXCLUDED.can_view_full_roadmap,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON core.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON core.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON core.user_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON core.user_usage(user_id, year, month);

-- Link payments -> subscription_plans (nullable)
ALTER TABLE IF EXISTS core.payments
    ADD COLUMN IF NOT EXISTS subscription_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_payments_subscription_id'
          AND conrelid = 'core.payments'::regclass
    ) THEN
        ALTER TABLE core.payments
            ADD CONSTRAINT fk_payments_subscription_id
            FOREIGN KEY (subscription_id) REFERENCES core.subscription_plans(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON core.payments(subscription_id);

-- Comments
COMMENT ON TABLE core.subscription_plans IS 'Các gói subscription';
COMMENT ON TABLE core.user_subscriptions IS 'Subscription của user';
COMMENT ON TABLE core.user_usage IS 'Tracking usage của user theo tháng';
COMMENT ON COLUMN core.subscription_plans.max_assessments_per_month IS '-1 = unlimited';
COMMENT ON COLUMN core.subscription_plans.max_career_views IS '-1 = unlimited';
COMMENT ON COLUMN core.subscription_plans.max_roadmap_level IS '-1 = unlimited';
