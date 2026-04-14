# Hướng Dẫn Tạo 3 API Key Gemini Riêng Biệt

## Vấn Đề Hiện Tại
- Cả 3 stream (Chatbot, Assessment, CV Analysis) đang dùng chung 1 API key
- Khi 1 stream hết quota thì cả 3 stream đều bị ảnh hưởng
- Cần tạo 3 API key riêng biệt để tách quota

## Cách Tạo 3 API Key Riêng Biệt

### Phương Án 1: Tạo 3 Project Khác Nhau (Khuyến Nghị)

1. **Truy cập Google AI Studio**: https://aistudio.google.com/
2. **Tạo Project 1 - Chatbot**:
   - Tạo project mới: "Career-AI-Chatbot"
   - Tạo API key cho project này
   - Copy API key → `GEMINI_CHATBOT_API_KEY`

3. **Tạo Project 2 - Assessment**:
   - Tạo project mới: "Career-AI-Assessment"  
   - Tạo API key cho project này
   - Copy API key → `GEMINI_ASSESSMENT_API_KEY`

4. **Tạo Project 3 - CV Analysis**:
   - Tạo project mới: "Career-AI-CV"
   - Tạo API key cho project này
   - Copy API key → `GEMINI_CV_API_KEY`

### Phương Án 2: Dùng 3 Gmail Account Khác Nhau

1. **Account 1**: Tạo API key cho Chatbot
2. **Account 2**: Tạo API key cho Assessment  
3. **Account 3**: Tạo API key cho CV Analysis

## Cập Nhật File .env

Sau khi có 3 API key, cập nhật file `apps/backend/.env`:

```env
# 3 API Key riêng biệt
GEMINI_CHATBOT_API_KEY=AIzaSy...key1...
GEMINI_ASSESSMENT_API_KEY=AIzaSy...key2...
GEMINI_CV_API_KEY=AIzaSy...key3...
```

## Kiểm Tra Hoạt Động

Chạy lệnh test:
```bash
python test_3_stream_system.py
```

Kết quả mong đợi:
```
📊 Stream Status:
   Chatbot: ✅
   Assessment: ✅  
   CV Analysis: ✅
```

## Lợi Ích Của 3 Stream Riêng Biệt

1. **Quota độc lập**: Mỗi stream có 20 requests/day riêng
2. **Không ảnh hưởng lẫn nhau**: 1 stream hết quota, 2 stream kia vẫn hoạt động
3. **Dễ debug**: Biết chính xác stream nào gặp vấn đề
4. **Tối ưu hiệu suất**: Có thể tune riêng cho từng use case

## Tạm Thời: Dùng 1 API Key Mới

Nếu chưa tạo được 3 key, tạo ít nhất 1 key mới:
1. Tạo API key mới tại https://aistudio.google.com/
2. Thay thế tất cả 3 key trong .env bằng key mới
3. Restart server: `python restart_server.py`