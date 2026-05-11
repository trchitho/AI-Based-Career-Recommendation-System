# Hướng dẫn kiểm tra fix màu sắc các ô làm bài

## Vấn đề đã sửa:
Các nút trả lời (1-5) trong bài đánh giá nghề nghiệp không hiển thị màu sắc đúng khi click.

## Thay đổi:
- **File**: `apps/frontend/src/components/assessment/CareerTestComponent.tsx`
- **Thay đổi**: Chuyển từ dynamic class names (template literals) sang static class names đầy đủ
- **Lý do**: Tailwind CSS cần class names đầy đủ để compile đúng, không thể sử dụng dynamic string concatenation

## Màu sắc mới:

### Trạng thái chưa chọn (hiển thị màu nhạt):
1. **Rất không đồng ý**: `bg-red-300` (đỏ nhạt)
2. **Không đồng ý**: `bg-orange-300` (cam nhạt)
3. **Trung lập**: `bg-gray-300` (xám)
4. **Đồng ý**: `bg-indigo-300` (xanh dương nhạt)
5. **Rất đồng ý**: `bg-indigo-500` (xanh dương đậm)

### Trạng thái đã chọn (hiển thị màu đậm + checkmark):
1. **Rất không đồng ý**: `bg-red-500` (đỏ đậm)
2. **Không đồng ý**: `bg-orange-500` (cam đậm)
3. **Trung lập**: `bg-gray-500` (xám đậm)
4. **Đồng ý**: `bg-indigo-600` (xanh dương đậm)
5. **Rất đồng ý**: `bg-indigo-700` (xanh dương rất đậm)

## Cách kiểm tra:

### Bước 1: Hard Refresh Browser
```
Windows: Ctrl + Shift + R hoặc Ctrl + F5
Mac: Cmd + Shift + R
```

### Bước 2: Nếu vẫn chưa thấy màu, restart dev server:
```bash
cd AI-Based-Career-Recommendation-System/apps/frontend
npm run dev
```

### Bước 3: Clear browser cache nếu cần:
- Mở DevTools (F12)
- Right-click vào nút Refresh
- Chọn "Empty Cache and Hard Reload"

### Bước 4: Kiểm tra trong browser:
1. Vào trang Assessment (localhost:3000/assessment)
2. Chọn chế độ "Traditional"
3. Xem các nút tròn 1-5 bên phải mỗi câu hỏi
4. **Trước khi click**: Các nút phải có màu sắc khác nhau (đỏ, cam, xám, xanh)
5. **Sau khi click**: Nút được chọn phải đổi sang màu đậm hơn và hiển thị dấu checkmark ✓

## Kết quả mong đợi:
✅ Các nút hiển thị màu sắc rõ ràng ngay cả khi chưa được chọn
✅ Khi click vào nút, màu sắc thay đổi sang màu đậm hơn
✅ Hiển thị icon checkmark màu trắng khi được chọn
✅ Có hiệu ứng scale và shadow khi hover/click
✅ Hoạt động tốt cả light mode và dark mode
