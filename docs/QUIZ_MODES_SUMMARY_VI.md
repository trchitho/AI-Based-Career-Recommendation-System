# Tóm Tắt Tính Năng Quiz 2 Chế Độ

## Tổng Quan

Hệ thống quiz với 2 chế độ cho phép người dùng chọn trải nghiệm làm bài test phù hợp, trong khi vẫn đảm bảo kết quả đánh giá nghề nghiệp hoàn toàn giống nhau.

## 2 Chế Độ Quiz

### 1. Standard Mode (Chế Độ Chuẩn)
- Giao diện chuyên nghiệp, tối giản
- Không có áp lực thời gian
- Có thể xem lại và thay đổi câu trả lời
- Phù hợp cho người dùng muốn trải nghiệm nghiêm túc

### 2. Game-based Mode (Chế Độ Game)
- Giao diện tương tác, có animation
- Hệ thống XP và level
- Hiệu ứng hình ảnh khi trả lời
- Phù hợp cho người dùng muốn trải nghiệm thú vị

## Nguyên Tắc Quan Trọng

✅ **Câu hỏi giống nhau**: Cả 2 chế độ dùng cùng bộ câu hỏi  
✅ **Thuật toán giống nhau**: Cách tính điểm hoàn toàn giống nhau  
✅ **Kết quả giống nhau**: Kết quả định hướng nghề nghiệp giống hệt nhau  
✅ **Dữ liệu tách biệt**: Dữ liệu gamification (XP, level) lưu riêng, không ảnh hưởng đến kết quả đánh giá

## Cấu Trúc File

### Frontend
```
apps/frontend/src/
├── pages/
│   ├── QuizModeSelectorPage.tsx      # Trang chọn chế độ
│   └── AssessmentPage.tsx            # Trang làm bài (đã cập nhật)
└── components/assessment/
    ├── StandardQuizMode.tsx          # Component chế độ chuẩn
    └── GameQuizMode.tsx              # Component chế độ game
```

### Backend
```
apps/backend/app/modules/assessments/
├── gamification_models.py            # Database models cho gamification
├── gamification_service.py           # Logic xử lý gamification
└── routes_gamification.py            # API endpoints cho gamification
```

### Database
```
db/migrations/
└── add_gamification_tables.sql       # Migration script tạo bảng
```

## Luồng Hoạt Động

### Chế Độ Chuẩn
1. User chọn "Standard Mode"
2. Làm bài test với giao diện đơn giản
3. Submit câu trả lời
4. Nhận kết quả đánh giá

### Chế Độ Game
1. User chọn "Game Mode"
2. Làm bài test với giao diện có animation
3. Nhận XP sau mỗi câu trả lời (chỉ để hiển thị)
4. Submit câu trả lời (giống chế độ chuẩn)
5. Nhận kết quả đánh giá (giống chế độ chuẩn)
6. Xem tổng kết XP và level

## API Endpoints Mới

```
POST /api/assessments/gamification/start-session
POST /api/assessments/gamification/award-xp
POST /api/assessments/gamification/complete-session
GET  /api/assessments/gamification/stats
GET  /api/assessments/gamification/profile
```

## Database Tables Mới

### core.user_gamification_profiles
- Lưu tổng XP và level của user
- Tách biệt với dữ liệu assessment

### core.assessment_gamification_sessions
- Lưu dữ liệu gamification cho mỗi lần làm bài
- Ghi nhận chế độ quiz đã dùng
- KHÔNG ảnh hưởng đến điểm assessment

### core.user_achievements
- Lưu thành tích của user
- Chỉ dùng cho gamification

## Cài Đặt

### 1. Chạy Migration
```bash
psql -U postgres -d your_database -f db/migrations/add_gamification_tables.sql
```

### 2. Khởi động Backend
```bash
cd apps/backend
python -m uvicorn app.main:app --reload
```

### 3. Khởi động Frontend
```bash
cd apps/frontend
npm run dev
```

## Testing

### Kiểm tra chức năng
- [ ] Trang chọn chế độ hiển thị đúng
- [ ] Chế độ chuẩn hoạt động bình thường
- [ ] Chế độ game hiển thị XP và level
- [ ] Cả 2 chế độ cho kết quả giống nhau
- [ ] Dữ liệu gamification lưu đúng
- [ ] Chế độ legacy vẫn hoạt động

### Kiểm tra kết quả
1. Làm bài test với chế độ chuẩn, ghi nhận kết quả
2. Làm bài test với chế độ game (trả lời giống hệt), ghi nhận kết quả
3. So sánh 2 kết quả → phải giống hệt nhau

## Lưu Ý Quan Trọng

⚠️ **Không được**:
- Thêm đếm ngược thời gian
- Tính điểm dựa trên tốc độ
- Tạo bảng xếp hạng ảnh hưởng kết quả
- Thay đổi ý nghĩa câu hỏi

✅ **Được phép**:
- Thêm animation và hiệu ứng
- Hiển thị XP và level
- Tạo thành tích (achievements)
- Thêm âm thanh (có nút tắt)

## Mở Rộng Tương Lai

- Thêm chế độ quiz dạng story
- Thêm badges và achievements
- Thêm streak tracking
- Thêm customizable avatars
- Cải thiện accessibility

## Hỗ Trợ

Nếu có vấn đề:
1. Đọc file `QUIZ_MODES_IMPLEMENTATION.md` (tiếng Anh, chi tiết hơn)
2. Kiểm tra code comments
3. Test với cả 2 chế độ
4. Kiểm tra database schema
5. Xem API responses

## Kết Luận

Tính năng này cung cấp trải nghiệm quiz linh hoạt và hấp dẫn, đồng thời đảm bảo tính chính xác và nhất quán của kết quả đánh giá nghề nghiệp, bất kể người dùng chọn chế độ nào.
