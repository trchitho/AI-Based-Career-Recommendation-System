BEGIN;

CREATE TABLE IF NOT EXISTS core.refresh_tokens (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE core.refresh_tokens
      ADD CONSTRAINT refresh_tokens_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_token_token ON core.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON core.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON core.refresh_tokens(expires_at);

COMMIT;
