-- =====================================================
-- ADD LEVEL COLUMN TO ROADMAP MILESTONES
-- Thêm cột level để phân cấp các milestone
-- =====================================================

-- 1. Thêm cột level vào bảng roadmap_milestones
ALTER TABLE core.roadmap_milestones
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Cập nhật level dựa trên order_no hiện tại
-- Giả sử mỗi level có khoảng 2-3 milestones
-- Level 1: order 1-2
-- Level 2: order 3-4
-- Level 3: order 5-6
-- Level 4: order 7-8
-- Level 5: order 9-10
-- Level 6: order 11+

UPDATE core.roadmap_milestones
SET level = CASE
    WHEN order_no <= 2 THEN 1
    WHEN order_no <= 4 THEN 2
    WHEN order_no <= 6 THEN 3
    WHEN order_no <= 8 THEN 4
    WHEN order_no <= 10 THEN 5
    ELSE 6
END
WHERE level IS NULL OR level = 1;

-- 3. Tạo index cho level để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_level 
ON core.roadmap_milestones(level);

-- 4. Tạo index kết hợp roadmap_id và level
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_roadmap_level 
ON core.roadmap_milestones(roadmap_id, level);

-- 5. Comment để giải thích
COMMENT ON COLUMN core.roadmap_milestones.level IS 'Level của milestone (1-6), dùng để phân cấp và giới hạn xem cho free users';

-- 6. Thêm Foreign Key constraint nếu chưa có (để đảm bảo data integrity)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_roadmap_milestones_roadmap_id'
    ) THEN
        ALTER TABLE core.roadmap_milestones
        ADD CONSTRAINT fk_roadmap_milestones_roadmap_id
        FOREIGN KEY (roadmap_id) 
        REFERENCES core.roadmaps(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- RELATIONSHIP EXPLANATION
-- =====================================================
-- Quan hệ giữa các bảng:
-- 
-- core.roadmaps (1) ----< (N) core.roadmap_milestones
--   id                         roadmap_id (FK)
--   career_id                  order_no
--   title                      level (NEW)
--                              skill_name
--                              description
--
-- Ý nghĩa:
-- - 1 Roadmap có nhiều Milestones
-- - Mỗi Milestone thuộc về 1 Roadmap
-- - ON DELETE CASCADE: Xóa roadmap → tự động xóa tất cả milestones

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Query 1: Xem roadmap với số lượng milestones
-- SELECT 
--     r.id as roadmap_id,
--     r.title as roadmap_title,
--     COUNT(m.id) as milestone_count,
--     COUNT(CASE WHEN m.level = 1 THEN 1 END) as level_1_count,
--     COUNT(CASE WHEN m.level > 1 THEN 1 END) as premium_count
-- FROM core.roadmaps r
-- LEFT JOIN core.roadmap_milestones m ON r.id = m.roadmap_id
-- GROUP BY r.id, r.title;

-- Query 2: Xem chi tiết milestones theo level
-- SELECT 
--     r.title as roadmap,
--     m.order_no,
--     m.level,
--     m.skill_name
-- FROM core.roadmaps r
-- JOIN core.roadmap_milestones m ON r.id = m.roadmap_id
-- ORDER BY r.id, m.order_no;
