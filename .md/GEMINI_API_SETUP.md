# Hướng dẫn Setup Gemini API Key

## ⚠️ VẤN ĐỀ HIỆN TẠI
API keys bị báo "expired" hoặc "invalid" ngay sau khi tạo.

## ✅ GIẢI PHÁP - Setup đúng cách

### Bước 1: Truy cập Google AI Studio
1. Mở: https://aistudio.google.com/
2. Đăng nhập với Google account
3. Chấp nhận Terms of Service nếu được hỏi

### Bước 2: Tạo API Key
1. Click vào "Get API Key" ở menu bên trái
2. Hoặc truy cập trực tiếp: https://aistudio.google.com/app/apikey
3. Click "Create API Key"
4. Chọn "Create API key in new project" (QUAN TRỌNG!)
5. Đợi vài giây để Google tạo project
6. Copy API key ngay lập tức

### Bước 3: Verify API Key
Chạy lệnh này để test (thay YOUR_KEY):

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

Nếu thành công, bạn sẽ thấy response JSON với text "Hello".

### Bước 4: Cập nhật .env
```env
GEMINI_API_KEY=YOUR_NEW_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash
```

### Bước 5: Restart Backend
```bash
# Stop server (Ctrl+C)
# Start lại
python -m uvicorn app.main:app --reload --port 8000
```

## 🔍 TROUBLESHOOTING

### Lỗi: "API key expired"
**Nguyên nhân:** 
- API key bị leak (đã commit lên Git public)
- Tài khoản Google chưa verify
- Project chưa enable Gemini API

**Giải pháp:**
1. Xóa TẤT CẢ API keys cũ
2. Tạo project MỚI trong Google Cloud Console
3. Enable Generative Language API
4. Tạo API key mới trong project đó
5. KHÔNG commit .env lên Git

### Lỗi: "404 model not found"
**Nguyên nhân:** Model name sai

**Giải pháp:** Dùng các model name sau:
- `gemini-1.5-flash` (recommended, free)
- `gemini-1.5-pro` (more capable)
- `gemini-pro` (legacy)

### Lỗi: "403 Permission denied"
**Nguyên nhân:** Billing chưa được setup

**Giải pháp:**
1. Truy cập: https://console.cloud.google.com/billing
2. Link credit card (không bị charge cho free tier)
3. Enable billing cho project

## 📝 LƯU Ý BẢO MẬT

### ⚠️ QUAN TRỌNG:
1. **KHÔNG** commit file `.env` lên Git
2. **KHÔNG** share API key công khai
3. **KHÔNG** hardcode API key trong code
4. Thêm `.env` vào `.gitignore`

### ✅ Best Practices:
```bash
# Kiểm tra .env có bị track không
git ls-files | grep .env

# Nếu có, xóa khỏi Git
git rm --cached apps/backend/.env
git commit -m "Remove .env from tracking"

# Đảm bảo .gitignore có
echo ".env" >> .gitignore
echo "**/.env" >> .gitignore
```

## 🎯 ALTERNATIVE: Dùng Fallback (Không cần API key)

Nếu không thể setup API key, ứng dụng vẫn hoạt động với fallback scenarios:
- Câu hỏi gốc từ database
- Không có AI-generated stories
- Vẫn có đầy đủ chức năng assessment

Để dùng fallback, để trống GEMINI_API_KEY:
```env
GEMINI_API_KEY=
```

Backend sẽ tự động dùng fallback scenarios.

## 📞 HỖ TRỢ

Nếu vẫn gặp vấn đề:
1. Check Google AI Studio status: https://status.cloud.google.com/
2. Xem Gemini API docs: https://ai.google.dev/docs
3. Kiểm tra quota limits: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
