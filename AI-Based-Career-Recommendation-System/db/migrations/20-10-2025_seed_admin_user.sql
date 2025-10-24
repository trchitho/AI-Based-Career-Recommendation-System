-- Seed an initial admin user (idempotent)
-- NOTE: Change email/password before using in production.

BEGIN;

-- bcrypt hashing support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin or elevate existing account to admin
INSERT INTO core.users (email, password_hash, full_name, role, is_locked, created_at)
VALUES (
  'admin@site.com',
  crypt('Admin@02062003', gen_salt('bf')),
  'Administrator',
  'admin',
  false,
  now()
)
ON CONFLICT (email) DO UPDATE
  SET 
    role = 'admin',
    is_locked = false,
    full_name = EXCLUDED.full_name,
    -- Reset mật khẩu mỗi lần chạy file để đồng bộ môi trường dev
    password_hash = crypt('Admin@02062003', gen_salt('bf'));

COMMIT;
