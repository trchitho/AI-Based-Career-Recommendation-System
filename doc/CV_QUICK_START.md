# 🚀 CV Builder - Quick Start

## Bước 1: Cài đặt dependencies

```bash
# Backend - Cài reportlab cho PDF generation
cd apps/backend
pip install reportlab
```

## Bước 2: Tạo bảng database

```bash
# Chạy SQL script để tạo bảng CVs
psql -U postgres -d career_ai -f alembic/versions/001_create_cvs_table.sql

# Hoặc chạy trực tiếp trong psql:
psql -U postgres -d career_ai
```

```sql
CREATE TABLE IF NOT EXISTS core.cvs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template VARCHAR(50) DEFAULT 'modern',
    personal_info JSONB NOT NULL,
    education JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON core.cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_updated_at ON core.cvs(updated_at DESC);
```

## Bước 3: Khởi động ứng dụng

```bash
# Terminal 1 - Backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend  
cd apps/frontend
npm run dev
```

## Bước 4: Test chức năng

1. Mở browser: `http://localhost:5173`
2. Đăng nhập vào hệ thống
3. Click "CV Builder" trên menu
4. Click "Create New CV"
5. Điền thông tin:
   - Personal Info: Tên, email, phone
   - Experience: Thêm ít nhất 1 kinh nghiệm
   - Education: Thêm ít nhất 1 học vấn
   - Skills: Thêm vài kỹ năng
6. Click "Save CV"
7. Click "Preview" để xem CV
8. Click "Export PDF" để tải về

## Kiểm tra API

```bash
# Get list CVs (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/bff/cv/list

# Get CV detail
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/bff/cv/1

# Export PDF
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/bff/cv/1/export -o my_cv.pdf
```

## Troubleshooting

### Backend không khởi động
- Kiểm tra reportlab đã cài: `pip list | grep reportlab`
- Kiểm tra database connection trong .env

### Frontend không hiển thị menu CV
- Clear cache browser (Ctrl+Shift+R)
- Kiểm tra console log

### Không export được PDF
- Kiểm tra backend logs
- Đảm bảo CV có đủ dữ liệu (ít nhất personal info)

## Done! 🎉

Bây giờ bạn đã có chức năng CV Builder hoàn chỉnh!
