# 🔍 Debug: Không phân tích được CV

## Checklist kiểm tra

### 1. Backend có chạy không?

```bash
# Check backend
curl http://localhost:8000/health
```

**Kết quả mong đợi**:
```json
{"status": "ok"}
```

**Nếu lỗi**: Backend chưa chạy
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

---

### 2. Frontend có chạy không?

```bash
# Check frontend
curl http://localhost:3000
```

**Nếu lỗi**: Frontend chưa chạy
```bash
cd apps/frontend
npm run dev
```

---

### 3. Skill Gap routes có đăng ký không?

```bash
# Test API endpoint
curl -X GET http://localhost:8000/api/skill-gap/my-analyses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Kết quả mong đợi**: `[]` hoặc list analyses

**Nếu lỗi 404**: Routes chưa đăng ký
- Check `apps/backend/app/main.py`
- Tìm dòng: `from .modules.skill_gap import routes`

---

### 4. Database có kết nối không?

```bash
cd apps/backend
python -c "from app.core.db import engine; engine.connect(); print('DB OK')"
```

**Kết quả mong đợi**: `DB OK`

**Nếu lỗi**: Check connection string trong `.env`

---

### 5. Table có tồn tại không?

```sql
-- Chạy trong psql hoặc pgAdmin
SELECT * FROM core.skill_gap_analyses LIMIT 1;
```

**Nếu lỗi "table does not exist"**:
```bash
cd apps/backend
python run_migration.py
```

---

### 6. Authentication có hoạt động không?

**Mở Browser Console (F12)**:
```javascript
// Check token
console.log(localStorage.getItem('accessToken'));
```

**Nếu null**: Chưa đăng nhập
- Đăng nhập lại
- Check token được lưu

---

### 7. CORS có lỗi không?

**Mở Browser Console (F12) → Network tab**

Upload CV và xem request:
- Status: 200 OK ✅
- Status: 401 Unauthorized ❌ → Token sai
- Status: 404 Not Found ❌ → Route không tồn tại
- Status: 500 Internal Server Error ❌ → Backend lỗi

---

### 8. File upload có hoạt động không?

**Test với curl**:
```bash
# Tạo file test
echo "Skills: Python, JavaScript, React" > test_cv.txt

# Upload
curl -X POST http://localhost:8000/api/skill-gap/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "career_id=software-engineer" \
  -F "cv_file=@test_cv.txt"
```

---

## Common Errors

### Error 1: "Failed to fetch"
**Nguyên nhân**: Backend không chạy hoặc CORS
**Giải pháp**:
1. Start backend: `uvicorn app.main:app --reload --port 8000`
2. Check proxy trong `vite.config.ts`

### Error 2: "401 Unauthorized"
**Nguyên nhân**: Token không hợp lệ
**Giải pháp**:
1. Đăng nhập lại
2. Check token: `localStorage.getItem('accessToken')`

### Error 3: "404 Not Found"
**Nguyên nhân**: Route không đăng ký
**Giải pháp**:
1. Check `apps/backend/app/main.py`
2. Tìm: `app.include_router(skill_gap_router.router)`

### Error 4: "500 Internal Server Error"
**Nguyên nhân**: Backend lỗi
**Giải pháp**:
1. Check backend logs (terminal)
2. Check database connection
3. Check file imports

### Error 5: "No module named 'app.core.database'"
**Nguyên nhân**: Import sai
**Giải pháp**: Đã fix → `app.core.db`

### Error 6: "Table does not exist"
**Nguyên nhân**: Migration chưa chạy
**Giải pháp**:
```bash
cd apps/backend
python run_migration.py
```

---

## Quick Test Script

```bash
#!/bin/bash

echo "=== Testing Skill Gap Feature ==="

# 1. Check backend
echo "[1/6] Checking backend..."
curl -s http://localhost:8000/health || echo "❌ Backend not running"

# 2. Check frontend
echo "[2/6] Checking frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend not running"

# 3. Check database
echo "[3/6] Checking database..."
cd apps/backend
python -c "from app.core.db import engine; engine.connect(); print('✅ Database OK')" 2>/dev/null || echo "❌ Database error"

# 4. Check table
echo "[4/6] Checking table..."
python -c "from app.modules.skill_gap.models import SkillGapAnalysis; print('✅ Table OK')" 2>/dev/null || echo "❌ Table error"

# 5. Check imports
echo "[5/6] Checking imports..."
python -c "from app.modules.skill_gap import routes; print('✅ Imports OK')" 2>/dev/null || echo "❌ Import error"

# 6. Check routes
echo "[6/6] Checking routes..."
python -c "from app.main import app; routes = [r.path for r in app.routes if '/skill-gap' in r.path]; print(f'✅ Found {len(routes)} routes')" 2>/dev/null || echo "❌ Routes error"

echo "=== Test Complete ==="
```

---

## Step-by-Step Debug

### Bước 1: Mở Browser Console (F12)

### Bước 2: Upload CV

### Bước 3: Xem Console Logs
```javascript
// Nếu thấy:
"Failed to fetch" → Backend không chạy
"401 Unauthorized" → Token sai
"404 Not Found" → Route không tồn tại
"500 Internal Server Error" → Backend lỗi
```

### Bước 4: Xem Network Tab
- Click vào request `/api/skill-gap/analyze`
- Xem Response
- Xem Headers

### Bước 5: Xem Backend Logs
```
Terminal chạy backend:
[1/4] Reading file: resume.pdf
[2/4] Parsing CV...
ERROR: ... ← Xem lỗi ở đây
```

---

## Fix Common Issues

### Issue: Backend không chạy
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

### Issue: Frontend không chạy
```bash
cd apps/frontend
npm run dev
```

### Issue: Token hết hạn
1. Logout
2. Login lại
3. Thử upload CV

### Issue: Database không kết nối
Check `.env`:
```
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
```

### Issue: Table không tồn tại
```bash
cd apps/backend
python run_migration.py
```

### Issue: Import error
```bash
cd apps/backend
pip install -r requirements_skill_gap.txt
```

---

## Verification

Sau khi fix, chạy:
```bash
python verify_skill_gap.py
```

Kết quả mong đợi:
```
✓ Imports: PASS
✓ CV Parser: PASS
✓ Database: PASS
✓ Main App: PASS

SUCCESS: All tests passed!
```

---

## Contact Support

Nếu vẫn lỗi, gửi:
1. Browser console logs (F12)
2. Backend terminal logs
3. Network tab screenshot
4. Error message

---

**Last Updated**: Debug Guide
**Status**: Ready to debug
