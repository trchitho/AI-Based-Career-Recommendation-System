-- Lấy top nghề có điểm khớp cao nhất cho người dùng
SELECT c.id, c.title, r.match_score
FROM ai.recommendation_results r
JOIN ai.careers c ON c.id = r.career_id
WHERE r.user_id = :user_id
ORDER BY r.match_score DESC
LIMIT 5;
-- Thay :user_id bằng ID người dùng thực tế bạn muốn truy vấn
