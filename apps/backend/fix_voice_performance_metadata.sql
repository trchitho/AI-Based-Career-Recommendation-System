-- Fix voice_performance_metrics metadata column name
-- This script renames the 'metadata' column to 'metadata_json' to avoid SQLAlchemy reserved attribute error

-- Check if the old column exists and new column doesn't exist
DO $$
BEGIN
    -- Check if we need to rename the column
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
        -- Rename the column
        ALTER TABLE interview.voice_performance_metrics 
        RENAME COLUMN metadata TO metadata_json;
        
        RAISE NOTICE 'Successfully renamed metadata column to metadata_json in voice_performance_metrics table';
    ELSE
        RAISE NOTICE 'Column rename not needed - metadata_json already exists or metadata does not exist';
    END IF;
END $$;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'interview' 
AND table_name = 'voice_performance_metrics' 
AND column_name IN ('metadata', 'metadata_json');