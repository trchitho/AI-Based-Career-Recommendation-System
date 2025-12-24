-- Migration: Add tables for Admin features (Audit Logs, Anomalies, Sync Jobs)
-- Run this SQL in your PostgreSQL database

-- 1. Audit Logs table - Add missing columns if table exists
DO $$
BEGIN
    -- Create table if not exists
    CREATE TABLE IF NOT EXISTS core.audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100),
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add user_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN user_id INTEGER;
    END IF;
    
    -- Add action column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'action'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN action VARCHAR(100);
    END IF;
    
    -- Add resource_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN resource_type VARCHAR(50);
    END IF;
    
    -- Add resource_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN resource_id VARCHAR(100);
    END IF;
    
    -- Add details column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'details'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN details JSONB;
    END IF;
    
    -- Add ip_address column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE core.audit_logs ADD COLUMN ip_address VARCHAR(45);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON core.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON core.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON core.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON core.audit_logs(created_at DESC);

-- 2. Anomalies table
CREATE TABLE IF NOT EXISTS core.anomalies (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    severity VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    user_id INTEGER,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_type ON core.anomalies(type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON core.anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON core.anomalies(resolved);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON core.anomalies(created_at DESC);

-- 3. Sync Jobs table
CREATE TABLE IF NOT EXISTS core.sync_jobs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    created_items INTEGER DEFAULT 0,
    updated_items INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON core.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON core.sync_jobs(created_at DESC);

-- 4. Career Recommendations table (if not exists) for tracking trends
CREATE TABLE IF NOT EXISTS core.career_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    assessment_id INTEGER,
    career_id INTEGER,
    score DECIMAL(5,2),
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_recommendations_career_id ON core.career_recommendations(career_id);
CREATE INDEX IF NOT EXISTS idx_career_recommendations_created_at ON core.career_recommendations(created_at DESC);

-- 5. Add source column to careers table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'careers' AND column_name = 'source'
    ) THEN
        ALTER TABLE core.careers ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'careers' AND column_name = 'industry_category'
    ) THEN
        ALTER TABLE core.careers ADD COLUMN industry_category VARCHAR(100);
    END IF;
END $$;


-- Insert sample audit logs (handles both old and new schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'entity'
    ) THEN
        INSERT INTO core.audit_logs (user_id, action, entity, resource_type, resource_id, details, ip_address, created_at)
        SELECT 1, 'login', 'user', 'user', '1', '{"browser": "Chrome"}'::jsonb, '127.0.0.1', NOW() - (random() * interval '7 days')
        FROM generate_series(1, 5);
    ELSE
        INSERT INTO core.audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
        SELECT 1, 'login', 'user', '1', '{"browser": "Chrome"}'::jsonb, '127.0.0.1', NOW() - (random() * interval '7 days')
        FROM generate_series(1, 5);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped audit logs insert: %', SQLERRM;
END $$;

-- Insert sample anomalies
INSERT INTO core.anomalies (type, severity, title, description, created_at)
VALUES 
    ('security', 'high', 'Multiple failed login attempts', 'User attempted to login 10 times with wrong password', NOW() - interval '1 day'),
    ('ai_error', 'medium', 'AI recommendation timeout', 'Career recommendation took longer than 30 seconds', NOW() - interval '2 days'),
    ('performance', 'low', 'Slow database query', 'Query took 5 seconds to complete', NOW() - interval '3 days'),
    ('unusual_activity', 'critical', 'Unusual API access pattern', 'API endpoint accessed 1000 times in 1 minute', NOW() - interval '4 hours')
ON CONFLICT DO NOTHING;


-- Insert sample audit logs for multiple users (run this to add test data)
DO $$
DECLARE
    user_rec RECORD;
    has_entity BOOLEAN;
BEGIN
    -- Check schema type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' AND table_name = 'audit_logs' AND column_name = 'entity'
    ) INTO has_entity;
    
    IF has_entity THEN
        -- Old schema with 'entity' column
        FOR user_rec IN SELECT id, email FROM core.users WHERE id > 1 LIMIT 10 LOOP
            -- Login logs
            INSERT INTO core.audit_logs (user_id, action, entity, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'login', 'user', user_rec.id::text, 
                    jsonb_build_object('browser', 'Chrome', 'email', user_rec.email), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '7 days'));
            
            -- Profile update logs
            INSERT INTO core.audit_logs (user_id, action, entity, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'profile_update', 'user', user_rec.id::text, 
                    jsonb_build_object('changes', jsonb_build_object('full_name', 'updated')), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '5 days'));
                    
            -- Payment logs
            INSERT INTO core.audit_logs (user_id, action, entity, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'payment_create', 'payment', 'ORDER_' || user_rec.id, 
                    jsonb_build_object('amount', 99000, 'method', 'zalopay'), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '3 days'));
        END LOOP;
    ELSE
        -- New schema with 'resource_type' column
        FOR user_rec IN SELECT id, email FROM core.users WHERE id > 1 LIMIT 10 LOOP
            -- Login logs
            INSERT INTO core.audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'login', 'user', user_rec.id::text, 
                    jsonb_build_object('browser', 'Chrome', 'email', user_rec.email), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '7 days'));
            
            -- Profile update logs
            INSERT INTO core.audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'profile_update', 'user', user_rec.id::text, 
                    jsonb_build_object('changes', jsonb_build_object('full_name', 'updated')), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '5 days'));
                    
            -- Payment logs
            INSERT INTO core.audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
            VALUES (user_rec.id, 'payment_create', 'payment', 'ORDER_' || user_rec.id, 
                    jsonb_build_object('amount', 99000, 'method', 'zalopay'), 
                    '192.168.1.' || (random() * 255)::int, 
                    NOW() - (random() * interval '3 days'));
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Sample audit logs inserted successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting audit logs: %', SQLERRM;
END $$;
