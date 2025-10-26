-- =====================================================================
-- PATCH 15-10-2025: ADD onet_code + FIX VIEW
-- =====================================================================
ALTER TABLE core.careers
  ADD COLUMN IF NOT EXISTS onet_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_core_careers_onet
  ON core.careers(onet_code);

-- Some databases may not have a generic "title" column yet (only title_vi/title_en)
ALTER TABLE core.careers
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Best-effort populate new column from existing localized columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='core' AND table_name='careers' AND column_name='title_vi'
  ) THEN
    UPDATE core.careers SET title = COALESCE(title, title_vi);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='core' AND table_name='careers' AND column_name='title_en'
  ) THEN
    UPDATE core.careers SET title = COALESCE(title, title_en);
  END IF;
END $$;

DROP VIEW IF EXISTS core.v_retrieval_with_career;
CREATE OR REPLACE VIEW core.v_retrieval_with_career AS
SELECT r.*,
       c.id AS career_id,
       c.title AS career_title,
       c.onet_code AS career_onet_code
FROM ai.retrieval_jobs_visbert r
LEFT JOIN core.careers c ON c.onet_code = r.job_id;


-- =====================================================================
-- NCKH · UPDATE ALL DB (CLEAN & OPTIMIZED)
-- Schemas: core, ai
-- =====================================================================

-- 0) Schema
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ai;

-- =====================================================================
-- 1) ESSAY PROMPTS + LINK TO ESSAYS
-- =====================================================================
CREATE TABLE IF NOT EXISTS core.essay_prompts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  lang TEXT DEFAULT 'vi',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE core.essays
  ADD COLUMN IF NOT EXISTS prompt_id BIGINT
  REFERENCES core.essay_prompts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_core_essays_prompt_id
  ON core.essays(prompt_id);

-- =====================================================================
-- 2) ASSESSMENTS (FORMS, QUESTIONS, RESPONSES)
-- =====================================================================
CREATE TABLE IF NOT EXISTS core.assessment_forms (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  title TEXT,
  form_type TEXT CHECK (form_type IN ('RIASEC','BigFive','ESSAY')) NOT NULL,
  lang TEXT DEFAULT 'vi',
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.assessment_questions (
  id BIGSERIAL PRIMARY KEY,
  form_id BIGINT REFERENCES core.assessment_forms(id) ON DELETE CASCADE,
  question_no INTEGER,
  question_key TEXT,
  prompt TEXT NOT NULL,
  options_json JSONB,
  reverse_score BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_assessment_questions_form
  ON core.assessment_questions(form_id);

CREATE TABLE IF NOT EXISTS core.assessment_responses (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT REFERENCES core.assessments(id) ON DELETE CASCADE,
  question_id BIGINT REFERENCES core.assessment_questions(id) ON DELETE CASCADE,
  question_key TEXT,
  answer_raw TEXT,
  score_value NUMERIC(6,3),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_assessment_responses_assessment
  ON core.assessment_responses(assessment_id);

-- =====================================================================
-- 3) O*NET DATA TABLES (NO career_categories / career_stats)
-- =====================================================================
CREATE TABLE IF NOT EXISTS core.career_sources (
  provider TEXT PRIMARY KEY,
  version TEXT,
  license TEXT
);

CREATE TABLE IF NOT EXISTS core.career_tasks (
  id BIGSERIAL PRIMARY KEY,
  onet_code TEXT NOT NULL,
  task_text TEXT NOT NULL,
  importance NUMERIC(5,2),
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_tasks_onet
  ON core.career_tasks(onet_code);

CREATE TABLE IF NOT EXISTS core.career_technology (
  id BIGSERIAL PRIMARY KEY,
  onet_code TEXT NOT NULL,
  category TEXT,
  name TEXT NOT NULL,
  hot_flag BOOLEAN,
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_tech_onet
  ON core.career_technology(onet_code);

CREATE TABLE IF NOT EXISTS core.career_ksas (
  id BIGSERIAL PRIMARY KEY,
  onet_code TEXT NOT NULL,
  ksa_type TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  level NUMERIC(5,2),
  importance NUMERIC(5,2),
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_ksas_onet_type
  ON core.career_ksas(onet_code, ksa_type);

CREATE TABLE IF NOT EXISTS core.career_prep (
  onet_code TEXT PRIMARY KEY,
  job_zone TEXT,
  education TEXT,
  training TEXT,
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.career_wages_us (
  id BIGSERIAL PRIMARY KEY,
  onet_code TEXT NOT NULL,
  area TEXT,
  median_annual NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  timespan TEXT,
  source TEXT DEFAULT 'ONET/BLS',
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_wages_onet
  ON core.career_wages_us(onet_code);

CREATE TABLE IF NOT EXISTS core.career_outlook (
  onet_code TEXT PRIMARY KEY,
  summary_md TEXT,
  growth_label TEXT,
  openings_est INTEGER,
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.career_interests (
  onet_code TEXT PRIMARY KEY,
  r NUMERIC(6,3), i NUMERIC(6,3), a NUMERIC(6,3),
  s NUMERIC(6,3), e NUMERIC(6,3), c NUMERIC(6,3),
  source TEXT DEFAULT 'ONET',
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- 4) CAREER TAGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS core.career_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS core.career_tag_map (
  career_id BIGINT REFERENCES core.careers(id) ON DELETE CASCADE,
  tag_id BIGINT REFERENCES core.career_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (career_id, tag_id)
);

-- =====================================================================
-- 5) AI · EMBEDDINGS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai.career_embeddings (
  career_id BIGINT REFERENCES core.careers(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  model_name TEXT DEFAULT 'vi-sbert',
  riasec_centroid REAL[] DEFAULT NULL,
  built_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (career_id, model_name)
);

CREATE TABLE IF NOT EXISTS ai.user_embeddings (
  user_id BIGINT REFERENCES core.users(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  source TEXT CHECK (source IN ('essay','profile')),
  model_name TEXT DEFAULT 'phobert',
  built_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, source, model_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_rjv_job_id
  ON ai.retrieval_jobs_visbert(job_id);

CREATE INDEX IF NOT EXISTS ivf_ai_rjv_cos
ON ai.retrieval_jobs_visbert
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_rjv_tag_tokens_gin
ON ai.retrieval_jobs_visbert
USING gin (tag_tokens);


-- =====================================================================
-- END
-- =====================================================================
