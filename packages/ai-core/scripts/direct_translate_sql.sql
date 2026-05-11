-- DỊCH TRỰC TIẾP CÁC RECORDS CÒN LẠI
-- ===================================

-- Record ID 61: Dịch experience_text_vn và degree_text_vn
UPDATE core.career_overview 
SET 
    experience_text_vn = 'Cần chuẩn bị đáng kể. Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
    degree_text_vn = 'Yêu cầu bằng cử nhân. Ưu tiên bằng thạc sĩ cho các vị trí cao cấp.',
    updated_at = NOW()
WHERE id = 61;

-- Record ID 62: Dịch experience_text_vn và degree_text_vn  
UPDATE core.career_overview 
SET 
    experience_text_vn = 'Cần chuẩn bị đáng kể. Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
    degree_text_vn = 'Yêu cầu bằng cử nhân. Ưu tiên bằng thạc sĩ cho các vị trí cao cấp.',
    updated_at = NOW()
WHERE id = 62;

-- Kiểm tra kết quả
SELECT id, experience_text_vn, degree_text_vn 
FROM core.career_overview 
WHERE id IN (61, 62);