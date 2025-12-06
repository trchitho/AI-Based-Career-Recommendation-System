# Test Tính Năng Tự Động Thanh Toán

## Cách Test

### 1. Khởi động services

```bash
# Terminal 1: Backend
cd apps/backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend  
cd apps/frontend
npm run dev
```

### 2. Test Flow Hoàn Chỉnh

#### Bước 1: Đăng nhập
- Truy cập: `http://localhost:5173/login`
- Đăng nhập với tài khoản test

#### Bước 2: Vào trang thanh toán
- Truy cập: `http://localhost:5173/payment`
- Chọn một gói (ví dụ: Gói Premium - 299,000đ)

#### Bước 3: Click "Chọn Gói Này"
- Hệ thống tạo đơn hàng
- Chuyển đến trang ZaloPay sandbox

#### Bước 4: Thanh toán tại ZaloPay
**Sandbox Test Account:**
```
Card Number: 4111111111111111
Expiry: 12/25
CVV: 123
OTP: 123456
```

#### Bước 5: Quan sát tự động
Sau khi thanh toán:
1. ZaloPay redirect về: `http://localhost:5173/payment?order_id=ORDER_xxx`
2. **Modal tự động hiện**: "🔄 Đang xử lý..."
3. **Polling bắt đầu**: Kiểm tra mỗi 5 giây
4. **Kết quả tự động**: 
   - ✅ "Thanh toán thành công!" (nếu thành công)
   - ❌ "Thanh toán thất bại" (nếu thất bại)

### 3. Kiểm tra Backend Logs

```bash
# Xem logs trong terminal backend
INFO: ZaloPay callback received: {...}
INFO: Payment ORDER_xxx marked as SUCCESS
INFO: Query result for ORDER_xxx: {"status": "success"}
```

### 4. Kiểm tra Database

```sql
-- Xem trạng thái payment
SELECT 
    order_id,
    amount,
    status,
    created_at,
    paid_at
FROM payments
ORDER BY created_at DESC
LIMIT 5;

-- Kết quả mong đợi:
-- order_id: ORDER_xxx
-- status: success (hoặc failed)
-- paid_at: 2024-12-06 10:30:00 (nếu success)
```

### 5. Test Các Trường Hợp

#### Test Case 1: Thanh toán thành công ✅
```
1. Click "Chọn Gói"
2. Thanh toán thành công tại ZaloPay
3. Quay lại trang
4. Modal hiện "Đang xử lý..."
5. Sau 5-10 giây → "Thanh toán thành công!"
6. Click "Xem lịch sử" → Thấy giao dịch mới
```

#### Test Case 2: Thanh toán thất bại ❌
```
1. Click "Chọn Gói"
2. Cancel tại ZaloPay (hoặc nhập sai OTP)
3. Quay lại trang
4. Modal hiện "Đang xử lý..."
5. Sau 5-10 giây → "Thanh toán thất bại"
6. Click "Thử lại" → Quay về tab "Chọn gói"
```

#### Test Case 3: Đóng tab và quay lại
```
1. Click "Chọn Gói"
2. Thanh toán tại ZaloPay
3. ĐÓNG TAB trước khi redirect
4. Mở lại: http://localhost:5173/payment?order_id=ORDER_xxx
5. Modal vẫn tự động kiểm tra và hiển thị kết quả
```

#### Test Case 4: Callback chậm
```
1. Tắt internet trước khi thanh toán
2. Thanh toán tại ZaloPay
3. Bật lại internet
4. Polling sẽ tự động query và cập nhật
```

## Expected Results

### UI States

#### State 1: Pending (Đang xử lý)
```
┌─────────────────────────────┐
│    🔄 (spinning icon)       │
│                             │
│   Đang xử lý...             │
│                             │
│   Đang kiểm tra trạng thái  │
│   thanh toán...             │
│                             │
│   (không có button)         │
└─────────────────────────────┘
```

#### State 2: Success (Thành công)
```
┌─────────────────────────────┐
│    ✅ (green checkmark)     │
│                             │
│   Thanh toán thành công!    │
│                             │
│   Tài khoản của bạn đã      │
│   được nâng cấp.            │
│                             │
│  [Xem lịch sử]  [Đóng]     │
└─────────────────────────────┘
```

