-- Update old assessments to have test_mode = 'traditional'
-- This is for existing assessments that were created before test_mode feature

UPDATE core.assessments 
SET test_mode = 'traditional'
WHERE test_mode IS NULL;

-- Verify the update
SELECT 
    id,
    a_type,
    test_mode,
    created_at
FROM core.assessments
ORDER BY created_at DESC
LIMIT 10;
