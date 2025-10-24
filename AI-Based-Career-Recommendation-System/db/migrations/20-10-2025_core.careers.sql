BEGIN;

-- Migrate careers table to support multilingual columns without dropping data
-- 1) Add columns if missing
ALTER TABLE core.careers
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_vi text,
  ADD COLUMN IF NOT EXISTS short_desc_en text,
  ADD COLUMN IF NOT EXISTS short_desc_vn text;

-- 2) Backfill from existing columns when new columns are null
UPDATE core.careers SET
  title_en = COALESCE(title_en, title),
  title_vi = COALESCE(title_vi, title),
  short_desc_en = COALESCE(short_desc_en, short_desc),
  short_desc_vn = COALESCE(short_desc_vn, short_desc);

-- 3) Ensure unique constraint on onet_code exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'careers_onet_code_key'
  ) THEN
    ALTER TABLE core.careers ADD CONSTRAINT careers_onet_code_key UNIQUE (onet_code);
  END IF;
END$$;

-- 4) Ensure index
CREATE INDEX IF NOT EXISTS idx_core_careers_onet ON core.careers(onet_code);

-- 5) Comments
COMMENT ON COLUMN core.careers.title_en IS 'Tên nghề tiếng Anh (chuẩn O*NET)';
COMMENT ON COLUMN core.careers.title_vi IS 'Tên nghề tiếng Việt';
COMMENT ON COLUMN core.careers.short_desc_en IS 'Mô tả ngắn tiếng Anh';
COMMENT ON COLUMN core.careers.short_desc_vn IS 'Mô tả ngắn tiếng Việt';

COMMIT;
