# ⚡ FAST API KEY SETUP

## Vấn đề đã được giải quyết:
✅ **FAST FAIL**: Không còn chờ 60 giây khi quota exceeded  
✅ **Immediate fallback**: Chuyển ngay sang keyword matching  
✅ **Quick test**: Script test nhanh API key  

## Để có AI hoạt động ngay:

### Bước 1: Tạo API Key mới (2 phút)
1. Mở: https://makersuite.google.com/app/apikey
2. **Quan trọng**: Tạo PROJECT MỚI (mỗi project có quota riêng)
3. Tạo API key trong project mới
4. Copy API key

### Bước 2: Test nhanh (30 giây)
```bash
python quick_test_new_key.py
```
- Chọn option 2
- Paste API key mới
- Hệ thống sẽ test và update .env tự động

### Bước 3: Test full system
```bash
python test_cv_extraction.py
```

## Cấu hình hiện tại (Tối ưu tốc độ):
```
AI_FAST_FAIL=true          # Không retry khi quota exceeded
GEMINI_MAX_RETRIES=1       # Chỉ thử 1 lần
GEMINI_RETRY_DELAY=5       # Chỉ chờ 5 giây
```

## Kết quả:
- ⚡ **Quota exceeded**: Fail ngay lập tức (0 giây chờ)
- 🔄 **Fallback**: Chuyển ngay sang keyword matching
- ✅ **Vẫn có kết quả**: Hệ thống vẫn hoạt động mà không cần AI

## Alternative: Sử dụng model khác
Nếu không muốn tạo API key mới, thử model khác:
```bash
# Trong .env, thay đổi:
GEMINI_MODEL=gemini-pro-latest
# hoặc
GEMINI_MODEL=gemini-flash-latest
```

## Status hiện tại:
🚀 **Hệ thống sẵn sàng** - chỉ cần API key mới là hoạt động ngay!
⚡ **Không còn chờ đợi lâu** - fail fast và fallback ngay lập tức!