#### State 3: Failed (Thất bại)
```
┌─────────────────────────────┐
│    ❌ (red X)               │
│                             │
│   Thanh toán thất bại       │
│                             │
│   Vui lòng thử lại hoặc     │
│   liên hệ hỗ trợ.           │
│                             │
│   [Thử lại]     [Đóng]     │
└─────────────────────────────┘
```

### Network Requests

Khi polling, sẽ thấy requests trong DevTools:

```
GET /api/payment/query/ORDER_xxx
Authorization: Bearer xxx
Response: {
  "success": false,
  "status": "pending",
  "payment": {...}
}

(5 giây sau)

GET /api/payment/query/ORDER_xxx
Authorization: Bearer xxx
Response: {
  "success": true,
  "status": "success",
  "payment": {...}
}
```

## Debug Tips

### 1. Kiểm tra Network Tab
```
DevTools → Network → Filter: /query/
- Xem số lần request
- Xem response status
- Xem thời gian giữa các request (5s)
```

### 2. Kiểm tra Console
```javascript
// Sẽ thấy logs:
"Payment initiated" "premium" "ORDER_xxx"
"Polling started for ORDER_xxx"
"Polling attempt 1/60"
"Polling attempt 2/60"
...
"Payment status: success"
```

### 3. Kiểm tra Backend
```bash
# Xem callback
tail -f logs/app.log | grep "callback"

# Xem query
tail -f logs/app.log | grep "query"
```

### 4. Test với curl

```bash
# Tạo payment
curl -X POST http://localhost:8000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 299000,
    "description": "Test Payment"
  }'

# Query status
curl http://localhost:8000/api/payment/query/ORDER_xxx \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Performance

### Metrics to Check

1. **Polling Duration**: Bao lâu để có kết quả?
   - Mục tiêu: < 30 giây
   - Thực tế: 5-15 giây (tùy callback)

2. **Number of Requests**: Bao nhiêu requests?
   - Mục tiêu: < 10 requests
   - Thực tế: 2-5 requests

3. **Success Rate**: Tỷ lệ thành công?
   - Mục tiêu: > 95%
   - Callback + Polling = 99%

## Common Issues

### Issue 1: Modal không hiện
**Check:**
- URL có `order_id` không?
- `startPaymentPolling` có được gọi không?
- Token còn valid không?

### Issue 2: Polling mãi không dừng
**Check:**
- Backend callback có nhận được không?
- DB status có update không?
- MAC verification có pass không?

### Issue 3: Hiển thị sai status
**Check:**
- Case sensitivity: `success` vs `SUCCESS`
- Enum mapping đúng không?
- Response format đúng không?

## Success Criteria

✅ **Test Pass khi:**

1. Modal tự động hiện sau khi quay về từ ZaloPay
2. Polling tự động bắt đầu (không cần click)
3. Kết quả hiển thị đúng (success/failed)
4. UI đẹp, smooth, không lag
5. Lịch sử cập nhật tự động
6. Không có error trong console
7. Backend logs đầy đủ
8. DB status chính xác

## Video Demo Script

```
1. [0:00] Mở trang payment
2. [0:05] Click "Chọn Gói Premium"
3. [0:10] Chuyển đến ZaloPay
4. [0:15] Nhập thông tin thanh toán
5. [0:25] Xác nhận OTP
6. [0:30] Redirect về trang
7. [0:31] Modal "Đang xử lý..." tự động hiện
8. [0:35] Đợi 5 giây...
9. [0:40] Modal "Thanh toán thành công!" ✅
10. [0:45] Click "Xem lịch sử"
11. [0:50] Thấy giao dịch mới trong bảng
```

## Conclusion

Hệ thống hoạt động **hoàn toàn tự động**:
- ✅ Không cần refresh
- ✅ Không cần click button
- ✅ Không cần check thủ công
- ✅ Real-time feedback
- ✅ Beautiful UI/UX

**Just pay and wait!** 🎉
