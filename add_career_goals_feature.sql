-- Migration: Add Career Goals Feature for Pro users
-- This extends the user_goals table to support career goal setting

-- Add new columns to user_goals table
ALTER TABLE core.user_goals 
ADD COLUMN IF NOT EXISTS career_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS career_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'short_term' CHECK (goal_type IN ('short_term', 'long_term')),
ADD COLUMN IF NOT EXISTS target_date DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled')),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON core.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_career_id ON core.user_goals(career_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON core.user_goals(status);

-- Create table for goal milestones/sub-goals
CREATE TABLE IF NOT EXISTS core.goal_milestones (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES core.user_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON core.goal_milestones(goal_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON core.user_goals TO career_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.goal_milestones TO career_user;
GRANT USAGE, SELECT ON SEQUENCE core.goal_milestones_id_seq TO career_user;
