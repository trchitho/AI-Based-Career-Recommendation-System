-- Fix trigger function after column removal
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