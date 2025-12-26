-- Drop unused legacy tables
-- These tables are no longer used in the current codebase
-- Current system uses: core.user_subscriptions and core.user_usage_tracking

-- Step 1: Backup data first (optional - run these SELECT queries to export if needed)
-- SELECT * FROM core.subscriptions;
-- SELECT * FROM core.user_test_quota;

-- Step 2: Drop tables safely (CASCADE will remove dependent objects like indexes)
DROP TABLE IF EXISTS core.subscriptions CASCADE;
DROP TABLE IF EXISTS core.user_test_quota CASCADE;

-- Step 3: Verify tables are dropped
-- Run this to confirm:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'core' AND table_name IN ('subscriptions', 'user_test_quota');
