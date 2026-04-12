-- Migration: Create analytics.career_feedback for Thompson Sampling
-- Run once against the PostgreSQL database.

CREATE TABLE IF NOT EXISTS analytics.career_feedback (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL,
    job_onet    TEXT        NOT NULL,
    -- Beta distribution parameters
    alpha       INTEGER     NOT NULL DEFAULT 1,   -- likes + 1
    beta        INTEGER     NOT NULL DEFAULT 1,   -- non-likes + 1
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, job_onet)
);

CREATE INDEX IF NOT EXISTS idx_career_feedback_user
    ON analytics.career_feedback (user_id);
