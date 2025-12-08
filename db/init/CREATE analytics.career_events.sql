CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.career_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NULL, -- có thể null cho khách
  session_id   UUID   NULL,
  job_id       TEXT   NOT NULL,  -- **PHẢI LÀ onet_code**
  event_type   TEXT   NOT NULL CHECK (event_type IN ('impression','click','save','apply')),
  rank_pos     INT    NULL,      -- vị trí trong list
  score_shown  REAL   NULL,      -- điểm model hiển thị (nếu có)
  source       TEXT   NOT NULL DEFAULT 'neumf', -- 'neumf' | 'retrieval' | 'mixed'
  ref          TEXT   NULL,      -- 'home','profile','recommend','search',...
  dwell_ms     INT    NULL,      -- optional: time on page
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_time ON analytics.career_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_job_time  ON analytics.career_events(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON analytics.career_events(event_type, created_at DESC);
