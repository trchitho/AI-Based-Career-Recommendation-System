-- ============================
-- DATABASE CLEANUP SCRIPT
-- ============================
-- Mục đích: Xóa các bảng trùng lặp và không sử dụng
-- Ngày tạo: 2026-04-27
-- Tác giả: System Analysis

-- ============================
-- BƯỚC 1: KIỂM TRA TRƯỚC KHI XÓA
-- ============================

DO $
BEGIN
    RAISE NOTICE '🔍 KIỂM TRA CÁC BẢNG SẼ XÓA...';
    RAISE NOTICE '';
END $;

-- Kiểm tra bảng careers_backup
SELECT 
    'careers_backup' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('core.careers_backup')) as table_size
FROM core.careers_backup;

-- Kiểm tra bảng blog_categories
SELECT 
    'blog_categories' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('core.blog_categories')) as table_size
FROM core.blog_categories;

-- Kiểm tra foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (ccu.table_name = 'careers_backup' OR ccu.table_name = 'blog_categories');

-- ============================
-- BƯỚC 2: BACKUP DỮ LIỆU (OPTIONAL)
-- ============================

-- Tạo bảng backup tạm thời (nếu muốn giữ dữ liệu)
-- CREATE TABLE IF NOT EXISTS core._backup_careers_backup AS 
-- SELECT * FROM core.careers_backup;

-- CREATE TABLE IF NOT EXISTS core._backup_blog_categories AS 
-- SELECT * FROM core.blog_categories;

-- ============================
-- BƯỚC 3: XÓA BẢNG careers_backup
-- ============================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  XÓA BẢNG: careers_backup';
    RAISE NOTICE '   Lý do: Bảng backup không được sử dụng trong code';
END $;

-- Xóa bảng careers_backup
DROP TABLE IF EXISTS core.careers_backup CASCADE;

-- Verify
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'core' AND table_name = 'careers_backup'
    ) THEN
        RAISE NOTICE '   ✅ Đã xóa thành công: careers_backup';
    ELSE
        RAISE NOTICE '   ❌ Lỗi: Bảng vẫn tồn tại';
    END IF;
END $;

-- ============================
-- BƯỚC 4: XÓA BẢNG blog_categories
-- ============================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  XÓA BẢNG: blog_categories';
    RAISE NOTICE '   Lý do: Không được sử dụng trong code, category lưu trực tiếp trong blog_posts';
END $;

-- Xóa bảng blog_categories
DROP TABLE IF EXISTS core.blog_categories CASCADE;

-- Verify
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'core' AND table_name = 'blog_categories'
    ) THEN
        RAISE NOTICE '   ✅ Đã xóa thành công: blog_categories';
    ELSE
        RAISE NOTICE '   ❌ Lỗi: Bảng vẫn tồn tại';
    END IF;
END $;

-- ============================
-- BƯỚC 5: KIỂM TRA SAU KHI XÓA
-- ============================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 KIỂM TRA SAU KHI DỌN DẸP...';
    RAISE NOTICE '';
END $;

-- Đếm tổng số bảng còn lại
SELECT 
    'Tổng số bảng trong schema core' as description,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'core';

-- Liệt kê các bảng blog còn lại
SELECT 
    'Các bảng blog còn lại' as description,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'core' 
    AND table_name LIKE '%blog%'
ORDER BY table_name;

-- Liệt kê các bảng career còn lại
SELECT 
    'Các bảng career còn lại' as description,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'core' 
    AND table_name LIKE '%career%'
ORDER BY table_name;

-- ============================
-- BƯỚC 6: VACUUM VÀ ANALYZE
-- ============================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 VACUUM VÀ ANALYZE DATABASE...';
    RAISE NOTICE '';
END $;

-- Vacuum để giải phóng không gian
VACUUM ANALYZE;

-- ============================
-- KẾT QUẢ
-- ============================

DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 DỌN DẸP HOÀN TẤT!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Đã xóa 2 bảng:';
    RAISE NOTICE '   - careers_backup';
    RAISE NOTICE '   - blog_categories';
    RAISE NOTICE '';
    RAISE NOTICE '📋 CHECKLIST TIẾP THEO:';
    RAISE NOTICE '   [ ] Chạy test suite: pytest apps/backend/app/tests/';
    RAISE NOTICE '   [ ] Kiểm tra application logs';
    RAISE NOTICE '   [ ] Test các API liên quan đến blog và career';
    RAISE NOTICE '   [ ] Cập nhật documentation';
    RAISE NOTICE '';
END $;

-- ============================
-- ROLLBACK (NẾU CẦN)
-- ============================

-- Nếu cần rollback, restore từ backup:
-- psql -h localhost -U postgres -d career_db < backup_deleted_tables.sql

-- Hoặc từ bảng backup tạm:
-- CREATE TABLE core.careers_backup AS SELECT * FROM core._backup_careers_backup;
-- CREATE TABLE core.blog_categories AS SELECT * FROM core._backup_blog_categories;
