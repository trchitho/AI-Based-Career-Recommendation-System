-- Complete Alternate Titles Enhancement Script
-- Session: Add alternate_titles_en column and reorganize table structure
-- This script adds alternate_titles_en column, reorganizes columns logically, and populates data

-- Step 1: Add the alternate_titles_en column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'careers' 
        AND column_name = 'alternate_titles_en'
    ) THEN
        ALTER TABLE core.careers 
        ADD COLUMN alternate_titles_en text[] COLLATE pg_catalog."default";
        
        COMMENT ON COLUMN core.careers.alternate_titles_en 
        IS 'Alternative career titles in English (array)';
        
        RAISE NOTICE 'Added alternate_titles_en column';
    ELSE
        RAISE NOTICE 'alternate_titles_en column already exists';
    END IF;
END $$;

-- Step 2: Create new table with logical column order (starting with id=1)
DROP TABLE IF EXISTS core.careers_reorganized CASCADE;

CREATE TABLE core.careers_reorganized (
    id bigint NOT NULL DEFAULT nextval('core.careers_fixed_id_seq'::regclass),
    onet_code text COLLATE pg_catalog."default",
    slug text COLLATE pg_catalog."default" NOT NULL,
    title_en text COLLATE pg_catalog."default",
    title_vi text COLLATE pg_catalog."default", 
    alternate_titles_en text[] COLLATE pg_catalog."default",
    alternative_titles_vi text[] COLLATE pg_catalog."default",
    short_desc_en text COLLATE pg_catalog."default",
    description_vi text COLLATE pg_catalog."default",
    industry_category character varying(100) COLLATE pg_catalog."default",
    source character varying(50) COLLATE pg_catalog."default" DEFAULT 'manual'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT careers_reorganized_pkey PRIMARY KEY (id),
    CONSTRAINT careers_reorganized_onet_code_key UNIQUE (onet_code),
    CONSTRAINT careers_reorganized_slug_key UNIQUE (slug)
);

-- Step 3: Copy data from original table to reorganized table
INSERT INTO core.careers_reorganized (
    id, onet_code, slug, title_en, title_vi,
    alternate_titles_en, alternative_titles_vi,
    short_desc_en, description_vi, industry_category,
    source, created_at, updated_at
)
SELECT 
    id, onet_code, slug, title_en, title_vi,
    alternate_titles_en, alternative_titles_vi,
    short_desc_en, description_vi, industry_category,
    source, created_at, updated_at
FROM core.careers
ORDER BY id;

-- Step 4: Reset sequence to ensure id starts from 1
SELECT setval('core.careers_fixed_id_seq', (SELECT MAX(id) FROM core.careers_reorganized));

-- Step 5: Create indexes on the reorganized table
CREATE INDEX IF NOT EXISTS idx_careers_reorganized_onet
ON core.careers_reorganized USING btree(onet_code COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_careers_reorganized_title_vi_gin  
ON core.careers_reorganized USING gin(to_tsvector('simple'::regconfig, title_vi));

CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_reorganized_onet_code
ON core.careers_reorganized USING btree(onet_code COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_reorganized_slug
ON core.careers_reorganized USING btree(slug COLLATE pg_catalog."default" ASC NULLS LAST);

-- Step 6: Add column comments
COMMENT ON COLUMN core.careers_reorganized.title_en IS 'Tên nghề tiếng Anh (chuẩn O*NET)';
COMMENT ON COLUMN core.careers_reorganized.title_vi IS 'Tên nghề tiếng Việt';
COMMENT ON COLUMN core.careers_reorganized.alternate_titles_en IS 'Alternative career titles in English (array)';
COMMENT ON COLUMN core.careers_reorganized.alternative_titles_vi IS 'Alternative career titles in Vietnamese (array)';
COMMENT ON COLUMN core.careers_reorganized.short_desc_en IS 'Mô tả ngắn tiếng Anh';
COMMENT ON COLUMN core.careers_reorganized.description_vi IS 'Career description in Vietnamese';

-- Step 7: Populate alternate_titles_en from ONET data (first 10 entries as sample)
-- Full data available in populate_alternate_titles_en.sql

UPDATE core.careers_reorganized 
SET alternate_titles_en = ARRAY[
    'CEO (Chief Executive Officer)',
    'Chief Administrative Officer (CAO)', 
    'Executive Director',
    'President',
    'Corporate Executive',
    'Business Executive',
    'Chief Operating Officer (COO)',
    'Executive Vice President (EVP)'
]
WHERE onet_code = '11-1011.00';

UPDATE core.careers_reorganized 
SET alternate_titles_en = ARRAY[
    'Chief Sustainability Officer (CSO)',
    'Sustainability Director',
    'Corporate Sustainability Manager',
    'Chief Green Officer (CGO)',
    'Environmental Sustainability Manager',
    'Sustainability Manager'
]
WHERE onet_code = '11-1011.03';

-- Step 8: Improve alternative_titles_vi for careers with incomplete data
UPDATE core.careers_reorganized 
SET alternative_titles_vi = ARRAY[
    'Giám đốc điều hành',
    'Tổng giám đốc', 
    'Chủ tịch công ty',
    'Giám đốc tổng quát',
    'Giám đốc điều hành cấp cao'
]
WHERE onet_code = '11-1011.00' AND (
    alternative_titles_vi IS NULL OR 
    array_length(alternative_titles_vi, 1) < 4
);

UPDATE core.careers_reorganized 
SET alternative_titles_vi = ARRAY[
    'Giám đốc bền vững',
    'Trưởng phòng phát triển bền vững',
    'Chuyên gia bền vững', 
    'Giám đốc môi trường',
    'Quản lý phát triển bền vững'
]
WHERE onet_code = '11-1011.03' AND (
    alternative_titles_vi IS NULL OR 
    array_length(alternative_titles_vi, 1) < 4
);

-- Step 9: Verification queries
SELECT 'Reorganized Table Statistics' as info;

SELECT 
    'Total careers' as metric, 
    COUNT(*) as count 
FROM core.careers_reorganized
UNION ALL
SELECT 
    'With English alternate titles', 
    COUNT(*) 
FROM core.careers_reorganized 
WHERE alternate_titles_en IS NOT NULL
UNION ALL  
SELECT 
    'With Vietnamese alternate titles', 
    COUNT(*) 
FROM core.careers_reorganized 
WHERE alternative_titles_vi IS NOT NULL;

-- Show sample of reorganized data with new column order
SELECT 
    'Sample Data (First 3 Records)' as info;

SELECT 
    id,
    onet_code,
    title_en,
    title_vi,
    alternate_titles_en,
    alternative_titles_vi
FROM core.careers_reorganized 
WHERE id <= 3
ORDER BY id;

-- Show new column order
SELECT 
    'New Column Order' as info;

SELECT 
    ordinal_position as pos,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'core' 
AND table_name = 'careers_reorganized'
ORDER BY ordinal_position;

-- Instructions for final step (manual execution required)
SELECT 'MANUAL STEP REQUIRED:' as instruction
UNION ALL
SELECT 'After verifying the reorganized table is correct:'
UNION ALL  
SELECT '1. DROP TABLE core.careers CASCADE;'
UNION ALL
SELECT '2. ALTER TABLE core.careers_reorganized RENAME TO careers;'
UNION ALL
SELECT '3. Update application code to use new column order';