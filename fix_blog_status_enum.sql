-- Fix blog_status enum to include all required values
-- This script will add missing enum values or recreate the enum if needed

-- First, check if blog_status enum exists
DO $$ 
BEGIN
    -- Try to add missing enum values
    BEGIN
        ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'Pending';
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Value already exists, do nothing
            NULL;
        WHEN undefined_object THEN
            -- Enum doesn't exist, create it
            CREATE TYPE blog_status AS ENUM ('Draft', 'Published', 'Pending', 'Rejected', 'Archived');
    END;
    
    -- Add other values if they don't exist
    BEGIN
        ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'Draft';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'Published';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'Rejected';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'Archived';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Update the blog_posts table to use the enum type if it's currently text
DO $$
BEGIN
    -- Check if status column is text type and convert to enum
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'blog_posts' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- First, update any invalid values to valid ones
        UPDATE core.blog_posts 
        SET status = 'Draft' 
        WHERE status NOT IN ('Draft', 'Published', 'Pending', 'Rejected', 'Archived');
        
        -- Then alter the column type
        ALTER TABLE core.blog_posts 
        ALTER COLUMN status TYPE blog_status USING status::blog_status;
    END IF;
END $$;

-- Remove the old check constraint if it exists
ALTER TABLE core.blog_posts DROP CONSTRAINT IF EXISTS check_blog_status;

COMMIT;