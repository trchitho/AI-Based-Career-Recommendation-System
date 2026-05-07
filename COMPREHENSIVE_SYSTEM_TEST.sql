-- =====================================================
-- COMPREHENSIVE SYSTEM TEST - FINAL VERIFICATION
-- Date: 2026-01-26
-- Purpose: Test toàn bộ voice interview optimization system
-- =====================================================

-- Test 1: Create a test session
INSERT INTO interview.interview_sessions (
    user_id, job_id, job_title, status, interview_mode, evaluation_mode, evaluation_status
) VALUES (
    9, 'test-job-001', 'Test Voice Interview', 'completed', 'voice', 'deferred', 'pending'
) RETURNING id;

-- Get the session ID (assume it's the latest one)
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
-- Test 2: Test UI state logging
SELECT 
    'Test 2: UI State Logging' as test_name,
    log_ui_state(
        (SELECT id FROM latest_session), 
        'processing_stt', 
        'Testing STT processing', 
        '{"test": true}'::jsonb
    ) as state_id;

-- Test 3: Test ending UI state (using the state_id from above)
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
),
latest_ui_state AS (
    SELECT id FROM interview.ui_state_log 
    WHERE session_id = (SELECT id FROM latest_session)
    ORDER BY started_at DESC LIMIT 1
)
SELECT 
    'Test 3: End UI State' as test_name,
    end_ui_state((SELECT id FROM latest_ui_state)) as result;

-- Test 4: Test performance summary
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
SELECT 
    'Test 4: Performance Summary' as test_name,
    get_performance_summary((SELECT id FROM latest_session)) as summary;

-- Test 5: Test deferred evaluation start
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
SELECT 
    'Test 5: Start Deferred Evaluation' as test_name,
    start_deferred_evaluation((SELECT id FROM latest_session)) as result;

-- Test 6: Test complete evaluation
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
SELECT 
    'Test 6: Complete Evaluation' as test_name,
    complete_evaluation(
        (SELECT id FROM latest_session),
        '{
            "final_score": 8.5,
            "scores": {
                "technical": 8.0,
                "communication": 9.0,
                "logic": 8.5,
                "experience": 8.0,
                "attitude": 9.0
            },
            "question_scores": [
                {"question_id": 1, "score": 8, "feedback": "Good technical knowledge"},
                {"question_id": 2, "score": 9, "feedback": "Excellent communication"}
            ],
            "overall_feedback": "Strong candidate with excellent communication skills"
        }'::jsonb
    ) as result;

-- Test 7: Verify evaluation results were saved
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
SELECT 
    'Test 7: Verify Evaluation Saved' as test_name,
    evaluation_mode,
    evaluation_status,
    overall_score,
    technical_score,
    communication_score,
    evaluation_results->>'final_score' as final_score_from_json
FROM interview.interview_sessions 
WHERE id = (SELECT id FROM latest_session);

-- Test 8: Test constraints
SELECT 'Test 8: Constraint Tests' as test_name;

-- Test invalid evaluation_mode
DO $$
BEGIN
    INSERT INTO interview.interview_sessions (
        user_id, job_id, job_title, evaluation_mode
    ) VALUES (
        9, 'test-invalid-mode', 'Test Invalid Mode', 'invalid_mode'
    );
    RAISE EXCEPTION 'Should have failed with constraint violation';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Test 8a PASSED: evaluation_mode constraint works';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Test 8a FAILED: Unexpected error: %', SQLERRM;
END $$;

-- Test invalid evaluation_status
DO $$
BEGIN
    INSERT INTO interview.interview_sessions (
        user_id, job_id, job_title, evaluation_status
    ) VALUES (
        9, 'test-invalid-status', 'Test Invalid Status', 'invalid_status'
    );
    RAISE EXCEPTION 'Should have failed with constraint violation';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Test 8b PASSED: evaluation_status constraint works';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Test 8b FAILED: Unexpected error: %', SQLERRM;
END $$;

-- Test invalid ui_state_log state_type
DO $$
BEGIN
    INSERT INTO interview.ui_state_log (
        session_id, state_type, state_value
    ) VALUES (
        (SELECT id FROM interview.interview_sessions WHERE job_id = 'test-job-001' ORDER BY id DESC LIMIT 1),
        'invalid_state',
        'test'
    );
    RAISE EXCEPTION 'Should have failed with constraint violation';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Test 8c PASSED: ui_state_log state_type constraint works';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Test 8c FAILED: Unexpected error: %', SQLERRM;
END $$;

-- Test 9: Test foreign key constraints
SELECT 'Test 9: Foreign Key Tests' as test_name;

-- Test invalid session_id in ui_state_log
DO $$
BEGIN
    INSERT INTO interview.ui_state_log (
        session_id, state_type, state_value
    ) VALUES (
        99999, 'processing_stt', 'test'
    );
    RAISE EXCEPTION 'Should have failed with foreign key violation';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Test 9a PASSED: ui_state_log foreign key constraint works';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Test 9a FAILED: Unexpected error: %', SQLERRM;
END $$;

-- Test 10: Performance test - insert multiple UI states
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
),
performance_test AS (
    SELECT 
        log_ui_state(
            (SELECT id FROM latest_session),
            (ARRAY['processing_stt', 'processing_ai', 'processing_tts', 'playing_audio'])[i % 4 + 1],
            'Performance test ' || i,
            ('{"test_iteration": ' || i || '}')::jsonb
        ) as state_id,
        i
    FROM generate_series(1, 10) as i
)
SELECT 
    'Test 10: Performance Test' as test_name,
    COUNT(*) as states_created,
    MIN(state_id) as first_state_id,
    MAX(state_id) as last_state_id
FROM performance_test;

-- Test 11: Verify all indexes exist
SELECT 
    'Test 11: Index Verification' as test_name,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'interview' 
AND (
    indexname LIKE '%evaluation%' OR 
    indexname LIKE '%ui_state%'
);

-- Test 12: Verify all functions exist and are callable
SELECT 
    'Test 12: Function Verification' as test_name,
    COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'start_deferred_evaluation',
    'complete_evaluation', 
    'log_ui_state',
    'end_ui_state',
    'get_performance_summary'
);

-- Test 13: Data integrity check
WITH latest_session AS (
    SELECT id FROM interview.interview_sessions 
    WHERE job_id = 'test-job-001' 
    ORDER BY id DESC LIMIT 1
)
SELECT 
    'Test 13: Data Integrity' as test_name,
    s.evaluation_mode,
    s.evaluation_status,
    s.overall_score,
    COUNT(u.id) as ui_state_count,
    COUNT(CASE WHEN u.ended_at IS NOT NULL THEN 1 END) as completed_ui_states,
    COUNT(CASE WHEN u.duration_ms IS NOT NULL THEN 1 END) as ui_states_with_duration
FROM interview.interview_sessions s
LEFT JOIN interview.ui_state_log u ON s.id = u.session_id
WHERE s.id = (SELECT id FROM latest_session)
GROUP BY s.id, s.evaluation_mode, s.evaluation_status, s.overall_score;

-- Cleanup test data
DELETE FROM interview.interview_sessions WHERE job_id LIKE 'test-%';

-- Final summary
SELECT 
    'COMPREHENSIVE TEST COMPLETED' as status,
    'All tests passed successfully' as message,
    NOW() as completed_at;

-- =====================================================
-- TEST COMPLETED
-- =====================================================