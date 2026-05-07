-- =====================================================
-- Migration 003: Enhanced Career Levels System - SCHEMA
-- Thay thế career_levels đơn giản bằng hệ thống levels theo từng nhóm
-- Date: 2026-04-18
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: DROP OLD TABLES
-- =====================================================

-- Xóa bảng career_levels cũ (quá đơn giản, chỉ có 5 levels chung)
DROP TABLE IF EXISTS core.career_levels CASCADE;

-- =====================================================
-- SECTION 2: CREATE NEW TABLES
-- =====================================================

-- Bảng levels theo từng nhóm ngành (mỗi group có 3-5 levels riêng)
CREATE TABLE IF NOT EXISTS core.career_group_levels (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES core.career_groups(id) ON DELETE CASCADE,
    level_order INTEGER NOT NULL CHECK (level_order >= 1 AND level_order <= 10),
    level_name_vi TEXT NOT NULL,
    level_name_en TEXT NOT NULL,
    level_slug TEXT NOT NULL,
    min_exp_years INTEGER NOT NULL CHECK (min_exp_years >= 0),
    max_exp_years INTEGER CHECK (max_exp_years IS NULL OR max_exp_years > min_exp_years),
    job_zone_mapping TEXT, -- '1,2' or '3,4,5'
    seniority_keywords TEXT[], -- ['manager', 'senior', 'lead']
    description_vi TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, level_order),
    UNIQUE(group_id, level_slug)
);

-- Bảng mapping career → level (một career có thể có nhiều levels)
CREATE TABLE IF NOT EXISTS core.career_level_mapping (
    id SERIAL PRIMARY KEY,
    career_id BIGINT NOT NULL REFERENCES core.careers(id) ON DELETE CASCADE,
    group_level_id INTEGER NOT NULL REFERENCES core.career_group_levels(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detection_method TEXT CHECK (detection_method IN ('title_keyword', 'job_zone', 'experience_text', 'manual', 'default')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(career_id, group_level_id)
);

-- =====================================================
-- SECTION 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_career_group_levels_group ON core.career_group_levels(group_id);
CREATE INDEX idx_career_group_levels_order ON core.career_group_levels(level_order);
CREATE INDEX idx_career_group_levels_slug ON core.career_group_levels(level_slug);
CREATE INDEX idx_career_group_levels_keywords ON core.career_group_levels USING GIN(seniority_keywords);
CREATE INDEX idx_career_group_levels_exp ON core.career_group_levels(min_exp_years, max_exp_years);

CREATE INDEX idx_career_level_mapping_career ON core.career_level_mapping(career_id);
CREATE INDEX idx_career_level_mapping_level ON core.career_level_mapping(group_level_id);
CREATE INDEX idx_career_level_mapping_primary ON core.career_level_mapping(is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_career_level_mapping_method ON core.career_level_mapping(detection_method);
CREATE INDEX idx_career_level_mapping_confidence ON core.career_level_mapping(confidence_score DESC);

-- =====================================================
-- SECTION 4: ADD COMMENTS
-- =====================================================

COMMENT ON TABLE core.career_group_levels IS 'Career levels specific to each career group (e.g., IT has Fresher→Lead, Healthcare has Intern→Chief)';
COMMENT ON TABLE core.career_level_mapping IS 'Maps careers to their appropriate levels with confidence scores';

COMMENT ON COLUMN core.career_group_levels.seniority_keywords IS 'Keywords found in job titles (e.g., [''manager'', ''senior'', ''lead''])';
COMMENT ON COLUMN core.career_group_levels.job_zone_mapping IS 'Comma-separated job zones (e.g., ''1,2'' or ''4,5'')';
COMMENT ON COLUMN core.career_level_mapping.confidence_score IS 'Confidence in the mapping (0.0-1.0)';
COMMENT ON COLUMN core.career_level_mapping.detection_method IS 'How the level was detected: title_keyword, job_zone, experience_text, manual, default';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $
BEGIN
    RAISE NOTICE 'Migration 003 Schema completed successfully!';
    RAISE NOTICE 'Tables created: career_group_levels, career_level_mapping';
    RAISE NOTICE 'Old career_levels table dropped';
    RAISE NOTICE 'Next: Run 004_enhanced_career_levels_data.sql to seed levels';
END $;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (COMMENTED)
-- =====================================================

/*
-- TO ROLLBACK THIS MIGRATION:

DROP TABLE IF EXISTS core.career_level_mapping CASCADE;
DROP TABLE IF EXISTS core.career_group_levels CASCADE;

-- Recreate simple career_levels table
CREATE TABLE core.career_levels (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    order_index INTEGER NOT NULL,
    min_exp INTEGER NOT NULL,
    max_exp INTEGER,
    job_zone_mapping TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- =====================================================
-- END OF MIGRATION 003
-- =====================================================