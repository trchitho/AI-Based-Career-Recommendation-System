-- Fix get_performance_summary function - nested aggregate error
CREATE OR REPLACE FUNCTION get_performance_summary(p_session_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    performance_data JSONB;
    ui_states JSONB;
    voice_metrics JSONB;
BEGIN
    -- Get UI state summary (fix nested aggregate)
    WITH ui_summary AS (
        SELECT 
            state_type,
            COALESCE(SUM(duration_ms), 0) as total_duration_ms,
            COUNT(*) as count,
            COALESCE(AVG(duration_ms), 0) as avg_duration_ms
        FROM interview.ui_state_log
        WHERE session_id = p_session_id
        GROUP BY state_type
    )
    SELECT jsonb_object_agg(
        state_type,
        jsonb_build_object(
            'total_duration_ms', total_duration_ms,
            'count', count,
            'avg_duration_ms', avg_duration_ms
        )
    ) INTO ui_states
    FROM ui_summary;
    
    -- Get voice performance metrics (fix nested aggregate)
    WITH voice_summary AS (
        SELECT 
            stage,
            AVG(processing_time) as avg_processing_time,
            SUM(processing_time) as total_processing_time,
            AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
            COUNT(*) as count
        FROM interview.voice_performance_metrics
        WHERE session_id = p_session_id
        GROUP BY stage
    )
    SELECT jsonb_object_agg(
        stage,
        jsonb_build_object(
            'avg_processing_time', avg_processing_time,
            'total_processing_time', total_processing_time,
            'success_rate', success_rate,
            'count', count
        )
    ) INTO voice_metrics
    FROM voice_summary;
    
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