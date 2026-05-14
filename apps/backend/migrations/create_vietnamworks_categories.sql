-- Migration: Create vietnamworks_categories table
-- Description: Danh mục ngành nghề từ VietnamWorks.com
-- Created: 2026-05-12

-- Create sequence for ID
CREATE SEQUENCE IF NOT EXISTS core.vietnamworks_categories_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

ALTER SEQUENCE core.vietnamworks_categories_id_seq
    OWNER TO postgres;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_vietnamworks_categories_updated_at()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.update_vietnamworks_categories_updated_at()
    OWNER TO postgres;

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS core.vietnamworks_categories CASCADE;

-- Create main table
CREATE TABLE IF NOT EXISTS core.vietnamworks_categories
(
    id integer NOT NULL DEFAULT nextval('core.vietnamworks_categories_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    slug text COLLATE pg_catalog."default" NOT NULL,
    vietnamese_name text COLLATE pg_catalog."default" NOT NULL,
    category_group text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    vietnamworks_url text COLLATE pg_catalog."default",
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vietnamworks_categories_pkey PRIMARY KEY (id),
    CONSTRAINT vietnamworks_categories_slug_key UNIQUE (slug)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS core.vietnamworks_categories
    OWNER to postgres;

-- Add table comments
COMMENT ON TABLE core.vietnamworks_categories
    IS 'Danh mục ngành nghề từ VietnamWorks.com';

COMMENT ON COLUMN core.vietnamworks_categories.slug
    IS 'Slug duy nhất cho URL';

COMMENT ON COLUMN core.vietnamworks_categories.category_group
    IS 'Nhóm ngành chính (Bán Hàng & Kinh Doanh, Kế Toán & Tài chính, etc.)';

COMMENT ON COLUMN core.vietnamworks_categories.vietnamworks_url
    IS 'URL gốc từ VietnamWorks';

COMMENT ON COLUMN core.vietnamworks_categories.sort_order
    IS 'Thứ tự sắp xếp trong nhóm';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_active
    ON core.vietnamworks_categories USING btree
    (is_active ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_group
    ON core.vietnamworks_categories USING btree
    (category_group COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_vietnamworks_categories_slug
    ON core.vietnamworks_categories USING btree
    (slug COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER trigger_vietnamworks_categories_updated_at
    BEFORE UPDATE 
    ON core.vietnamworks_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vietnamworks_categories_updated_at();

-- Grant permissions (adjust as needed)
GRANT ALL ON TABLE core.vietnamworks_categories TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core.vietnamworks_categories TO PUBLIC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Table core.vietnamworks_categories created successfully!';
END $$;
