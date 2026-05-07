-- =====================================================
-- VIETNAMESE LOCALIZATION FOR CAREER WORK ACTIVITY SUMMARY
-- Migration: 011_career_work_activity_summary_vietnamese.sql
-- Purpose: Add Vietnamese columns and implement translation strategy
-- =====================================================

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS core.career_work_activity_summary_backup AS 
SELECT * FROM core.career_work_activity_summary;

-- Step 2: Add Vietnamese columns to existing table
ALTER TABLE core.career_work_activity_summary 
ADD COLUMN IF NOT EXISTS activity_title_en TEXT,
ADD COLUMN IF NOT EXISTS activity_title_vi TEXT,
ADD COLUMN IF NOT EXISTS activity_description_en TEXT,
ADD COLUMN IF NOT EXISTS activity_description_vi TEXT;

-- Step 3: Update existing records with Vietnamese translations from master table
UPDATE core.career_work_activity_summary 
SET 
    activity_title_en = m.element_name,
    activity_title_vi = m.element_name_vi,
    activity_description_en = m.description,
    activity_description_vi = m.description_vi
FROM core.career_work_activities_master m
WHERE core.career_work_activity_summary.element_id = m.element_id;

-- Step 4: Insert additional Vietnamese translations for common work activities
INSERT INTO core.career_work_activities_master (element_id, element_name, element_name_vi, description, description_vi, activity_category, activity_category_vi) VALUES
('4.A.1.a.1', 'Analyzing Data or Information', 'Phân tích dữ liệu hoặc thông tin', 'Identifying the underlying principles, reasons, or facts of information by breaking down information or data into separate parts.', 'Xác định các nguyên tắc cơ bản, lý do hoặc sự thật của thông tin bằng cách chia nhỏ thông tin hoặc dữ liệu thành các phần riêng biệt.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.a.2', 'Processing Information', 'Xử lý thông tin', 'Compiling, coding, categorizing, calculating, tabulating, auditing, or verifying information or data.', 'Biên soạn, mã hóa, phân loại, tính toán, lập bảng, kiểm toán hoặc xác minh thông tin hoặc dữ liệu.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.a.3', 'Making Decisions and Solving Problems', 'Đưa ra quyết định và giải quyết vấn đề', 'Analyzing information and evaluating results to choose the best solution and solve problems.', 'Phân tích thông tin và đánh giá kết quả để chọn giải pháp tốt nhất và giải quyết vấn đề.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.a.4', 'Thinking Creatively', 'Tư duy sáng tạo', 'Developing, designing, or creating new applications, ideas, relationships, systems, or products, including artistic contributions.', 'Phát triển, thiết kế hoặc tạo ra các ứng dụng, ý tưởng, mối quan hệ, hệ thống hoặc sản phẩm mới, bao gồm cả những đóng góp nghệ thuật.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.b.1', 'Updating and Using Relevant Knowledge', 'Cập nhật và sử dụng kiến thức liên quan', 'Keeping up-to-date technically and applying new knowledge to your job.', 'Luôn cập nhật về mặt kỹ thuật và áp dụng kiến thức mới vào công việc của bạn.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.b.2', 'Developing Objectives and Strategies', 'Phát triển mục tiêu và chiến lược', 'Establishing long-range objectives and specifying the strategies and actions to achieve them.', 'Thiết lập các mục tiêu dài hạn và xác định các chiến lược và hành động để đạt được chúng.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.b.3', 'Scheduling Work and Activities', 'Lập lịch công việc và hoạt động', 'Scheduling events, programs, and activities, as well as the work of others.', 'Lập lịch cho các sự kiện, chương trình và hoạt động, cũng như công việc của người khác.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.1.b.4', 'Organizing, Planning, and Prioritizing Work', 'Tổ chức, lập kế hoạch và ưu tiên công việc', 'Developing specific goals and plans to prioritize, organize, and accomplish your work.', 'Phát triển các mục tiêu và kế hoạch cụ thể để ưu tiên, tổ chức và hoàn thành công việc của bạn.', 'Mental Processes', 'Quy trình tư duy'),
('4.A.2.a.1', 'Getting Information', 'Thu thập thông tin', 'Observing, receiving, and otherwise obtaining information from all relevant sources.', 'Quan sát, tiếp nhận và thu thập thông tin từ tất cả các nguồn liên quan.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.a.2', 'Identifying Objects, Actions, and Events', 'Xác định đối tượng, hành động và sự kiện', 'Identifying information by categorizing, estimating, recognizing differences or similarities, and detecting changes in circumstances or events.', 'Xác định thông tin bằng cách phân loại, ước tính, nhận biết sự khác biệt hoặc tương đồng, và phát hiện những thay đổi trong hoàn cảnh hoặc sự kiện.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.a.3', 'Inspecting Equipment, Structures, or Materials', 'Kiểm tra thiết bị, cấu trúc hoặc vật liệu', 'Inspecting equipment, structures, or materials to identify the cause of errors or other problems or defects.', 'Kiểm tra thiết bị, cấu trúc hoặc vật liệu để xác định nguyên nhân của lỗi hoặc các vấn đề hoặc khiếm khuyết khác.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.a.4', 'Estimating the Quantifiable Characteristics of Products, Events, or Information', 'Ước tính các đặc điểm có thể định lượng của sản phẩm, sự kiện hoặc thông tin', 'Estimating sizes, distances, and quantities; or determining time, costs, resources, or materials needed to perform a work activity.', 'Ước tính kích thước, khoảng cách và số lượng; hoặc xác định thời gian, chi phí, tài nguyên hoặc vật liệu cần thiết để thực hiện một hoạt động công việc.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.b.1', 'Judging the Qualities of Things, Services, or People', 'Đánh giá chất lượng của sự vật, dịch vụ hoặc con người', 'Assessing the value, importance, or quality of things or people.', 'Đánh giá giá trị, tầm quan trọng hoặc chất lượng của sự vật hoặc con người.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.b.2', 'Monitoring Processes, Materials, or Surroundings', 'Giám sát quy trình, vật liệu hoặc môi trường xung quanh', 'Monitoring and reviewing information from materials, events, or the environment, to detect or assess problems.', 'Giám sát và xem xét thông tin từ vật liệu, sự kiện hoặc môi trường để phát hiện hoặc đánh giá vấn đề.', 'Work Output', 'Đầu ra công việc'),
('4.A.2.b.3', 'Evaluating Information to Determine Compliance with Standards', 'Đánh giá thông tin để xác định sự tuân thủ các tiêu chuẩn', 'Using relevant information and individual judgment to determine whether events or processes comply with laws, regulations, or standards.', 'Sử dụng thông tin liên quan và phán đoán cá nhân để xác định xem các sự kiện hoặc quy trình có tuân thủ luật pháp, quy định hoặc tiêu chuẩn hay không.', 'Work Output', 'Đầu ra công việc'),
('4.A.3.a.1', 'Communicating with Supervisors, Peers, or Subordinates', 'Giao tiếp với cấp trên, đồng nghiệp hoặc cấp dưới', 'Providing information to supervisors, co-workers, and subordinates by telephone, in written form, e-mail, or in person.', 'Cung cấp thông tin cho cấp trên, đồng nghiệp và cấp dưới qua điện thoại, dưới dạng văn bản, email hoặc trực tiếp.', 'Interacting with Others', 'Tương tác với người khác'),
('4.A.3.a.2', 'Communicating with Persons Outside Organization', 'Giao tiếp với những người bên ngoài tổ chức', 'Communicating with people outside the organization, representing the organization to customers, the public, government, and other external sources.', 'Giao tiếp với những người bên ngoài tổ chức, đại diện cho tổ chức với khách hàng, công chúng, chính phủ và các nguồn bên ngoài khác.', 'Interacting with Others', 'Tương tác với người khác'),
('4.A.3.a.3', 'Establishing and Maintaining Interpersonal Relationships', 'Thiết lập và duy trì các mối quan hệ giữa các cá nhân', 'Developing constructive and cooperative working relationships with others, and maintaining them over time.', 'Phát triển các mối quan hệ làm việc mang tính xây dựng và hợp tác với người khác, và duy trì chúng theo thời gian.', 'Interacting with Others', 'Tương tác với người khác'),
('4.A.3.a.4', 'Working with Computers', 'Làm việc với máy tính', 'Using computers and computer systems (including hardware and software) to program, write software, set up functions, enter data, or process information.', 'Sử dụng máy tính và hệ thống máy tính (bao gồm phần cứng và phần mềm) để lập trình, viết phần mềm, thiết lập chức năng, nhập dữ liệu hoặc xử lý thông tin.', 'Interacting with Others', 'Tương tác với người khác')
ON CONFLICT (element_id) DO UPDATE SET
    element_name = EXCLUDED.element_name,
    element_name_vi = EXCLUDED.element_name_vi,
    description = EXCLUDED.description,
    description_vi = EXCLUDED.description_vi,
    activity_category = EXCLUDED.activity_category,
    activity_category_vi = EXCLUDED.activity_category_vi,
    updated_at = CURRENT_TIMESTAMP;

