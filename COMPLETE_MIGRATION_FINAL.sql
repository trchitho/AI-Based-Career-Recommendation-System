-- =====================================================
-- COMPLETE MIGRATION SCRIPT - FINAL VERSION
-- Date: 2026-01-26
-- Purpose: Fix ALL missing columns and schema issues
-- Database: career_ai (PostgreSQL)
-- =====================================================

-- Connect to database first
\c career_ai;

-- Set client encoding
SET client_encoding = 'UTF8';

-- =====================================================
-- 1. FIX INTERVIEW_MESSAGES TABLE
-- =====================================================

-- Add missing audio_url column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'interview_messages' 
        AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE interview.interview_messages 
        ADD COLUMN audio_url TEXT;
        
        COMMENT ON COLUMN interview.interview_messages.audio_url 
        IS 'URL trực tiếp đến file audio cho message này (để replay full conversation)';
        
        RAISE NOTICE 'Added audio_url column to interview_messages';
    ELSE
        RAISE NOTICE 'audio_url column already exists in interview_messages';
    END IF;
END $$;

-- Add missing conversation_flow column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'interview_messages' 
        AND column_name = 'conversation_flow'
    ) THEN
        ALTER TABLE interview.interview_messages 
        ADD COLUMN conversation_flow JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN interview.interview_messages.conversation_flow 
        IS 'Metadata flow cuộc trò chuyện: {prev_message_id, next_message_id, is_question, is_answer}';
        
        RAISE NOTICE 'Added conversation_flow column to interview_messages';
    ELSE
        RAISE NOTICE 'conversation_flow column already exists in interview_messages';
    END IF;
END $$;

-- Add missing voice_type and processing_time comments
COMMENT ON COLUMN interview.interview_messages.voice_type 
IS 'Loại giọng nói cho message này';

COMMENT ON COLUMN interview.interview_messages.processing_time 
IS 'Thời gian xử lý STT/TTS (seconds)';

-- =====================================================
-- 2. FIX INTERVIEW_SESSIONS TABLE  
-- =====================================================

-- Add missing replay_metadata column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'interview_sessions' 
        AND column_name = 'replay_metadata'
    ) THEN
        ALTER TABLE interview.interview_sessions 
        ADD COLUMN replay_metadata JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN interview.interview_sessions.replay_metadata 
        IS 'Metadata để replay interview: {total_duration, audio_files_count, conversation_summary}';
        
        RAISE NOTICE 'Added replay_metadata column to interview_sessions';
    ELSE
        RAISE NOTICE 'replay_metadata column already exists in interview_sessions';
    END IF;
END $$;

-- Add missing voice_type and voice_settings comments
COMMENT ON COLUMN interview.interview_sessions.voice_type 
IS 'Loại giọng nói: male hoặc female';

COMMENT ON COLUMN interview.interview_sessions.voice_settings 
IS 'Cài đặt giọng nói (rate, pitch, volume)';

-- Fix tab_switch_count constraint (3 -> 10)
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'interview' 
        AND constraint_name = 'chk_tab_switch_count'
    ) THEN
        ALTER TABLE interview.interview_sessions 
        DROP CONSTRAINT chk_tab_switch_count;
        
        RAISE NOTICE 'Dropped old chk_tab_switch_count constraint';
    END IF;
    
    -- Add new constraint with limit 10
    ALTER TABLE interview.interview_sessions 
    ADD CONSTRAINT chk_tab_switch_count 
    CHECK (tab_switch_count >= 0 AND tab_switch_count <= 10);
    
    RAISE NOTICE 'Added new chk_tab_switch_count constraint (limit: 10)';
END $$;

-- Fix voice_type constraint name (if different)
DO $$
BEGIN
    -- Check if old constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'interview' 
        AND constraint_name = 'chk_voice_type'
    ) THEN
        ALTER TABLE interview.interview_sessions 
        DROP CONSTRAINT chk_voice_type;
        
        RAISE NOTICE 'Dropped old chk_voice_type constraint';
    END IF;
    
    -- Add new constraint with correct name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'interview' 
        AND constraint_name = 'interview_sessions_voice_type_check'
    ) THEN
        ALTER TABLE interview.interview_sessions 
        ADD CONSTRAINT interview_sessions_voice_type_check 
        CHECK (voice_type::text = ANY (ARRAY['male'::character varying, 'female'::character varying]::text[]));
        
        RAISE NOTICE 'Added interview_sessions_voice_type_check constraint';
    END IF;
END $$;

-- =====================================================
-- 3. FIX VOICE_PERFORMANCE_METRICS TABLE
-- =====================================================

-- Rename metadata to metadata_json (avoid SQLAlchemy reserved word)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'voice_performance_metrics' 
        AND column_name = 'metadata'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'voice_performance_metrics' 
        AND column_name = 'metadata_json'
    ) THEN
        ALTER TABLE interview.voice_performance_metrics 
        RENAME COLUMN metadata TO metadata_json;
        
        RAISE NOTICE 'Renamed metadata to metadata_json in voice_performance_metrics';
    ELSE
        RAISE NOTICE 'metadata_json column already exists or metadata does not exist';
    END IF;
END $$;

-- =====================================================
-- 4. FIX VOICE_PREFERENCES TABLE
-- =====================================================

-- Set NOT NULL constraints for required columns
ALTER TABLE interview.voice_preferences 
ALTER COLUMN preferred_voice SET NOT NULL,
ALTER COLUMN voice_rate SET NOT NULL,
ALTER COLUMN voice_pitch SET NOT NULL,
ALTER COLUMN voice_volume SET NOT NULL,
ALTER COLUMN language SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- =====================================================
-- 5. CREATE MISSING INDEXES
-- =====================================================

