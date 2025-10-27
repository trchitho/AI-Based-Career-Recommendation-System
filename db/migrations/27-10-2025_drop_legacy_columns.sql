BEGIN;

-- 0) Drop view phụ thuộc (nếu có) để gỡ khóa cột cũ
DROP VIEW IF EXISTS core.v_retrieval_with_career CASCADE;

-- 1) Xóa 3 cột legacy (an toàn, có kiểm tra tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='careers' AND column_name='title'
  ) THEN
    EXECUTE 'ALTER TABLE core.careers DROP COLUMN title';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='careers' AND column_name='short_desc'
  ) THEN
    EXECUTE 'ALTER TABLE core.careers DROP COLUMN short_desc';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='careers' AND column_name='content_md'
  ) THEN
    EXECUTE 'ALTER TABLE core.careers DROP COLUMN content_md';
  END IF;
END$$;

COMMIT;