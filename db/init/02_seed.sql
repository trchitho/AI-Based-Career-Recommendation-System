-- =========================================================
-- 02_seed.sql
-- Seed dữ liệu mẫu cho demo & kiểm thử nhanh
-- =========================================================

-- 1) USERS
INSERT INTO core.users (email, password_hash, full_name, role)
VALUES
('admin@local', '$2y$10$ABCDEFGHIJKLMNOPQRSTUV/abcd1234567890abcdefghiJK', 'Admin Local', 'Admin'),
('alice@example.com', '$2y$10$ABCDEFGHIJKLMNOPQRSTUV/abcd1234567890abcdefghiJK', 'Alice Nguyen', 'Reader'),
('bob@example.com',   '$2y$10$ABCDEFGHIJKLMNOPQRSTUV/abcd1234567890abcdefghiJK', 'Bob Tran',   'Reader')
ON CONFLICT (email) DO NOTHING;

-- 2) CAREER CATEGORIES
INSERT INTO core.career_categories (name) VALUES
('Công nghệ thông tin'),
('Khoa học dữ liệu'),
('Kỹ thuật phần mềm')
ON CONFLICT DO NOTHING;

-- 3) CAREERS
INSERT INTO core.careers (slug, title, category_id, short_desc, content_md)
SELECT 'data-scientist', 'Data Scientist', cc.id,
       'Phân tích dữ liệu nâng cao, mô hình hóa, ML/AI.',
       '## Data Scientist
- Kỹ năng: Python, SQL, ML, MLOps
- Công việc: xây dựng mô hình học máy, phân tích, báo cáo.'
FROM core.career_categories cc WHERE cc.name='Khoa học dữ liệu'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO core.careers (slug, title, category_id, short_desc, content_md)
SELECT 'ai-engineer', 'AI Engineer', cc.id,
       'Triển khai hệ thống AI/ML vào sản phẩm.',
       '## AI Engineer
- Kỹ năng: Python, Deep Learning, Vector DB
- Công việc: phục vụ model, tối ưu suy luận, MLOps.'
FROM core.career_categories cc WHERE cc.name='Công nghệ thông tin'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO core.careers (slug, title, category_id, short_desc, content_md)
SELECT 'software-engineer', 'Software Engineer', cc.id,
       'Phát triển tính năng, tối ưu hiệu năng hệ thống.',
       '## Software Engineer
- Kỹ năng: Algorithms, System Design, Cloud
- Công việc: phát triển/duy trì dịch vụ.'
FROM core.career_categories cc WHERE cc.name='Kỹ thuật phần mềm'
ON CONFLICT (slug) DO NOTHING;

-- 4) CAREER STATS
INSERT INTO core.career_stats (career_id, market_outlook, avg_salary, salary_currency, demand_level, sources_json)
SELECT c.id, 'Tăng trưởng mạnh', 35000000, 'VND', 'High', '{"source":"VNIT Report 2025"}'
FROM core.careers c WHERE c.slug='data-scientist'
ON CONFLICT (career_id) DO NOTHING;

INSERT INTO core.career_stats (career_id, market_outlook, avg_salary, salary_currency, demand_level, sources_json)
SELECT c.id, 'Ổn định', 32000000, 'VND', 'Medium', '{"source":"VNIT Report 2025"}'
FROM core.careers c WHERE c.slug='ai-engineer'
ON CONFLICT (career_id) DO NOTHING;

INSERT INTO core.career_stats (career_id, market_outlook, avg_salary, salary_currency, demand_level, sources_json)
SELECT c.id, 'Rất cao', 30000000, 'VND', 'High', '{"source":"VNIT Report 2025"}'
FROM core.careers c WHERE c.slug='software-engineer'
ON CONFLICT (career_id) DO NOTHING;

-- 5) TAGS + MAP
INSERT INTO core.career_tags(name) VALUES
('Python'), ('SQL'), ('Machine Learning'), ('Deep Learning'), ('System Design')
ON CONFLICT DO NOTHING;

INSERT INTO core.career_tag_map(career_id, tag_id)
SELECT c.id, t.id
FROM core.careers c
JOIN core.career_tags t ON t.name IN (
  CASE c.slug
    WHEN 'data-scientist'     THEN 'Python'
    WHEN 'ai-engineer'        THEN 'Deep Learning'
    WHEN 'software-engineer'  THEN 'System Design'
  END
)
WHERE c.slug IN ('data-scientist','ai-engineer','software-engineer')
ON CONFLICT DO NOTHING;

-- 6) BLOG + COMMENTS + REACTIONS
INSERT INTO core.blog_posts (author_id, title, slug, content_md, status, published_at)
SELECT u.id, 'Giới thiệu hệ thống CareerAI', 'gioi-thieu-careerai',
       '# CareerAI
Hệ thống gợi ý nghề nghiệp dựa trên RIASEC, Big Five và embedding.',
       'Published', now()
FROM core.users u WHERE u.email='admin@local'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO core.comments (post_id, user_id, content)
SELECT p.id, u.id, 'Bài viết hữu ích!'
FROM core.blog_posts p, core.users u
WHERE p.slug='gioi-thieu-careerai' AND u.email='alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO core.reactions (user_id, post_id, value)
SELECT u.id, p.id, 'love'
FROM core.blog_posts p, core.users u
WHERE p.slug='gioi-thieu-careerai' AND u.email='bob@example.com'
ON CONFLICT DO NOTHING;

-- 7) ASSESSMENTS (ví dụ điểm RIASEC/BigFive)
INSERT INTO core.assessments (user_id, a_type, scores)
SELECT u.id, 'RIASEC', '{"R":0.4,"I":0.7,"A":0.3,"S":0.5,"E":0.4,"C":0.2}'
FROM core.users u WHERE u.email='alice@example.com';

INSERT INTO core.assessments (user_id, a_type, scores)
SELECT u.id, 'BigFive', '{"O":0.66,"C":0.58,"E":0.41,"A":0.73,"N":0.32}'
FROM core.users u WHERE u.email='alice@example.com';

-- 8) VECTOR SEEDS
-- Tạo embedding nghề: career_id → vector(768)
INSERT INTO ai.career_embeddings (career_id, emb)
SELECT c.id, ARRAY(SELECT random()::real FROM generate_series(1,768))::vector(768)
FROM core.careers c
WHERE NOT EXISTS (SELECT 1 FROM ai.career_embeddings e WHERE e.career_id = c.id);

-- Tạo embedding user (essay)
INSERT INTO ai.user_embeddings (user_id, emb, source)
SELECT u.id, ARRAY(SELECT random()::real FROM generate_series(1,768))::vector(768), 'essay'
FROM core.users u
WHERE u.email IN ('alice@example.com','bob@example.com')
  AND NOT EXISTS (SELECT 1 FROM ai.user_embeddings ue WHERE ue.user_id = u.id);

-- 9) TỐI ƯU & KIỂM TRA NHANH
ANALYZE ai.career_embeddings;
ANALYZE ai.user_embeddings;

-- Demo truy vấn top-K (cosine)
-- WITH q AS (
--   SELECT ARRAY(SELECT random()::real FROM generate_series(1,768))::vector(768) AS emb
-- )
-- SELECT c.title, 1 - (e.emb <=> q.emb) AS cosine_score
-- FROM ai.career_embeddings e
-- JOIN core.careers c ON c.id = e.career_id, q
-- ORDER BY e.emb <=> q.emb
-- LIMIT 5;
