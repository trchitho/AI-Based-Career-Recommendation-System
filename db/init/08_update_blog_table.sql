BEGIN;

-- ================
-- 0) Fix schema mâu thuẫn blog_posts.author_id (khuyến nghị)
-- NOT NULL + ON DELETE SET NULL là sai logic.
-- Chọn 1:
--  A) Giữ dữ liệu bài viết khi user bị xóa => cho phép NULL
--  B) Xóa luôn bài viết khi user bị xóa => ON DELETE CASCADE
-- Ở đây chọn A (phổ biến cho blog).
-- ================
ALTER TABLE core.blog_posts
  ALTER COLUMN author_id DROP NOT NULL;

-- ================
-- 1) Thêm các cột mới vào blog_posts
-- ================
ALTER TABLE core.blog_posts
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_image TEXT,
  ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- backfill để tránh NULL rác (nếu trước đó cột đã tồn tại mà null)
UPDATE core.blog_posts SET tags = '[]'::jsonb WHERE tags IS NULL;
UPDATE core.blog_posts SET view_count = 0 WHERE view_count IS NULL;
UPDATE core.blog_posts SET is_featured = FALSE WHERE is_featured IS NULL;

-- ================
-- 2) Bổ sung giá trị ENUM blog_status (đây là chỗ bạn bị lỗi)
-- ================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'blog_status' AND n.nspname = 'core'
  ) THEN
    RAISE NOTICE 'Type core.blog_status does not exist. Skip enum alter.';
  ELSE
    -- Add values if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'core' AND t.typname = 'blog_status' AND e.enumlabel = 'Pending'
    ) THEN
      EXECUTE 'ALTER TYPE core.blog_status ADD VALUE ''Pending''';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'core' AND t.typname = 'blog_status' AND e.enumlabel = 'Rejected'
    ) THEN
      EXECUTE 'ALTER TYPE core.blog_status ADD VALUE ''Rejected''';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'core' AND t.typname = 'blog_status' AND e.enumlabel = 'Archived'
    ) THEN
      EXECUTE 'ALTER TYPE core.blog_status ADD VALUE ''Archived''';
    END IF;
  END IF;
END$$;

-- NOTE: Với enum rồi thì CHECK là thừa và có thể gây lỗi nếu lệch.
-- => BỎ phần check_blog_status.

-- ================
-- 3) Index tối ưu
-- ================
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON core.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON core.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON core.blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON core.blog_posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON core.blog_posts USING GIN(tags);

-- ================
-- 4) Trigger auto update updated_at
-- ================
CREATE OR REPLACE FUNCTION core.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blog_posts_updated_at ON core.blog_posts;
CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON core.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION core.update_blog_posts_updated_at();

-- ================
-- 5) Bảng blog_categories
-- ================
CREATE TABLE IF NOT EXISTS core.blog_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON core.blog_categories(slug);

-- seed data
INSERT INTO core.blog_categories (name, slug, description, color) VALUES
('Career Advice', 'career-advice', 'Lời khuyên và hướng dẫn nghề nghiệp', '#10B981'),
('Job Search', 'job-search', 'Mẹo tìm kiếm việc làm hiệu quả', '#3B82F6'),
('Interview Tips', 'interview-tips', 'Chuẩn bị và vượt qua phỏng vấn', '#8B5CF6'),
('Skill Development', 'skill-development', 'Phát triển kỹ năng chuyên môn', '#F59E0B'),
('Industry Insights', 'industry-insights', 'Thông tin và xu hướng ngành', '#EF4444')
ON CONFLICT (slug) DO NOTHING;

-- ================
-- 6) Bảng blog_tags
-- ================
CREATE TABLE IF NOT EXISTS core.blog_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON core.blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_usage_count ON core.blog_tags(usage_count DESC);

COMMIT;
