-- =====================================================
-- VOICE INTERVIEW OPTIMIZATION - DATABASE CHANGES
-- Date: 2026-01-26
-- Purpose: Support evaluation logic, performance tracking, UI states
-- =====================================================

-- 1. ADD EVALUATION LOGIC SUPPORT
-- Thêm columns để support evaluation sau khi kết thúc interview

-- Add evaluation_mode to interview_sessions
ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS evaluation_mode VARCHAR(20) DEFAULT 'immediate';

COMMENT ON COLUMN interview.interview_sessions.evaluation_mode 
IS 'Chế độ chấm điểm: immediate (ngay lập tức) hoặc deferred (sau khi kết thúc)';

-- Add evaluation_status to track evaluation state
ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(20) DEFAULT 'pending';

COMMENT ON COLUMN interview.interview_sessions.evaluation_status 
IS 'Trạng thái chấm điểm: pending, in_progress, completed';

-- Add evaluation_results to store final evaluation
ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS evaluation_results JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN interview.interview_sessions.evaluation_results 
IS 'Kết quả chấm điểm chi tiết: {final_score, question_scores, feedback}';

-- 2. ADD PERFORMANCE TRACKING SUPPORT
-- Enhance voice_performance_metrics for detailed tracking

-- Add stage_details for more granular tracking
ALTER TABLE interview.voice_performance_metrics 
ADD COLUMN IF NOT EXISTS stage_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN interview.voice_performance_metrics.stage_details 
IS 'Chi tiết performance từng stage: {model_used, cache_hit, optimization_applied}';

-- Add user_experience_metrics to track UX
ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS user_experience_metrics JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN interview.interview_sessions.user_experience_metrics 
IS 'Metrics trải nghiệm người dùng: {total_wait_time, stage_delays, user_satisfaction}';

-- 3. ADD UI STATE TRACKING
-- Track UI states for better UX

-- Add ui_state_log table for tracking UI states
CREATE TABLE IF NOT EXISTS interview.ui_state_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id INTEGER NOT NULL,
    state_type VARCHAR(50) NOT NULL,
    state_value VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITHOUT TIME ZONE,
    duration_ms INTEGER,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT ui_state_log_pkey PRIMARY KEY (id),
    CONSTRAINT ui_state_log_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES interview.interview_sessions (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT ui_state_log_state_type_check CHECK (
        state_type IN ('processing_stt', 'processing_ai', 'processing_tts', 'waiting_user', 'playing_audio', 'recording_audio')
    )
);

COMMENT ON TABLE interview.ui_state_log 
IS 'Log trạng thái UI để track performance và UX';

