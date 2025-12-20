-- =========================
-- core.report_templates
-- =========================
CREATE TABLE IF NOT EXISTS core.report_templates (
  id                bigserial PRIMARY KEY,
  template_key      text NOT NULL,                 -- vd: 'big5_v1', 'riasec_v1'
  version           text NOT NULL,                 -- vd: '1.0.0'
  locale            text NOT NULL DEFAULT 'vi',     -- 'vi' | 'en'
  title             text,
  description       text,
  config_json       jsonb NOT NULL,                -- weights, mapping rules, labels, text blocks
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_report_templates UNIQUE (template_key, version, locale)
);

CREATE INDEX IF NOT EXISTS idx_report_templates_active
  ON core.report_templates (template_key, is_active);

CREATE INDEX IF NOT EXISTS idx_report_templates_locale
  ON core.report_templates (locale);



-- =========================
-- core.assessment_reports
-- =========================
CREATE TABLE IF NOT EXISTS core.assessment_reports (
  id                    bigserial PRIMARY KEY,
  user_id               bigint NOT NULL,
  session_id            bigint,                    -- optional but recommended to link
  assessment_id         bigint NOT NULL,           -- link 1-1 theo assessment
  template_id           bigint NOT NULL,           -- core.report_templates.id
  report_type           text NOT NULL,             -- 'big5' | 'riasec'
  locale                text NOT NULL DEFAULT 'vi',
  status                text NOT NULL DEFAULT 'ready',  -- 'ready'|'generating'|'failed'
  source_hash           text,                      -- hash of inputs (scores+essay ids) để detect stale
  computed_at           timestamptz NOT NULL DEFAULT now(),

  -- SNAPSHOT payload
  cover_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative_json        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- "Persuasive Idealist" + intro paragraphs
  scores_json           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- OCEAN raw/percentile + labels low/avg/high
  facets_json           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- 6 facets × 4-quadrant percents + dominant
  strengths_json        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array bullets
  challenges_json       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array bullets
  pages_json            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- optional: store per-page structure/text blocks

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_assessment_reports_user
    FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_reports_session
    FOREIGN KEY (session_id) REFERENCES core.assessment_sessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_assessment_reports_assessment
    FOREIGN KEY (assessment_id) REFERENCES core.assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_reports_template
    FOREIGN KEY (template_id) REFERENCES core.report_templates(id) ON DELETE RESTRICT
);

-- 1 assessment có thể có 2 report (big5 + riasec)
CREATE UNIQUE INDEX IF NOT EXISTS ux_assessment_reports_unique
  ON core.assessment_reports (assessment_id, report_type, locale);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_user
  ON core.assessment_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_session
  ON core.assessment_reports (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_template
  ON core.assessment_reports (template_id);



