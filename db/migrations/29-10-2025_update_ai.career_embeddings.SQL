BEGIN;

-- 1. core.careers.onet_code phải UNIQUE để có thể làm FK từ ai.career_embeddings.job_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'core.careers'::regclass
      AND contype = 'u'
      AND conname = 'careers_onet_code_key'
  ) THEN
    -- Nếu có trùng onet_code thì bước này sẽ fail -> cần dọn dữ liệu trước
    ALTER TABLE core.careers
      ADD CONSTRAINT careers_onet_code_key UNIQUE (onet_code);
  END IF;
END$$;

-- 2. Thêm cột job_id (TEXT) nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='ai' AND table_name='career_embeddings' AND column_name='job_id'
  ) THEN
    ALTER TABLE ai.career_embeddings
      ADD COLUMN job_id TEXT;
  END IF;
END$$;

-- 3. Backfill job_id từ core.careers.onet_code (mapping qua career_id)
UPDATE ai.career_embeddings e
SET job_id = c.onet_code
FROM core.careers c
WHERE c.id = e.career_id
  AND e.job_id IS NULL;

-- 4. Index/UNIQUE + FK (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'career_embeddings_job_id_key'
  ) THEN
    ALTER TABLE ai.career_embeddings
      ADD CONSTRAINT career_embeddings_job_id_key UNIQUE (job_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'ai.career_embeddings'::regclass
      AND contype = 'f'
      AND conname = 'career_embeddings_job_id_fkey'
  ) THEN
    ALTER TABLE ai.career_embeddings
      ADD CONSTRAINT career_embeddings_job_id_fkey
      FOREIGN KEY (job_id)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;

  -- (Tùy chọn) Index cho truy vấn theo career_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'career_embeddings_career_id_idx'
  ) THEN
    CREATE INDEX career_embeddings_career_id_idx
      ON ai.career_embeddings (career_id);
  END IF;

  -- (Tùy chọn) Index theo built_at để audit
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'career_embeddings_built_at_idx'
  ) THEN
    CREATE INDEX career_embeddings_built_at_idx
      ON ai.career_embeddings (built_at);
  END IF;
END$$;

COMMIT;
