-- Fix user_usage_tracking table: Add unique constraint for ON CONFLICT
-- This fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- First, check if the constraint already exists
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_usage_tracking_user_feature_unique'
    ) THEN
        ALTER TABLE core.user_usage_tracking 
        ADD CONSTRAINT user_usage_tracking_user_feature_unique 
        UNIQUE (user_id, feature_type);
        
        RAISE NOTICE 'Added unique constraint user_usage_tracking_user_feature_unique';
    ELSE
        RAISE NOTICE 'Constraint user_usage_tracking_user_feature_unique already exists';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'core.user_usage_tracking'::regclass
  AND conname = 'user_usage_tracking_user_feature_unique';