-- Add indexes for ui_state_log
CREATE INDEX IF NOT EXISTS idx_ui_state_log_session_id
    ON interview.ui_state_log USING btree (session_id ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_ui_state_log_state_type
    ON interview.ui_state_log USING btree (state_type ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_ui_state_log_started_at
    ON interview.ui_state_log USING btree (started_at ASC NULLS LAST);

-- 4. CREATE EVALUATION FUNCTIONS

-- Function to start deferred evaluation
CREATE OR REPLACE FUNCTION start_deferred_evaluation(p_session_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    session_status VARCHAR;
    result JSONB;
BEGIN
    -- Check if session is completed
    SELECT status INTO session_status
    FROM interview.interview_sessions
    WHERE id = p_session_id;
    
    IF session_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session not found'
        );
    END IF;
    
    IF session_status != 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session must be completed before evaluation'
        );
    END IF;
    
    -- Update evaluation status
    UPDATE interview.interview_sessions 
    SET 
        evaluation_status = 'in_progress',
        evaluation_mode = 'deferred'
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Deferred evaluation started',
        'session_id', p_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to complete evaluation with results
CREATE OR REPLACE FUNCTION complete_evaluation(
    p_session_id INTEGER,
    p_evaluation_results JSONB
)
RETURNS JSONB AS $$
BEGIN
    -- Update session with evaluation results
    UPDATE interview.interview_sessions 
    SET 
        evaluation_status = 'completed',
        evaluation_results = p_evaluation_results,
        -- Extract scores from evaluation results
        overall_score = (p_evaluation_results->>'final_score')::DOUBLE PRECISION,
        technical_score = (p_evaluation_results->'scores'->>'technical')::DOUBLE PRECISION,
        communication_score = (p_evaluation_results->'scores'->>'communication')::DOUBLE PRECISION,
        logic_score = (p_evaluation_results->'scores'->>'logic')::DOUBLE PRECISION,
        experience_score = (p_evaluation_results->'scores'->>'experience')::DOUBLE PRECISION,
        attitude_score = (p_evaluation_results->'scores'->>'attitude')::DOUBLE PRECISION
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Evaluation completed successfully',
        'session_id', p_session_id,
        'final_score', p_evaluation_results->>'final_score'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE PERFORMANCE TRACKING FUNCTIONS

-- Function to log UI state
CREATE OR REPLACE FUNCTION log_ui_state(
    p_session_id INTEGER,
    p_state_type VARCHAR,
    p_state_value VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    state_id UUID;
BEGIN
    -- End previous state of same type if exists
    UPDATE interview.ui_state_log 
    SET 
        ended_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
    WHERE session_id = p_session_id 
    AND state_type = p_state_type 
    AND ended_at IS NULL;
    
    -- Insert new state
    INSERT INTO interview.ui_state_log (
        session_id, state_type, state_value, metadata_json
    ) VALUES (
        p_session_id, p_state_type, p_state_value, p_metadata
    ) RETURNING id INTO state_id;
    
    RETURN state_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end UI state
CREATE OR REPLACE FUNCTION end_ui_state(p_state_id UUID)
RETURNS JSONB AS $$
DECLARE
    duration_ms INTEGER;
BEGIN
    -- Update state with end time and duration
    UPDATE interview.ui_state_log 
    SET 
        ended_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
    WHERE id = p_state_id
    RETURNING duration_ms INTO duration_ms;
    
    RETURN jsonb_build_object(
        'success', true,
        'state_id', p_state_id,
        'duration_ms', duration_ms
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(p_session_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    performance_data JSONB;
    ui_states JSONB;
    voice_metrics JSONB;
BEGIN
    -- Get UI state summary
    SELECT jsonb_object_agg(
        state_type,
        jsonb_build_object(
            'total_duration_ms', COALESCE(SUM(duration_ms), 0),
            'count', COUNT(*),
            'avg_duration_ms', COALESCE(AVG(duration_ms), 0)
        )
    ) INTO ui_states
    FROM interview.ui_state_log
    WHERE session_id = p_session_id
    GROUP BY state_type;
    
    -- Get voice performance metrics
    SELECT jsonb_object_agg(
        stage,
        jsonb_build_object(
            'avg_processing_time', AVG(processing_time),
            'total_processing_time', SUM(processing_time),
            'success_rate', AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END),
            'count', COUNT(*)
        )
    ) INTO voice_metrics
    FROM interview.voice_performance_metrics
    WHERE session_id = p_session_id
    GROUP BY stage;
    
    -- Combine all performance data
    performance_data := jsonb_build_object(
        'session_id', p_session_id,
        'ui_states', COALESCE(ui_states, '{}'::jsonb),
        'voice_metrics', COALESCE(voice_metrics, '{}'::jsonb),
        'generated_at', CURRENT_TIMESTAMP
    );
    
    RETURN performance_data;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE INDEXES FOR NEW COLUMNS

CREATE INDEX IF NOT EXISTS idx_interview_sessions_evaluation_mode
    ON interview.interview_sessions USING btree (evaluation_mode ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_evaluation_status
    ON interview.interview_sessions USING btree (evaluation_status ASC NULLS LAST);

-- 7. UPDATE CONSTRAINTS

-- Add constraint for evaluation_mode
ALTER TABLE interview.interview_sessions 
ADD CONSTRAINT chk_evaluation_mode 
CHECK (evaluation_mode IN ('immediate', 'deferred'));

-- Add constraint for evaluation_status
ALTER TABLE interview.interview_sessions 
ADD CONSTRAINT chk_evaluation_status 
CHECK (evaluation_status IN ('pending', 'in_progress', 'completed'));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify new columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'interview' 
AND table_name = 'interview_sessions' 
AND column_name IN ('evaluation_mode', 'evaluation_status', 'evaluation_results', 'user_experience_metrics')
ORDER BY column_name;

-- Verify new table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'interview' 
AND table_name = 'ui_state_log'
ORDER BY ordinal_position;

-- Verify new functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('start_deferred_evaluation', 'complete_evaluation', 'log_ui_state', 'end_ui_state', 'get_performance_summary')
ORDER BY routine_name;

-- =====================================================
-- OPTIMIZATION COMPLETED
-- =====================================================