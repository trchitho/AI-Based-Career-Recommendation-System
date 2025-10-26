-- đảm bảo có UNIQUE(name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'career_tags_name_key'
      AND conrelid = 'core.career_tags'::regclass
  ) THEN
    ALTER TABLE core.career_tags
      ADD CONSTRAINT career_tags_name_key UNIQUE (name);
  END IF;
END$$;

-- gắn DEFAULT tự tăng cho id nếu đang thiếu
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='career_tags'
      AND column_name='id' AND column_default IS NULL
  ) THEN
    CREATE SEQUENCE IF NOT EXISTS core.career_tags_id_seq;
    ALTER TABLE core.career_tags
      ALTER COLUMN id SET DEFAULT nextval('core.career_tags_id_seq');

    -- đồng bộ sequence với giá trị hiện tại
    PERFORM setval('core.career_tags_id_seq',
                   COALESCE((SELECT MAX(id) FROM core.career_tags), 0));
  END IF;
END$$;
