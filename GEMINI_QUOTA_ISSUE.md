# Gemini API Quota Issue - Giải pháp

## Vấn đề
```
429 You exceeded your current quota
Quota exceeded: limit 20 requests/day for gemini-2.5-flash
```

## Nguyên nhân
- Gemini Free Tier có giới hạn requests/day
- gemini-2.5-flash: 20 requests/day
- gemini-1.5-flash: 1500 requests/day
- Đã dùng hết quota hôm nay

## Giải pháp đã áp dụng

### 1. Tắt AI Matching (TẠM THỜI)
File: `apps/backend/.env`
```
USE_AI_MATCHING=false
```

Khi tắt AI:
- Hệ thống dùng traditional matching (keyword + fuzzy)
- Vẫn hoạt động bình thường
- Không cần Gemini API

### 2. Đổi sang gemini-1.5-flash
```
GEMINI_MODEL=gemini-1.5-flash
```

Model này có quota cao hơn (1500 requests/day)

### 3. Code đã update
File: `apps/backend/app/modules/skill_gap/graph_analyzer.py`

Thêm check flag:
```python
use_ai = os.getenv('USE_AI_MATCHING', 'true').lower() == 'true'
if not use_ai:
    print("  ⚠️ AI matching disabled (USE_AI_MATCHING=false)")
    return None
```

## Cách sử dụng

### Tắt AI (khi hết quota):
```bash
# File: apps/backend/.env
USE_AI_MATCHING=false
```

Restart backend:
```bash
cd apps/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Bật AI (khi có quota):
```bash
# File: apps/backend/.env
USE_AI_MATCHING=true
```

Restart backend.

## Kết quả

### Khi AI TẮT:
- ✅ Hệ thống vẫn chạy
- ✅ Skill matching dùng traditional method
- ✅ Không bị lỗi 429
- ⚠️ Match percentage có thể thấp hơn (vì không có semantic matching)

### Khi AI BẬT:
- ✅ Semantic matching thông minh
- ✅ Match percentage cao hơn
- ⚠️ Cần quota API

## Giải pháp lâu dài

### Option 1: Đợi quota reset (24 giờ)
- Free tier reset mỗi ngày
- Không tốn tiền

### Option 2: Upgrade API key
- Tạo project mới trên Google AI Studio
- Lấy key mới (có quota mới)
- Miễn phí

### Option 3: Dùng gemini-1.5-flash
- Quota cao hơn (1500 requests/day)
- Vẫn miễn phí
- Đã update trong .env

### Option 4: Implement caching
- Cache kết quả AI matching
- Giảm số lần gọi API
- Tiết kiệm quota

## Logs khi AI tắt

```
[2/4] Attempting AI semantic skill matching...
⚠️ AI matching disabled (USE_AI_MATCHING=false)
[3/4] Performing gap analysis...
⚠️ AI matching unavailable, using traditional matching
🔍 [Gap Analysis] Starting skill comparison...
```

## Test

### Test với AI tắt:
1. Set `USE_AI_MATCHING=false` trong .env
2. Restart backend
3. Upload CV
4. Kết quả: Vẫn có match percentage (dùng traditional)

### Test với AI bật:
1. Set `USE_AI_MATCHING=true` trong .env
2. Đảm bảo có quota
3. Restart backend
4. Upload CV
5. Kết quả: Match percentage cao hơn (semantic matching)

## Trạng thái hiện tại

✅ Code đã update
✅ Flag `USE_AI_MATCHING=false` đã set
⏳ Cần restart backend để áp dụng

## Restart Backend

```bash
# Stop backend hiện tại (Ctrl+C)

# Start lại
cd apps/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Sau khi restart, hệ thống sẽ:
- Bỏ qua AI matching
- Dùng traditional matching
- Không bị lỗi 429
- Vẫn cho kết quả phân tích
