# 🧪 Hướng Dẫn Test Personality Garden

## Chuẩn Bị

### 1. Xóa Cache Trình Duyệt
**QUAN TRỌNG:** Phải xóa cache để thấy thay đổi mới!

**Chrome/Edge:**
- Nhấn `Ctrl + Shift + Delete`
- Chọn "Cached images and files"
- Chọn "All time"
- Click "Clear data"

**Firefox:**
- Nhấn `Ctrl + Shift + Delete`
- Chọn "Cache"
- Click "Clear Now"

### 2. Khởi Động Ứng Dụng
```bash
cd D:\Project\AI-Based-Career-Recommendation-System
npm run dev
```

## Test Cases

### ✅ Test 1: Đồ Họa Cây

**Mục tiêu:** Verify cây phát triển thực tế với lá, hoa, thân lớn

**Các bước:**
1. Vào trang Assessment
2. Chọn "🌳 Personality Garden"
3. Skip tutorial (hoặc xem hết)
4. Bắt đầu trả lời câu hỏi

**Kiểm tra sau mỗi 5 câu:**

| Câu hỏi | Thân cây | Lá | Hoa | Chim |
|---------|----------|-----|-----|------|
| 1-5 (11%) | Nhỏ, mỏng | ❌ Chưa có | ❌ Chưa có | ❌ Chưa có |
| 6-10 (23%) | Lớn hơn | ✅ Bắt đầu xuất hiện | ❌ Chưa có | ❌ Chưa có |
| 11-15 (34%) | Rõ ràng | ✅ Nhiều hơn | ❌ Chưa có | ❌ Chưa có |
| 16-20 (45%) | Dày, cao | ✅ Dày đặc | ❌ Chưa có | ✅ 1-2 con |
| 21-25 (57%) | Rất rõ | ✅ Rất nhiều | ✅ Bắt đầu nở | ✅ 2-3 con |
| 26-30 (68%) | To, dày | ✅ Đầy | ✅ Nhiều hoa | ✅ 3-4 con |
| 31-44 (100%) | Rất to | ✅ Rất đầy | ✅ Rất nhiều hoa | ✅ 4-5 con |

**Kết quả mong đợi:**
- ✅ Thân cây phải rõ ràng ngay từ đầu (không quá nhỏ)
- ✅ Lá xuất hiện từ câu 6-7 (khi height ~15%)
- ✅ Hoa xuất hiện từ câu 22-23 (khi height ~50%)
- ✅ Chim bay xuất hiện từ câu 18 (khi height ~40%)
- ✅ Cây trông thực tế, KHÔNG giống "xếp que"

### ✅ Test 2: Đếm Câu Hỏi

**Mục tiêu:** Verify số câu trả lời chính xác

**Các bước:**
1. Trả lời 10 câu
2. Check góc trên phải: "Question 10/44"
3. Check Nature Energy bar: "10/44 Complete"
4. Trả lời thêm 10 câu (tổng 20)
5. Check: "Question 20/44"
6. Tiếp tục đến hết 44 câu

**Kết quả mong đợi:**
- ✅ Số hiển thị = số câu thực tế đã trả lời
- ✅ KHÔNG có bug 50 câu nhưng chỉ 34/44
- ✅ Progress bar tăng đều đặn
- ✅ Kết thúc đúng ở câu 44/44

**Công thức kiểm tra:**
```
Số hiển thị = Số câu đã click = responses.size
```

### ✅ Test 3: Âm Thanh

**Mục tiêu:** Verify âm thanh cho mỗi element

**Các bước:**
1. Bật loa/headphone
2. Click từng element và nghe âm thanh:
   - 💧 Water → Âm thấp, êm dịu (400Hz)
   - 🍃 Breeze → Âm trung bình (550Hz)
   - 🌿 Fertilizer → Âm trung (500Hz)
   - ☀️ Sunlight → Âm cao, sáng (600Hz)
   - ✨ Energy → Âm cao nhất, ma thuật (700Hz)

**Kết quả mong đợi:**
- ✅ Mỗi element có âm thanh riêng
- ✅ Âm thanh ngắn (~0.3s)
- ✅ Không quá to, không chói tai
- ✅ Fade in/out mượt mà
- ✅ Không crash nếu audio không hỗ trợ

### ✅ Test 4: Lịch Sử Câu Trả Lời

**Mục tiêu:** Verify answer history hoạt động đúng

**Các bước:**
1. Trả lời 5 câu
2. Check góc dưới phải: "📜 History (5)"
3. Click nút History → Panel mở ra
4. Verify hiển thị 5 câu với:
   - Số thứ tự (1, 2, 3, 4, 5)
   - Nội dung câu hỏi (rút gọn)
   - Element đã chọn (emoji + label)
5. Hover vào từng câu → Tooltip hiển thị full question
6. Trả lời thêm 10 câu (tổng 15)
7. Check: "📜 History (15)"
8. Mở panel → Verify 15 câu, có thể scroll

**Kết quả mong đợi:**
- ✅ Đếm đúng số câu đã trả lời
- ✅ Hiển thị đầy đủ thông tin
- ✅ Tooltip hoạt động
- ✅ Scroll mượt mà
- ✅ Compact view hiển thị 5 câu gần nhất

