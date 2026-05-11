-- ============================
-- BLOG POST REACTIONS SYSTEM
-- ============================

ALTER TABLE core.blog_posts
    ADD COLUMN IF NOT EXISTS like_count BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dislike_count BIGINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS core.blog_post_reactions (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    CONSTRAINT fk_reaction_post FOREIGN KEY (post_id) REFERENCES core.blog_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_post_reactions_post_id ON core.blog_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_reactions_user_id ON core.blog_post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_reactions_type ON core.blog_post_reactions(reaction_type);

CREATE OR REPLACE FUNCTION update_blog_post_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE core.blog_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        ELSIF NEW.reaction_type = 'dislike' THEN
            UPDATE core.blog_posts SET dislike_count = dislike_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.reaction_type != NEW.reaction_type THEN
            IF OLD.reaction_type = 'like' THEN
                UPDATE core.blog_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
            ELSIF OLD.reaction_type = 'dislike' THEN
                UPDATE core.blog_posts SET dislike_count = GREATEST(dislike_count - 1, 0) WHERE id = OLD.post_id;
            END IF;
            IF NEW.reaction_type = 'like' THEN
                UPDATE core.blog_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
            ELSIF NEW.reaction_type = 'dislike' THEN
                UPDATE core.blog_posts SET dislike_count = dislike_count + 1 WHERE id = NEW.post_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE core.blog_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
        ELSIF OLD.reaction_type = 'dislike' THEN
            UPDATE core.blog_posts SET dislike_count = GREATEST(dislike_count - 1, 0) WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_blog_post_reaction_counts ON core.blog_post_reactions;
CREATE TRIGGER trg_update_blog_post_reaction_counts
AFTER INSERT OR UPDATE OR DELETE ON core.blog_post_reactions
FOR EACH ROW EXECUTE FUNCTION update_blog_post_reaction_counts();

UPDATE core.blog_posts SET like_count = 0, dislike_count = 0 WHERE like_count IS NULL OR dislike_count IS NULL;

INSERT INTO core.blog_post_reactions (post_id, user_id, reaction_type)
VALUES
    (2, 1, 'like'),
    (2, 2, 'like'),
    (2, 3, 'dislike'),
    (9, 1, 'like'),
    (11, 2, 'like'),
    (11, 3, 'like')
ON CONFLICT (post_id, user_id) DO NOTHING;

SELECT 'blog_posts' as table_name,
    COUNT(*) as total_posts,
    SUM(like_count) as total_likes,
    SUM(dislike_count) as total_dislikes
FROM core.blog_posts
UNION ALL
SELECT 'blog_post_reactions' as table_name,
    COUNT(*) as total_reactions,
    COUNT(*) FILTER (WHERE reaction_type = 'like') as total_likes,
    COUNT(*) FILTER (WHERE reaction_type = 'dislike') as total_dislikes
FROM core.blog_post_reactions;
