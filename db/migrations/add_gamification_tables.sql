-- Migration: Add gamification tables
-- Purpose: Store gamification data (XP, levels, achievements) separately from assessment data
-- Date: 2025-01-25

-- Create user gamification profiles table
CREATE TABLE IF NOT EXISTS core.user_gamification_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_gamification_profiles_user_id 
    ON core.user_gamification_profiles(user_id);

-- Create assessment gamification sessions table
CREATE TABLE IF NOT EXISTS core.assessment_gamification_sessions (
    id SERIAL PRIMARY KEY,
    assessment_session_id INTEGER NOT NULL REFERENCES core.assessment_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    quiz_mode VARCHAR(50) NOT NULL, -- 'standard', 'game', 'legacy'
    xp_earned INTEGER NOT NULL DEFAULT 0,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    extra_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_assessment_gamification_sessions_user_id 
    ON core.assessment_gamification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_gamification_sessions_assessment_session_id 
    ON core.assessment_gamification_sessions(assessment_session_id);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS core.user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description VARCHAR(500),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
    ON core.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type 
    ON core.user_achievements(achievement_type);

-- Add unique constraint to prevent duplicate achievements
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_unique 
    ON core.user_achievements(user_id, achievement_type);

-- Comments
COMMENT ON TABLE core.user_gamification_profiles IS 'User gamification profiles - stores XP and level data separately from assessment results';
COMMENT ON TABLE core.assessment_gamification_sessions IS 'Gamification data for each assessment session - does not affect assessment scoring';
COMMENT ON TABLE core.user_achievements IS 'User achievements - purely for gamification purposes';

COMMENT ON COLUMN core.assessment_gamification_sessions.quiz_mode IS 'Quiz mode used: standard, game, or legacy';
COMMENT ON COLUMN core.assessment_gamification_sessions.extra_data IS 'Additional gamification data like badges, streaks, etc.';
