-- =========================
-- analytics.report_events
-- =========================

CREATE TABLE IF NOT EXISTS analytics.report_events (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL,
  assessment_id    bigint NOT NULL,
  report_id        bigint NOT NULL,               -- core.assessment_reports.id
  report_type      text NOT NULL,                 -- 'big5'|'riasec'
  event_type       text NOT NULL,                 -- 'open'|'tab_switch'|'page_view'|'scroll_depth'|'print'
  tab_key          text,                          -- 'big5'|'riasec'
  page_no          int,                           -- 1..7 cho Big5
  meta_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_report_events_user
    FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_events_assessment
    FOREIGN KEY (assessment_id) REFERENCES core.assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_events_report
    FOREIGN KEY (report_id) REFERENCES core.assessment_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_events_user_time
  ON analytics.report_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_events_report_time
  ON analytics.report_events (report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_events_type
  ON analytics.report_events (event_type);
