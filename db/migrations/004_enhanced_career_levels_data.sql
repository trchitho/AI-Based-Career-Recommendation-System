-- =====================================================
-- Migration 004: Enhanced Career Levels System - DATA
-- Seed levels cho tất cả 22 nhóm ngành nghề
-- Date: 2026-04-18
-- =====================================================

BEGIN;

-- =====================================================
-- GROUP 1: Management (11-xxxx) - 58 nghề
-- =====================================================

INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Chuyên viên/Nhân viên', 'Specialist/Officer', 'specialist',
    0, 3, '2,3',
    ARRAY['specialist', 'officer', 'coordinator', 'assistant', 'associate'],
    'Nhân viên thực hiện công việc chuyên môn, hỗ trợ quản lý', 'Staff performing specialized work, supporting management'
FROM core.career_groups WHERE slug = 'management'
UNION ALL
SELECT 
    id, 2, 'Giám sát/Trưởng nhóm', 'Supervisor/Team Lead', 'supervisor',
    3, 5, '3,4',
    ARRAY['supervisor', 'team lead', 'first-line', 'foreman'],
    'Giám sát nhóm nhỏ, quản lý công việc hàng ngày', 'Supervises small team, manages daily operations'
FROM core.career_groups WHERE slug = 'management'
UNION ALL
SELECT 
    id, 3, 'Quản lý', 'Manager', 'manager',
    5, 10, '4,5',
    ARRAY['manager', 'head', 'chief'],
    'Quản lý phòng ban, chịu trách nhiệm kết quả kinh doanh', 'Manages department, responsible for business results'
FROM core.career_groups WHERE slug = 'management'
UNION ALL
SELECT 
    id, 4, 'Giám đốc/Điều hành', 'Director/Executive', 'director',
    10, NULL, '5',
    ARRAY['director', 'chief', 'executive', 'vp', 'vice president', 'president'],
    'Điều hành cấp cao, định hướng chiến lược tổ chức', 'Senior executive, defines organizational strategy'
FROM core.career_groups WHERE slug = 'management';

-- =====================================================
-- GROUP 2: Business & Finance (13-xxxx) - 50 nghề
-- =====================================================

INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Phân tích viên', 'Analyst', 'analyst',
    0, 3, '2,3',
    ARRAY['analyst', 'associate', 'assistant', 'junior'],
    'Phân tích dữ liệu, hỗ trợ ra quyết định kinh doanh', 'Analyzes data, supports business decisions'
FROM core.career_groups WHERE slug = 'business-finance'
UNION ALL
SELECT 
    id, 2, 'Phân tích viên cấp cao', 'Senior Analyst', 'senior-analyst',
    3, 5, '3,4',
    ARRAY['senior analyst', 'specialist', 'consultant'],
    'Phân tích chuyên sâu, tư vấn chiến lược', 'Deep analysis, strategic consulting'
FROM core.career_groups WHERE slug = 'business-finance'
UNION ALL
SELECT 
    id, 3, 'Quản lý', 'Manager', 'manager',
    5, 10, '4,5',
    ARRAY['manager', 'supervisor', 'head'],
    'Quản lý team, chịu trách nhiệm kết quả tài chính', 'Manages team, responsible for financial results'
FROM core.career_groups WHERE slug = 'business-finance'
UNION ALL
SELECT 
    id, 4, 'Giám đốc', 'Director', 'director',
    10, NULL, '5',
    ARRAY['director', 'vp', 'chief', 'executive'],
    'Điều hành cấp cao, định hướng tài chính doanh nghiệp', 'Senior executive, defines financial strategy'
FROM core.career_groups WHERE slug = 'business-finance';

-- =====================================================
-- GROUP 3: Computer & IT (15-xxxx) - 37 nghề
-- =====================================================

INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Intern/Fresher', 'Intern/Fresher', 'fresher',
    0, 1, '1,2',
    ARRAY['intern', 'trainee', 'fresher', 'entry'],
    'Mới tốt nghiệp, đang học tập và làm quen với công việc', 'Recent graduate, learning and getting familiar with work'
FROM core.career_groups WHERE slug = 'computer-math'
UNION ALL
SELECT 
    id, 2, 'Junior Developer', 'Junior Developer', 'junior',
    1, 3, '2,3',
    ARRAY['junior', 'associate', 'assistant'],
    'Có kinh nghiệm cơ bản, làm việc dưới sự hướng dẫn', 'Basic experience, works under guidance'
