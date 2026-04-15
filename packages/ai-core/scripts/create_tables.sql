-- ============================================
-- SQL Script: create_tables.sql
-- Purpose: Create missing tables for O*NET data
-- Author: Senior Data Engineer
-- Date: 2026-01-27
-- ============================================

-- Table 1: career_dwas (Detailed Work Activities)
CREATE TABLE IF NOT EXISTS core.career_dwas (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    element_id VARCHAR(20),
    iwa_id VARCHAR(30),
    dwa_id VARCHAR(50) NOT NULL,
    dwa_title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_dwas_onet ON core.career_dwas(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_dwas_dwa_id ON core.career_dwas(dwa_id);

COMMENT ON TABLE core.career_dwas IS 'Detailed Work Activities mapped to O*NET occupations';

-- Table 2: career_work_activities (General Work Activities)
CREATE TABLE IF NOT EXISTS core.career_work_activities (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    element_id VARCHAR(20) NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    scale_id VARCHAR(10),
    data_value NUMERIC(5,2),
    n INTEGER,
    standard_error NUMERIC(5,4),
    date VARCHAR(10),
    domain_source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_work_activities_onet ON core.career_work_activities(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_work_activities_element ON core.career_work_activities(element_id);

COMMENT ON TABLE core.career_work_activities IS 'General Work Activities with importance and level ratings';

-- Table 3: career_work_context (Work Context/Environment)
CREATE TABLE IF NOT EXISTS core.career_work_context (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    element_id VARCHAR(20) NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    scale_id VARCHAR(10),
    category INTEGER,
    data_value NUMERIC(5,2),
    n INTEGER,
    standard_error NUMERIC(5,4),
    date VARCHAR(10),
    domain_source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_work_context_onet ON core.career_work_context(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_work_context_element ON core.career_work_context(element_id);

COMMENT ON TABLE core.career_work_context IS 'Work context and environmental conditions';

-- Table 4: career_education_pct (Education Level Distribution)
CREATE TABLE IF NOT EXISTS core.career_education_pct (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    element_id VARCHAR(20) NOT NULL,
    element_name VARCHAR(255) NOT NULL,
    category INTEGER NOT NULL,
    category_description VARCHAR(255),
    data_value NUMERIC(5,2),
    n INTEGER,
    standard_error NUMERIC(5,4),
    date VARCHAR(10),
    domain_source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_education_pct_onet ON core.career_education_pct(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_education_pct_category ON core.career_education_pct(category);

COMMENT ON TABLE core.career_education_pct IS 'Education level distribution percentages';

-- Table 5: career_prep (Job Zones/Preparation Levels)
CREATE TABLE IF NOT EXISTS core.career_prep (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL UNIQUE,
    job_zone INTEGER NOT NULL,
    date VARCHAR(10),
    domain_source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_prep_onet ON core.career_prep(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_prep_job_zone ON core.career_prep(job_zone);

COMMENT ON TABLE core.career_prep IS 'Job preparation levels (Job Zones 1-5)';

-- Table 6: career_wages_us (Salary/Wage Data)
-- Note: This table structure depends on actual wage file format
-- Placeholder structure based on typical O*NET wage data
CREATE TABLE IF NOT EXISTS core.career_wages_us (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    annual_median NUMERIC(10,2),
    annual_10th_percentile NUMERIC(10,2),
    annual_25th_percentile NUMERIC(10,2),
    annual_75th_percentile NUMERIC(10,2),
    annual_90th_percentile NUMERIC(10,2),
    hourly_median NUMERIC(8,2),
    hourly_10th_percentile NUMERIC(8,2),
    hourly_25th_percentile NUMERIC(8,2),
    hourly_75th_percentile NUMERIC(8,2),
    hourly_90th_percentile NUMERIC(8,2),
    date VARCHAR(10),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_wages_us_onet ON core.career_wages_us(onet_code);

COMMENT ON TABLE core.career_wages_us IS 'US wage and salary data by occupation';

-- Table 7: career_mapping_esco (O*NET to ESCO/ISCO Crosswalk)
CREATE TABLE IF NOT EXISTS core.career_mapping_esco (
    id SERIAL PRIMARY KEY,
    onet_code VARCHAR(10) NOT NULL,
    onet_title VARCHAR(255),
    esco_code VARCHAR(20) NOT NULL,
    esco_title VARCHAR(255),
    isco_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_onet ON core.career_mapping_esco(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_esco ON core.career_mapping_esco(esco_code);
CREATE INDEX IF NOT EXISTS idx_career_mapping_esco_isco ON core.career_mapping_esco(isco_code);

COMMENT ON TABLE core.career_mapping_esco IS 'Crosswalk mapping between O*NET, ESCO, and ISCO codes';

-- ============================================
-- Grant permissions (adjust as needed)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO your_app_user;

-- ============================================
-- Verification queries
-- ============================================
-- SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
-- FROM information_schema.tables
-- WHERE table_schema = 'core'
-- ORDER BY table_name;
