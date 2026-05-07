-- =====================================================
-- Migration 002: Career Groups & Career Levels - COMPLETE
-- Tạo hệ thống phân nhóm nghề nghiệp và cấp bậc
-- Date: 2026-01-26
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE TABLES
-- =====================================================

-- Bảng nhóm ngành nghề (Software & IT, Healthcare, Finance, etc.)
CREATE TABLE IF NOT EXISTS core.career_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    onet_major_group TEXT, -- 2 ký tự đầu của onet_code (11, 13, 15, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng cấp bậc nghề nghiệp (Fresher, Junior, Middle, Senior, Lead)
CREATE TABLE IF NOT EXISTS core.career_levels (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    order_index INTEGER NOT NULL,
    min_exp INTEGER NOT NULL, -- Tối thiểu năm kinh nghiệm
    max_exp INTEGER, -- Tối đa năm kinh nghiệm (NULL = unlimited)
    job_zone_mapping TEXT, -- Map với O*NET job zones (1,2,3,4,5)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng mapping giữa Career và CareerGroup (many-to-many)
CREATE TABLE IF NOT EXISTS core.career_group_mapping (
    id SERIAL PRIMARY KEY,
    career_id BIGINT NOT NULL REFERENCES core.careers(id),
    group_id INTEGER NOT NULL REFERENCES core.career_groups(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(career_id, group_id)
);

-- =====================================================
-- SECTION 2: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_career_groups_slug ON core.career_groups(slug);
CREATE INDEX IF NOT EXISTS idx_career_groups_onet ON core.career_groups(onet_major_group);
CREATE INDEX IF NOT EXISTS idx_career_levels_slug ON core.career_levels(slug);
CREATE INDEX IF NOT EXISTS idx_career_levels_order ON core.career_levels(order_index);
CREATE INDEX IF NOT EXISTS idx_career_group_mapping_career ON core.career_group_mapping(career_id);
CREATE INDEX IF NOT EXISTS idx_career_group_mapping_group ON core.career_group_mapping(group_id);

-- =====================================================
-- SECTION 3: SEED CAREER GROUPS (22 O*NET Major Groups)
-- =====================================================

INSERT INTO core.career_groups (onet_major_group, slug, name, description) VALUES
('11', 'management', 'Quản lý', 'Các vị trí quản lý và điều hành doanh nghiệp'),
('13', 'business-finance', 'Kinh doanh & Tài chính', 'Phân tích kinh doanh, tài chính và các hoạt động liên quan'),
('15', 'computer-math', 'Công nghệ thông tin', 'Lập trình, phân tích hệ thống và toán học ứng dụng'),
('17', 'architecture-engineering', 'Kiến trúc & Kỹ thuật', 'Thiết kế, xây dựng và kỹ thuật'),
('19', 'life-science', 'Khoa học tự nhiên', 'Nghiên cứu khoa học, vật lý, hóa học và sinh học'),
('21', 'community-social', 'Dịch vụ cộng đồng', 'Công tác xã hội và dịch vụ cộng đồng'),
('23', 'legal', 'Pháp lý', 'Luật sư, thẩm phán và các nghề pháp lý'),
('25', 'education', 'Giáo dục', 'Giảng dạy và đào tạo'),
('27', 'arts-media', 'Nghệ thuật & Truyền thông', 'Thiết kế, nghệ thuật và truyền thông'),
('29', 'healthcare-practitioners', 'Y tế chuyên nghiệp', 'Bác sĩ, y tá và chuyên gia y tế'),
('31', 'healthcare-support', 'Hỗ trợ y tế', 'Nhân viên hỗ trợ trong lĩnh vực y tế'),
('33', 'protective-service', 'Dịch vụ bảo vệ', 'Cảnh sát, lính cứu hỏa và an ninh'),
('35', 'food-service', 'Dịch vụ ăn uống', 'Nấu ăn và phục vụ thực phẩm'),
('37', 'building-maintenance', 'Bảo trì tòa nhà', 'Vệ sinh và bảo trì cơ sở vật chất'),
('39', 'personal-care', 'Chăm sóc cá nhân', 'Làm đẹp, chăm sóc sức khỏe cá nhân'),
('41', 'sales', 'Bán hàng', 'Bán hàng và dịch vụ khách hàng'),
('43', 'office-admin', 'Hành chính văn phòng', 'Hỗ trợ hành chính và văn phòng'),
('45', 'farming-forestry', 'Nông nghiệp & Lâm nghiệp', 'Nông nghiệp, chăn nuôi và lâm nghiệp'),
('47', 'construction', 'Xây dựng', 'Xây dựng và khai thác'),
('49', 'installation-repair', 'Lắp đặt & Sửa chữa', 'Bảo trì và sửa chữa thiết bị'),
('51', 'production', 'Sản xuất', 'Sản xuất và chế tạo'),
('53', 'transportation', 'Vận tải', 'Vận chuyển và di chuyển hàng hóa')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 4: SEED CAREER LEVELS (5 Levels)
-- =====================================================

INSERT INTO core.career_levels (slug, name, order_index, min_exp, max_exp, job_zone_mapping, description) VALUES
('fresher', 'Fresher', 1, 0, 1, '1,2', 'Người mới bắt đầu, ít hoặc không có kinh nghiệm'),
('junior', 'Junior', 2, 1, 2, '2,3', 'Có kinh nghiệm cơ bản, cần hướng dẫn'),
('middle', 'Middle', 3, 2, 4, '3,4', 'Có kinh nghiệm trung bình, làm việc độc lập'),
('senior', 'Senior', 4, 4, 6, '4,5', 'Có kinh nghiệm cao, có thể dẫn dắt team'),
('lead', 'Lead', 5, 6, NULL, '5', 'Chuyên gia, quản lý và định hướng chiến lược')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 5: MAP CAREERS TO GROUPS
-- =====================================================

-- Map careers to groups dựa trên 2 ký tự đầu của onet_code
INSERT INTO core.career_group_mapping (career_id, group_id)
SELECT DISTINCT
    c.id as career_id,
    cg.id as group_id
FROM core.careers c
JOIN core.career_groups cg ON LEFT(c.onet_code, 2) = cg.onet_major_group
WHERE c.onet_code IS NOT NULL
ON CONFLICT (career_id, group_id) DO NOTHING;

-- Map careers không có onet_code dựa trên industry_category
INSERT INTO core.career_group_mapping (career_id, group_id)
SELECT DISTINCT
    c.id as career_id,
    cg.id as group_id
FROM core.careers c
JOIN core.career_groups cg ON (
    CASE c.industry_category
        WHEN 'Management' THEN 'management'
        WHEN 'Business and Financial Operations' THEN 'business-finance'
        WHEN 'Computer and Mathematical' THEN 'computer-math'
        WHEN 'Architecture and Engineering' THEN 'architecture-engineering'
        WHEN 'Life, Physical, and Social Science' THEN 'life-science'
        WHEN 'Community and Social Service' THEN 'community-social'
        WHEN 'Legal' THEN 'legal'
        WHEN 'Educational Instruction and Library' THEN 'education'
        WHEN 'Arts, Design, Entertainment, Sports, and Media' THEN 'arts-media'
        WHEN 'Healthcare Practitioners and Technical' THEN 'healthcare-practitioners'
        WHEN 'Healthcare Support' THEN 'healthcare-support'
        WHEN 'Protective Service' THEN 'protective-service'
        WHEN 'Food Preparation and Serving Related' THEN 'food-service'
        WHEN 'Building and Grounds Cleaning and Maintenance' THEN 'building-maintenance'
        WHEN 'Personal Care and Service' THEN 'personal-care'
        WHEN 'Sales and Related' THEN 'sales'
        WHEN 'Office and Administrative Support' THEN 'office-admin'
        WHEN 'Farming, Fishing, and Forestry' THEN 'farming-forestry'
        WHEN 'Construction and Extraction' THEN 'construction'
        WHEN 'Installation, Maintenance, and Repair' THEN 'installation-repair'
        WHEN 'Production' THEN 'production'
        WHEN 'Transportation and Material Moving' THEN 'transportation'
        ELSE NULL
    END
) = cg.slug
WHERE c.industry_category IS NOT NULL
  AND c.id NOT IN (SELECT career_id FROM core.career_group_mapping)
ON CONFLICT (career_id, group_id) DO NOTHING;

-- =====================================================
-- SECTION 6: ADD COMMENTS
-- =====================================================

COMMENT ON TABLE core.career_groups IS 'Nhóm ngành nghề (Software & IT, Healthcare, Finance, etc.)';
COMMENT ON TABLE core.career_levels IS 'Cấp bậc nghề nghiệp (Fresher, Junior, Middle, Senior, Lead)';
COMMENT ON TABLE core.career_group_mapping IS 'Mapping giữa Career và CareerGroup (many-to-many)';

COMMENT ON COLUMN core.career_groups.onet_major_group IS '2 ký tự đầu của O*NET code (11, 13, 15, etc.)';
COMMENT ON COLUMN core.career_levels.job_zone_mapping IS 'Map với O*NET job zones (1,2,3,4,5)';
COMMENT ON COLUMN core.career_levels.min_exp IS 'Tối thiểu năm kinh nghiệm';
COMMENT ON COLUMN core.career_levels.max_exp IS 'Tối đa năm kinh nghiệm (NULL = unlimited)';

-- =====================================================
-- SECTION 7: VERIFICATION QUERIES
-- =====================================================

-- Basic counts
DO $$
DECLARE
    group_count INTEGER;
    level_count INTEGER;
    mapping_count INTEGER;
    career_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO group_count FROM core.career_groups;
    SELECT COUNT(*) INTO level_count FROM core.career_levels;
    SELECT COUNT(*) INTO mapping_count FROM core.career_group_mapping;
    SELECT COUNT(*) INTO career_count FROM core.careers;
    
    RAISE NOTICE 'Migration 002 Results:';
    RAISE NOTICE '  Career Groups: %', group_count;
    RAISE NOTICE '  Career Levels: %', level_count;
    RAISE NOTICE '  Career Mappings: %', mapping_count;
    RAISE NOTICE '  Total Careers: %', career_count;
    RAISE NOTICE '  Mapping Coverage: %.1f%%', (mapping_count::FLOAT / career_count * 100);
    
    -- Verify expected counts
    IF group_count != 22 THEN
        RAISE EXCEPTION 'Expected 22 career groups, got %', group_count;
    END IF;
    
    IF level_count != 5 THEN
        RAISE EXCEPTION 'Expected 5 career levels, got %', level_count;
    END IF;
    
    IF mapping_count != career_count THEN
        RAISE WARNING 'Not all careers mapped: % mapped out of %', mapping_count, career_count;
    END IF;
    
    RAISE NOTICE 'Migration 002 completed successfully!';
END $$;

-- =====================================================
-- SECTION 8: ROLLBACK INSTRUCTIONS (COMMENTED)
-- =====================================================

/*
-- TO ROLLBACK THIS MIGRATION, RUN:

-- Drop mappings first (has foreign keys)
DROP TABLE IF EXISTS core.career_group_mapping CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS core.career_levels CASCADE;
DROP TABLE IF EXISTS core.career_groups CASCADE;

-- Drop indexes (if they still exist)
DROP INDEX IF EXISTS idx_career_groups_slug;
DROP INDEX IF EXISTS idx_career_groups_onet;
DROP INDEX IF EXISTS idx_career_levels_slug;
DROP INDEX IF EXISTS idx_career_levels_order;
DROP INDEX IF EXISTS idx_career_group_mapping_career;
DROP INDEX IF EXISTS idx_career_group_mapping_group;

-- Verify rollback
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'core' 
  AND table_name IN ('career_groups', 'career_levels', 'career_group_mapping');
-- Should return 0 rows if rollback was successful
*/

-- =====================================================
-- END OF MIGRATION 002
-- =====================================================