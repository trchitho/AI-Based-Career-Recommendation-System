-- Create CVs table
CREATE TABLE IF NOT EXISTS core.cvs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template VARCHAR(50) DEFAULT 'modern',
    personal_info JSONB NOT NULL,
    education JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON core.cvs(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_cvs_updated_at ON core.cvs(updated_at DESC);
