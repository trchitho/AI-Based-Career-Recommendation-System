-- Ensure schema `core` exists
CREATE SCHEMA IF NOT EXISTS core;

-- Create table core.users if it doesn't exist (minimal columns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'users'
  ) THEN
    CREATE TABLE core.users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      full_name TEXT,
      role TEXT,
      is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    );
  END IF;
END
$$;

-- Add columns if missing (safe re-runs)
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Unique email index (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON core.users(email);

