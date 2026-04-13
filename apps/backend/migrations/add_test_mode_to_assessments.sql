-- Migration: Add test_mode column to core.assessments table
-- Date: 2026-03-02
-- Description: Add test_mode field to track whether assessment was done via traditional or story mode

-- Add test_mode column
ALTER TABLE core.assessments 
ADD COLUMN IF NOT EXISTS test_mode TEXT;

-- Add comment
COMMENT ON COLUMN core.assessments.test_mode IS 'Assessment mode: traditional, story, or enhanced';

-- Optional: Set default for existing records
UPDATE core.assessments 
SET test_mode = 'traditional' 
WHERE test_mode IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_assessments_test_mode 
ON core.assessments(test_mode);
