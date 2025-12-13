-- ========== 0) Extension ==========
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== 1) analytics.report_events hardening ==========

-- 1.1 Add event_uuid (if missing)
ALTER TABLE IF EXISTS analytics.report_events
  ADD COLUMN IF NOT EXISTS event_uuid uuid;

-- 1.2 Backfill UUID for old rows
UPDATE analytics.report_events
SET event_uuid = gen_random_uuid()
WHERE event_uuid IS NULL;

-- 1.3 Default for new rows + NOT NULL
ALTER TABLE IF EXISTS analytics.report_events
  ALTER COLUMN event_uuid SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS analytics.report_events
  ALTER COLUMN event_uuid SET NOT NULL;

-- 1.4 Dedupe guard
CREATE UNIQUE INDEX IF NOT EXISTS ux_report_events_event_uuid
ON analytics.report_events(event_uuid);

-- 1.5 meta_json: default + backfill + (optional) NOT NULL
ALTER TABLE IF EXISTS analytics.report_events
  ALTER COLUMN meta_json SET DEFAULT '{}'::jsonb;

UPDATE analytics.report_events
SET meta_json = '{}'::jsonb
WHERE meta_json IS NULL;

-- Nếu bạn muốn dọn sạch NULL triệt để:
ALTER TABLE IF EXISTS analytics.report_events
  ALTER COLUMN meta_json SET NOT NULL;

-- 1.6 Add CHECK constraints safely (Postgres doesn't support IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_events_page_no'
      AND conrelid = 'analytics.report_events'::regclass
  ) THEN
    ALTER TABLE analytics.report_events
      ADD CONSTRAINT ck_report_events_page_no
      CHECK (
        event_type <> 'page_view'
        OR page_no IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_report_events_tab_key'
      AND conrelid = 'analytics.report_events'::regclass
  ) THEN
    ALTER TABLE analytics.report_events
      ADD CONSTRAINT ck_report_events_tab_key
      CHECK (
        event_type <> 'tab_switch'
        OR tab_key IS NOT NULL
      );
  END IF;
END $$;

-- ========== 2) core.assessment_reports hardening ==========

-- 2.1 Defaults
ALTER TABLE IF EXISTS core.assessment_reports
  ALTER COLUMN cover_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN narrative_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN scores_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN facets_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN strengths_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN challenges_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN pages_json SET DEFAULT '[]'::jsonb;

-- 2.2 Backfill NULL -> default
UPDATE core.assessment_reports SET cover_json = '{}'::jsonb WHERE cover_json IS NULL;
UPDATE core.assessment_reports SET narrative_json = '{}'::jsonb WHERE narrative_json IS NULL;
UPDATE core.assessment_reports SET scores_json = '[]'::jsonb WHERE scores_json IS NULL;
UPDATE core.assessment_reports SET facets_json = '[]'::jsonb WHERE facets_json IS NULL;
UPDATE core.assessment_reports SET strengths_json = '[]'::jsonb WHERE strengths_json IS NULL;
UPDATE core.assessment_reports SET challenges_json = '[]'::jsonb WHERE challenges_json IS NULL;
UPDATE core.assessment_reports SET pages_json = '[]'::jsonb WHERE pages_json IS NULL;

-- (Khuyến nghị) Set NOT NULL để chặn NULL rác về sau
ALTER TABLE IF EXISTS core.assessment_reports
  ALTER COLUMN cover_json SET NOT NULL,
  ALTER COLUMN narrative_json SET NOT NULL,
  ALTER COLUMN scores_json SET NOT NULL,
  ALTER COLUMN facets_json SET NOT NULL,
  ALTER COLUMN strengths_json SET NOT NULL,
  ALTER COLUMN challenges_json SET NOT NULL,
  ALTER COLUMN pages_json SET NOT NULL;

-- 2.3 layout_version
ALTER TABLE IF EXISTS core.assessment_reports
  ADD COLUMN IF NOT EXISTS layout_version text;

UPDATE core.assessment_reports
SET layout_version = 'print_v1'
WHERE layout_version IS NULL;

ALTER TABLE IF EXISTS core.assessment_reports
  ALTER COLUMN layout_version SET DEFAULT 'print_v1';

-- ========== 3) core.report_templates: fill description if empty ==========
UPDATE core.report_templates
SET description = 'Big Five template v1: heuristic facets (6 quadrants), narrative + strengths/challenges, print layout target = Truity-like'
WHERE template_key = 'big5_v1'
  AND (description IS NULL OR btrim(description) = '');

UPDATE core.report_templates
SET description = 'RIASEC template v1: career interest profile (6 dims), print layout target = same page system as Big5'
WHERE template_key = 'riasec_v1'
  AND (description IS NULL OR btrim(description) = '');

-- ========== 4) Indexes ==========
CREATE INDEX IF NOT EXISTS idx_assessment_reports_user_assessment
ON core.assessment_reports(user_id, assessment_id, report_type, locale);

CREATE INDEX IF NOT EXISTS idx_report_events_user_assessment
ON analytics.report_events(user_id, assessment_id, report_type, created_at);
