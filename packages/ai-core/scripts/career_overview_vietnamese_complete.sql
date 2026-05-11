-- VIỆT HÓA HOÀN CHỈNH BẢNG core.career_overview
-- ===============================================
-- Ngày tạo: 2026-05-08 16:46:26

-- Record ID 3
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.',
    degree_text_vn = 'Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư.',
    updated_at = NOW()
WHERE id = 3;

-- Record ID 4
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.',
    degree_text_vn = 'Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư.',
    updated_at = NOW()
WHERE id = 4;

-- Record ID 59
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.',
    degree_text_vn = 'Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư.',
    updated_at = NOW()
WHERE id = 59;

-- Record ID 60
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần kỹ năng, kiến thức và kinh nghiệm sâu rộng. Thường yêu cầu hơn 5 năm kinh nghiệm chuyên môn trong vai trò lãnh đạo.',
    degree_text_vn = 'Yêu cầu bằng thạc sĩ. Một số vị trí có thể yêu cầu bằng tiến sĩ, bác sĩ y khoa hoặc luật sư.',
    updated_at = NOW()
WHERE id = 60;

-- Record ID 61
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần có sự chuẩn bị đáng kể.Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
    degree_text_vn = 'Yêu cầu bằng cử nhân.Ưu tiên có bằng Thạc sĩ đối với các vị trí cấp cao.',
    updated_at = NOW()
WHERE id = 61;

-- Record ID 62
UPDATE core.career_overview
SET
    experience_text_vn = 'Cần có sự chuẩn bị đáng kể.Thường yêu cầu 2-4 năm kinh nghiệm làm việc liên quan.',
    degree_text_vn = 'Yêu cầu bằng cử nhân.Ưu tiên có bằng Thạc sĩ đối với các vị trí cấp cao.',
    updated_at = NOW()
WHERE id = 62;

-- Kiểm tra kết quả
SELECT id, experience_text_vn, degree_text_vn
FROM core.career_overview
WHERE id IN (3, 4, 59, 60, 61, 62);