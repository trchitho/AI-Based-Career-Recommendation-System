BEGIN;

-- 0) Schema
CREATE SCHEMA IF NOT EXISTS core;

-- 1) Bảng (đúng shape mà tools/load_careers.py đang dùng)
CREATE TABLE IF NOT EXISTS core.careers (
  id             BIGSERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT,
  short_desc     TEXT,
  content_md     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  onet_code      TEXT,
  title_en       TEXT,
  title_vi       TEXT,
  short_desc_en  TEXT,
  short_desc_vn  TEXT
);

-- 2) Bổ sung cột còn thiếu (an toàn)
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS onet_code      TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS title_en       TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS title_vi       TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS short_desc_en  TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS short_desc_vn  TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS short_desc     TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS content_md     TEXT;
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS title          TEXT;

-- 3) Ràng buộc cần thiết
ALTER TABLE core.careers ALTER COLUMN slug SET NOT NULL;

-- 4) Dọn cột cũ không dùng (nếu có)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='careers' AND column_name='category_id'
  ) THEN
    EXECUTE 'ALTER TABLE core.careers DROP COLUMN category_id';
  END IF;
END$$;

-- 5) Đảm bảo unique theo onet_code bằng UNIQUE INDEX (tránh trùng tên constraint)
CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_onet_code ON core.careers(onet_code);

-- 6) (tuỳ chọn) index phụ
-- CREATE INDEX IF NOT EXISTS idx_core_careers_onet ON core.careers(onet_code);

-- 7) Comment cột (best-effort, dùng EXECUTE với nháy đơn double)
DO $$
BEGIN
  BEGIN
    EXECUTE 'COMMENT ON COLUMN core.careers.title_en IS ''Tên nghề tiếng Anh (chuẩn O*NET)''';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    EXECUTE 'COMMENT ON COLUMN core.careers.title_vi IS ''Tên nghề tiếng Việt''';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    EXECUTE 'COMMENT ON COLUMN core.careers.short_desc_en IS ''Mô tả ngắn tiếng Anh''';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    EXECUTE 'COMMENT ON COLUMN core.careers.short_desc_vn IS ''Mô tả ngắn tiếng Việt''';
  EXCEPTION WHEN OTHERS THEN NULL; END;
END$$;

-- 8) Grant (best-effort)
DO $$
BEGIN
  BEGIN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core.careers TO career_user';
  EXCEPTION WHEN OTHERS THEN NULL; END;
END$$;

-- 9) Đồng bộ sequence với dữ liệu hiện có
SELECT setval(
  pg_get_serial_sequence('core.careers','id'),
  COALESCE((SELECT MAX(id)+1 FROM core.careers),1),
  false
);

COMMIT;
