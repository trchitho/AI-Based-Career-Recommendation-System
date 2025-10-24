BEGIN;

-- Add date_of_birth to users profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'core' AND table_name = 'users' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE core.users ADD COLUMN date_of_birth date NULL;
  END IF;
END$$;

COMMIT;

