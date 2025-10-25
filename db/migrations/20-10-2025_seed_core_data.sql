BEGIN;

-- Seed app settings (branding)
INSERT INTO core.app_settings (id, logo_url, app_title, app_name, footer_html)
VALUES (1,
        'https://dummyimage.com/120x40/4b5563/ffffff&text=CareerBridge',
        'CareerBridge AI', 'CareerBridge', '© 2025 CareerBridge AI')
ON CONFLICT (id) DO NOTHING;

-- Seed career categories
INSERT INTO core.career_categories (name)
VALUES ('Phần mềm'), ('Dữ liệu'), ('Thiết kế')
ON CONFLICT (name) DO NOTHING;

-- Helper: pick category ids
WITH cat_sw AS (
  SELECT id FROM core.career_categories WHERE name='Phần mềm'
), cat_data AS (
  SELECT id FROM core.career_categories WHERE name='Dữ liệu'
), cat_design AS (
  SELECT id FROM core.career_categories WHERE name='Thiết kế'
)
INSERT INTO core.careers (slug, title, category_id, short_desc, content_md, onet_code)
VALUES
('frontend-developer', 'Frontend Developer', (SELECT id FROM cat_sw),
 'Xây dựng giao diện web hiện đại.',
 'Kỹ năng: HTML, CSS, JavaScript, React/Vue, hiệu năng & UX.',
 '15-1254.01'),
('data-analyst', 'Data Analyst', (SELECT id FROM cat_data),
 'Phân tích dữ liệu, trực quan hoá và báo cáo.',
 'Kỹ năng: SQL, Excel, Python, BI, thống kê mô tả.',
 '15-2041.00'),
('ui-ux-designer', 'UI/UX Designer', (SELECT id FROM cat_design),
 'Thiết kế trải nghiệm và giao diện người dùng.',
 'Kỹ năng: wireframe, prototype, nghiên cứu người dùng, Figma.',
 '27-1024.00')
ON CONFLICT (slug) DO NOTHING;

-- Seed essay prompts
INSERT INTO core.essay_prompts (title, prompt_text, lang)
VALUES
('Định hướng nghề nghiệp', 'Hãy mô tả công việc mơ ước của bạn trong 5 năm tới và lý do.', 'vi'),
('Phong cách làm việc', 'Bạn thích làm việc cá nhân hay theo nhóm? Nêu ví dụ.', 'vi')
ON CONFLICT DO NOTHING;

-- Seed RIASEC form + questions
WITH form AS (
  INSERT INTO core.assessment_forms (code, title, form_type, lang, version)
  VALUES ('RIASEC_VI_V1', 'Bộ câu hỏi RIASEC (VI)', 'RIASEC', 'vi', 'v1')
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, version=EXCLUDED.version
  RETURNING id
)
INSERT INTO core.assessment_questions (form_id, question_no, question_key, prompt, options_json, reverse_score)
VALUES
((SELECT id FROM form),  1, 'R', 'Tôi thích làm việc với máy móc, công cụ hoặc thiết bị.', NULL, FALSE),
((SELECT id FROM form),  2, 'R', 'Tôi thấy thoải mái khi sửa chữa, lắp ráp các vật dụng.', NULL, FALSE),
((SELECT id FROM form),  3, 'R', 'Tôi thích các hoạt động thực hành ngoài trời.', NULL, FALSE),
((SELECT id FROM form),  4, 'R', 'Tôi ưu tiên công việc đề cao thể lực/kỹ thuật hơn giấy tờ.', NULL, FALSE),
((SELECT id FROM form),  5, 'I', 'Tôi thích phân tích dữ liệu và giải quyết vấn đề phức tạp.', NULL, FALSE),
((SELECT id FROM form),  6, 'I', 'Tôi tò mò về cách mọi thứ hoạt động.', NULL, FALSE),
((SELECT id FROM form),  7, 'I', 'Tôi thích nghiên cứu, đọc tài liệu chuyên sâu.', NULL, FALSE),
((SELECT id FROM form),  8, 'I', 'Tôi thường đặt câu hỏi “vì sao” và “như thế nào”.', NULL, FALSE),
((SELECT id FROM form),  9, 'A', 'Tôi thích thể hiện bản thân qua nghệ thuật hoặc thiết kế.', NULL, FALSE),
((SELECT id FROM form), 10, 'A', 'Tôi coi trọng sự sáng tạo và độc đáo.', NULL, FALSE),
((SELECT id FROM form), 11, 'A', 'Tôi thích làm việc trong môi trường linh hoạt, ít gò bó.', NULL, FALSE),
((SELECT id FROM form), 12, 'A', 'Tôi yêu thích âm nhạc, hội họa, viết lách hoặc nhiếp ảnh.', NULL, FALSE),
((SELECT id FROM form), 13, 'S', 'Tôi thích giúp đỡ, hướng dẫn hoặc dạy người khác.', NULL, FALSE),
((SELECT id FROM form), 14, 'S', 'Tôi dễ dàng đồng cảm và thấu hiểu cảm xúc người khác.', NULL, FALSE),
((SELECT id FROM form), 15, 'S', 'Tôi thích làm việc nhóm và giao tiếp nhiều.', NULL, FALSE),
((SELECT id FROM form), 16, 'S', 'Tôi thấy vui khi góp phần cải thiện cuộc sống cộng đồng.', NULL, FALSE),
((SELECT id FROM form), 17, 'E', 'Tôi thích thuyết phục, dẫn dắt và tạo ảnh hưởng.', NULL, FALSE),
((SELECT id FROM form), 18, 'E', 'Tôi hứng thú với kinh doanh, bán hàng hoặc khởi nghiệp.', NULL, FALSE),
((SELECT id FROM form), 19, 'E', 'Tôi tự tin ra quyết định và chịu trách nhiệm.', NULL, FALSE),
((SELECT id FROM form), 20, 'E', 'Tôi muốn theo đuổi mục tiêu tham vọng và tăng trưởng.', NULL, FALSE),
((SELECT id FROM form), 21, 'C', 'Tôi thích công việc có cấu trúc, quy trình rõ ràng.', NULL, FALSE),
((SELECT id FROM form), 22, 'C', 'Tôi chú ý đến chi tiết và tính chính xác.', NULL, FALSE),
((SELECT id FROM form), 23, 'C', 'Tôi thấy thoải mái với các công việc giấy tờ, dữ liệu.', NULL, FALSE),
((SELECT id FROM form), 24, 'C', 'Tôi thích lập kế hoạch, sắp xếp và quản lý hồ sơ.', NULL, FALSE)
ON CONFLICT DO NOTHING;

