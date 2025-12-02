-- 1) Extension cho vector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Schema
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS core;

-- 3) Bảng index English SBERT (768D)
CREATE TABLE IF NOT EXISTS ai.retrieval_jobs_ensbert (
  id               BIGSERIAL PRIMARY KEY,
  job_id           TEXT        NOT NULL UNIQUE,  -- ví dụ: '15-1251.00'
  title            TEXT,
  description      TEXT,
  tags_en          TEXT,                         -- "data|bi|sql"
  tag_tokens       TEXT[],                       -- có thể NULL
  riasec_centroid  vector(6),                    -- nếu có
  embedding        vector(768) NOT NULL,         -- English SBERT 768D
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Index ANN (cosine)
CREATE INDEX IF NOT EXISTS idx_ensbert_embedding_ivf
ON ai.retrieval_jobs_ensbert
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5) Fulltext index
CREATE INDEX IF NOT EXISTS idx_ensbert_ft_en
ON ai.retrieval_jobs_ensbert
USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(tags_en,'')));

ANALYZE ai.retrieval_jobs_ensbert;
