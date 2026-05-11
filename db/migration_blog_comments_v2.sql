-- ============================
-- BLOG COMMENT SYSTEM - PRODUCTION READY
-- ============================

-- 1️⃣ COMMENTS TABLE
CREATE TABLE IF NOT EXISTS core.blog_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_post FOREIGN KEY (post_id) REFERENCES core.blog_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_comment FOREIGN KEY (parent_id) REFERENCES core.blog_comments(id) ON DELETE CASCADE,
    CONSTRAINT chk_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 5000)
);

-- 2️⃣ COMMENT LIKES TABLE
CREATE TABLE IF NOT EXISTS core.comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id),
    CONSTRAINT fk_comment FOREIGN KEY (comment_id) REFERENCES core.blog_comments(id) ON DELETE CASCADE
);

-- 3️⃣ RATE LIMIT TABLE
CREATE TABLE IF NOT EXISTS core.comment_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    comment_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- 4️⃣ INDEXES
CREATE INDEX IF NOT EXISTS idx_comments_post ON core.blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON core.blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON core.blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON core.blog_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON core.blog_comments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON core.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON core.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_post ON core.comment_rate_limits(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON core.comment_rate_limits(window_start);

-- 5️⃣ TRIGGER: Auto update like_count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE core.blog_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE core.blog_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_like_count ON core.comment_likes;
CREATE TRIGGER trg_update_like_count
AFTER INSERT OR DELETE ON core.comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- 6️⃣ TRIGGER: Auto update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_update ON core.blog_comments;
CREATE TRIGGER trg_comment_update
BEFORE UPDATE ON core.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 7️⃣ SEED TEST DATA
INSERT INTO core.blog_posts (author_id, title, slug, content_md, excerpt, category, status, published_at, created_at, updated_at)
VALUES (1, 'Hướng dẫn phát triển sự nghiệp hiệu quả', 'huong-dan-phat-trien-su-nghiep-hieu-qua',
'# Hướng dẫn phát triển sự nghiệp hiệu quả', 'Hướng dẫn chi tiết về cách phát triển sự nghiệp hiệu quả trong thời đại số.',
'Career Development', 'Published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO core.users (email, full_name, password_hash, role, is_email_verified, created_at)
VALUES
    ('john.doe@example.com', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP),
    ('jane.smith@example.com', 'Jane Smith', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP),
    ('mike.wilson@example.com', 'Mike Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPyS1.S6', 'user', true, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO core.blog_comments (post_id, user_id, content, created_at, updated_at)
VALUES
    (1, 1, 'Bài viết rất hữu ích! Những lời khuyên về networking đặc biệt có giá trị.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 2, 'Tôi đã áp dụng phương pháp SMART goals và thấy hiệu quả rõ rệt. Recommend!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 3, 'Có thể chia sẻ thêm về cách tìm mentor phù hợp không?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 1, 'Kỹ năng số hóa thực sự quan trọng. Bạn nào có kinh nghiệm học online courses?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO core.blog_comments (post_id, user_id, parent_id, content, created_at, updated_at)
VALUES
    (1, 2, 1, 'Mình cũng đồng ý! Networking đã giúp mình tìm được công việc hiện tại.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 3, 1, 'LinkedIn thực sự hiệu quả cho việc networking.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 1, 3, 'Về việc tìm mentor, mình suggest bạn tham gia các group chuyên ngành trên LinkedIn.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 2, 4, 'Coursera và Udemy có nhiều khóa học chất lượng.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO core.comment_likes (comment_id, user_id, created_at)
VALUES (1, 2, CURRENT_TIMESTAMP),(1, 3, CURRENT_TIMESTAMP),(2, 1, CURRENT_TIMESTAMP),
       (2, 3, CURRENT_TIMESTAMP),(3, 1, CURRENT_TIMESTAMP),(5, 1, CURRENT_TIMESTAMP),(7, 2, CURRENT_TIMESTAMP)
ON CONFLICT (comment_id, user_id) DO NOTHING;

-- 8️⃣ VERIFICATION
SELECT schemaname, tablename, tableowner
FROM pg_tables WHERE schemaname = 'core' AND tablename LIKE '%comment%' ORDER BY tablename;

SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'core' AND tablename LIKE '%comment%' ORDER BY tablename, indexname;

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'core' AND event_object_table LIKE '%comment%'
ORDER BY event_object_table, trigger_name;

-- 9️⃣ DATA VERIFICATION
SELECT 'blog_comments' as table_name, COUNT(*) as record_count FROM core.blog_comments
UNION ALL SELECT 'comment_likes', COUNT(*) FROM core.comment_likes
UNION ALL SELECT 'comment_rate_limits', COUNT(*) FROM core.comment_rate_limits
ORDER BY table_name;

SELECT c.id, c.content, c.parent_id, c.user_id, u.full_name,
    c.like_count,
    CASE WHEN c.parent_id IS NULL THEN 'Main Comment' ELSE 'Reply' END as comment_type
FROM core.blog_comments c
LEFT JOIN core.users u ON c.user_id = u.id
WHERE c.post_id = 1 AND c.is_deleted = false
ORDER BY COALESCE(c.parent_id, c.id), c.created_at;

DO $$
BEGIN
    RAISE NOTICE '🎉 Blog Comment System Installation Complete!';
    RAISE NOTICE '   - Tables: blog_comments, comment_likes, comment_rate_limits';
    RAISE NOTICE '   - Indexes: 9 performance indexes created';
    RAISE NOTICE '   - Triggers: like_count auto-update, updated_at timestamp';
    RAISE NOTICE '   - Test Data: Sample comments and likes inserted';
    RAISE NOTICE '✅ System is ready for production use!';
END $$;