-- Step 5: Update summary table again with new translations
UPDATE core.career_work_activity_summary 
SET 
    activity_title_en = m.element_name,
    activity_title_vi = m.element_name_vi,
    activity_description_en = m.description,
    activity_description_vi = m.description_vi
FROM core.career_work_activities_master m
WHERE core.career_work_activity_summary.element_id = m.element_id;

-- Step 6: Create indexes for Vietnamese columns
CREATE INDEX IF NOT EXISTS idx_career_work_summary_title_vi_gin
    ON core.career_work_activity_summary USING gin
    (to_tsvector('simple'::regconfig, activity_title_vi));

CREATE INDEX IF NOT EXISTS idx_career_work_summary_desc_vi_gin
    ON core.career_work_activity_summary USING gin
    (to_tsvector('simple'::regconfig, activity_description_vi));

-- Step 7: Add comments for Vietnamese columns
COMMENT ON COLUMN core.career_work_activity_summary.activity_title_en IS 'Work activity title in English';
COMMENT ON COLUMN core.career_work_activity_summary.activity_title_vi IS 'Work activity title in Vietnamese';
COMMENT ON COLUMN core.career_work_activity_summary.activity_description_en IS 'Work activity description in English';
COMMENT ON COLUMN core.career_work_activity_summary.activity_description_vi IS 'Work activity description in Vietnamese';

-- Step 8: Create trigger to auto-update Vietnamese translations
CREATE OR REPLACE FUNCTION update_vietnamese_translations()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate Vietnamese translations from master table
    SELECT 
        element_name, element_name_vi, 
        description, description_vi
    INTO 
        NEW.activity_title_en, NEW.activity_title_vi,
        NEW.activity_description_en, NEW.activity_description_vi
    FROM core.career_work_activities_master
    WHERE element_id = NEW.element_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_vietnamese_translations
    BEFORE INSERT OR UPDATE ON core.career_work_activity_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_vietnamese_translations();