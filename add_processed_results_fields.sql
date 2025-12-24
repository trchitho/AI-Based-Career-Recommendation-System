-- Migration to add processed results fields to assessments table
-- This allows storing AI-processed RIASEC/Big Five scores for persistence

ALTER TABLE core.assessments 
ADD COLUMN IF NOT EXISTS processed_riasec_scores JSONB,
ADD COLUMN IF NOT EXISTS processed_big_five_scores JSONB,
ADD COLUMN IF NOT EXISTS top_interest TEXT,
ADD COLUMN IF NOT EXISTS career_recommendations JSONB,
ADD COLUMN IF NOT EXISTS essay_analysis JSONB;

-- Add comments for documentation
COMMENT ON COLUMN core.assessments.processed_riasec_scores IS 'AI-processed RIASEC scores (0-1 scale) for persistence';
COMMENT ON COLUMN core.assessments.processed_big_five_scores IS 'AI-processed Big Five scores (0-1 scale) for persistence';
COMMENT ON COLUMN core.assessments.top_interest IS 'Top RIASEC interest letter (R/I/A/S/E/C)';
COMMENT ON COLUMN core.assessments.career_recommendations IS 'Array of recommended career IDs';
COMMENT ON COLUMN core.assessments.essay_analysis IS 'AI analysis of user essay responses';