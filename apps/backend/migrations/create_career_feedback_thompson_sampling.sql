-- Migration: Create analytics.career_feedback for Thompson Sampling
-- Description: Lưu trữ phản hồi của người dùng (Like) cho từng nghề nghiệp,
--              dùng để re-rank gợi ý theo thuật toán Thompson Sampling (Beta distribution).
--
-- Chạy file này một lần duy nhất trên database:
--   psql -h localhost -p 5433 -U postgres -d career_ai -f migrations/create_career_feedback_thompson_sampling.sql
--
-- Hoặc dùng Python (nếu không có psql trong PATH):
--   python -c "
--     import psycopg2, pathlib
--     conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai')
--     conn.autocommit = True
--     conn.cursor().execute(pathlib.Path('migrations/create_career_feedback_thompson_sampling.sql').read_text())
--     print('Done')
--   "
-- ============================================================

-- Bảng chính: lưu alpha/beta của Beta distribution cho mỗi cặp (user, nghề)
CREATE TABLE IF NOT EXISTS analytics.career_feedback (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    job_onet    TEXT         NOT NULL,   -- O*NET code, ví dụ: '15-1252.00'

    -- Tham số Beta distribution (Thompson Sampling)
    -- alpha = số lần Like + 1       (prior = 1 → Beta(1,1) đồng đều)
    -- beta  = số lần bỏ qua/dislike + 1
    -- E[θ] = alpha / (alpha + beta) → xác suất user thích nghề này
    alpha       INTEGER      NOT NULL DEFAULT 1
                             CONSTRAINT career_feedback_alpha_positive CHECK (alpha >= 1),
    beta        INTEGER      NOT NULL DEFAULT 1
                             CONSTRAINT career_feedback_beta_positive  CHECK (beta  >= 1),

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Mỗi user chỉ có một hàng cho mỗi nghề (UPSERT target)
    UNIQUE (user_id, job_onet)
);

-- Index tra cứu nhanh tất cả nghề user đã Like (dùng khi apply_boost)
CREATE INDEX IF NOT EXISTS idx_career_feedback_user
    ON analytics.career_feedback (user_id);

-- Index phụ: truy vấn theo nghề (ví dụ: xem ai đã like nghề này)
CREATE INDEX IF NOT EXISTS idx_career_feedback_job_onet
    ON analytics.career_feedback (job_onet);

-- Comments mô tả bảng và cột
COMMENT ON TABLE  analytics.career_feedback
    IS 'Phản hồi của user với nghề nghiệp được gợi ý. Alpha/Beta dùng cho Thompson Sampling re-ranking.';

COMMENT ON COLUMN analytics.career_feedback.user_id
    IS 'ID người dùng (FK tới core.users.id, không ràng buộc cứng để tránh cascade)';

COMMENT ON COLUMN analytics.career_feedback.job_onet
    IS 'O*NET code của nghề, ví dụ: 15-1252.00 (Software Developers)';

COMMENT ON COLUMN analytics.career_feedback.alpha
    IS 'Tổng số lần Like + 1 (prior). Mỗi lần bấm Like tăng alpha lên 1.';

COMMENT ON COLUMN analytics.career_feedback.beta
    IS 'Tổng số lần bỏ qua + 1 (prior). Tăng khi user thấy nghề nhưng không Like.';

COMMENT ON COLUMN analytics.career_feedback.updated_at
    IS 'Thời điểm cập nhật alpha/beta gần nhất (tự động update qua trigger hoặc application)';
