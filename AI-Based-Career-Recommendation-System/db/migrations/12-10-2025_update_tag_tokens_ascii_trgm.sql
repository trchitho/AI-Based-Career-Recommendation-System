-- 03_normalize_tags_and_trgm.sql
-- Chuẩn hoá tag_tokens từ cột tags_vi (xử lý unaccent + lowercase + '_' + loại bỏ ký tự đặc biệt)
-- + bật extension unaccent và pg_trgm để tìm kiếm không dấu & fuzzy

-- 1️⃣ Bật các extension cần thiết
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2️⃣ Chuẩn hoá lại tag_tokens từ cột tags_vi
UPDATE ai.retrieval_jobs_visbert
SET tag_tokens = ARRAY(
  SELECT regexp_replace(
           translate(lower(unaccent(t)), ' ', '_'),
           '[^a-z0-9_]+', '', 'g'
         )
  FROM unnest( string_to_array(coalesce(tags_vi, ''), '|') ) AS t
  WHERE length(t) > 0
);

-- 3️⃣ Tạo index để tăng tốc cho tìm kiếm full-text hoặc fuzzy match
CREATE INDEX IF NOT EXISTS idx_tags_vi_trgm
  ON ai.retrieval_jobs_visbert
  USING gin (tags_vi gin_trgm_ops);

-- 4️⃣ (Tuỳ chọn) ví dụ filter test — KHÔNG cần chạy khi import batch
-- SELECT job_id, title
-- FROM ai.retrieval_jobs_visbert
-- WHERE tags_vi ILIKE ANY (
--         ARRAY['%công nghệ thông tin%','%dữ liệu%','%trực quan hóa%','%sql%','%etl%']
--       )
--    OR tag_tokens && ARRAY['cong_nghe_thong_tin','du_lieu','truc_quan_hoa','sql','etl'];
