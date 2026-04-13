-- Migration: Add cv_file_url column to skill_gap_analyses
-- Run this once against your database

ALTER TABLE core.skill_gap_analyses
    ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(1024);

COMMENT ON COLUMN core.skill_gap_analyses.cv_file_url IS 'Cloudflare R2 public URL of the uploaded CV file';
