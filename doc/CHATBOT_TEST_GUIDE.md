# 🧪 Hướng dẫn Test Chatbot

## Tình trạng hiện tại

### ✅ Đã hoạt động
- Backend API endpoints đã được tạo
- Gemini API connection thành công
- Health check: `GET /api/chatbot/health` ✅
- Test endpoint: `POST /api/chatbot/test-chat` ✅

### 🔧 Đang debug
- Authentication với `require_user()` 
- Frontend integration
- Encoding tiếng Việt

## Test Steps

### 1. Test Backend API

#### Health Check
```bash
curl http://localhost:8000/api/chatbot/health
```
**Expected:** `{"status":"healthy","gemini_api":"connected"}`

#### Test Chat (No Auth)
```bash
# Tạo file test
echo '{"message": "Hello chatbot"}' > test.json

# Test API
curl -X POST "http://localhost:8000/api/chatbot/test-chat" \
  -H "Content-Type: application/json" \
  -d @test.json
```

### 2. Test Frontend

#### Khởi động servers
```bash
# Terminal 1: Backend
cd Cap/AI-Based-Career-Recommendation-System/apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend  
cd Cap/AI-Based-Career-Recommendation-System/apps/frontend
npm run dev
```

#### Test trên browser
1. Mở http://localhost:3000
2. **Đăng nhập** (quan trọng!)
3. Tìm icon chatbot ở góc phải
4. Click để mở chat window
5. Gửi tin nhắn test

### 3. Debug Common Issues

#### Chatbot không hiện
- Kiểm tra user đã đăng nhập chưa
- Check console browser (F12)
- Verify ChatbotWrapper trong App.tsx

#### API 500 Error
- Kiểm tra backend logs
- Verify Gemini API key trong .env
- Check authentication token

#### Encoding issues
- Đảm bảo UTF-8 encoding
- Check browser charset
- Verify API response headers

## Current Configuration

### Backend (.env)
```env
GEMINI_API_KEY=AIzaSyBavdbkPen1PbCoMZRXYCm7qXgRtt4B6Uk
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7
```

### Frontend (temporary)
- Sử dụng `/api/chatbot/test-chat` để bypass auth
- Sẽ chuyển về `/api/chatbot/chat` sau khi fix auth

## Next Steps

### 1. Fix Authentication
- Debug `require_user()` function
- Verify JWT token format
- Test with valid user session

### 2. Fix Encoding
- Add UTF-8 headers
- Test Vietnamese characters
- Verify frontend display

### 3. Production Ready
- Switch back to authenticated endpoints
- Add error handling
- Implement rate limiting

## Troubleshooting Commands

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check chatbot health
curl http://localhost:8000/api/chatbot/health

# Test Gemini directly
python Cap/AI-Based-Career-Recommendation-System/test_gemini.py

# Check frontend build
cd apps/frontend && npm run build

# Check dependencies
pip list | grep google-generativeai
```

## Expected Behavior

### Working Chatbot
1. Icon xuất hiện ở góc phải khi đã đăng nhập
2. Click icon → chat window mở (320x480px)
3. Gửi tin nhắn → AI response trong ~3-5 giây
4. Hỗ trợ tiếng Việt tự nhiên
5. Quick actions cho tính năng phổ biến

### Error Handling
- Network errors → "Kiểm tra kết nối mạng"
- Auth errors → "Vui lòng đăng nhập lại"
- API errors → "Thử lại sau"
- Loading states với animation

---

**Status:** 🟡 In Progress - Backend OK, Frontend debugging

**Next:** Fix authentication và test end-to-end