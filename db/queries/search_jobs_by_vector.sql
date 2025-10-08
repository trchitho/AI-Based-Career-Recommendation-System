-- Tìm nghề gần nhất theo embedding vector (pgvector)
SELECT id, title, description
FROM ai.career_embeddings
ORDER BY embedding <=> '[0.12, 0.45, 0.33, ...]'::vector
LIMIT 10;
-- Thay '[0.12, 0.45, 0.33, ...]' bằng vector thực tế bạn muốn tìm kiếm