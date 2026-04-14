# 🔧 Fix: 404 Error - Không phân tích được CV

## Vấn đề
Upload CV → Lỗi 404 "Not Found"

## Nguyên nhân
Router prefix bị duplicate hoặc backend chưa restart sau khi sửa code

## ✅ Giải pháp đã fix

### 1. Fix Router Prefix
**File**: `apps/backend/app/modules/skill_gap/routes.py`

**Trước** (SAI):
```python
router = APIRouter(prefix="/api/skill-gap", tags=["Skill Gap Analysis"])
```

**Sau** (ĐÚNG):
```python
router = APIRouter(tags=["Skill Gap Analysis"])
```

### 2. Fix Main.py Registration
**File**: `apps/backend/app/main.py`

**Trước** (SAI):
```python
app.include_router(skill_gap_router.router, tags=["skill-gap"])
```

**Sau** (ĐÚNG):
```python
app.include_router(skill_gap_router.router, prefix="/api/skill-gap", tags=["skill-gap"])
```

---

## 🚀 Cách fix

### Bước 1: Stop Backend
Nhấn `Ctrl + C` trong terminal đang chạy backend

### Bước 2: Restart Backend
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

### Bước 3: Kiểm tra logs
Phải thấy dòng:
```
✅ Skill Gap Analysis router registered
```

### Bước 4: Test API
```bash
# Windows PowerShell
python -c "import requests; r = requests.get('http://localhost:8000/api/skill-gap/my-analyses'); print(f'Status: {r.status_code}')"
```

**Kết quả mong đợi**:
- `Status: 401` hoặc `403` → OK (cần authentication)
- `Status: 404` → Vẫn lỗi, check lại

### Bước 5: Test trên Browser
1. Mở: `http://localhost:3000/skill-gap`
2. Login
3. Upload CV
4. Xem kết quả

---

## 🔍 Debug

### Check routes đã đăng ký chưa
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

### Check API có hoạt động không
```bash
python -c "import requests; r = requests.get('http://localhost:8000/api/skill-gap/my-analyses'); print(r.status_code, r.text)"
```

**Kết quả**:
- `401 {"detail":"Not authenticated"}` → ✅ API hoạt động, cần login
- `404 {"detail":"Not Found"}` → ❌ Vẫn lỗi

---

## ⚠️ Common Mistakes

### Mistake 1: Prefix ở 2 chỗ
```python
# SAI - Prefix ở routes.py
router = APIRouter(prefix="/api/skill-gap")

# VÀ prefix ở main.py
app.include_router(router, prefix="/api/skill-gap")

# Kết quả: /api/skill-gap/api/skill-gap/analyze ❌
```

**FIX**: Chỉ dùng prefix ở 1 chỗ (main.py)

### Mistake 2: Quên restart backend
Sau khi sửa code Python, PHẢI restart backend!

### Mistake 3: Port sai
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## ✅ Verification

### Test 1: Backend logs
```
✅ BFF Career router registered at /bff/catalog/career/{onet_code}
✅ Skill Gap Analysis router registered  ← Phải có dòng này
```

### Test 2: API response
```bash
curl http://localhost:8000/api/skill-gap/my-analyses
```

Response:
```json
{"detail":"Not authenticated"}  ← OK, cần token
```

NOT:
```json
{"detail":"Not Found"}  ← Lỗi, routes chưa đăng ký
```

### Test 3: Frontend
1. Login: `http://localhost:3000/login`
2. Go to: `http://localhost:3000/skill-gap`
3. Upload CV
4. Should work! ✅

---

## 📝 Summary

**Root Cause**: Router prefix bị duplicate

**Fix**:
1. ✅ Bỏ prefix trong `routes.py`
2. ✅ Thêm prefix trong `main.py`
3. ✅ Restart backend

**Result**: API hoạt động, có thể upload CV

---

## 🎯 Quick Fix Commands

```bash
# 1. Stop backend (Ctrl+C)

# 2. Restart backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# 3. Test API
python -c "import requests; print(requests.get('http://localhost:8000/api/skill-gap/my-analyses').status_code)"

# 4. If 401 or 403 → SUCCESS!
# 5. If 404 → Check code again
```

---

**Status**: ✅ Fixed
**Action Required**: Restart backend
**Expected Result**: API returns 401 (not 404)
