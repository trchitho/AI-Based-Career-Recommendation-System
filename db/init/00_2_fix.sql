BEGIN;

-- 1) Add legacy-compatible column "title"
ALTER TABLE core.roadmaps
ADD COLUMN IF NOT EXISTS title text;

-- 2) Backfill existing rows (prefer EN, fallback VN)
UPDATE core.roadmaps
SET title = COALESCE(title_en, title_vn, title)
WHERE title IS NULL
   OR btrim(title) = '';

-- 3) Sync trigger function (prefer EN, fallback VN)
CREATE OR REPLACE FUNCTION core.trg_roadmaps_sync_title()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.title := COALESCE(NULLIF(btrim(NEW.title_en), ''),
                        NULLIF(btrim(NEW.title_vn), ''),
                        NULLIF(btrim(NEW.title), ''));

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4) Create trigger
DROP TRIGGER IF EXISTS roadmaps_sync_title ON core.roadmaps;

CREATE TRIGGER roadmaps_sync_title
BEFORE INSERT OR UPDATE OF title_en, title_vn, title
ON core.roadmaps
FOR EACH ROW
EXECUTE FUNCTION core.trg_roadmaps_sync_title();

COMMIT;
