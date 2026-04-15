# 🔍 Troubleshoot: Upload CV không phân tích được

## Checklist Debug

### 1. Check Backend Logs

Mở terminal đang chạy backend, xem có lỗi gì không:

```
[1/4] Reading file: TranQuocVi_Backend Laravel(l).pdf
[2/4] Parsing CV...
ERROR: ... ← Xem lỗi ở đây
```

**Common errors**:
- `ModuleNotFoundError` → Thiếu package
- `DatabaseError` → Database không kết nối
- `ValidationError` → Data không hợp lệ

---

### 2. Check Browser Console (F12)

**Network Tab**:
```
POST /api/skill-gap/analyze
Status: ??? ← Xem status code
```

**Status codes**:
- `200 OK` → ✅ Thành công
- `401 Unauthorized` → ❌ Token hết hạn, login lại
- `404 Not Found` → ❌ Route không tồn tại
- `422 Unprocessable Entity` → ❌ File không hợp lệ
- `500 Internal Server Error` → ❌ Backend lỗi

**Console Tab**:
```javascript
// Xem error message
Failed to analyze CV: ...
```

---

### 3. Check File

**File requirements**:
- ✅ Format: PDF only
- ✅ Size: < 10MB
- ✅ Content: Text-based (không phải scan)
- ✅ Skills: Liệt kê rõ ràng

**Test với file đơn giản**:
```
Tạo file test.txt:
---
John Doe
Software Engineer

Skills:
- Python
- JavaScript
- React
- Node.js
- MySQL
- Docker
- AWS
---

Convert sang PDF và upload
```

---

### 4. Check Authentication

```javascript
// Browser Console (F12)
console.log(localStorage.getItem('accessToken'));
```

**Nếu null**:
1. Logout
2. Login lại
3. Thử upload

---

### 5. Check Backend Running

```bash
# Test health endpoint
curl http://localhost:8000/health
```

**Kết quả mong đợi**:
```json
{"status": "ok"}
```

**Nếu lỗi**:
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

---

### 6. Check Routes Registered

```bash
cd apps/backend
python -c "from app.main import app; routes = [r.path for r in app.routes if 'skill-gap' in r.path]; print('\n'.join(routes))"
```

**Kết quả mong đợi**:
```
/api/skill-gap/analyze
/api/skill-gap/my-analyses
/api/skill-gap/analysis/{analysis_id}
/api/skill-gap/heatmap/{analysis_id}
/api/skill-gap/interview-prep/{analysis_id}
```

---

### 7. Test API Directly

```bash
# Create test file
echo "Skills: Python, JavaScript, React, Docker" > test_cv.txt

# Test API
curl -X POST http://localhost:8000/api/skill-gap/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "career_id=software-engineer" \
  -F "cv_file=@test_cv.txt"
```

**Kết quả mong đợi**:
```json
{
  "success": true,
  "message": "CV analyzed successfully",
  "data": {
    "analysis_id": 123,
    ...
  }
}
```

---

## Common Issues & Fixes

### Issue 1: "Failed to fetch"
**Nguyên nhân**: Backend không chạy
**Fix**:
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

### Issue 2: "401 Unauthorized"
**Nguyên nhân**: Token hết hạn
**Fix**:
1. Logout
2. Login lại
3. Thử upload

### Issue 3: "404 Not Found"
**Nguyên nhân**: Routes chưa đăng ký đúng
**Fix**: Xem `FIX_404_ERROR.md`

### Issue 4: "422 Unprocessable Entity"
**Nguyên nhân**: File không hợp lệ
**Fix**:
- Check file là PDF
- Check file < 10MB
- Thử file khác

### Issue 5: "500 Internal Server Error"
**Nguyên nhân**: Backend lỗi
**Fix**:
1. Xem backend logs
2. Check database connection
3. Check imports

### Issue 6: WebSocket Error
**Nguyên nhân**: WebSocket endpoint không tồn tại
**Fix**: Xem `FIX_WEBSOCKET_ERROR.md`
**Note**: Không ảnh hưởng Skill Gap!

---

## Debug Steps

### Step 1: Open Browser DevTools (F12)

### Step 2: Go to Network Tab

### Step 3: Upload CV

### Step 4: Click on `/api/skill-gap/analyze` request

### Step 5: Check Response

**If 200 OK**:
```json
{
  "success": true,
  "data": {...}
}
```
→ ✅ API hoạt động, check frontend

**If 401**:
```json
{"detail": "Not authenticated"}
```
→ ❌ Login lại

**If 404**:
```json
{"detail": "Not Found"}
```
→ ❌ Routes chưa đăng ký, restart backend

**If 500**:
```json
{"detail": "Internal Server Error"}
```
→ ❌ Check backend logs

---

## Quick Fix Commands

```bash
# 1. Restart backend
cd apps/backend
# Ctrl+C to stop
uvicorn app.main:app --reload --port 8000

# 2. Test API
python -c "import requests; print(requests.get('http://localhost:8000/health').json())"

# 3. Test routes
python -c "from app.main import app; print([r.path for r in app.routes if 'skill-gap' in r.path])"

# 4. Run verification
python verify_skill_gap.py
```

---

## Still Not Working?

### Collect Debug Info

1. **Backend logs** (terminal output)
2. **Browser console** (F12 → Console tab)
3. **Network request** (F12 → Network tab → /api/skill-gap/analyze)
4. **File info** (name, size, format)

### Check These Files

1. `apps/backend/app/main.py` - Routes registered?
2. `apps/backend/app/modules/skill_gap/routes.py` - Prefix correct?
3. `apps/frontend/src/services/skillGapService.ts` - API URL correct?
4. `apps/frontend/vite.config.ts` - Proxy configured?

---

**Last Updated**: Troubleshooting Guide
**Status**: Ready to debug
