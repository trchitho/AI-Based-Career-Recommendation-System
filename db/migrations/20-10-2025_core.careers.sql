BEGIN;

-- Create careers table if missing (safe shape)
CREATE TABLE IF NOT EXISTS core.careers (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  category_id BIGINT,
  short_desc TEXT,
  content_md TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  onet_code TEXT,
  title_en TEXT,
  title_vi TEXT,
  short_desc_en TEXT,
  short_desc_vn TEXT
);

-- Ensure columns exist (idempotent)
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS title_vi TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS short_desc_en TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS short_desc_vn TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS onet_code TEXT;

-- Unique and indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_onet_code ON core.careers(onet_code);
CREATE INDEX IF NOT EXISTS idx_core_careers_onet ON core.careers(onet_code);

-- Comments (columns now ensured to exist)
COMMENT ON COLUMN core.careers.title_en IS 'Tên nghề tiếng Anh (chuẩn O*NET)';
COMMENT ON COLUMN core.careers.title_vi IS 'Tên nghề tiếng Việt';
COMMENT ON COLUMN core.careers.short_desc_en IS 'Mô tả ngắn tiếng Anh';
COMMENT ON COLUMN core.careers.short_desc_vn IS 'Mô tả ngắn tiếng Việt';

-- Grant (best-effort)
DO $$ BEGIN
  BEGIN EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core.careers TO career_user';
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- Ensure sequence aligned to max(id)
SELECT setval(pg_get_serial_sequence('core.careers','id'), COALESCE((SELECT MAX(id)+1 FROM core.careers),1), false);

COMMIT;
