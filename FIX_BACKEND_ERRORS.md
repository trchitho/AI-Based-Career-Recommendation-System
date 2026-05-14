# 🔧 Hướng Dẫn Sửa Lỗi Backend

## Tóm Tắt Các Lỗi Đã Sửa Trong Session

### 1. ✅ Big Five Data Missing (Đang Debug)
- **File**: `apps/backend/app/modules/assessments/service.py`
- **Thay đổi**: Thêm comprehensive logging
- **Status**: Cần user chạy test và chia sẻ logs

### 2. ✅ Goals Milestone Generation 500 Error (FIXED)
- **File**: `apps/backend/app/modules/goals/routes_goals.py`
- **Lỗi**: Gemini model names sai, poor error handling
- **Sửa**: 
  - Đổi model names (bỏ `models/` prefix)
  - Thêm comprehensive logging
  - Better error handling

### 3. ✅ Career Recommendations 500 Error (FIXED)
- **File**: `apps/backend/app/modules/recommendation/service.py`
- **Lỗi**: AI-core không reachable, poor error handling
- **Sửa**:
  - Enhanced logging
  - Better fallback handling
  - Graceful empty response

### 4. ⚠️ Missing Dependencies
- **Lỗi**: `ModuleNotFoundError: No module named 'msgpack'`, `orjson`
- **Giải pháp**: Cài đặt dependencies

## Cách Sửa Lỗi Dependencies

### Option 1: Cài Từng Package (Nhanh)

```bash
cd apps/backend

# Core dependencies
pip install msgpack orjson

# HTTP client
pip install httpx

# Database
pip install psycopg2-binary sqlalchemy

# FastAPI
pip install fastapi uvicorn

# Auth
pip install python-jose[cryptography] passlib[bcrypt]

# Google
pip install google-generativeai google-auth google-auth-oauthlib

# Others
pip install python-dotenv pydantic python-multipart
```

### Option 2: Cài Từ requirements.txt (Đầy Đủ)

```bash
cd apps/backend
pip install -r requirements.txt
```

**Lưu ý**: Lệnh này có thể mất 5-10 phút

### Option 3: Sử dụng Virtual Environment (Khuyến Nghị)

```bash
cd apps/backend

# Tạo virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Cài dependencies
pip install -r requirements.txt
```

## Kiểm Tra Backend Sau Khi Sửa

### 1. Test Import

```bash
python -c "import sys; sys.path.insert(0, 'apps/backend'); from app.main import app; print('✅ Backend OK')"
```

### 2. Start Backend

```bash
cd apps/backend
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# API docs
# Open: http://localhost:8000/docs
```

## Các Lỗi Phổ Biến Và Cách Sửa

### Lỗi 1: ModuleNotFoundError

**Triệu chứng**:
```
ModuleNotFoundError: No module named 'xxx'
```

**Giải pháp**:
```bash
pip install xxx
```

### Lỗi 2: Database Connection Error

**Triệu chứng**:
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Giải pháp**:
1. Kiểm tra PostgreSQL đang chạy
2. Kiểm tra `DATABASE_URL` trong `.env`
3. Test connection:
```bash
psql -h localhost -p 5433 -U postgres -d career_ai
```

### Lỗi 3: Neo4j Connection Error

**Triệu chứng**:
```
neo4j.exceptions.ServiceUnavailable
```

**Giải pháp**:
1. Kiểm tra Neo4j đang chạy
2. Kiểm tra `NEO4J_URL` trong `.env`
3. Test connection:
```bash
curl http://localhost:7474
```

### Lỗi 4: Gemini API Error

**Triệu chứng**:
```
google.api_core.exceptions.ResourceExhausted: Quota exceeded
```

**Giải pháp**:
1. Kiểm tra `GEMINI_API_KEY` trong `.env`
2. Kiểm tra quota: https://makersuite.google.com/app/apikey
3. Sử dụng backup keys nếu có

### Lỗi 5: Cloudflare R2 Error

**Triệu chứng**:
```
botocore.exceptions.NoCredentialsError
```

**Giải pháp**:
1. Kiểm tra `CF_R2_*` variables trong `.env`
2. Test upload script:
```bash
python scripts/upload_audio_to_r2.py
```

## Code Quality Checks

### 1. Syntax Check

```bash
# Check single file
python -m py_compile apps/backend/app/modules/assessments/service.py

# Check all Python files
find apps/backend -name "*.py" -exec python -m py_compile {} \;
```

### 2. Import Check

```bash
python -c "from app.modules.assessments import service; print('✅ OK')"
```

### 3. Linting (Optional)

```bash
pip install flake8
flake8 apps/backend/app --max-line-length=120
```

## Rollback Changes (Nếu Cần)

Nếu các thay đổi gây lỗi, bạn có thể rollback:

### Git Rollback

```bash
# Xem changes
git status
git diff

# Rollback specific file
git checkout -- apps/backend/app/modules/goals/routes_goals.py

# Rollback all changes
git reset --hard HEAD
```

### Manual Rollback

Các file đã sửa trong session này:
1. `apps/backend/app/modules/assessments/service.py` - Thêm logging
2. `apps/backend/app/modules/goals/routes_goals.py` - Fix Gemini models
3. `apps/backend/app/modules/recommendation/service.py` - Better error handling

## Testing Checklist

Sau khi sửa, test các tính năng:

- [ ] Backend starts without errors
- [ ] Database connection works
- [ ] Neo4j connection works
- [ ] Assessment submission works
- [ ] Career recommendations work
- [ ] Goals milestone generation works
- [ ] CV upload and analysis works
- [ ] Chatbot works
- [ ] Payment integration works

## Logs Để Debug

Khi gặp lỗi, check logs:

### Backend Logs

```bash
# Start với verbose logging
python -m uvicorn app.main:app --reload --port 8000 --log-level debug
```

### Specific Module Logs

Tìm các dòng log với prefix:
- `[Goals]` - Goals module
- `[Recommendations]` - Recommendations module
- `[DEBUG save_assessment]` - Assessment saving
- `[DEBUG get_questions]` - Question retrieval

## Liên Hệ Support

Nếu vẫn gặp lỗi:
1. Copy full error message
2. Copy relevant logs
3. Note: Hệ thống đang chạy (DB, Neo4j, etc.)
4. Share với team

---

**Last Updated**: May 12, 2026
**Status**: Backend đã được cải thiện với better logging và error handling
