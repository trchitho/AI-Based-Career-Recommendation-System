-- Create blog_posts table
CREATE TABLE IF NOT EXISTS core.blog_posts (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content_md TEXT NOT NULL,
    status TEXT DEFAULT 'Draft',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON core.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON core.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON core.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON core.blog_posts(published_at DESC);

-- Create comments table (if needed)
CREATE TABLE IF NOT EXISTS core.comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES core.blog_posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES core.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'Visible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON core.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON core.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON core.comments(parent_id);
