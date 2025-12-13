# 📚 Hướng dẫn Chat History - Lịch sử Chatbot

## Tổng quan
Tính năng Chat History cho phép lưu trữ và quản lý lịch sử cuộc hội thoại của người dùng với chatbot AI.

## 🗄️ Database Schema

### Bảng `chatbot.chat_sessions`
```sql
- id: Primary key
- user_id: Foreign key đến core.users
- title: Tiêu đề cuộc trò chuyện (tự động từ tin nhắn đầu)
- created_at: Thời gian tạo
- updated_at: Thời gian cập nhật cuối
- is_active: Session đang hoạt động hay không
```

### Bảng `chatbot.chat_messages`
```sql
- id: Primary key
- session_id: Foreign key đến chat_sessions
- user_id: Foreign key đến core.users
- message: Tin nhắn của user
- response: Phản hồi của AI
- message_type: Loại tin nhắn (text, career-advice, etc.)
- created_at: Thời gian tạo
- response_time_ms: Thời gian phản hồi (milliseconds)
```

## 🚀 Setup Database

### 1. Chạy Migration
```bash
cd Cap/AI-Based-Career-Recommendation-System/apps/backend
python setup_chatbot_db.py
```

### 2. Kiểm tra Database
```sql
-- Kiểm tra schema đã tạo
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'chatbot';

-- Kiểm tra bảng đã tạo
SELECT table_name FROM information_schema.tables WHERE table_schema = 'chatbot';
```

## 🔧 Backend API Endpoints

### Chat với lưu lịch sử
```http
POST /api/chatbot/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Tôi muốn tư vấn nghề nghiệp",
  "session_id": 123  // Optional, tự động tạo nếu không có
}
```

### Lấy danh sách sessions
```http
GET /api/chatbot/sessions
Authorization: Bearer <token>
```

### Tạo session mới
```http
POST /api/chatbot/sessions/new
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Cuộc trò chuyện về Data Science"  // Optional
}
```

### Lấy tin nhắn trong session
```http
GET /api/chatbot/sessions/{session_id}/messages
Authorization: Bearer <token>
```

### Cập nhật tiêu đề session
```http
PUT /api/chatbot/sessions/{session_id}/title
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Tiêu đề mới"
}
```

### Xóa session
```http
DELETE /api/chatbot/sessions/{session_id}
Authorization: Bearer <token>
```

## 🎨 Frontend Features

### Chat History Modal
- Hiển thị danh sách cuộc trò chuyện
- Tìm kiếm và lọc sessions
- Xem preview tin nhắn cuối
- Đổi tên và xóa sessions

### Chat Interface Updates
- Nút "Lịch sử" trong header chatbot
- Nút "Cuộc trò chuyện mới"
- Tự động lưu tin nhắn vào session hiện tại
- Load lại tin nhắn khi chọn session cũ

### UI Components
```tsx
// Mở lịch sử chat
<button onClick={() => setShowHistory(true)}>
  <History size={16} />
</button>

// Tạo cuộc trò chuyện mới
<button onClick={createNewSession}>
  <RotateCcw size={16} />
</button>
```

## 📊 Tính năng chính

### 1. Auto Session Management
- Tự động tạo session cho user mới
- Chỉ có 1 session active tại một thời điểm
- Tự động đặt title từ tin nhắn đầu tiên

### 2. Message Persistence
- Lưu tất cả tin nhắn user và AI response
- Tracking thời gian phản hồi
- Phân loại theo message type

### 3. Session Operations
- Tạo session mới
- Load lại session cũ
- Đổi tên session
- Xóa session (cascade delete messages)

### 4. Performance Optimization
- Indexes trên các trường quan trọng
- Pagination cho danh sách sessions
- Lazy loading messages

## 🔍 Usage Examples

### Tạo và sử dụng session
```javascript
// Tạo session mới
const newSession = await fetch('/api/chatbot/sessions/new', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title: 'Tư vấn Frontend Developer' })
});

// Chat trong session
const chatResponse = await fetch('/api/chatbot/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Tôi muốn trở thành Frontend Developer',
    session_id: newSession.session_id
  })
});
```

### Load lại cuộc trò chuyện cũ
```javascript
// Lấy danh sách sessions
const sessions = await fetch('/api/chatbot/sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Load messages từ session cụ thể
const messages = await fetch(`/api/chatbot/sessions/${sessionId}/messages`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🛡️ Security & Privacy

### Data Protection
- Chỉ user sở hữu mới xem được sessions của mình
- JWT authentication required cho tất cả endpoints
- Cascade delete khi xóa user

### Performance Considerations
- Index optimization cho queries thường dùng
- Limit số lượng sessions trả về
- Pagination cho messages trong session lớn

## 🧪 Testing

### Test Database Setup
```bash
# Test connection
python setup_chatbot_db.py

# Verify tables
psql -d career_ai -c "\dt chatbot.*"
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:8000/api/chatbot/health

# Test chat with session
curl -X POST "http://localhost:8000/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Hello", "session_id": null}'

# Get sessions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/chatbot/sessions
```

## 📈 Monitoring

### Database Metrics
- Số lượng sessions per user
- Số tin nhắn per session
- Response time distribution
- Storage usage

### User Behavior
- Session duration
- Messages per session
- Most active users
- Popular conversation topics

## 🔄 Maintenance

### Cleanup Old Data
```sql
-- Xóa sessions cũ hơn 6 tháng và không active
DELETE FROM chatbot.chat_sessions 
WHERE created_at < NOW() - INTERVAL '6 months' 
AND is_active = false;

-- Xóa messages orphaned
DELETE FROM chatbot.chat_messages 
WHERE session_id NOT IN (SELECT id FROM chatbot.chat_sessions);
```

### Backup Strategy
- Regular backup của schema chatbot
- Export conversations cho analysis
- Archive old sessions

---

## 🎉 Kết quả

Chat History đã được tích hợp hoàn chỉnh với:
- ✅ Database schema và migrations
- ✅ Backend API endpoints
- ✅ Frontend UI components
- ✅ Session management
- ✅ Message persistence
- ✅ Security và performance optimization

Người dùng giờ có thể:
- Lưu trữ và quản lý lịch sử chat
- Tiếp tục cuộc trò chuyện cũ
- Tạo nhiều sessions khác nhau
- Tìm kiếm và tổ chức conversations

**Chatbot với Chat History đã sẵn sàng sử dụng!** 🚀