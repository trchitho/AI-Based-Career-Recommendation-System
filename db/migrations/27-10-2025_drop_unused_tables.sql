-- =====================================================================
-- NCKH · DROP UNUSED TABLES (SAFE)
-- Date: 2025-10-25
-- Purpose: Remove legacy / deprecated tables from core schema
-- Tables: career_categories, career_stats, career_journey
-- =====================================================================

BEGIN;

-- Check & drop core.career_categories if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='core' AND table_name='career_categories'
  ) THEN
    EXECUTE 'DROP TABLE core.career_categories CASCADE';
    RAISE NOTICE 'Dropped table: core.career_categories';
  ELSE
    RAISE NOTICE 'Table core.career_categories does not exist, skipping';
  END IF;
END$$;

-- Check & drop core.career_stats if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='core' AND table_name='career_stats'
  ) THEN
    EXECUTE 'DROP TABLE core.career_stats CASCADE';
    RAISE NOTICE 'Dropped table: core.career_stats';
  ELSE
    RAISE NOTICE 'Table core.career_stats does not exist, skipping';
  END IF;
END$$;

-- Check & drop core.career_journey if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='core' AND table_name='career_journey'
  ) THEN
    EXECUTE 'DROP TABLE core.career_journey CASCADE';
    RAISE NOTICE 'Dropped table: core.career_journey';
  ELSE
    RAISE NOTICE 'Table core.career_journey does not exist, skipping';
  END IF;
END$$;

COMMIT;

-- =====================================================================
-- END OF FILE · 25-10-2025_drop_unused_tables.sql
-- =====================================================================
