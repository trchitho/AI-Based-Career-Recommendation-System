# 📄 CV Builder - Hướng dẫn sử dụng

## Tổng quan

Chức năng CV Builder cho phép người dùng tạo, chỉnh sửa và xuất CV chuyên nghiệp dưới dạng PDF.

## Tính năng

### Frontend
- ✅ Tạo CV mới với form nhập liệu đầy đủ
- ✅ Chỉnh sửa CV đã tạo
- ✅ Xem trước CV real-time
- ✅ Quản lý danh sách CV
- ✅ Xuất CV ra file PDF
- ✅ Xóa CV không cần thiết

### Backend
- ✅ API CRUD đầy đủ cho CV
- ✅ Lưu trữ dữ liệu CV dạng JSON trong PostgreSQL
- ✅ Tạo PDF từ dữ liệu CV với ReportLab
- ✅ Bảo mật: Chỉ user sở hữu mới có thể truy cập/chỉnh sửa CV

## Cài đặt

### 1. Backend Setup

```bash
cd apps/backend

# Cài đặt dependencies
pip install reportlab

# Hoặc cài từ file requirements
pip install -r requirements-cv.txt

# Chạy migration để tạo bảng CVs
psql -U postgres -d career_ai -f alembic/versions/001_create_cvs_table.sql
```

### 2. Frontend Setup

Không cần cài đặt thêm, các dependencies đã có sẵn.

### 3. Khởi động ứng dụng

```bash
# Terminal 1 - Backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
```

## Sử dụng

### 1. Truy cập CV Builder

- Đăng nhập vào hệ thống
- Click vào menu "CV Builder" trên header
- Hoặc truy cập trực tiếp: `http://localhost:5173/cv`

### 2. Tạo CV mới

1. Click nút "Create New CV"
2. Điền thông tin vào các section:
   - **Personal Info**: Tên, email, số điện thoại, địa chỉ, summary
   - **Experience**: Kinh nghiệm làm việc
   - **Education**: Học vấn
   - **Skills**: Kỹ năng
   - **Projects**: Dự án đã làm (optional)
3. Click "Save CV" để lưu

### 3. Chỉnh sửa CV

1. Từ danh sách CV, click nút "✏️ Edit"
2. Chỉnh sửa thông tin cần thiết
3. Click "Save CV" để cập nhật

### 4. Xem trước CV

- Trong trang CV Builder, click tab "👁️ Preview"
- Xem CV với định dạng chuyên nghiệp

### 5. Xuất CV ra PDF

- Từ danh sách CV: Click nút "📥 Export"
- Hoặc trong trang Builder: Click "📥 Export PDF"
- File PDF sẽ được tải về máy

### 6. Xóa CV

- Từ danh sách CV, click nút "🗑️"
- Xác nhận xóa

## Cấu trúc dữ liệu

### CV Object

```typescript
{
  id: number,
  title: string,
  template: 'modern' | 'classic' | 'minimal' | 'creative',
  personalInfo: {
    fullName: string,
    email: string,
    phone: string,
    address?: string,
    linkedin?: string,
    github?: string,
    summary?: string
  },
  education: [
    {
      school: string,
      degree: string,
      field: string,
      startDate: string,
      endDate?: string,
      gpa?: string
    }
  ],
  experience: [
    {
      company: string,
      position: string,
      startDate: string,
      endDate?: string,
      current?: boolean,
      description: string,
      achievements?: string[]
    }
  ],
  skills: [
    {
      name: string,
      level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
    }
  ],
  projects?: [...],
  certifications?: [...],
  languages?: [...]
}
```

## API Endpoints

### GET /bff/cv/list
Lấy danh sách CV của user hiện tại

**Response:**
```json
[
  {
    "id": 1,
    "title": "Software Engineer CV",
    "template": "modern",
    "updatedAt": "2025-12-10T10:30:00Z"
  }
]
```

### GET /bff/cv/{cv_id}
Lấy chi tiết một CV

**Response:**
```json
{
  "id": 1,
  "userId": 123,
  "title": "Software Engineer CV",
  "template": "modern",
  "personalInfo": {...},
  "education": [...],
  "experience": [...],
  ...
}
```

### POST /bff/cv
Tạo CV mới

**Request Body:**
```json
{
  "title": "My CV",
  "template": "modern",
  "personalInfo": {...},
  "education": [...],
  "experience": [...],
  "skills": [...]
}
```

### PUT /bff/cv/{cv_id}
Cập nhật CV

**Request Body:** Tương tự POST, nhưng tất cả fields đều optional

### DELETE /bff/cv/{cv_id}
Xóa CV

**Response:** 204 No Content

### GET /bff/cv/{cv_id}/export
Xuất CV ra PDF

**Response:** File PDF (application/pdf)

## Database Schema

```sql
CREATE TABLE core.cvs (
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
```

## Tính năng tương lai

- [ ] Nhiều templates CV khác nhau
- [ ] Import CV từ LinkedIn
- [ ] AI suggestions cho nội dung CV
- [ ] Chia sẻ CV qua link public
- [ ] Tích hợp với career recommendations
- [ ] Export sang Word format
- [ ] Multi-language support cho CV

## Troubleshooting

### Lỗi: "Failed to load CVs"
- Kiểm tra backend đang chạy
- Kiểm tra user đã đăng nhập
- Xem console log để biết chi tiết lỗi

### Lỗi: "Failed to export CV"
- Kiểm tra reportlab đã được cài đặt
- Kiểm tra CV có dữ liệu hợp lệ

### PDF không hiển thị đúng
- Kiểm tra dữ liệu CV có đầy đủ
- Xem backend logs để debug

## Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.
