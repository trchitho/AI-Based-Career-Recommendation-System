# Hướng dẫn cài đặt nhanh Gemini Chatbot

## Bước 1: Cài đặt Dependencies

### Backend
```bash
cd apps/backend
pip install -r requirements.txt
```

### Frontend
```bash
cd apps/frontend
npm install lucide-react
```

## Bước 2: Lấy Gemini API Key

1. Truy cập [Google AI Studio](https://aistudio.google.com/)
2. Đăng nhập với tài khoản Google
3. Click "Get API Key" → "Create API Key"
4. Copy API Key

## Bước 3: Cấu hình Environment

Cập nhật file `apps/backend/.env`:
```env
# Google Gemini API for Chatbot
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7
```

## Bước 4: Thêm Routes vào Backend

Trong file `apps/backend/app/main.py`, thêm:
```python
from app.modules.chatbot.routes import router as chatbot_router

# Thêm vào phần include routers
app.include_router(chatbot_router)
```

## Bước 5: Thêm Component vào Frontend

Trong file `apps/frontend/src/App.tsx` hoặc layout chính:
```tsx
import { ChatbotButton } from './components/chatbot/ChatbotButton';

function App() {
  return (
    <div className="App">
      {/* Existing components */}
      
      {/* Chatbot - thêm ở cuối */}
      <ChatbotButton />
    </div>
  );
}
```

## Bước 6: Test Chatbot

1. Khởi động backend:
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

2. Khởi động frontend:
```bash
cd apps/frontend
npm run dev
```

3. Mở browser và test chatbot ở góc phải màn hình

## Bước 7: Kiểm tra Health Check

Test API endpoint:
```bash
curl http://localhost:8000/api/chatbot/health
```

## Troubleshooting

### Lỗi API Key
- Kiểm tra GEMINI_API_KEY trong .env
- Đảm bảo API key hợp lệ và có quyền truy cập

### Lỗi Import
- Kiểm tra đã cài đặt `google-generativeai`
- Restart backend sau khi cài đặt

### Lỗi CORS
- Kiểm tra ALLOWED_ORIGINS trong .env
- Đảm bảo frontend URL được cho phép

### Lỗi Authentication
- Kiểm tra user đã đăng nhập
- Kiểm tra token trong localStorage

## Tính năng có sẵn

1. **Chat cơ bản**: Hỏi đáp tự do về nghề nghiệp
2. **Tư vấn nghề nghiệp**: Phân tích profile và đề xuất
3. **Kế hoạch kỹ năng**: Lộ trình phát triển cá nhân
4. **Phân tích thị trường**: Thông tin về ngành nghề

## Tùy chỉnh

### Thay đổi giao diện
- Sửa file `Chatbot.tsx` và `ChatbotButton.tsx`
- Tùy chỉnh CSS classes

### Thêm tính năng
- Mở rộng `GeminiService` với methods mới
- Thêm endpoints trong `routes.py`
- Cập nhật frontend components

### Cấu hình AI
- Điều chỉnh `GEMINI_TEMPERATURE` (0.0-1.0)
- Thay đổi `GEMINI_MAX_TOKENS`
- Sử dụng model khác (gemini-pro, gemini-1.5-pro)

---

Chatbot đã sẵn sàng sử dụng! 🤖✨