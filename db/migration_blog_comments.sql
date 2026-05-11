-- Migration: Create Blog Comments System
-- Description: Creates tables for blog comments with nested replies, likes, and soft delete support
-- Author: System
-- Date: 2026-03-11

-- Create blog_comments table
CREATE TABLE IF NOT EXISTS core.blog_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES core.blog_posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES core.blog_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT blog_comments_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 5000)
);

-- Create indexes for blog_comments
CREATE INDEX idx_blog_comments_post_id ON core.blog_comments(post_id);
CREATE INDEX idx_blog_comments_user_id ON core.blog_comments(user_id);
CREATE INDEX idx_blog_comments_parent_id ON core.blog_comments(parent_id);
CREATE INDEX idx_blog_comments_created_at ON core.blog_comments(created_at DESC);
CREATE INDEX idx_blog_comments_is_deleted ON core.blog_comments(is_deleted);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS core.comment_likes (
    id BIGSERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL REFERENCES core.blog_comments(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- Create indexes for comment_likes
CREATE INDEX idx_comment_likes_comment_id ON core.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON core.comment_likes(user_id);

-- Create trigger to update like_count when a like is added
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

CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR DELETE ON core.comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_comment_timestamp
BEFORE UPDATE ON core.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_blog_comment_timestamp();

-- Create rate limiting table for spam protection
CREATE TABLE IF NOT EXISTS core.comment_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES core.blog_posts(id) ON DELETE CASCADE,
    comment_count INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_post_window UNIQUE (user_id, post_id)
);

CREATE INDEX idx_comment_rate_limits_user_post ON core.comment_rate_limits(user_id, post_id);
CREATE INDEX idx_comment_rate_limits_window_start ON core.comment_rate_limits(window_start);

-- Add comments to tables
COMMENT ON TABLE core.blog_comments IS 'Stores blog post comments with support for nested replies and soft delete';
COMMENT ON TABLE core.comment_likes IS 'Tracks user likes on comments';
COMMENT ON TABLE core.comment_rate_limits IS 'Rate limiting for spam protection (max 10 comments per user per post per hour)';
COMMENT ON COLUMN core.blog_comments.parent_id IS 'NULL for top-level comments, references parent comment for replies';
COMMENT ON COLUMN core.blog_comments.is_deleted IS 'Soft delete flag - deleted comments show as [deleted] but preserve thread structure';
COMMENT ON COLUMN core.blog_comments.like_count IS 'Denormalized count of likes for performance';
