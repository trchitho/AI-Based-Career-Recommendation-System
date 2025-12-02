-- ==========================================================
-- File: 03_create_quick_essay_tables.sql
-- Purpose: Tạo bảng lưu essay "search nhanh" (Quick Essay)
--           + embedding riêng cho quick essay (Retrieval/NLP)
--           + view chọn text ưu tiên hiển thị cho profile
-- Author: Tran Chi Tho
-- Date: 2025-11-05
-- ==========================================================

-- 1️⃣ Bảng core.essay_quick_inputs
CREATE TABLE IF NOT EXISTS core.essay_quick_inputs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
  session_id      UUID,
  prompt_id       BIGINT REFERENCES core.essay_prompts(id) ON DELETE SET NULL,
  text            TEXT NOT NULL,
  lang            TEXT NOT NULL DEFAULT 'vi',
  used_for_profile BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_essay_user
  ON core.essay_quick_inputs(user_id);

CREATE INDEX IF NOT EXISTS idx_quick_essay_time
  ON core.essay_quick_inputs(created_at DESC);

-- (Optional) nếu bạn bật pg_trgm extension:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_quick_essay_text_trgm
--   ON core.essay_quick_inputs USING gin (text gin_trgm_ops);

-- ----------------------------------------------------------

-- 2️⃣ Bảng ai.quick_text_embeddings
CREATE TABLE IF NOT EXISTS ai.quick_text_embeddings (
  input_id    BIGINT PRIMARY KEY REFERENCES core.essay_quick_inputs(id) ON DELETE CASCADE,
  emb         vector(768) NOT NULL,
  model_name  TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('retrieval','essay')),
  built_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qte_ivf_cos
  ON ai.quick_text_embeddings USING ivfflat (emb vector_cosine_ops)
  WITH (lists=50);

-- ----------------------------------------------------------

-- 3️⃣ VIEW: core.v_user_latest_text
CREATE OR REPLACE VIEW core.v_user_latest_text AS
SELECT u.id AS user_id,
       e.content AS text,
       e.lang,
       e.created_at,
       'test_essay'::text AS source
FROM core.users u
JOIN LATERAL (
  SELECT * FROM core.essays ce
  WHERE ce.user_id = u.id
  ORDER BY ce.created_at DESC
  LIMIT 1
) e ON TRUE

UNION ALL
SELECT u.id AS user_id,
       q.text,
       q.lang,
       q.created_at,
       'quick_essay'::text AS source
FROM core.users u
LEFT JOIN LATERAL (
  SELECT * FROM core.essay_quick_inputs qi
  WHERE qi.user_id = u.id
    AND qi.used_for_profile = TRUE
  ORDER BY qi.created_at DESC
  LIMIT 1
) q ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM core.essays ce WHERE ce.user_id = u.id
);

-- ==========================================================
-- End of 06_create_quick_essay_tables.sql
-- ==========================================================