-- Index for audio_url in interview_messages
CREATE INDEX IF NOT EXISTS idx_interview_messages_audio_url
    ON interview.interview_messages USING btree
    (audio_url ASC NULLS LAST)
    WHERE audio_url IS NOT NULL;

-- Index for conversation_flow in interview_messages  
CREATE INDEX IF NOT EXISTS idx_interview_messages_conversation_flow
    ON interview.interview_messages USING gin
    (conversation_flow);

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to update conversation flow for existing data
CREATE OR REPLACE FUNCTION update_conversation_flow()
RETURNS void AS $$
DECLARE
    session_record RECORD;
    message_record RECORD;
    prev_msg_id INTEGER := NULL;
    is_question BOOLEAN;
BEGIN
    -- Loop qua từng session
    FOR session_record IN 
        SELECT id FROM interview.interview_sessions 
        ORDER BY id
    LOOP
        prev_msg_id := NULL;
        
        -- Loop qua messages trong session theo order_index
        FOR message_record IN 
            SELECT id, role, order_index 
            FROM interview.interview_messages 
            WHERE session_id = session_record.id 
            ORDER BY order_index ASC, timestamp ASC
        LOOP
            -- Xác định loại message
            is_question := (message_record.role = 'assistant' OR message_record.role = 'ai');
            
            -- Update conversation_flow
            UPDATE interview.interview_messages 
            SET conversation_flow = jsonb_build_object(
                'prev_message_id', prev_msg_id,
                'is_question', is_question,
                'is_answer', NOT is_question,
                'flow_position', message_record.order_index
            )
            WHERE id = message_record.id;
            
            prev_msg_id := message_record.id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Updated conversation_flow for all existing messages';
END;
$$ LANGUAGE plpgsql;

-- Function to get full conversation for replay
CREATE OR REPLACE FUNCTION get_full_conversation(p_session_id INTEGER)
RETURNS TABLE (
    message_id INTEGER,
    role VARCHAR,
    content TEXT,
    audio_url TEXT,
    order_index INTEGER,
    has_audio BOOLEAN,
    audio_duration DOUBLE PRECISION,
    word_timestamps JSONB,
    conversation_flow JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.role,
        m.content,
        m.audio_url,
        m.order_index,
        m.has_audio,
        m.audio_duration,
        m.word_timestamps,
        m.conversation_flow
    FROM interview.interview_messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.order_index ASC, m.timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to track tab switch with debug info
CREATE OR REPLACE FUNCTION track_tab_switch(
    p_session_id INTEGER,
    p_debug_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    current_count INTEGER;
    result JSONB;
BEGIN
    -- Lấy current tab_switch_count
    SELECT tab_switch_count INTO current_count
    FROM interview.interview_sessions
    WHERE id = p_session_id;
    
    -- Kiểm tra nếu session không tồn tại
    IF current_count IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session not found',
            'current_count', 0,
            'debug_info', p_debug_info
        );
    END IF;
    
    -- Kiểm tra limit (10 cho debug mode)
    IF current_count >= 10 THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Tab switch limit reached (10)',
            'current_count', current_count,
            'debug_info', p_debug_info
        );
    ELSE
        -- Tăng counter
        UPDATE interview.interview_sessions 
        SET 
            tab_switch_count = tab_switch_count + 1,
            conversation_metadata = conversation_metadata || jsonb_build_object(
                'last_tab_switch', NOW(),
                'tab_switch_debug', p_debug_info
            )
        WHERE id = p_session_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Tab switch tracked',
            'new_count', current_count + 1,
            'remaining', 10 - (current_count + 1),
            'debug_info', p_debug_info
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE VIEW FOR FULL CONVERSATION
-- =====================================================

CREATE OR REPLACE VIEW interview.full_conversation_view AS
SELECT 
    s.id as session_id,
    s.user_id,
    s.job_title,
    s.interview_mode,
    s.voice_type,
    s.started_at,
    s.completed_at,
    m.id as message_id,
    m.role,
    m.content,
    m.audio_url,
    m.order_index,
    m.conversation_flow,
    m.has_audio,
    m.audio_duration,
    m.word_timestamps,
    a.file_url as audio_file_url,
    a.duration_seconds as audio_duration_seconds,
    a.transcript
FROM interview.interview_sessions s
LEFT JOIN interview.interview_messages m ON s.id = m.session_id
LEFT JOIN interview.interview_audio a ON m.id = a.message_id
ORDER BY s.id, m.order_index, m.timestamp;

COMMENT ON VIEW interview.full_conversation_view 
IS 'View để query full conversation với audio cho replay và training AI';

-- =====================================================
-- 8. UPDATE EXISTING DATA
-- =====================================================

-- Update conversation_flow for existing messages
SELECT update_conversation_flow();

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify all columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'interview' 
AND table_name IN ('interview_messages', 'interview_sessions', 'voice_performance_metrics', 'voice_preferences')
AND column_name IN ('audio_url', 'conversation_flow', 'replay_metadata', 'metadata_json')
ORDER BY table_name, column_name;

-- Verify constraints
SELECT 
    constraint_name,
    table_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'interview'
AND constraint_name IN ('chk_tab_switch_count', 'interview_sessions_voice_type_check')
ORDER BY table_name, constraint_name;

-- Verify indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'interview'
AND indexname IN ('idx_interview_messages_audio_url', 'idx_interview_messages_conversation_flow')
ORDER BY tablename, indexname;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================

\echo 'Migration completed successfully!'
\echo 'All missing columns, constraints, indexes, and functions have been created.'
\echo 'Database is now ready for full conversation replay and tab switch debug mode.'