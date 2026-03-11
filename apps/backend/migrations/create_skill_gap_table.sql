-- Migration: Create skill_gap_analyses table
-- Description: Lưu trữ kết quả phân tích skill gap từ CV

CREATE TABLE IF NOT EXISTS core.skill_gap_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    career_id VARCHAR(100) NOT NULL,
    
    -- CV information
    cv_filename VARCHAR(255),
    cv_text_preview TEXT,
    
    -- Analysis results (stored as JSONB for flexibility)
    cv_skills JSONB,
    job_skills JSONB,
    matched_skills JSONB,
    skill_gaps JSONB,
    extra_skills JSONB,
    
    -- Metrics
    match_percentage FLOAT,
    total_required_skills INTEGER,
    matched_skills_count INTEGER,
    missing_skills_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT skill_gap_analyses_user_id_idx FOREIGN KEY (user_id) REFERENCES core.users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_skill_gap_user_id ON core.skill_gap_analyses(user_id);
CREATE INDEX idx_skill_gap_career_id ON core.skill_gap_analyses(career_id);
CREATE INDEX idx_skill_gap_created_at ON core.skill_gap_analyses(created_at DESC);
CREATE INDEX idx_skill_gap_match_percentage ON core.skill_gap_analyses(match_percentage);

-- Add comments
COMMENT ON TABLE core.skill_gap_analyses IS 'Lưu trữ kết quả phân tích lỗ hổng kỹ năng từ CV';
COMMENT ON COLUMN core.skill_gap_analyses.cv_skills IS 'Danh sách kỹ năng trích xuất từ CV (JSON)';
COMMENT ON COLUMN core.skill_gap_analyses.job_skills IS 'Danh sách kỹ năng yêu cầu từ job (JSON)';
COMMENT ON COLUMN core.skill_gap_analyses.matched_skills IS 'Kỹ năng phù hợp (JSON)';
COMMENT ON COLUMN core.skill_gap_analyses.skill_gaps IS 'Lỗ hổng kỹ năng phân loại theo mức độ (JSON)';
COMMENT ON COLUMN core.skill_gap_analyses.match_percentage IS 'Phần trăm phù hợp (0-100)';