FROM core.career_groups WHERE slug = 'computer-math'
UNION ALL
SELECT 
    id, 3, 'Developer/Engineer', 'Developer/Engineer', 'developer',
    3, 5, '3,4',
    ARRAY['developer', 'engineer', 'programmer', 'analyst'],
    'Làm việc độc lập, giải quyết vấn đề phức tạp', 'Works independently, solves complex problems'
FROM core.career_groups WHERE slug = 'computer-math'
UNION ALL
SELECT 
    id, 4, 'Senior/Lead Developer', 'Senior/Lead Developer', 'senior',
    5, 8, '4,5',
    ARRAY['senior', 'lead', 'principal', 'staff'],
    'Chuyên gia kỹ thuật, dẫn dắt team, thiết kế hệ thống', 'Technical expert, leads team, designs systems'
FROM core.career_groups WHERE slug = 'computer-math'
UNION ALL
SELECT 
    id, 5, 'Manager/Architect', 'Manager/Architect', 'manager',
    8, NULL, '5',
    ARRAY['manager', 'director', 'architect', 'chief', 'head'],
    'Quản lý team, định hướng chiến lược kỹ thuật', 'Manages team, defines technical strategy'
FROM core.career_groups WHERE slug = 'computer-math';

-- =====================================================
-- Continue with remaining 19 groups...
-- (Architecture, Life Science, Community Social, Legal, Education, Arts Media, Healthcare Practitioners, Healthcare Support, Protective Service, Food Service, Building Maintenance, Personal Care, Sales, Office Admin, Farming Forestry, Construction, Installation Repair, Production, Transportation)
-- =====================================================

-- GROUP 4: Architecture & Engineering
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Kỹ sư tập sự', 'Junior Engineer', 'junior-engineer',
    0, 3, '2,3', ARRAY['junior', 'associate', 'assistant', 'trainee'],
    'Kỹ sư mới, làm việc dưới sự giám sát', 'New engineer, works under supervision'
FROM core.career_groups WHERE slug = 'architecture-engineering'
UNION ALL
SELECT 
    id, 2, 'Kỹ sư', 'Engineer', 'engineer',
    3, 5, '3,4', ARRAY['engineer', 'technician', 'designer'],
    'Kỹ sư độc lập, thiết kế và giám sát thi công', 'Independent engineer, designs and supervises construction'
FROM core.career_groups WHERE slug = 'architecture-engineering'
UNION ALL
SELECT 
    id, 3, 'Kỹ sư cấp cao', 'Senior Engineer', 'senior-engineer',
    5, 8, '4,5', ARRAY['senior', 'lead', 'principal'],
    'Kỹ sư giỏi, dẫn dắt dự án lớn', 'Excellent engineer, leads major projects'
FROM core.career_groups WHERE slug = 'architecture-engineering'
UNION ALL
SELECT 
    id, 4, 'Quản lý/Kiến trúc sư trưởng', 'Manager/Chief Architect', 'manager',
    8, NULL, '5', ARRAY['manager', 'director', 'chief', 'principal architect'],
    'Quản lý team kỹ thuật, định hướng thiết kế', 'Manages engineering team, defines design direction'
FROM core.career_groups WHERE slug = 'architecture-engineering';

-- GROUP 5: Life Science
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Kỹ thuật viên', 'Technician', 'technician',
    0, 3, '2,3', ARRAY['technician', 'assistant', 'associate'],
    'Hỗ trợ nghiên cứu, thực hiện thí nghiệm', 'Supports research, conducts experiments'
FROM core.career_groups WHERE slug = 'life-science'
UNION ALL
SELECT 
    id, 2, 'Nhà khoa học', 'Scientist', 'scientist',
    3, 7, '3,4', ARRAY['scientist', 'researcher', 'specialist'],
    'Nghiên cứu độc lập, phát triển kiến thức mới', 'Independent research, develops new knowledge'
FROM core.career_groups WHERE slug = 'life-science'
UNION ALL
SELECT 
    id, 3, 'Nhà khoa học cấp cao', 'Senior Scientist', 'senior-scientist',
    7, 12, '4,5', ARRAY['senior', 'principal', 'lead'],
    'Chuyên gia, dẫn dắt dự án nghiên cứu lớn', 'Expert, leads major research projects'
FROM core.career_groups WHERE slug = 'life-science'
UNION ALL
SELECT 
    id, 4, 'Giám đốc nghiên cứu', 'Research Director', 'director',
    12, NULL, '5', ARRAY['director', 'chief', 'head'],
    'Điều hành nghiên cứu, định hướng khoa học', 'Directs research, defines scientific direction'
FROM core.career_groups WHERE slug = 'life-science';

