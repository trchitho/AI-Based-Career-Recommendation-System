-- =====================================================================
-- NCKH · RELATIONS & INDEXES (SAFE & IDEMPOTENT)
-- Date: 2025-10-19 (rewritten to handle NOT NULL "title" in core.careers)
-- What this does:
--   1) Ensure careers.onet_code exists & unique; deduplicate
--   2) Seed minimal careers for orphan O*NET codes found in child tables
--      - If careers.title exists, insert with title = onet_code (fallback)
--   3) Add FKs to careers(onet_code) using NOT VALID
--   4) Add helpful indexes
--   5) Provide diagnostics and optional VALIDATE block
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) PRELUDE: Ensure column exists & deduplicate onet_code
-- ---------------------------------------------------------------------
ALTER TABLE core.careers ADD COLUMN IF NOT EXISTS onet_code TEXT;

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

-- ---------------------------------------------------------------------
-- 1) SEED MISSING CAREERS FOR ORPHAN onet_code (from child tables)
--    - Version that adapts to presence of "title" column
-- ---------------------------------------------------------------------
DO $$
DECLARE
  has_title boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='core' AND table_name='careers' AND column_name='title'
  ) INTO has_title;

  IF has_title THEN
    -- Seed WITH title (handles NOT NULL title)
    EXECUTE $sql$
      WITH orphan_codes AS (
        SELECT DISTINCT onet_code FROM core.career_interests   WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_prep        WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_outlook     WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_ksas        WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_tasks       WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_technology  WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_wages_us    WHERE onet_code IS NOT NULL
      ),
      missing AS (
        SELECT oc.onet_code
        FROM orphan_codes oc
        LEFT JOIN core.careers c ON c.onet_code = oc.onet_code
        WHERE c.onet_code IS NULL
      )
      INSERT INTO core.careers (slug, onet_code, title)
      SELECT
        'onet-' || replace(m.onet_code, '.', '-') AS slug,
        m.onet_code,
        m.onet_code AS title
      FROM missing m
      ON CONFLICT (onet_code) DO NOTHING;
    $sql$;
  ELSE
    -- Seed WITHOUT title (schema không có cột title)
    EXECUTE $sql$
      WITH orphan_codes AS (
        SELECT DISTINCT onet_code FROM core.career_interests   WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_prep        WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_outlook     WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_ksas        WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_tasks       WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_technology  WHERE onet_code IS NOT NULL
        UNION SELECT DISTINCT onet_code FROM core.career_wages_us    WHERE onet_code IS NOT NULL
      ),
      missing AS (
        SELECT oc.onet_code
        FROM orphan_codes oc
        LEFT JOIN core.careers c ON c.onet_code = oc.onet_code
        WHERE c.onet_code IS NULL
      )
      INSERT INTO core.careers (slug, onet_code)
      SELECT
        'onet-' || replace(m.onet_code, '.', '-') AS slug,
        m.onet_code
      FROM missing m
      ON CONFLICT (onet_code) DO NOTHING;
    $sql$;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 2) OPTIONAL: Backfill onet_code from legacy slug pattern (...-dd-dddd-dd)
-- ---------------------------------------------------------------------
UPDATE core.careers
SET onet_code = regexp_replace(slug, '.*(\d{2}-\d{4})-(\d{2})$', '\1.\2')
WHERE onet_code IS NULL
  AND slug ~ '\d{2}-\d{4}-\d{2}$';

-- reinforce uniqueness (no-op if exists)
CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_onet_code
  ON core.careers (onet_code);

