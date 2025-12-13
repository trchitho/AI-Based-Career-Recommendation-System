-- Migration: Add event_uuid and page_key columns to analytics.report_events
-- Purpose: Support idempotent event logging and page tracking

-- Add event_uuid column for idempotent logging
ALTER TABLE analytics.report_events 
ADD COLUMN IF NOT EXISTS event_uuid TEXT UNIQUE;

-- Add page_key column for page identification
ALTER TABLE analytics.report_events 
ADD COLUMN IF NOT EXISTS page_key TEXT;

-- Create index on event_uuid for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_report_events_event_uuid 
ON analytics.report_events(event_uuid) 
WHERE event_uuid IS NOT NULL;

-- Ensure meta_json has default value
ALTER TABLE analytics.report_events 
ALTER COLUMN meta_json SET DEFAULT '{}';

-- Update existing NULL meta_json to empty object
UPDATE analytics.report_events 
SET meta_json = '{}' 
WHERE meta_json IS NULL;

-- Add layout_version to assessment_reports for tracking layout changes
ALTER TABLE core.assessment_reports 
ADD COLUMN IF NOT EXISTS layout_version TEXT DEFAULT 'print_v1';

-- Ensure all JSON columns have defaults
ALTER TABLE core.assessment_reports 
ALTER COLUMN cover_json SET DEFAULT '{}';

ALTER TABLE core.assessment_reports 
ALTER COLUMN narrative_json SET DEFAULT '{}';

ALTER TABLE core.assessment_reports 
ALTER COLUMN scores_json SET DEFAULT '[]';

ALTER TABLE core.assessment_reports 
ALTER COLUMN facets_json SET DEFAULT '[]';

ALTER TABLE core.assessment_reports 
ALTER COLUMN strengths_json SET DEFAULT '[]';

ALTER TABLE core.assessment_reports 
ALTER COLUMN challenges_json SET DEFAULT '[]';

ALTER TABLE core.assessment_reports 
ALTER COLUMN pages_json SET DEFAULT '[]';

-- Update report_templates description
UPDATE core.report_templates 
SET description = 'Big Five Personality Report template with 7 pages: Cover, Summary, 3 Facet pages (2 facets each), Strengths & Challenges, Closing. Uses heuristic mapping from OCEAN traits to 6 behavioral facets.'
WHERE template_key = 'big5_v1';

UPDATE core.report_templates 
SET description = 'RIASEC Career Interest Report template with 2 pages: Cover, Interest Pattern & Scores. Based on Holland''s RIASEC model.'
WHERE template_key = 'riasec_v1';

COMMENT ON COLUMN analytics.report_events.event_uuid IS 'Unique identifier for idempotent event logging - skip if duplicate';
COMMENT ON COLUMN analytics.report_events.page_key IS 'Page identifier (cover, summary, facets-1, facets-2, facets-3, strengths, closing)';
COMMENT ON COLUMN core.assessment_reports.layout_version IS 'Layout version used to generate this report (e.g., print_v1)';
