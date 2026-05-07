-- Fix end_ui_state function - ambiguous column reference
CREATE OR REPLACE FUNCTION end_ui_state(p_state_id UUID)
RETURNS JSONB AS $$
DECLARE
    result_duration INTEGER;
BEGIN
    -- Update state with end time and duration
    UPDATE interview.ui_state_log 
    SET 
        ended_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
    WHERE id = p_state_id
    RETURNING ui_state_log.duration_ms INTO result_duration;
    
    RETURN jsonb_build_object(
        'success', true,
        'state_id', p_state_id,
        'duration_ms', result_duration
    );
END;
$$ LANGUAGE plpgsql;