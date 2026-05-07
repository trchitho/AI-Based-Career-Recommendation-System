-- Fix voice_preferences table schema to match model requirements
-- All columns except id and user_id should be NOT NULL with proper defaults

-- Fix preferred_voice column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN preferred_voice SET NOT NULL;

-- Fix voice_rate column  
ALTER TABLE interview.voice_preferences 
ALTER COLUMN voice_rate SET NOT NULL;

-- Fix voice_pitch column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN voice_pitch SET NOT NULL;

-- Fix voice_volume column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN voice_volume SET NOT NULL;

-- Fix language column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN language SET NOT NULL;

-- Fix created_at column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN created_at SET NOT NULL;

-- Fix updated_at column
ALTER TABLE interview.voice_preferences 
ALTER COLUMN updated_at SET NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'interview' AND table_name = 'voice_preferences'
ORDER BY ordinal_position;