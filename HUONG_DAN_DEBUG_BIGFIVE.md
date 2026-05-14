# Lỗi Thiếu Dữ Liệu Big Five - Hướng Dẫn Debug

## Tóm Tắt Vấn Đề

Trang kết quả hiển thị "Chưa có dữ liệu tính cách" ở phần Big Five. Sau khi kiểm tra, phát hiện **các bài đánh giá BigFive không được lưu** mặc dù frontend đã gửi câu trả lời BigFive.

## Phân Tích Nguyên Nhân

### Kết Quả Kiểm Tra Database:
- ✅ Câu hỏi BigFive tồn tại trong database (240 câu, ID từ 289-528)
- ✅ Form BigFive tồn tại (form_type = 'BigFive')
- ❌ **Các bài test gần đây của User 74 chỉ có RIASEC** (ID 416, 415, 414, 413, 412)
- ❌ Không có bài đánh giá BigFive nào được tạo trong các lần submit gần đây

### Quy Trình Đúng:
1. Frontend gửi: `testTypes: ['RIASEC', 'BIG_FIVE']`
2. Backend chuẩn hóa 'BIG_FIVE' → 'BigFive'
3. Backend nên tạo **HAI** bài đánh giá:
   - Một bài với `a_type = 'RIASEC'`
   - Một bài với `a_type = 'BigFive'`
4. Trang kết quả hiển thị cả điểm RIASEC và BigFive

### Thực Tế Đang Xảy Ra:
- Chỉ có bài đánh giá RIASEC được tạo
- Câu trả lời BigFive được gửi nhưng không được xử lý/lưu

## Logging Đã Được Thêm Vào

Tôi đã thêm logging chi tiết vào hàm `save_assessment()` để chẩn đoán vấn đề:

```python
[DEBUG save_assessment] Queried X question metadata for Y question IDs
[DEBUG save_assessment] Question metadata: X RIASEC, Y BigFive
[DEBUG save_assessment] Processed X responses, skipped Y
[DEBUG save_assessment] RIASEC responses: X, BigFive responses: Y
[DEBUG save_assessment] RIASEC accumulator: {R: X, I: Y, A: Z, ...}
[DEBUG save_assessment] BigFive accumulator: {O: X, C: Y, E: Z, A: W, N: V}
[DEBUG save_assessment] RIASEC scores: {...}
[DEBUG save_assessment] BigFive scores: {...}
[DEBUG save_assessment] has_riasec=True/False, has_big5=True/False
```

## Bước Tiếp Theo - Vui Lòng Test Lại

### 1. Khởi Động Backend (nếu chưa chạy)
```bash
cd d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\backend
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Làm Bài Test Mới
- Vào trang assessment
- Hoàn thành CẢ câu hỏi RIASEC VÀ Big Five
- Submit bài test

### 3. Kiểm Tra Backend Logs
Tìm các dòng log `[DEBUG save_assessment]` trong terminal. Chúng sẽ hiển thị:
- Có bao nhiêu câu hỏi BigFive được tìm thấy trong metadata
- Có bao nhiêu câu trả lời BigFive được xử lý
- Điểm BigFive có được tính toán không
- Cờ `has_big5` là True hay False

### 4. Chia Sẻ Logs
Copy toàn bộ phần `[DEBUG save_assessment]` từ backend logs.

## Log Mẫu Khi Hoạt Động Đúng

```
[DEBUG save_assessment] Queried 33 question metadata for 33 question IDs
[DEBUG save_assessment] Question metadata: 18 RIASEC, 15 BigFive
[DEBUG save_assessment] Processed 33 responses, skipped 0
[DEBUG save_assessment] RIASEC responses: 18, BigFive responses: 15
[DEBUG save_assessment] RIASEC accumulator: {R: 3, I: 3, A: 3, S: 3, E: 3, C: 3}
[DEBUG save_assessment] BigFive accumulator: {O: 3, C: 3, E: 3, A: 3, N: 3}
[DEBUG save_assessment] RIASEC scores: {'R': 3.0, 'I': 2.67, ...}
[DEBUG save_assessment] BigFive scores: {'O': 3.5, 'C': 4.0, ...}
[DEBUG save_assessment] has_riasec=True, has_big5=True
```

## Các Vấn Đề Có Thể Gặp

### Vấn Đề 1: Không Có Câu Hỏi BigFive Trong Metadata
```
[DEBUG save_assessment] Question metadata: 18 RIASEC, 0 BigFive
```
**Nguyên nhân**: Question IDs từ frontend không khớp với câu hỏi BigFive trong database
**Giải pháp**: Kiểm tra frontend có gửi đúng question IDs (trong khoảng 289-528)

### Vấn Đề 2: Câu Trả Lời BigFive Bị Bỏ Qua
```
[DEBUG save_assessment] Processed 18 responses, skipped 15
[DEBUG save_assessment] BigFive responses: 0
```
**Nguyên nhân**: Câu trả lời BigFive bị lọc ra
**Giải pháp**: Kiểm tra filter `testTypes` hoặc format câu trả lời

### Vấn Đề 3: BigFive Accumulator Rỗng
```
[DEBUG save_assessment] BigFive accumulator: {O: 0, C: 0, E: 0, A: 0, N: 0}
```
**Nguyên nhân**: Điểm không được thêm vào accumulator (dimension không khớp hoặc lỗi parse điểm)
**Giải pháp**: Kiểm tra format question_key và việc parse câu trả lời

### Vấn Đề 4: has_big5 = False
```
[DEBUG save_assessment] has_big5=False
```
**Nguyên nhân**: Không có điểm BigFive hợp lệ được tính toán
**Giải pháp**: Kiểm tra tại sao accumulator rỗng

## Script Kiểm Tra Database

Tôi đã tạo script debug để kiểm tra trạng thái database:

```bash
cd d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\backend
python test_bigfive_debug.py
```

Script này sẽ hiển thị:
- Các form đánh giá và số lượng câu hỏi
- Các bài đánh giá gần đây của user 74
- Mẫu câu hỏi BigFive

## Files Đã Sửa Đổi

1. `apps/backend/app/modules/assessments/service.py`
   - Thêm logging chi tiết vào hàm `save_assessment()`
   - Thêm logging vào hàm `get_questions()`

2. `apps/backend/test_bigfive_debug.py` (MỚI)
   - Script kiểm tra database

## Thông Tin Cần Chia Sẻ

Sau khi chạy test và thu thập logs, vui lòng chia sẻ:
1. Toàn bộ output log `[DEBUG save_assessment]`
2. Network tab của frontend hiển thị request payload POST /api/assessments/submit
3. Bất kỳ thông báo lỗi nào

Điều này sẽ giúp xác định chính xác nơi dữ liệu BigFive bị mất.

---

## Tóm Tắt Ngắn Gọn

**Vấn đề**: Không có dữ liệu Big Five trong kết quả
**Nguyên nhân**: Backend không tạo bài đánh giá BigFive
**Giải pháp**: Đã thêm logging chi tiết để tìm nguyên nhân
**Cần làm**: Chạy lại bài test và chia sẻ logs backend
