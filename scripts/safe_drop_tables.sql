-- Script xóa an toàn 2 bảng: ai.quick_text_embeddings và core.essay_quick_inputs
-- Tạo bởi: AI Assistant
-- Ngày: 2026-01-08

-- Bước 1: Kiểm tra xem các bảng có tồn tại không
DO $$
BEGIN
    -- Kiểm tra bảng ai.quick_text_embeddings
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'ai' 
        AND table_name = 'quick_text_embeddings'
    ) THEN
        RAISE NOTICE 'Bảng ai.quick_text_embeddings tồn tại';
        
        -- Đếm số dòng
        EXECUTE 'SELECT COUNT(*) FROM ai.quick_text_embeddings' INTO @row_count;
        RAISE NOTICE 'Số dòng trong ai.quick_text_embeddings: %', @row_count;
    ELSE
        RAISE NOTICE 'Bảng ai.quick_text_embeddings không tồn tại';
    END IF;

    -- Kiểm tra bảng core.essay_quick_inputs
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'core' 
        AND table_name = 'essay_quick_inputs'
    ) THEN
        RAISE NOTICE 'Bảng core.essay_quick_inputs tồn tại';
        
        -- Đếm số dòng
        EXECUTE 'SELECT COUNT(*) FROM core.essay_quick_inputs' INTO @row_count;
        RAISE NOTICE 'Số dòng trong core.essay_quick_inputs: %', @row_count;
    ELSE
        RAISE NOTICE 'Bảng core.essay_quick_inputs không tồn tại';
    END IF;
END $$;

-- Bước 2: Tạo backup trước khi xóa (nếu cần)
-- Uncomment các dòng dưới nếu muốn backup

-- CREATE TABLE IF NOT EXISTS backup.ai_quick_text_embeddings_backup AS 
-- SELECT * FROM ai.quick_text_embeddings;

-- CREATE TABLE IF NOT EXISTS backup.core_essay_quick_inputs_backup AS 
-- SELECT * FROM core.essay_quick_inputs;

-- Bước 3: Kiểm tra foreign key constraints
SELECT 
    tc.table_schema,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (
        (ccu.table_schema = 'ai' AND ccu.table_name = 'quick_text_embeddings')
        OR 
        (ccu.table_schema = 'core' AND ccu.table_name = 'essay_quick_inputs')
        OR
        (tc.table_schema = 'ai' AND tc.table_name = 'quick_text_embeddings')
        OR
        (tc.table_schema = 'core' AND tc.table_name = 'essay_quick_inputs')
    );

-- Bước 4: Xóa các bảng một cách an toàn
-- Xóa theo thứ tự để tránh foreign key constraint errors

-- Xóa bảng ai.quick_text_embeddings trước
DROP TABLE IF EXISTS ai.quick_text_embeddings CASCADE;

-- Xóa bảng core.essay_quick_inputs
DROP TABLE IF EXISTS core.essay_quick_inputs CASCADE;

-- Bước 5: Xác nhận đã xóa thành công
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'ai' 
        AND table_name = 'quick_text_embeddings'
    ) THEN
        RAISE NOTICE '✓ Đã xóa thành công bảng ai.quick_text_embeddings';
    ELSE
        RAISE NOTICE '✗ Lỗi: Bảng ai.quick_text_embeddings vẫn tồn tại';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'core' 
        AND table_name = 'essay_quick_inputs'
    ) THEN
        RAISE NOTICE '✓ Đã xóa thành công bảng core.essay_quick_inputs';
    ELSE
        RAISE NOTICE '✗ Lỗi: Bảng core.essay_quick_inputs vẫn tồn tại';
    END IF;
END $$;

-- Bước 6: Dọn dẹp các sequence liên quan (nếu có)
DROP SEQUENCE IF EXISTS ai.quick_text_embeddings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS core.essay_quick_inputs_id_seq CASCADE;

RAISE NOTICE 'Hoàn thành script xóa bảng an toàn!';