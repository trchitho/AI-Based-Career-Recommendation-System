-- Nếu đang có transaction lỗi, reset trước
ROLLBACK;

DO $$
BEGIN
  -- Nếu bảng tạm đã tồn tại, xóa đi
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='core' AND tablename='careers_new') THEN
    EXECUTE 'DROP TABLE core.careers_new CASCADE';
  END IF;
END$$;

BEGIN;

-- Tạo bảng tạm với thứ tự cột đúng mong muốn
CREATE TABLE core.careers_new AS
SELECT 
    id,
    slug,
    title_en,
    title_vi,
    short_desc_en,
    short_desc_vn,
    created_at,
    updated_at,
    onet_code
FROM core.careers
ORDER BY id;

-- Bổ sung ràng buộc NOT NULL + IDENTITY cho id
ALTER TABLE core.careers_new 
  ALTER COLUMN id SET NOT NULL;

-- Tạo sequence mới (vì CREATE TABLE AS không sao chép identity)
CREATE SEQUENCE IF NOT EXISTS core.careers_id_seq START WITH 1 OWNED BY core.careers_new.id;

-- Gán identity theo sequence mới
ALTER TABLE core.careers_new ALTER COLUMN id SET DEFAULT nextval('core.careers_id_seq');

-- Xoá bảng cũ & đổi tên bảng mới
DROP TABLE core.careers CASCADE;
ALTER TABLE core.careers_new RENAME TO careers;

-- Khóa chính & unique
ALTER TABLE core.careers ADD PRIMARY KEY (id);

ALTER TABLE core.careers
  ADD CONSTRAINT careers_onet_code_key UNIQUE (onet_code);

-- Index
CREATE INDEX IF NOT EXISTS idx_core_careers_onet
  ON core.careers (onet_code);

-- Gán quyền & comment mô tả
COMMENT ON COLUMN core.careers.title_en IS 'Tên nghề tiếng Anh (chuẩn O*NET)';
COMMENT ON COLUMN core.careers.title_vi IS 'Tên nghề tiếng Việt';
COMMENT ON COLUMN core.careers.short_desc_en IS 'Mô tả ngắn tiếng Anh';
COMMENT ON COLUMN core.careers.short_desc_vn IS 'Mô tả ngắn tiếng Việt';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core.careers TO career_user;

COMMIT;


BEGIN;

-- Nếu sequence chưa tồn tại thì tạo mới
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'careers_id_seq'
  ) THEN
    CREATE SEQUENCE core.careers_id_seq START WITH 1;
  END IF;
END$$;

-- Đặt sequence làm default cho id
ALTER TABLE core.careers 
  ALTER COLUMN id SET DEFAULT nextval('core.careers_id_seq');

-- Gắn quyền sở hữu
ALTER SEQUENCE core.careers_id_seq OWNED BY core.careers.id;

-- Cập nhật giá trị sequence tới MAX(id) hiện có
SELECT setval('core.careers_id_seq', COALESCE((SELECT MAX(id)+1 FROM core.careers), 1), false);

COMMIT;
