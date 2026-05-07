-- =====================================================
-- Migration 005: Career Level Mapping
-- Map tất cả 959 careers vào levels phù hợp
-- Date: 2026-04-18
-- =====================================================

-- NOTE: This migration requires the mapping script to be run first
-- Run: python3 apps/backend/app/scripts/map_careers_to_enhanced_levels.py

BEGIN;

-- =====================================================
-- VERIFICATION ONLY
-- =====================================================

-- This migration file serves as a placeholder and verification
-- The actual mapping is done by the Python script:
-- apps/backend/app/scripts/map_careers_to_enhanced_levels.py

-- The script will:
-- 1. Analyze each career's title, job_zone, and experience requirements
-- 2. Map to appropriate level using detection methods:
--    - title_keyword (confidence 0.9)
--    - job_zone (confidence 0.7) 
--    - experience_text (confidence 0.6)
--    - default (confidence 0.5)
-- 3. Insert records into core.career_level_mapping

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $
DECLARE
    total_careers INTEGER;
    mapped_careers INTEGER;
    mapping_count INTEGER;
    coverage_percent DECIMAL;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_careers FROM core.careers;
    SELECT COUNT(DISTINCT career_id) INTO mapped_careers FROM core.career_level_mapping;
    SELECT COUNT(*) INTO mapping_count FROM core.career_level_mapping;
    
    -- Calculate coverage
    coverage_percent := ROUND((mapped_careers::DECIMAL / total_careers * 100), 2);
    
    RAISE NOTICE 'Migration 005 Verification:';
    RAISE NOTICE '  Total Careers: %', total_careers;
    RAISE NOTICE '  Mapped Careers: %', mapped_careers;
    RAISE NOTICE '  Total Mappings: %', mapping_count;
    RAISE NOTICE '  Coverage: %% %', coverage_percent;
    
    -- Check if mapping script has been run
    IF mapped_careers = 0 THEN
        RAISE WARNING 'No career mappings found!';
        RAISE WARNING 'Please run: python3 apps/backend/app/scripts/map_careers_to_enhanced_levels.py';
    ELSIF coverage_percent < 100 THEN
        RAISE WARNING 'Incomplete coverage: %% %. Expected 100%%', coverage_percent;
    ELSE
        RAISE NOTICE 'Perfect coverage: All careers mapped!';
    END IF;
    
    -- Show detection method distribution
    IF mapping_count > 0 THEN
        RAISE NOTICE 'Detection Method Distribution:';
        FOR rec IN 
            SELECT 
                detection_method,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / mapping_count, 1) as percentage
            FROM core.career_level_mapping
            GROUP BY detection_method
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '  %: % (%.1f%%)', rec.detection_method, rec.count, rec.percentage;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Migration 005 verification completed!';
END $;

COMMIT;

-- =====================================================
-- INSTRUCTIONS FOR MANUAL EXECUTION
-- =====================================================

/*
To complete this migration:

1. Ensure migrations 001-004 have been applied
2. Run the mapping script:
   cd apps/backend
   python3 app/scripts/map_careers_to_enhanced_levels.py

3. Verify results:
   SELECT COUNT(*) FROM core.career_level_mapping;
   -- Should return 959 (one mapping per career)

4. Check coverage:
   SELECT 
     (SELECT COUNT(*) FROM core.careers) as total_careers,
     (SELECT COUNT(DISTINCT career_id) FROM core.career_level_mapping) as mapped_careers,
     (SELECT COUNT(*) FROM core.career_level_mapping) as total_mappings;
   -- All three numbers should be 959

5. Check confidence distribution:
   SELECT 
     detection_method,
     COUNT(*) as count,
     ROUND(AVG(confidence_score), 2) as avg_confidence
   FROM core.career_level_mapping
   GROUP BY detection_method
   ORDER BY count DESC;
*/

-- =====================================================
-- END OF MIGRATION 005
-- =====================================================