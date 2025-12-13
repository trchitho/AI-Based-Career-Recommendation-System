-- SQL script để cập nhật bảng blog_posts với các cột mới
-- Chạy script này để thêm các tính năng blog mở rộng

-- 1. Thêm các cột mới vào bảng blog_posts
ALTER TABLE core.blog_posts 
ADD COLUMN IF NOT EXISTS excerpt TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 2. Tạo index cho các cột mới để tối ưu hiệu suất
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON core.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON core.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON core.blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON core.blog_posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON core.blog_posts USING GIN(tags);

-- 3. Cập nhật trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
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
    EXECUTE FUNCTION update_blog_posts_updated_at();

-- 4. Thêm ràng buộc dữ liệu
ALTER TABLE core.blog_posts 
ADD CONSTRAINT check_blog_status 
CHECK (status IN ('Draft', 'Published', 'Pending', 'Rejected', 'Archived'));

-- 5. Tạo bảng blog_categories để quản lý danh mục
CREATE TABLE IF NOT EXISTS core.blog_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Thêm dữ liệu mẫu cho blog_categories
INSERT INTO core.blog_categories (name, slug, description, color) VALUES
('Career Advice', 'career-advice', 'Lời khuyên và hướng dẫn nghề nghiệp', '#10B981'),
('Job Search', 'job-search', 'Mẹo tìm kiếm việc làm hiệu quả', '#3B82F6'),
('Interview Tips', 'interview-tips', 'Chuẩn bị và vượt qua phỏng vấn', '#8B5CF6'),
('Skill Development', 'skill-development', 'Phát triển kỹ năng chuyên môn', '#F59E0B'),
('Industry Insights', 'industry-insights', 'Thông tin và xu hướng ngành', '#EF4444')
ON CONFLICT (slug) DO NOTHING;

-- 7. Tạo bảng blog_tags để quản lý tags
CREATE TABLE IF NOT EXISTS core.blog_tags (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    usage_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tạo index cho các bảng mới
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON core.blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON core.blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_usage_count ON core.blog_tags(usage_count DESC);

COMMIT;