### ✅ Test 5: Chim Bay

**Mục tiêu:** Verify chim bay xuất hiện và animation

**Các bước:**
1. Trả lời đến câu 18 (height ~40%)
2. Quan sát màn hình → Chim 🕊️ bắt đầu bay
3. Trả lời thêm → Số chim tăng lên
4. Quan sát:
   - Chim bay từ trái sang phải
   - Mỗi con có độ cao khác nhau
   - Mỗi con có tốc độ khác nhau
   - Animation lặp vô hạn

**Kết quả mong đợi:**
- ✅ Chim xuất hiện khi height >= 40%
- ✅ 1-5 con chim tùy theo height
- ✅ Animation mượt mà
- ✅ Không lag, không giật
- ✅ Tạo cảm giác sống động

### ✅ Test 6: Save/Load Progress

**Mục tiêu:** Verify progress được lưu và restore đúng

**Các bước:**
1. Trả lời 15 câu
2. Note lại:
   - Question number: 15/44
   - Nature Energy: 150
   - Growth Level: 2
   - Bloom Chain: 15
   - Hình dạng cây hiện tại
3. Reload trang (F5)
4. Vào lại Personality Garden
5. Verify:
   - Bỏ qua tutorial/planting
   - Tiếp tục từ câu 16
   - Số liệu giống như trước reload
   - Cây giữ nguyên hình dạng

**Kết quả mong đợi:**
- ✅ Progress được lưu tự động
- ✅ Restore đúng sau reload
- ✅ Không bị duplicate answers
- ✅ Cây không reset về seed

### ✅ Test 7: Complete Flow

**Mục tiêu:** Test toàn bộ flow từ đầu đến cuối

**Các bước:**
1. **Tutorial Phase:**
   - Xem hoặc skip tutorial
   - Verify 6 bước hướng dẫn

2. **Planting Phase:**
   - Xem animation trồng hạt
   - Verify seed animation

3. **Nurturing Phase:**
   - Trả lời tất cả 44 câu
   - Verify cây phát triển liên tục
   - Verify lá, hoa, chim xuất hiện đúng lúc
   - Verify âm thanh mỗi lần chọn
   - Verify history tracking

4. **Revealing Phase:**
   - Xem kết quả cuối cùng
   - Verify cây hoàn chỉnh
   - Verify personality traits hiển thị
   - Click "View Results"

**Kết quả mong đợi:**
- ✅ Flow mượt mà, không crash
- ✅ Tất cả animation hoạt động
- ✅ Tất cả âm thanh hoạt động
- ✅ Kết quả chính xác
- ✅ Trải nghiệm immersive, emotional

## 🐛 Known Issues to Check

### Issue 1: Lá/Hoa Không Hiển Thị
**Triệu chứng:** Cây chỉ có cành, không có lá/hoa
**Fix:** Đã fix trong TreeCanvas.tsx
**Verify:** Lá xuất hiện từ câu 6-7, hoa từ câu 22-23

### Issue 2: Thân Cây Quá Nhỏ
**Triệu chứng:** Thân cây không lớn theo progress
**Fix:** Đã fix minimum size và scaling
**Verify:** Thân cây rõ ràng ngay từ đầu, lớn dần

### Issue 3: Bug Đếm Câu (50 vs 34)
**Triệu chứng:** Số câu trả lời không khớp
**Fix:** Đã fix sử dụng responses.size
**Verify:** Số hiển thị = số câu thực tế

## 📊 Performance Benchmarks

**Target:**
- FPS: >= 30 (smooth animation)
- Memory: < 200MB
- CPU: < 50%
- Load time: < 3s

**Test:**
```javascript
// Open DevTools → Performance tab
// Record while answering 10 questions
// Check:
// - FPS graph (should be stable)
// - Memory usage (should not increase continuously)
// - CPU usage (should have spikes only during animations)
```

## ✅ Acceptance Criteria

Tất cả các điều sau phải đúng:

- [ ] Cây có thân, lá, hoa, rễ rõ ràng
- [ ] Thân cây phát triển từ nhỏ đến lớn
- [ ] Lá xuất hiện khi height >= 15%
- [ ] Hoa xuất hiện khi height >= 50%
- [ ] Chim bay xuất hiện khi height >= 40%
- [ ] Số câu hỏi đếm chính xác (không bug 50 vs 34)
- [ ] Âm thanh hoạt động cho mỗi element
- [ ] Answer history tracking đúng
- [ ] Save/load progress hoạt động
- [ ] Không crash, không lag
- [ ] Trải nghiệm mượt mà, đẹp mắt

## 🎯 Success Metrics

**Visual Quality:**
- Cây trông thực tế (không giống "xếp que") ✅
- Animation mượt mà ✅
- Colors hài hòa ✅

**Functional Correctness:**
- Đếm câu hỏi chính xác ✅
- Progress tracking đúng ✅
- No duplicate answers ✅

**User Experience:**
- Immersive, emotional ✅
- Audio feedback ✅
- Visual feedback (chim, particles) ✅

---

**Prepared by:** Kiro AI
**Last Updated:** Bug fix session
**Status:** Ready for testing