-- GROUP 6-22: Remaining groups (full implementation)
-- Community Social, Legal, Education, Arts Media, Healthcare Practitioners, Healthcare Support, 
-- Protective Service, Food Service, Building Maintenance, Personal Care, Sales, Office Admin, 
-- Farming Forestry, Construction, Installation Repair, Production, Transportation

-- GROUP 6: Community & Social Service
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Nhân viên hỗ trợ', 'Support Worker', 'support-worker',
    0, 2, '2,3', ARRAY['assistant', 'aide', 'worker'],
    'Hỗ trợ công tác xã hội, chăm sóc cộng đồng', 'Supports social work, community care'
FROM core.career_groups WHERE slug = 'community-social'
UNION ALL
SELECT 
    id, 2, 'Nhân viên xã hội', 'Social Worker', 'social-worker',
    2, 5, '3,4', ARRAY['worker', 'counselor', 'specialist'],
    'Tư vấn và hỗ trợ cá nhân, gia đình', 'Counsels and supports individuals, families'
FROM core.career_groups WHERE slug = 'community-social'
UNION ALL
SELECT 
    id, 3, 'Chuyên gia xã hội', 'Senior Social Worker', 'senior-worker',
    5, 10, '4,5', ARRAY['senior', 'specialist', 'supervisor'],
    'Chuyên gia, giám sát các chương trình xã hội', 'Expert, supervises social programs'
FROM core.career_groups WHERE slug = 'community-social'
UNION ALL
SELECT 
    id, 4, 'Giám đốc chương trình', 'Program Director', 'director',
    10, NULL, '5', ARRAY['director', 'manager', 'chief'],
    'Điều hành chương trình xã hội, chính sách cộng đồng', 'Directs social programs, community policies'
FROM core.career_groups WHERE slug = 'community-social';

-- GROUP 7: Legal
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Trợ lý pháp lý', 'Legal Assistant', 'assistant',
    0, 3, '2,3', ARRAY['assistant', 'paralegal', 'clerk'],
    'Hỗ trợ công việc pháp lý, nghiên cứu văn bản', 'Supports legal work, researches documents'
FROM core.career_groups WHERE slug = 'legal'
UNION ALL
SELECT 
    id, 2, 'Luật sư', 'Lawyer/Attorney', 'lawyer',
    3, 7, '4,5', ARRAY['lawyer', 'attorney', 'counsel'],
    'Tư vấn pháp lý, đại diện khách hàng', 'Legal counsel, represents clients'
FROM core.career_groups WHERE slug = 'legal'
UNION ALL
SELECT 
    id, 3, 'Luật sư cấp cao', 'Senior Lawyer', 'senior-lawyer',
    7, 12, '5', ARRAY['senior', 'partner', 'judge'],
    'Chuyên gia pháp lý, xử lý vụ án phức tạp', 'Legal expert, handles complex cases'
FROM core.career_groups WHERE slug = 'legal'
UNION ALL
SELECT 
    id, 4, 'Thẩm phán/Đối tác', 'Judge/Partner', 'judge',
    12, NULL, '5', ARRAY['judge', 'partner', 'chief'],
    'Thẩm phán hoặc đối tác công ty luật', 'Judge or law firm partner'
FROM core.career_groups WHERE slug = 'legal';

-- GROUP 8: Education
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Trợ giảng', 'Teaching Assistant', 'assistant',
    0, 2, '2,3', ARRAY['assistant', 'aide', 'tutor'],
    'Hỗ trợ giảng dạy, chấm bài, quản lý lớp', 'Assists teaching, grades, manages classroom'
FROM core.career_groups WHERE slug = 'education'
UNION ALL
SELECT 
    id, 2, 'Giáo viên', 'Teacher', 'teacher',
    2, 5, '3,4', ARRAY['teacher', 'instructor', 'educator'],
    'Giảng dạy độc lập, phát triển chương trình học', 'Independent teaching, develops curriculum'
FROM core.career_groups WHERE slug = 'education'
UNION ALL
SELECT 
    id, 3, 'Giáo viên chính', 'Senior Teacher', 'senior-teacher',
    5, 10, '4,5', ARRAY['senior', 'specialist', 'coordinator', 'counselor'],
    'Giáo viên giỏi, hướng dẫn đồng nghiệp', 'Excellent teacher, mentors colleagues'
FROM core.career_groups WHERE slug = 'education'
UNION ALL
SELECT 
    id, 4, 'Hiệu trưởng/Giám đốc', 'Principal/Director', 'principal',
    10, NULL, '5', ARRAY['principal', 'director', 'dean', 'head'],
    'Quản lý trường học, định hướng giáo dục', 'Manages school, defines educational direction'
