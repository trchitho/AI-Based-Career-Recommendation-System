-- Import career_overview data with correct column mapping
-- CSV structure: career_id, experience_text, experience_text_vi, degree_text, degree_text_vi, 
--                salary_min_en, salary_max_en, salary_avg_en, salary_currency_en, salary_bands_en,
--                salary_min, salary_max, salary_avg, salary_currency, salary_bands, updated_at
-- DB structure:  career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn,
--                salary_min_en, salary_min_vn, salary_max_en, salary_max_vn, salary_avg_en, salary_avg_vn,
--                salary_currency_en, salary_currency_vn, salary_bands_en, salary_bands_vn, updated_at

\copy core.career_overview(career_id, experience_text_en, experience_text_vn, degree_text_en, degree_text_vn, salary_min_en, salary_max_en, salary_avg_en, salary_currency_en, salary_bands_en, salary_min_vn, salary_max_vn, salary_avg_vn, salary_currency_vn, salary_bands_vn, updated_at) FROM 'E:\OneDrive\Desktop\sach\AI-Based-Career-Recommendation-System\career_overview.csv' WITH(FORMAT csv, DELIMITER ',', HEADER, ENCODING 'UTF8', QUOTE '"', ESCAPE '"');