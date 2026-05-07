-- Migration: Fix roadmaps schema for proper multilingual support
-- Date: 2026-04-24
-- Description: 
--   1. Create trigger function for title synchronization
--   2. Migrate existing data from 'title' to 'title_vn' 
--   3. Drop redundant 'title' column
--   4. Ensure proper multilingual structure

-- Step 1: Create trigger function for title synchronization (fixed version)
CREATE OR REPLACE FUNCTION core.trg_roadmaps_sync_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure at least one title exists
    IF NEW.title_en IS NULL AND NEW.title_vn IS NULL THEN
        RAISE EXCEPTION 'At least one title (title_en or title_vn) must be provided';
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Migrate existing data from 'title' to 'title_vn'
UPDATE core.roadmaps 
SET title_vn = title 
WHERE title IS NOT NULL AND title_vn IS NULL;

-- Step 3: Drop the redundant 'title' column (with CASCADE to remove trigger dependency)
ALTER TABLE core.roadmaps DROP COLUMN IF EXISTS title CASCADE;

-- Step 4: Ensure trigger is properly attached (recreate after column drop)
CREATE TRIGGER roadmaps_sync_title
    BEFORE INSERT OR UPDATE OF title_en, title_vn
    ON core.roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION core.trg_roadmaps_sync_title();

-- Step 5: Add constraints for data integrity
ALTER TABLE core.roadmaps 
ADD CONSTRAINT chk_roadmaps_has_title 
CHECK (title_en IS NOT NULL OR title_vn IS NOT NULL);

-- Step 6: Create indexes for better performance (use 'simple' config instead of 'vietnamese')
CREATE INDEX IF NOT EXISTS idx_roadmaps_title_en ON core.roadmaps USING gin(to_tsvector('english', title_en)) WHERE title_en IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roadmaps_title_vn ON core.roadmaps USING gin(to_tsvector('simple', title_vn)) WHERE title_vn IS NOT NULL;

-- Verification query
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_roadmaps,
    COUNT(title_en) as has_title_en,
    COUNT(title_vn) as has_title_vn
FROM core.roadmaps;