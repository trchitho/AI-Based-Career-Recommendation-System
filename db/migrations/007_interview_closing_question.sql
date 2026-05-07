-- Migration: 007_interview_closing_question
-- Feature: Closing Question + Skills Context Enhancement
-- Date: 2026-04-22
-- Description:
--   1. Thêm câu hỏi closing vào cuối mỗi buổi phỏng vấn
--      - question_count tăng thêm 1 (closing) so với số câu user chọn
--      - question_distribution bao gồm closing: 1
--   2. skills_context bao gồm cả soft skills và hard skills (is_hard_skill flag)
--   3. Cập nhật constraint question_count để cho phép giá trị lớn hơn
--   4. Cập nhật comment cho question_distribution

-- ─── 1. Cập nhật constraint question_count ────────────────────────────────────
-- Xóa constraint cũ nếu có (giới hạn 3-20 không còn phù hợp)
ALTER TABLE interview.interview_sessions
    DROP CONSTRAINT IF EXISTS chk_question_count_range;

-- Thêm constraint mới: cho phép tối đa 25 câu
-- (12 base + 3 JD + 1 closing = 16, để dư margin)
ALTER TABLE interview.interview_sessions
    ADD CONSTRAINT chk_question_count_range
    CHECK (question_count >= 1 AND question_count <= 25);

-- ─── 2. Cập nhật comment cho question_distribution ────────────────────────────
COMMENT ON COLUMN interview.interview_sessions.question_distribution IS
'Phân bố câu hỏi theo loại: warm_up, technical, behavioral, situational, jd_specific, closing.
Closing luôn = 1 và là câu hỏi cuối cùng (HR hỏi ứng viên có câu hỏi gì không).
Ví dụ 5 câu: {"warm_up":1,"technical":2,"behavioral":1,"situational":1,"closing":1} = 6 total';

-- ─── 3. Cập nhật comment cho skills_context ───────────────────────────────────
COMMENT ON COLUMN interview.interview_sessions.skills_context IS
'Danh sách skills của nghề nghiệp, bao gồm cả soft skills và hard skills.
Mỗi skill có: skill_name, skill_type, importance, level, is_hard_skill (boolean).
Khi có JD: hard skills được thay bằng JD required_skills + tools.
Format: [{"skill_name":"...", "skill_type":"...", "importance":4.5, "level":4.0, "is_hard_skill":true/false}]';

-- ─── 4. Cập nhật comment cho market_context ───────────────────────────────────
COMMENT ON COLUMN interview.interview_sessions.market_context IS
'Context cho interview session:
- effective_level: fresher|junior|middle|senior|lead
- has_jd: boolean - có JD upload không
- jd_questions_count: số câu hỏi từ JD
- jd_data: full JD extracted data (required_skills, tools, responsibilities)
- level_context: full level context object
- has_level: boolean
Format: {"effective_level":"junior","has_jd":false,"jd_questions_count":0,...}';

-- ─── 5. Đảm bảo question_count default đúng ──────────────────────────────────
-- Default 5 là số câu user chọn, thực tế sẽ là 6 (5+1 closing)
-- Không thay đổi default vì logic tính trong code
ALTER TABLE interview.interview_sessions
    ALTER COLUMN question_count SET DEFAULT 5;

-- ─── 6. Verify ────────────────────────────────────────────────────────────────
-- Kiểm tra constraint mới
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'interview'
  AND constraint_name = 'chk_question_count_range';

-- Kiểm tra max question_count hiện tại
SELECT
    MAX(question_count) as max_qc,
    MIN(question_count) as min_qc,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN question_distribution::text LIKE '%closing%' THEN 1 END) as sessions_with_closing
FROM interview.interview_sessions;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- ALTER TABLE interview.interview_sessions
--     DROP CONSTRAINT IF EXISTS chk_question_count_range;
-- ALTER TABLE interview.interview_sessions
--     ADD CONSTRAINT chk_question_count_range
--     CHECK (question_count >= 3 AND question_count <= 20);
