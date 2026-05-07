-- Fix metadata reserved attribute error by renaming column
-- This script renames the 'metadata' column to 'metadata_json' in voice_performance_metrics table

-- Connect to the database and run this SQL
-- ALTER TABLE interview.voice_performance_metrics RENAME COLUMN metadata TO metadata_json;

-- For safety, let's check if the column exists first
DO $$
BEGIN
    -- Check if the old column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'interview' 
        AND table_name = 'voice_performance_metrics' 
        AND column_name = 'metadata'
    ) THEN
        -- Rename the column
        ALTER TABLE interview.voice_performance_metrics RENAME COLUMN metadata TO metadata_json;
        RAISE NOTICE 'Column metadata renamed to metadata_json successfully';
    ELSE
        RAISE NOTICE 'Column metadata does not exist, no action needed';
    END IF;
END $$;