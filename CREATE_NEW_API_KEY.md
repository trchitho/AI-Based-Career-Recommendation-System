# Hướng dẫn tạo API Key mới cho Gemini

## Vấn đề hiện tại
- API key hiện tại đã vượt quá quota limit (20 requests/day)
- Cần tạo API key mới để tiếp tục sử dụng AI

## Cách tạo API Key mới

### Bước 1: Truy cập Google AI Studio
1. Mở trình duyệt và truy cập: https://makersuite.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google của bạn

### Bước 2: Tạo Project mới (Quan trọng!)
1. Trong Google AI Studio, tạo một project mới
2. Mỗi project có quota riêng biệt
3. Điều này giúp bạn có thêm 20 requests/day

### Bước 3: Tạo API Key
1. Click "Create API Key"
2. Chọn project vừa tạo
3. Copy API key mới

### Bước 4: Cập nhật vào hệ thống
1. Chạy script setup: `python setup_new_gemini_key.py`
2. Chọn option 2 "Enter new API key"
3. Paste API key mới vào

## Hoặc cập nhật thủ công

Mở file `.env` và thay đổi:
```
GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
```

## Kiểm tra hoạt động

Chạy test để kiểm tra:
```bash
python test_ai_with_retry.py
```

## Lưu ý quan trọng

### Quota Limits cho Free Tier:
- **gemini-2.5-flash**: 20 requests/day
- **gemini-2.5-pro**: 50 requests/day (nhưng chậm hơn)
- **gemini-flash-latest**: Có thể có quota khác

### Tối ưu hóa sử dụng:
1. **Batch processing**: Gộp nhiều thao tác trong 1 request
2. **Caching**: Lưu kết quả để tránh gọi lại
3. **Smart retry**: Hệ thống đã có retry logic với exponential backoff
4. **Fallback**: Khi AI fail, vẫn có keyword matching

### Alternative Solutions:
1. **Multiple API Keys**: Tạo nhiều project, nhiều API key
2. **Paid Plan**: Upgrade để có quota cao hơn
3. **Alternative Models**: Thử các model khác có quota riêng

## Test Commands

```bash
# Test API key mới
python setup_new_gemini_key.py

# Test full system với AI
python test_ai_with_retry.py

# Test skill extraction
python test_cv_extraction.py

# Test full pipeline
python test_full_skill_gap.py
```

## Troubleshooting

### Nếu vẫn gặp quota error:
1. Đợi 24h để quota reset
2. Tạo thêm project mới
3. Sử dụng model khác (gemini-pro-latest)
4. Upgrade to paid plan

### Nếu API key không hoạt động:
1. Kiểm tra API key đã enable chưa
2. Kiểm tra project có đúng không
3. Kiểm tra billing account (nếu cần)

## Status hiện tại

✅ **Hệ thống đã được chuẩn bị sẵn sàng cho AI**:
- Retry logic với exponential backoff
- Quota management
- Fallback to keyword matching
- Centralized Gemini API manager
- Unlimited token support

🔑 **Chỉ cần API key mới là có thể hoạt động ngay!**