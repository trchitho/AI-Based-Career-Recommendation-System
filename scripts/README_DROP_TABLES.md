# Hướng dẫn xóa an toàn 2 bảng Database

## Mục tiêu
Xóa an toàn 2 bảng:
- `ai.quick_text_embeddings`
- `core.essay_quick_inputs`

## Các tính năng an toàn

### ✅ Kiểm tra trước khi xóa
- Kiểm tra bảng có tồn tại không
- Đếm số dòng dữ liệu
- Kiểm tra Foreign Key constraints
- Hiển thị thông tin chi tiết

### ✅ Backup tùy chọn
- Tạo backup trước khi xóa
- Lưu vào schema `backup`
- Tên backup có timestamp

### ✅ Xác nhận từ người dùng
- Yêu cầu xác nhận trước khi xóa
- Hiển thị cảnh báo rõ ràng
- Có thể hủy bỏ bất cứ lúc nào

### ✅ Xóa CASCADE
- Tự động xử lý Foreign Key constraints
- Xóa các sequence liên quan
- Báo cáo kết quả chi tiết

## Cách sử dụng

### Phương pháp 1: Chạy script Python (Khuyến nghị)

```bash
# Di chuyển vào thư mục scripts
cd AI-Based-Career-Recommendation-System/scripts

# Cài đặt thư viện cần thiết
pip install psycopg2-binary

# Chạy script
python drop_tables_safely.py
```

### Phương pháp 2: Chạy file batch (Windows)

```cmd
# Di chuyển vào thư mục scripts
cd AI-Based-Career-Recommendation-System\scripts

# Chạy file batch (tự động cài đặt dependencies)
drop_tables.bat
```

### Phương pháp 3: Chạy SQL trực tiếp

```sql
-- Kết nối vào PostgreSQL và chạy file SQL
\i safe_drop_tables.sql
```

## Quy trình thực hiện

### Bước 1: Kiểm tra bảng
```
📋 BƯỚC 1: Kiểm tra bảng tồn tại
✅ ai.quick_text_embeddings - Tồn tại (1,234 dòng)
✅ core.essay_quick_inputs - Tồn tại (567 dòng)
```

### Bước 2: Kiểm tra Foreign Keys
```
🔗 BƯỚC 2: Kiểm tra Foreign Key Constraints
✅ ai.quick_text_embeddings - Không có foreign key constraints
⚠️  core.essay_quick_inputs có 2 foreign key constraints:
   - core.assessments.essay_input_id -> core.essay_quick_inputs.id
```

### Bước 3: Xác nhận xóa
```
⚠️  CẢNH BÁO: Sắp xóa 2 bảng:
   - ai.quick_text_embeddings (1,234 dòng)
   - core.essay_quick_inputs (567 dòng)

❓ Bạn có chắc chắn muốn tiếp tục? (yes/no):
```

### Bước 4: Backup (tùy chọn)
```
❓ Bạn có muốn tạo backup trước khi xóa? (yes/no): yes

💾 BƯỚC 4: Tạo backup
✅ Đã tạo backup: backup.quick_text_embeddings_backup_20260108_092145
✅ Đã tạo backup: backup.essay_quick_inputs_backup_20260108_092145
```

### Bước 5: Xóa bảng
```
🗑️  BƯỚC 5: Xóa bảng
✅ Đã xóa bảng: ai.quick_text_embeddings
✅ Đã xóa bảng: core.essay_quick_inputs
```

### Bước 6: Xác nhận kết quả
```
✅ BƯỚC 6: Xác nhận kết quả
✅ ai.quick_text_embeddings - Đã xóa thành công
✅ core.essay_quick_inputs - Đã xóa thành công

🎉 Hoàn thành! Đã xóa 2/2 bảng
```

## Yêu cầu hệ thống

### Python Dependencies
```bash
pip install psycopg2-binary
```

### Database Connection
- PostgreSQL server đang chạy
- Port: 5433
- Database: career_ai
- User: postgres
- Password: 123456

### Quyền truy cập
- Quyền DROP TABLE
- Quyền CREATE TABLE (cho backup)
- Quyền CREATE SCHEMA (cho backup)

## Khôi phục dữ liệu

Nếu cần khôi phục dữ liệu từ backup:

```sql
-- Khôi phục ai.quick_text_embeddings
CREATE TABLE ai.quick_text_embeddings AS 
SELECT * FROM backup.quick_text_embeddings_backup_20260108_092145;

-- Khôi phục core.essay_quick_inputs
CREATE TABLE core.essay_quick_inputs AS 
SELECT * FROM backup.essay_quick_inputs_backup_20260108_092145;

-- Tạo lại các constraint và index nếu cần
```

## Troubleshooting

### Lỗi kết nối database
```
❌ Lỗi kết nối database: could not connect to server
```
**Giải pháp:**
- Kiểm tra PostgreSQL server đang chạy
- Kiểm tra port 5433
- Kiểm tra thông tin đăng nhập

### Lỗi quyền truy cập
```
❌ Lỗi xóa bảng: permission denied
```
**Giải pháp:**
- Đăng nhập với user có quyền cao hơn
- Cấp quyền DROP cho user hiện tại

### Lỗi Foreign Key
```
❌ Lỗi xóa bảng: cannot drop table because other objects depend on it
```
**Giải pháp:**
- Script tự động sử dụng CASCADE
- Kiểm tra lại các bảng liên quan

## Lưu ý quan trọng

⚠️ **CẢNH BÁO**: Thao tác xóa bảng không thể hoàn tác!

✅ **Khuyến nghị**: Luôn tạo backup trước khi xóa

🔒 **Bảo mật**: Chỉ chạy script trên môi trường development

📊 **Kiểm tra**: Xác nhận không có ứng dụng nào đang sử dụng các bảng này

## Liên hệ hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra log chi tiết
2. Xác nhận database connection
3. Kiểm tra quyền truy cập
4. Liên hệ team phát triển