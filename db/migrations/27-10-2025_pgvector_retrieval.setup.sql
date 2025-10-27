BEGIN;

CREATE SCHEMA IF NOT EXISTS ai;

-- Extension vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng lưu jobs đã encode (768d)
CREATE TABLE IF NOT EXISTS ai.retrieval_jobs_visbert(
  id                   BIGSERIAL PRIMARY KEY,
  job_id               TEXT NOT NULL UNIQUE,           -- thường = onet_code
  title_vi             TEXT,
  skills_vi            TEXT,
  tags_vi              TEXT,
  tag_tokens           TEXT[] DEFAULT '{}',
  riasec_centroid      REAL[],                         -- nếu có trong catalog
  embedding            VECTOR(768) NOT NULL,
  model_name           TEXT DEFAULT 'vi-sbert',
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- GIN trigram cho filter nhanh theo tags/text (tuỳ chọn)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ai_tags_vi_trgm
  ON ai.retrieval_jobs_visbert
  USING gin (tags_vi gin_trgm_ops);

-- IVF index cho truy vấn vector cosine
-- (đổi sang vector_ip_ops nếu bạn dùng inner product)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='ai' AND indexname='ix_ai_retrieval_jobs_visbert_vec'
  ) THEN
    EXECUTE 'CREATE INDEX ix_ai_retrieval_jobs_visbert_vec
             ON ai.retrieval_jobs_visbert
             USING ivfflat (embedding vector_cosine_ops)
             WITH (lists = 100)';
  END IF;
END$$;

COMMIT;
