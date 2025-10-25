BEGIN;

-- Auth tokens: email verify / password reset
CREATE TABLE IF NOT EXISTS core.auth_tokens (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    token text NOT NULL,
    ttype text NOT NULL, -- 'verify_email' | 'reset_password'
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE core.auth_tokens
      ADD CONSTRAINT auth_tokens_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON core.auth_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_tokens_token ON core.auth_tokens(token);

-- Profile: goals
CREATE TABLE IF NOT EXISTS core.user_goals (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    goal_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_goals_user_id_fkey'
  ) THEN
    ALTER TABLE core.user_goals
      ADD CONSTRAINT user_goals_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

-- Profile: user skills simple mapping
CREATE TABLE IF NOT EXISTS core.user_skills_map (
    user_id bigint NOT NULL,
    skill_name text NOT NULL,
    level text,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, skill_name)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_skills_map_user_id_fkey'
  ) THEN
    ALTER TABLE core.user_skills_map
      ADD CONSTRAINT user_skills_map_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

-- Career journey entries
CREATE TABLE IF NOT EXISTS core.career_journey (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_journey_user_id_fkey'
  ) THEN
    ALTER TABLE core.career_journey
      ADD CONSTRAINT career_journey_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;

