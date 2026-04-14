# AI Mock Interviewer Scripts

Folder này chứa các scripts liên quan đến AI Mock Interviewer feature.

## 📁 Cấu trúc Files

### 🗄️ Database Setup
- `create_interview_tables.py` - Tạo bảng interview trong PostgreSQL

### 🧪 Testing
- `test_interview_api.py` - Test API endpoints của Interview system

## 🚀 Cách sử dụng

### 1. Setup Database Tables
```bash
python create_interview_tables.py
```

### 2. Test API
```bash
python test_interview_api.py
```

## 📊 Interview System Features

### 🎯 Core Components
- **Interview Sessions:** Quản lý phiên phỏng vấn
- **Questions:** Câu hỏi được tạo bởi AI
- **Responses:** Câu trả lời của user
- **Evaluations:** Đánh giá và feedback từ AI
- **Reports:** Báo cáo kết quả phỏng vấn

### 🤖 AI Integration
- **Gemini AI:** Tạo câu hỏi và đánh giá
- **Neo4j Integration:** Lấy thông tin job requirements
- **Prompt Engineering:** Tối ưu hóa prompts cho từng loại câu hỏi

### 📈 Database Schema
```sql
-- Interview Sessions
interview_sessions (id, user_id, job_title, status, created_at, completed_at)

-- Interview Questions  
interview_questions (id, session_id, question_text, question_type, order_index)

-- Interview Responses
interview_responses (id, question_id, response_text, response_time, created_at)

-- Interview Evaluations
interview_evaluations (id, session_id, overall_score, strengths, improvements, detailed_feedback)
```

## 🔗 API Endpoints

- `POST /interview/start` - Bắt đầu phiên phỏng vấn
- `GET /interview/{session_id}/question` - Lấy câu hỏi tiếp theo
- `POST /interview/{session_id}/answer` - Gửi câu trả lời
- `POST /interview/{session_id}/complete` - Hoàn thành phỏng vấn
- `GET /interview/{session_id}/results` - Lấy kết quả đánh giá

## 📝 Notes

- Interview system đã được tích hợp với main application
- AI prompts đã được tối ưu hóa cho tiếng Việt
- Database schema đã được tạo và test thành công
- API endpoints hoạt động ổn định với Gemini AI integration