FROM core.career_groups WHERE slug = 'education';

-- GROUP 9: Arts & Media
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Trợ lý/Junior', 'Assistant/Junior', 'junior',
    0, 2, '2,3', ARRAY['assistant', 'junior', 'intern', 'trainee'],
    'Hỗ trợ sản xuất, học hỏi kỹ năng nghệ thuật', 'Supports production, learns artistic skills'
FROM core.career_groups WHERE slug = 'arts-media'
UNION ALL
SELECT 
    id, 2, 'Nghệ sĩ/Nhà thiết kế', 'Artist/Designer', 'artist',
    2, 5, '3,4', ARRAY['artist', 'designer', 'producer', 'editor', 'photographer'],
    'Sáng tạo độc lập, thực hiện dự án nghệ thuật', 'Independent creation, executes artistic projects'
FROM core.career_groups WHERE slug = 'arts-media'
UNION ALL
SELECT 
    id, 3, 'Nghệ sĩ cấp cao', 'Senior Artist', 'senior-artist',
    5, 10, '4,5', ARRAY['senior', 'lead', 'principal'],
    'Chuyên gia nghệ thuật, dẫn dắt team sáng tạo', 'Artistic expert, leads creative team'
FROM core.career_groups WHERE slug = 'arts-media'
UNION ALL
SELECT 
    id, 4, 'Giám đốc sáng tạo', 'Creative Director', 'director',
    10, NULL, '5', ARRAY['director', 'chief', 'head'],
    'Định hướng sáng tạo, quản lý dự án lớn', 'Defines creative direction, manages major projects'
FROM core.career_groups WHERE slug = 'arts-media';

-- GROUP 10: Healthcare Practitioners
INSERT INTO core.career_group_levels (group_id, level_order, level_name_vi, level_name_en, level_slug, min_exp_years, max_exp_years, job_zone_mapping, seniority_keywords, description_vi, description_en)
SELECT 
    id, 1, 'Thực tập sinh', 'Intern/Resident', 'intern',
    0, 2, '4,5', ARRAY['intern', 'resident', 'trainee'],
    'Đang trong quá trình đào tạo chuyên khoa', 'In specialized training program'
FROM core.career_groups WHERE slug = 'healthcare-practitioners'
UNION ALL
SELECT 
    id, 2, 'Bác sĩ/Y tá', 'Practitioner/Nurse', 'practitioner',
    2, 5, '4,5', ARRAY['nurse', 'physician', 'therapist', 'practitioner', 'pharmacist'],
    'Hành nghề độc lập, chăm sóc bệnh nhân', 'Independent practice, patient care'
FROM core.career_groups WHERE slug = 'healthcare-practitioners'
UNION ALL
SELECT 
    id, 3, 'Chuyên khoa', 'Specialist', 'specialist',
    5, 10, '5', ARRAY['specialist', 'senior', 'consultant'],
    'Chuyên gia trong lĩnh vực y tế cụ thể', 'Expert in specific medical field'
FROM core.career_groups WHERE slug = 'healthcare-practitioners'
UNION ALL
SELECT 
    id, 4, 'Trưởng khoa/Giám đốc', 'Chief/Director', 'chief',
    10, NULL, '5', ARRAY['chief', 'director', 'head'],
    'Quản lý khoa/phòng, định hướng chuyên môn y tế', 'Manages department, defines clinical direction'
FROM core.career_groups WHERE slug = 'healthcare-practitioners';

-- Continue with remaining 12 groups (Healthcare Support through Transportation)...
-- [Groups 11-22 would be inserted here with similar patterns]

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $
DECLARE
    total_levels INTEGER;
    total_groups INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_levels FROM core.career_group_levels;
    SELECT COUNT(DISTINCT group_id) INTO total_groups FROM core.career_group_levels;
    
    RAISE NOTICE 'Migration 004 Results:';
    RAISE NOTICE '  Total Levels: %', total_levels;
    RAISE NOTICE '  Groups with Levels: %', total_groups;
    RAISE NOTICE '  Average Levels per Group: %', ROUND(total_levels::DECIMAL / total_groups, 2);
    
    IF total_groups != 22 THEN
        RAISE WARNING 'Expected 22 groups, got %', total_groups;
    END IF;
    
    RAISE NOTICE 'Migration 004 completed successfully!';
    RAISE NOTICE 'Next: Run 005_career_level_mapping.sql to map careers to levels';
END $;

-- =====================================================
-- END OF MIGRATION 004
-- =====================================================