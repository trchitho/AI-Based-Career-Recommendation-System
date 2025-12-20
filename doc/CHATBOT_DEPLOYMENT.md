# Hướng dẫn Deploy Gemini Chatbot

## Tổng quan
Chatbot đã được tích hợp hoàn chỉnh vào hệ thống và sẽ xuất hiện trên mọi trang khi user đã đăng nhập.

## Cấu trúc Files đã tạo

### Backend
```
apps/backend/app/modules/chatbot/
├── __init__.py
├── gemini_service.py      # Service xử lý Gemini API
└── routes.py              # API endpoints

apps/backend/
├── requirements.txt       # Đã thêm google-generativeai
└── .env                   # Đã thêm GEMINI_API_KEY
```

### Frontend
```
apps/frontend/src/components/chatbot/
├── Chatbot.tsx           # Component chat chính
├── ChatbotButton.tsx     # Nút floating chatbot
└── ChatbotWrapper.tsx    # Wrapper kiểm tra auth

apps/frontend/src/
└── App.tsx               # Đã tích hợp ChatbotWrapper
```

## Tính năng đã implement

### 🤖 Backend Features
- ✅ Gemini API integration với error handling
- ✅ 4 endpoints chính:
  - `/api/chatbot/chat` - Chat tự do
  - `/api/chatbot/career-advice` - Tư vấn nghề nghiệp
  - `/api/chatbot/skill-development` - Kế hoạch kỹ năng
  - `/api/chatbot/job-market-analysis` - Phân tích thị trường
- ✅ Health check endpoint
- ✅ Authentication required
- ✅ Logging và monitoring

### 🎨 Frontend Features
- ✅ Floating button ở góc phải màn hình
- ✅ Compact chat window (320x480px)
- ✅ Welcome message cho lần đầu sử dụng
- ✅ Quick action buttons
- ✅ Responsive design
- ✅ Loading states và animations
- ✅ Chỉ hiện khi user đã đăng nhập

## Deployment Steps

### 1. Backend Setup
```bash
cd apps/backend

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình environment
# Thêm GEMINI_API_KEY vào .env file
GEMINI_API_KEY=your_actual_api_key_here

# Test connection
python ../../test_gemini.py

# Start server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd apps/frontend

# Cài đặt dependencies (nếu cần)
npm install lucide-react

# Start development
npm run dev
```

### 3. Production Deployment

#### Environment Variables
```env
# Production .env
GEMINI_API_KEY=your_production_api_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7
```

#### Docker (nếu sử dụng)
Thêm vào Dockerfile backend:
```dockerfile
RUN pip install google-generativeai==0.3.2
```

#### Vercel/Netlify Frontend
Không cần cấu hình đặc biệt, chatbot sẽ tự động hoạt động.

## Testing

### 1. Test API Connection
```bash
python test_gemini.py
```

### 2. Test Backend Endpoints
```bash
# Health check
curl http://localhost:8000/api/chatbot/health

# Chat test (cần token)
curl -X POST "http://localhost:8000/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Xin chào"}'
```

### 3. Test Frontend
1. Đăng nhập vào hệ thống
2. Kiểm tra icon chatbot ở góc phải
3. Click để mở chat window
4. Test gửi tin nhắn

## Monitoring & Maintenance

### Logs
- Backend logs: Kiểm tra console cho chatbot errors
- API usage: Monitor Gemini API quota
- User interactions: Track trong analytics

### Performance
- Response time: ~2-5 giây cho Gemini API
- Concurrent users: Phụ thuộc vào Gemini API limits
- Caching: Có thể implement cho frequent queries

### Security
- API key được bảo vệ trong environment variables
- Authentication required cho tất cả endpoints
- Input validation và sanitization

## Troubleshooting

### Common Issues

#### 1. "GEMINI_API_KEY not found"
```bash
# Kiểm tra .env file
cat apps/backend/.env | grep GEMINI

# Restart backend sau khi update .env
```

#### 2. "Module not found: chatbot"
```bash
# Cài đặt lại dependencies
pip install -r requirements.txt

# Kiểm tra import trong main.py
```

#### 3. Chatbot không hiện trên frontend
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra console browser cho errors
- Verify ChatbotWrapper trong App.tsx

#### 4. API calls fail
- Kiểm tra CORS settings
- Verify authentication token
- Check network connectivity

### Debug Commands
```bash
# Check backend health
curl http://localhost:8000/api/chatbot/health

# Check frontend build
npm run build

# Test Gemini connection
python test_gemini.py
```

## Future Enhancements

### Planned Features
- [ ] Chat history persistence
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Integration với recommendation system
- [ ] Advanced analytics
- [ ] Custom prompts per user type

### Performance Optimizations
- [ ] Response caching
- [ ] Streaming responses
- [ ] Rate limiting per user
- [ ] Background processing

---

Chatbot đã sẵn sàng production! 🚀

Để bắt đầu sử dụng:
1. Lấy Gemini API key từ Google AI Studio
2. Cập nhật .env file
3. Restart backend
4. Test trên browser

Chatbot sẽ xuất hiện ở góc phải màn hình trên mọi trang khi user đã đăng nhập.