-- Add email verification flags to users
ALTER TABLE core.users
    ADD COLUMN IF NOT EXISTS is_email_verified boolean DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Backfill existing accounts to keep them accessible
UPDATE core.users
SET
    is_email_verified = TRUE,
    email_verified_at = COALESCE(email_verified_at, NOW())
WHERE is_email_verified IS NULL;
