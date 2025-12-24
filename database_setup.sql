-- =====================================================
-- 4-TIER PREMIUM SYSTEM DATABASE SETUP
-- =====================================================
-- Chạy file này để setup database cho hệ thống 4 gói
-- Free (0đ) → Basic (99k) → Premium (299k) → Pro (499k)

-- 1. Cập nhật bảng subscriptions với expires_at
-- =====================================================
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Cập nhật expires_at cho các subscription hiện tại (1 năm từ created_at)
UPDATE subscriptions 
SET expires_at = created_at + INTERVAL '1 year'
WHERE expires_at IS NULL;

-- 2. Thêm dữ liệu mẫu cho test 4-tier system
-- =====================================================

-- Tạo user test cho từng gói
INSERT INTO users (email, password_hash, full_name, is_verified, created_at) VALUES
('free@test.com', '$2b$12$example_hash', 'Free User Test', true, NOW()),
('basic@test.com', '$2b$12$example_hash', 'Basic User Test', true, NOW()),
('premium@test.com', '$2b$12$example_hash', 'Premium User Test', true, NOW()),
('pro@test.com', '$2b$12$example_hash', 'Pro User Test', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Lấy user IDs
DO $$
DECLARE
    free_user_id INTEGER;
    basic_user_id INTEGER;
    premium_user_id INTEGER;
    pro_user_id INTEGER;
BEGIN
    SELECT id INTO free_user_id FROM users WHERE email = 'free@test.com';
    SELECT id INTO basic_user_id FROM users WHERE email = 'basic@test.com';
    SELECT id INTO premium_user_id FROM users WHERE email = 'premium@test.com';
    SELECT id INTO pro_user_id FROM users WHERE email = 'pro@test.com';

    -- Tạo payments cho test users
    INSERT INTO payments (user_id, order_id, amount, description, status, payment_method, created_at) VALUES
    (basic_user_id, 'TEST_BASIC_001', 99000, 'Thanh toán Gói Cơ Bản', 'success', 'zalopay', NOW() - INTERVAL '1 day'),
    (premium_user_id, 'TEST_PREMIUM_001', 299000, 'Thanh toán Gói Premium', 'success', 'zalopay', NOW() - INTERVAL '2 days'),
    (pro_user_id, 'TEST_PRO_001', 499000, 'Thanh toán Gói Pro', 'success', 'zalopay', NOW() - INTERVAL '3 days')
    ON CONFLICT (order_id) DO NOTHING;

    -- Tạo subscriptions cho test users
    INSERT INTO subscriptions (user_id, plan_name, status, created_at, expires_at) VALUES
    (basic_user_id, 'Gói Cơ Bản', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '364 days'),
    (premium_user_id, 'Gói Premium', 'active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '363 days'),
    (pro_user_id, 'Gói Pro', 'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '362 days')
    ON CONFLICT DO NOTHING;
END $$;

-- 3. Cập nhật enum cho blog status (nếu cần)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_status_enum') THEN
        CREATE TYPE blog_status_enum AS ENUM ('draft', 'published', 'archived');
    END IF;
END $$;

-- Cập nhật bảng blogs nếu chưa có status column
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS status blog_status_enum DEFAULT 'draft';

-- 4. Tạo indexes để tối ưu performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 5. Tạo view để dễ dàng query subscription info
-- =====================================================
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    COALESCE(s.plan_name, 'Free') as plan_name,
    COALESCE(s.status, 'active') as status,
    s.created_at as subscription_created_at,
    s.expires_at,
    CASE 
        WHEN s.expires_at IS NULL THEN NULL
        WHEN s.expires_at > NOW() THEN EXTRACT(days FROM s.expires_at - NOW())::INTEGER
        ELSE 0
    END as days_remaining,
    CASE 
        WHEN s.plan_name IS NULL THEN false
        ELSE true
    END as is_premium,
    p.amount as last_payment_amount,
    p.created_at as last_payment_date
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'success'
    AND p.created_at = (
        SELECT MAX(created_at) 
        FROM payments p2 
        WHERE p2.user_id = u.id AND p2.status = 'success'
    );

-- 6. Function để check feature access
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_plan_features(user_email TEXT)
RETURNS TABLE (
    plan_name TEXT,
    is_premium BOOLEAN,
    days_remaining INTEGER,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(usi.plan_name, 'Free') as plan_name,
        usi.is_premium,
        usi.days_remaining,
        CASE 
            WHEN usi.plan_name = 'Gói Pro' THEN 
                '{"unlimited_assessments": true, "unlimited_careers": true, "career_roadmap": true, "pdf_export": true, "progress_tracking": true, "career_counseling": true}'::jsonb
            WHEN usi.plan_name = 'Gói Premium' THEN 
                '{"unlimited_assessments": true, "unlimited_careers": true, "career_roadmap": true, "detailed_analysis": true}'::jsonb
            WHEN usi.plan_name = 'Gói Cơ Bản' THEN 
                '{"career_recommendations": true, "career_roadmap": true, "skill_assessment": true, "career_view": true}'::jsonb
            ELSE 
                '{"career_recommendations": true}'::jsonb
        END as features
    FROM user_subscription_info usi
    WHERE usi.email = user_email;
END;
$$ LANGUAGE plpgsql;

-- 7. Cleanup old test data (optional)
-- =====================================================
-- Uncomment nếu muốn xóa data test cũ
-- DELETE FROM subscriptions WHERE plan_name LIKE '%test%';
-- DELETE FROM payments WHERE description LIKE '%test%';

-- 8. Verify setup
-- =====================================================
-- Check user subscription info
SELECT 
    email,
    plan_name,
    is_premium,
    days_remaining,
    subscription_created_at
FROM user_subscription_info 
ORDER BY 
    CASE plan_name 
        WHEN 'Free' THEN 1 
        WHEN 'Gói Cơ Bản' THEN 2 
        WHEN 'Gói Premium' THEN 3 
        WHEN 'Gói Pro' THEN 4 
        ELSE 5 
    END;

-- Check feature access for test users
SELECT * FROM check_user_plan_features('free@test.com');
SELECT * FROM check_user_plan_features('basic@test.com');
SELECT * FROM check_user_plan_features('premium@test.com');
SELECT * FROM check_user_plan_features('pro@test.com');

-- =====================================================
-- SETUP COMPLETED SUCCESSFULLY! 
-- =====================================================
-- Bây giờ bạn có thể test 4-tier system với:
-- - free@test.com (Free plan)
-- - basic@test.com (Basic plan - 99k)
-- - premium@test.com (Premium plan - 299k) 
-- - pro@test.com (Pro plan - 499k)
-- =====================================================