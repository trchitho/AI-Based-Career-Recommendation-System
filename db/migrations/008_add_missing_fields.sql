-- Migration: 008_add_missing_fields
-- Feature: Ensure all required fields exist in interview schema
-- Date: 2026-04-22
-- Description:
--   Đảm bảo tất cả các cột cần thiết tồn tại trong interview_sessions.
--   Migration này an toàn để chạy nhiều lần (IF NOT EXISTS).
--   Bao gồm tất cả fields từ migrations 001-007.

-- ─── interview_sessions: Đảm bảo tất cả cột tồn tại ─────────────────────────

ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS question_distribution JSONB,
    ADD COLUMN IF NOT EXISTS skills_context JSONB,
    ADD COLUMN IF NOT EXISTS market_context JSONB;

-- ─── interview_sessions: Constraint ──────────────────────────────────────────

-- Xóa constraint cũ nếu có
ALTER TABLE interview.interview_sessions
    DROP CONSTRAINT IF EXISTS chk_question_count_range;

-- Thêm constraint mới (tối đa 25 câu)
ALTER TABLE interview.interview_sessions
    ADD CONSTRAINT chk_question_count_range
    CHECK (question_count >= 1 AND question_count <= 25);

-- ─── interview_sessions: Indexes ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id
    ON interview.interview_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_job_id
    ON interview.interview_sessions (job_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status
    ON interview.interview_sessions (status);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_market_context
    ON interview.interview_sessions USING GIN (market_context);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_skills_context
    ON interview.interview_sessions USING GIN (skills_context);

-- ─── interview_messages: Đảm bảo tất cả cột tồn tại ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id
    ON interview.interview_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_interview_messages_role
    ON interview.interview_messages (role);

-- ─── job_descriptions: Đảm bảo tất cả cột tồn tại ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_jd_user_id
    ON interview.job_descriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_jd_career_id
    ON interview.job_descriptions (career_id);

-- ─── Verify ───────────────────────────────────────────────────────────────────

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'interview'
  AND table_name = 'interview_sessions'
ORDER BY ordinal_position;
