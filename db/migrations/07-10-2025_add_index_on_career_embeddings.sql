-- Schema: ai, bảng: career_embeddings, cột vector: emb
-- Tạo index IVF Flat cho cosine; chỉ tạo nếu chưa có
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_career_embeddings_emb_cos
ON ai.career_embeddings
USING ivfflat (emb vector_cosine_ops)
WITH (lists = 100);

-- Gợi ý chạy lại thống kê
ANALYZE ai.career_embeddings;
