-- Migration: Add personal info columns to skill_gap_analyses table
-- Date: 2026-03-08
-- Description: Add cv_name, cv_email, cv_phone columns to store extracted personal information

-- Add new columns
ALTER TABLE core.skill_gap_analyses 
ADD COLUMN IF NOT EXISTS cv_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cv_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS cv_phone VARCHAR(50);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skill_gap_cv_email ON core.skill_gap_analyses(cv_email);
CREATE INDEX IF NOT EXISTS idx_skill_gap_cv_name ON core.skill_gap_analyses(cv_name);

-- Add comment
COMMENT ON COLUMN core.skill_gap_analyses.cv_name IS 'Full name extracted from CV';
COMMENT ON COLUMN core.skill_gap_analyses.cv_email IS 'Email address extracted from CV';
COMMENT ON COLUMN core.skill_gap_analyses.cv_phone IS 'Phone number extracted from CV';
