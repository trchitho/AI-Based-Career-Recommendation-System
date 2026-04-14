# ⚠️ CẦN RESTART SERVER NGAY

**Lý do:** Đã sửa code validation để reject thông báo học phí NGAY

## Thay đổi:

### Trước:
```python
if not text or len(text) < 10:
    return self._get_fallback_data()  # ❌ Trả về fallback, tiếp tục xử lý
```

### Sau:
```python
if not text or len(text) < 10:
    raise ValueError(...)  # ✅ REJECT NGAY, không xử lý tiếp
```

## Cách Restart:

### Option 1: Ctrl+C và chạy lại
```bash
# Trong terminal đang chạy server
Ctrl+C

# Chạy lại
cd apps/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Option 2: Dùng script
```bash
cd apps/backend
python restart_server.py
```

### Option 3: Nếu dùng --reload
Server sẽ tự động restart khi phát hiện thay đổi file.
Chờ vài giây để server reload.

## Kiểm tra sau khi restart:

Upload lại file thông báo học phí → Phải bị reject NGAY với error:
```
"Không thể đọc nội dung từ file..."
```

Hoặc nếu extract được text:
```
"File tải lên không phải là CV. Nội dung có vẻ là 'thông báo hành chính'..."
```

**KHÔNG được gọi Gemini nữa!**
