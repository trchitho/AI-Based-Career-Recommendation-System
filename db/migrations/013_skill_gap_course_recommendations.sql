-- Cache AI-discovered course recommendations for skill-gap pages.
-- One row stores the validated result for a specific analysis + skill-group input.

CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.skill_gap_course_recommendations (
    id              SERIAL PRIMARY KEY,
    analysis_id     INTEGER,
    cache_key       VARCHAR(64) UNIQUE NOT NULL,
    career_name     VARCHAR(255),
    model_name      VARCHAR(120),
    source          VARCHAR(50) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'ready',
    skill_groups    JSONB NOT NULL DEFAULT '{}'::jsonb,
    owned_skills    JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_sg_course_cache_key
    ON core.skill_gap_course_recommendations(cache_key);

CREATE INDEX IF NOT EXISTS ix_sg_course_cache_analysis
    ON core.skill_gap_course_recommendations(analysis_id);

COMMENT ON TABLE core.skill_gap_course_recommendations IS
    'Cached Gemini/fallback course recommendations for skill-gap analysis pages.';

COMMENT ON COLUMN core.skill_gap_course_recommendations.cache_key IS
    'SHA-256 key from analysis id, normalized skill groups, owned skills, top_k and prompt version.';

COMMENT ON COLUMN core.skill_gap_course_recommendations.recommendations IS
    'Validated CourseRecommendation payload shown by the frontend.';
