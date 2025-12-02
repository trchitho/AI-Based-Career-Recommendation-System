-- ==========================================================
-- File: 04_update_assessments_and_create_trait_tables.sql
-- Purpose:
--   1️⃣ Chuẩn hóa bảng core.assessments (phân tách rõ RIASEC / BIG5)
--   2️⃣ Thêm cột response_set_id để liên kết nhóm câu trả lời
--   3️⃣ Tạo 2 bảng AI riêng lưu kết quả NLP và dữ liệu hợp nhất
-- Author: Tran Chi Tho
-- Date: 2025-11-05
-- ==========================================================

-- ----------------------------------------------------------
-- 1️⃣ Cập nhật bảng core.assessments
-- ----------------------------------------------------------

-- Chuyển kiểu dữ liệu cho rõ ràng (nếu chưa đúng)
ALTER TABLE core.assessments
  ALTER COLUMN a_type TYPE TEXT,
  ALTER COLUMN scores TYPE JSONB USING scores::jsonb;

-- (Khuyến nghị) mỗi record tương ứng 1 loại test
--   a_type ∈ ('RIASEC','BIG5')
--   scores chỉ chứa đúng nhóm điểm tương ứng (vd: {"R":..,"I":..} hoặc {"O":..,"C":..})

-- Thêm cột liên kết đợt làm bài (nếu chưa có)
ALTER TABLE core.assessments
  ADD COLUMN IF NOT EXISTS response_set_id BIGINT;

-- Index để truy xuất nhanh theo người dùng + loại test
CREATE INDEX IF NOT EXISTS idx_assess_user_type
  ON core.assessments (user_id, a_type);

-- ----------------------------------------------------------
-- 2️⃣ Bảng lưu kết quả dự đoán NLP (PhoBERT)
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai.user_trait_preds (
  user_id     BIGINT PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  riasec_pred REAL[6] NOT NULL,      -- [R,I,A,S,E,C] trên [0..1]
  big5_pred   REAL[5] NOT NULL,      -- [O,C,E,A,N] trên [0..1]
  model_name  TEXT NOT NULL DEFAULT 'phobert',
  built_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ai.user_trait_preds IS
  'Kết quả dự đoán tính cách từ NLP (PhoBERT), không ghi đè điểm test thật.';

COMMENT ON COLUMN ai.user_trait_preds.riasec_pred IS 'Điểm RIASEC [0..1] dự đoán từ essay.';
COMMENT ON COLUMN ai.user_trait_preds.big5_pred IS 'Điểm BigFive [0..1] dự đoán từ essay.';

-- ----------------------------------------------------------
-- 3️⃣ Bảng lưu dữ liệu hợp nhất (test + NLP)
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai.user_trait_fused (
  user_id      BIGINT PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  riasec_final REAL[6] NOT NULL,    -- pha trộn test & NLP
  big5_final   REAL[5] NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('test_only','nlp_only','blend_0.7')),
  built_at     TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ai.user_trait_fused IS
  'Dữ liệu pha trộn giữa điểm test và điểm NLP (final traits dùng cho Ranking).';

-- ----------------------------------------------------------
-- End of 07_update_assessments_and_create_trait_tables.sql
-- ==========================================================
