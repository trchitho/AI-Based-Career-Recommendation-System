-- Add missing foreign keys and helpful indexes across core schema
-- Safe to run multiple times (guards included)

BEGIN;

-- Ensure referenced column (careers.onet_code) exists and is unique before adding FKs
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS onet_code TEXT;
-- Clean duplicates (keep smallest id) before creating unique index
WITH ranked AS (
  SELECT id, onet_code,
         ROW_NUMBER() OVER (PARTITION BY onet_code ORDER BY id ASC) AS rn
  FROM core.careers
  WHERE onet_code IS NOT NULL
)
DELETE FROM core.careers c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_onet_code
  ON core.careers (onet_code);

-- Guard: only add FK if both tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='core' AND table_name='app_settings'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='core' AND table_name='users'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_updated_by_fkey'
  ) THEN
    ALTER TABLE core.app_settings
      ADD CONSTRAINT app_settings_updated_by_fkey
      FOREIGN KEY (updated_by)
      REFERENCES core.users (id)
      ON UPDATE NO ACTION
      ON DELETE SET NULL;
  END IF;
END$$;

-- ONET-code based relations to careers.onet_code (unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_interests_onet_fkey'
  ) THEN
    ALTER TABLE core.career_interests
      ADD CONSTRAINT career_interests_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_prep_onet_fkey'
  ) THEN
    ALTER TABLE core.career_prep
      ADD CONSTRAINT career_prep_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_outlook_onet_fkey'
  ) THEN
    ALTER TABLE core.career_outlook
      ADD CONSTRAINT career_outlook_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_tasks_onet_fkey'
  ) THEN
    ALTER TABLE core.career_tasks
      ADD CONSTRAINT career_tasks_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_technology_onet_fkey'
  ) THEN
    ALTER TABLE core.career_technology
      ADD CONSTRAINT career_technology_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_wages_us_onet_fkey'
  ) THEN
    ALTER TABLE core.career_wages_us
      ADD CONSTRAINT career_wages_us_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'career_ksas_onet_fkey'
  ) THEN
    ALTER TABLE core.career_ksas
      ADD CONSTRAINT career_ksas_onet_fkey
      FOREIGN KEY (onet_code)
      REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END$$;

-- Helpful indexes for FKs / lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON core.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON core.comments(user_id);
-- (comments.post_id, comments.parent_id already indexed in your script)

CREATE INDEX IF NOT EXISTS idx_assessment_responses_question ON core.assessment_responses(question_id);
-- (assessment_responses.assessment_id already indexed)

CREATE INDEX IF NOT EXISTS idx_career_ksas_onet ON core.career_ksas(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_tasks_onet ON core.career_tasks(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_tech_onet ON core.career_technology(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_wages_onet ON core.career_wages_us(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_prep_onet ON core.career_prep(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_outlook_onet ON core.career_outlook(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_interests_onet ON core.career_interests(onet_code);

-- Reverse lookup index for tag -> careers
CREATE INDEX IF NOT EXISTS idx_career_tag_map_tag ON core.career_tag_map(tag_id);

COMMIT;

