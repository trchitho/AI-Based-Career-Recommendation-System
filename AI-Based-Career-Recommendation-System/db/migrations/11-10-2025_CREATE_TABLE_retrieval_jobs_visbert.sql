-- 2.1 Bật extension vector (nếu chưa)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2.2 Bảng lưu embedding vi-SBERT (768D) trong schema ai
CREATE TABLE IF NOT EXISTS ai.retrieval_jobs_visbert (
  id               BIGSERIAL PRIMARY KEY,
  job_id           TEXT NOT NULL,                 -- từ jobs_index_visbert.json
  title            TEXT,
  tags_vi          TEXT,
  tag_tokens       TEXT[] DEFAULT '{}',           -- ["quản_lý","học_chủ_động",...]
  riasec_centroid  REAL[] DEFAULT NULL,           -- [R,I,A,S,E,C] nếu có
  embedding        vector(768) NOT NULL,          -- vi-SBERT 768D
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Index vector IVF (cosine). Điều chỉnh lists theo N (ví dụ 50-100 là đủ)
CREATE INDEX IF NOT EXISTS ivf_jobs_visbert_cos
ON ai.retrieval_jobs_visbert
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 2.4 GIN cho lọc theo tag_tokens
CREATE INDEX IF NOT EXISTS gin_jobs_visbert_tags
ON ai.retrieval_jobs_visbert
USING gin (tag_tokens);

-- 2.5 Tối ưu tìm kiếm gần đúng
SET ivfflat.probes = 10;   -- có thể tăng 16/24 khi N lớn hơn
ANALYZE ai.retrieval_jobs_visbert;