-- Seed Big Five form + questions
WITH form AS (
  INSERT INTO core.assessment_forms (code, title, form_type, lang, version)
  VALUES ('BIGFIVE_VI_V1', 'Bộ câu hỏi Big Five (VI)', 'BigFive', 'vi', 'v1')
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, version=EXCLUDED.version
  RETURNING id
)
INSERT INTO core.assessment_questions (form_id, question_no, question_key, prompt, options_json, reverse_score)
VALUES
((SELECT id FROM form),  1, 'O', 'Tôi thích thử nghiệm những ý tưởng mới lạ.', NULL, FALSE),
((SELECT id FROM form),  2, 'O', 'Tôi quan tâm đến nghệ thuật, văn hóa và triết học.', NULL, FALSE),
((SELECT id FROM form),  3, 'O', 'Tôi cởi mở với trải nghiệm mới.', NULL, FALSE),
((SELECT id FROM form),  4, 'O', 'Tôi thích tưởng tượng và khám phá khả năng khác nhau.', NULL, FALSE),
((SELECT id FROM form),  5, 'C', 'Tôi làm việc có tổ chức và đúng hạn.', NULL, FALSE),
((SELECT id FROM form),  6, 'C', 'Tôi kiên trì với mục tiêu cho đến khi hoàn thành.', NULL, FALSE),
((SELECT id FROM form),  7, 'C', 'Tôi ít khi bất cẩn trong công việc.', NULL, FALSE),
((SELECT id FROM form),  8, 'C', 'Tôi có kế hoạch rõ ràng cho công việc/ngày của mình.', NULL, FALSE),
((SELECT id FROM form),  9, 'E', 'Tôi dễ dàng bắt chuyện và kết nối với người lạ.', NULL, FALSE),
((SELECT id FROM form), 10, 'E', 'Tôi thấy mình tràn đầy năng lượng khi ở cạnh người khác.', NULL, FALSE),
((SELECT id FROM form), 11, 'E', 'Tôi thích là trung tâm của sự chú ý.', NULL, TRUE),
((SELECT id FROM form), 12, 'E', 'Tôi thường chủ động trong các hoạt động xã hội.', NULL, FALSE),
((SELECT id FROM form), 13, 'A', 'Tôi ân cần, quan tâm đến cảm xúc người khác.', NULL, FALSE),
((SELECT id FROM form), 14, 'A', 'Tôi dễ tin tưởng và hợp tác với mọi người.', NULL, FALSE),
((SELECT id FROM form), 15, 'A', 'Tôi hay cạnh tranh và ít khi nhượng bộ.', NULL, TRUE),
((SELECT id FROM form), 16, 'A', 'Tôi sẵn sàng giúp đỡ người khác khi họ cần.', NULL, FALSE),
((SELECT id FROM form), 17, 'N', 'Tôi dễ lo lắng khi đối mặt áp lực.', NULL, FALSE),
((SELECT id FROM form), 18, 'N', 'Tôi thường thấy căng thẳng hoặc bất an.', NULL, FALSE),
((SELECT id FROM form), 19, 'N', 'Tôi giữ bình tĩnh trong hầu hết tình huống.', NULL, TRUE),
((SELECT id FROM form), 20, 'N', 'Cảm xúc tiêu cực ảnh hưởng nhiều đến hiệu suất của tôi.', NULL, FALSE)
ON CONFLICT DO NOTHING;

COMMIT;