-- ---------------------------------------------------------------------
-- 3) APP SETTINGS FK (guarded)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4) O*NET-BASED FKs (use NOT VALID first; VALIDATE later)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_interests_onet_fkey') THEN
    ALTER TABLE core.career_interests
      ADD CONSTRAINT career_interests_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_prep_onet_fkey') THEN
    ALTER TABLE core.career_prep
      ADD CONSTRAINT career_prep_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_outlook_onet_fkey') THEN
    ALTER TABLE core.career_outlook
      ADD CONSTRAINT career_outlook_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_tasks_onet_fkey') THEN
    ALTER TABLE core.career_tasks
      ADD CONSTRAINT career_tasks_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_technology_onet_fkey') THEN
    ALTER TABLE core.career_technology
      ADD CONSTRAINT career_technology_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_wages_us_onet_fkey') THEN
    ALTER TABLE core.career_wages_us
      ADD CONSTRAINT career_wages_us_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='career_ksas_onet_fkey') THEN
    ALTER TABLE core.career_ksas
      ADD CONSTRAINT career_ksas_onet_fkey
      FOREIGN KEY (onet_code) REFERENCES core.careers (onet_code)
      ON UPDATE CASCADE ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 5) Helpful indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_blog_posts_author             ON core.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_user                 ON core.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question ON core.assessment_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_career_ksas_onet      ON core.career_ksas(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_tasks_onet     ON core.career_tasks(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_tech_onet      ON core.career_technology(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_wages_onet     ON core.career_wages_us(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_prep_onet      ON core.career_prep(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_outlook_onet   ON core.career_outlook(onet_code);
CREATE INDEX IF NOT EXISTS idx_career_interests_onet ON core.career_interests(onet_code);

CREATE INDEX IF NOT EXISTS idx_career_tag_map_tag    ON core.career_tag_map(tag_id);

COMMIT;

-- =====================================================================
-- 6) DIAGNOSTICS (run manually if needed)
-- =====================================================================
-- A) Any child rows still orphaned?  (should be empty)
-- SELECT src, onet_code, count(*) AS n
-- FROM (
--   SELECT 'interests'  AS src, onet_code FROM core.career_interests  WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'prep',       onet_code FROM core.career_prep       WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'outlook',    onet_code FROM core.career_outlook    WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'ksas',       onet_code FROM core.career_ksas       WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'tasks',      onet_code FROM core.career_tasks      WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'technology', onet_code FROM core.career_technology WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
--   UNION ALL SELECT 'wages',      onet_code FROM core.career_wages_us   WHERE onet_code IS NOT NULL AND onet_code NOT IN (SELECT onet_code FROM core.careers)
-- ) q
-- GROUP BY src, onet_code
-- ORDER BY src, onet_code;

-- B) Backfill title_vi/title_en (ONLY IF those columns exist)
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='careers' AND column_name='title_en') THEN
--     UPDATE core.careers c
--     SET title_en = COALESCE(title_en, c.onet_code)
--     WHERE c.slug LIKE 'onet-%' AND (c.title_en IS NULL OR c.title_en = '');
--   END IF;
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='careers' AND column_name='title_vi') THEN
--     UPDATE core.careers c
--     SET title_vi = COALESCE(title_vi, c.onet_code)
--     WHERE c.slug LIKE 'onet-%' AND (c.title_vi IS NULL OR c.title_vi = '');
--   END IF;
-- END$$;

-- =====================================================================
-- 7) VALIDATE FKs (run after diagnostics show no orphan remains)
-- =====================================================================
-- ALTER TABLE core.career_interests   VALIDATE CONSTRAINT career_interests_onet_fkey;
-- ALTER TABLE core.career_prep        VALIDATE CONSTRAINT career_prep_onet_fkey;
-- ALTER TABLE core.career_outlook     VALIDATE CONSTRAINT career_outlook_onet_fkey;
-- ALTER TABLE core.career_tasks       VALIDATE CONSTRAINT career_tasks_onet_fkey;
-- ALTER TABLE core.career_technology  VALIDATE CONSTRAINT career_technology_onet_fkey;
-- ALTER TABLE core.career_wages_us    VALIDATE CONSTRAINT career_wages_us_onet_fkey;
-- ALTER TABLE core.career_ksas        VALIDATE CONSTRAINT career_ksas_onet_fkey;
