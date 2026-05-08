-- Migration: 001_jd_feature_migration
-- Feature: JD (Job Description) Ingestion Pipeline
-- Date: 2025-07
-- Description:
--   1. Tạo bảng interview.job_descriptions
--   2. Thêm cột question_count, question_distribution vào interview_sessions

-- ─── 1. Tạo bảng job_descriptions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interview.job_descriptions (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL,       -- References core.users.id
    career_id      VARCHAR,               -- O*NET code, nullable
    raw_text       TEXT NOT NULL,         -- Nội dung JD gốc
    extracted_data JSONB,                 -- Dữ liệu đã parse bởi AI (xem format bên dưới)
    source         VARCHAR DEFAULT 'manual', -- 'manual' | 'pdf' | 'docx'
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jd_user_id   ON interview.job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_jd_career_id ON interview.job_descriptions(career_id);

-- ─── 2. Thêm cột thiếu vào interview_sessions ────────────────────────────────

ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS question_count        INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS question_distribution JSONB;

-- ─── extracted_data JSONB format ─────────────────────────────────────────────
-- {
--   "required_skills":  ["Java", "Spring Boot", ...],   -- ít nhất 5-10 items
--   "tools":            ["MySQL", "Git", "Maven", ...], -- ít nhất 5-10 items
--   "responsibilities": ["Training 3 tháng", ...],
--   "training_program": ["Java Core", "Spring Framework", ...],
--   "qualifications":   ["Tiếng Nhật N3", "TOEIC 650+"],
--   "experience_level": "Fresher | Junior | Middle | Senior",
--   "domain":           "Web Backend",
--   "company_name":     "FPT Software",
--   "location":         "Da Nang",
--   "company_culture":  "...",
--   "benefits":         ["Lương 21tr/khóa", ...]
-- }

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS interview.job_descriptions;
-- ALTER TABLE interview.interview_sessions
--     DROP COLUMN IF EXISTS question_count,
--     DROP COLUMN IF EXISTS question_distribution;
