-- =====================================================
-- MIGRATION: Fix Full Conversation & Tab Switch Debug
-- Date: 2026-01-26
-- Issues Fixed:
--   1. Lưu Full Conversation (thêm audio_url vào interview_messages)
--   2. Tab Switch Debug Mode (tăng limit từ 3 lên 10)
-- =====================================================

-- 1. FIX: Thêm audio_url vào interview_messages để lưu full conversation
-- Điều này cho phép replay full interview và training AI tốt hơn

ALTER TABLE interview.interview_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

COMMENT ON COLUMN interview.interview_messages.audio_url 
IS 'URL trực tiếp đến file audio cho message này (để replay full conversation)';

-- Tạo index cho audio_url để tối ưu query
CREATE INDEX IF NOT EXISTS idx_interview_messages_audio_url
    ON interview.interview_messages USING btree
    (audio_url ASC NULLS LAST)
    WHERE audio_url IS NOT NULL;

-- 2. FIX: Tăng tab_switch_count limit từ 3 lên 10 cho debug mode
-- Drop constraint cũ và tạo constraint mới

ALTER TABLE interview.interview_sessions 
DROP CONSTRAINT IF EXISTS chk_tab_switch_count;

ALTER TABLE interview.interview_sessions 
ADD CONSTRAINT chk_tab_switch_count 
CHECK (tab_switch_count >= 0 AND tab_switch_count <= 10);

-- 3. ENHANCEMENT: Thêm conversation_flow để track thứ tự Q&A
-- Điều này giúp replay conversation theo đúng thứ tự

ALTER TABLE interview.interview_messages 
ADD COLUMN IF NOT EXISTS conversation_flow JSONB DEFAULT '{}';

COMMENT ON COLUMN interview.interview_messages.conversation_flow 
IS 'Metadata flow cuộc trò chuyện: {prev_message_id, next_message_id, is_question, is_answer}';

-- Tạo index cho conversation_flow
CREATE INDEX IF NOT EXISTS idx_interview_messages_conversation_flow
    ON interview.interview_messages USING gin
    (conversation_flow);

-- 4. ENHANCEMENT: Thêm replay_metadata vào interview_sessions
-- Lưu thông tin cần thiết để replay full interview

ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS replay_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN interview.interview_sessions.replay_metadata 
IS 'Metadata để replay interview: {total_duration, audio_files_count, conversation_summary}';

-- 5. UPDATE: Cập nhật existing data để có conversation_flow
-- Tạo function để tự động set conversation_flow cho messages hiện có

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
            ORDER BY order_index ASC, created_at ASC
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
END;
$$ LANGUAGE plpgsql;

-- Chạy function để update existing data
SELECT update_conversation_flow();

-- 6. CREATE VIEW: Tạo view để dễ dàng query full conversation
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
ORDER BY s.id, m.order_index, m.created_at;

COMMENT ON VIEW interview.full_conversation_view 
IS 'View để query full conversation với audio cho replay và training AI';

-- 7. CREATE FUNCTION: Function để get full conversation cho replay
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
    ORDER BY m.order_index ASC, m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. CREATE FUNCTION: Function để track tab switch với debug info
CREATE OR REPLACE FUNCTION track_tab_switch(
    p_session_id INTEGER,
    p_debug_info JSONB DEFAULT '{}'
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

-- 9. VERIFICATION: Queries để verify migration
-- Uncomment để test sau khi chạy migration

/*
-- Test 1: Kiểm tra audio_url column đã được thêm
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'interview' 
  AND table_name = 'interview_messages' 
  AND column_name = 'audio_url';

-- Test 2: Kiểm tra tab_switch_count constraint mới
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_schema = 'interview' 
  AND constraint_name = 'chk_tab_switch_count';

-- Test 3: Test function get_full_conversation
SELECT * FROM get_full_conversation(1) LIMIT 5;

-- Test 4: Test function track_tab_switch
SELECT track_tab_switch(1, '{"page": "interview", "timestamp": "2026-01-26T10:00:00Z"}');
*/

-- =====================================================
-- MIGRATION COMPLETED
-- =====================================================