-- =========================================================
-- 01_schema_core_ai.sql
-- Lược đồ nghiệp vụ (core) + vector layer (ai) cho CareerAI
-- =========================================================

-- 0) SCHEMAS ------------------------------------------------
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ai;

-- 1) ROLES / APP USER --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'career_user') THEN
    CREATE ROLE career_user LOGIN PASSWORD '123456';
  END IF;
END$$;

-- 2) ENUMS --------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_type') THEN
    CREATE TYPE assessment_type AS ENUM ('RIASEC', 'BigFive');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_status') THEN
    CREATE TYPE blog_status AS ENUM ('Draft', 'Published', 'Archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_value') THEN
    CREATE TYPE reaction_value AS ENUM ('like','love','wow','sad','angry');
  END IF;
END$$;

-- 3) CORE TABLES --------------------------------------------

-- Users
CREATE TABLE IF NOT EXISTS core.users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT DEFAULT 'Reader',
  is_locked     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_login    TIMESTAMPTZ
);

-- Assessments (RIASEC / BigFive scores in JSON)
CREATE TABLE IF NOT EXISTS core.assessments (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  a_type     assessment_type NOT NULL,
  scores     JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON core.assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON core.assessments(a_type);

-- Essays (tự luận của user)
CREATE TABLE IF NOT EXISTS core.essays (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  lang       TEXT DEFAULT 'vi',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_essays_user ON core.essays(user_id);

-- Career catalog (phần tĩnh để đọc)
CREATE TABLE IF NOT EXISTS core.career_categories (
  id        BIGSERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES core.career_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS core.careers (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  category_id  BIGINT REFERENCES core.career_categories(id) ON DELETE SET NULL,
  short_desc   TEXT,
  content_md   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_careers_category ON core.careers(category_id);

CREATE TABLE IF NOT EXISTS core.career_stats (
  career_id       BIGINT PRIMARY KEY REFERENCES core.careers(id) ON DELETE CASCADE,
  market_outlook  TEXT,
  avg_salary      NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'VND',
  demand_level    TEXT,
  sources_json    JSONB
);

CREATE TABLE IF NOT EXISTS core.career_tags (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS core.career_tag_map (
  career_id BIGINT NOT NULL REFERENCES core.careers(id) ON DELETE CASCADE,
  tag_id    BIGINT NOT NULL REFERENCES core.career_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (career_id, tag_id)
);

-- Blog + Comments + Reactions
CREATE TABLE IF NOT EXISTS core.blog_posts (
  id            BIGSERIAL PRIMARY KEY,
  author_id     BIGINT NOT NULL REFERENCES core.users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  content_md    TEXT NOT NULL,
  status        blog_status DEFAULT 'Draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES core.blog_posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  parent_id  BIGINT REFERENCES core.comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  status     TEXT DEFAULT 'Visible',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON core.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON core.comments(parent_id);

CREATE TABLE IF NOT EXISTS core.reactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  post_id    BIGINT REFERENCES core.blog_posts(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES core.comments(id) ON DELETE CASCADE,
  value      reaction_value NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK ( (post_id IS NOT NULL) <> (comment_id IS NOT NULL) ) -- chỉ react post HOẶC comment
);
CREATE INDEX IF NOT EXISTS idx_reactions_post  ON core.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comm  ON core.reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user  ON core.reactions(user_id);

-- Audit log
CREATE TABLE IF NOT EXISTS core.audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   BIGINT REFERENCES core.users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  BIGINT,
  data_json  JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON core.audit_logs(entity, entity_id);

-- 4) AI / VECTOR TABLES -------------------------------------

-- Embedding nghề
CREATE TABLE IF NOT EXISTS ai.career_embeddings (
  career_id   BIGINT PRIMARY KEY REFERENCES core.careers(id) ON DELETE CASCADE,
  emb         vector(768) NOT NULL,
  model_name  TEXT DEFAULT 'vi-sbert',
  built_at    TIMESTAMPTZ DEFAULT now()
);

-- Embedding người dùng (essay/profile)
CREATE TABLE IF NOT EXISTS ai.user_embeddings (
  user_id    BIGINT PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  emb        vector(768) NOT NULL,
  source     TEXT CHECK (source IN ('essay','profile')) DEFAULT 'essay',
  model_name TEXT DEFAULT 'vi-sbert',
  built_at   TIMESTAMPTZ DEFAULT now()
);

-- IVF index cho cosine similarity
CREATE INDEX IF NOT EXISTS idx_career_emb_ivf_cos
  ON ai.career_embeddings USING ivfflat (emb vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_user_emb_ivf_cos
  ON ai.user_embeddings   USING ivfflat (emb vector_cosine_ops) WITH (lists = 50);

-- 5) PRIVILEGES ---------------------------------------------
GRANT USAGE ON SCHEMA core, ai TO career_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core, ai TO career_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core, ai TO career_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA core
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO career_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA ai
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO career_user;

-- 6) OPTIONAL: Tối ưu planner cho IVF (có thể đặt trong session app)
-- SET ivfflat.probes = 10;
-- ANALYZE ai.career_embeddings;
-- ANALYZE ai.user_embeddings;
