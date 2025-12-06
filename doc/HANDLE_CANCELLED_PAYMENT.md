# Xử Lý Giao Dịch Bị Hủy

## Vấn Đề

Khi user hủy giao dịch tại ZaloPay, hệ thống hiển thị "Đang xử lý..." mãi mà không chuyển sang "Thất bại".

## Nguyên Nhân

1. **ZaloPay không gọi callback** khi user hủy
2. **Query API trả về return_code = -49** (đơn hàng hết hạn/hủy)
3. **Frontend polling** không biết khi nào dừng
4. **Timeout quá dài** (5 phút) làm user chờ lâu

## Giải Pháp

### 1. Backend: Xử lý return_code từ ZaloPay

#### ZaloPay Return Codes

```python
# apps/backend/app/modules/payment/zalopay_service.py

def query_order(self, app_trans_id: str) -> Dict[str, Any]:
    """
    ZaloPay return_code:
        1: Thanh toán thành công ✅
        2: Thanh toán thất bại ❌
        3: Đơn hàng chưa thanh toán (pending) ⏳
        -49: Đơn hàng hết hạn/đã hủy 🚫
    """
    
    return_code = result.get("return_code")
    
    if return_code == 1:
        status = "success"
    elif return_code == 2:
        status = "failed"
    elif return_code == -49:
        status = "cancelled"  # ← Xử lý hủy
    elif return_code == 3:
        status = "pending"
    else:
        status = "failed"
    
    return {"status": status, ...}
```

#### Update Database Status

```python
# apps/backend/app/modules/payment/routes_payment.py

@router.get("/query/{order_id}")
def query_payment(order_id: str, ...):
    result = zalopay.query_order(payment.app_trans_id)
    
    if result.get("status") == "cancelled":
        payment.status = PaymentStatus.CANCELLED
        db.commit()
        logger.info(f"Payment {order_id} updated to CANCELLED")
```

### 2. Frontend: Dừng Polling Khi Cancelled

#### Polling Logic

```typescript
// apps/frontend/src/services/paymentService.ts

export const pollPaymentStatus = async (
    orderId: string,
    token: string,
    maxAttempts: number = 30,  // ← Giảm từ 60 xuống 30
    interval: number = 5000
): Promise<PaymentQueryResponse> => {
    
    const checkStatus = async () => {
        const result = await queryPayment(orderId, token);
        
        // Dừng polling nếu có kết quả cuối cùng
        if (result.status === 'success' || 
            result.status === 'failed' || 
            result.status === 'cancelled') {  // ← Thêm cancelled
            resolve(result);
            return;
        }
        
        // Timeout sau 30 lần (2.5 phút)
        if (attempts >= maxAttempts) {
            resolve({
                success: false,
                status: 'failed',
                message: 'Giao dịch có thể đã bị hủy.',
            });
            return;
        }
        
        setTimeout(checkStatus, interval);
    };
};
```

#### UI Messages

```typescript
// apps/frontend/src/pages/PaymentPage.tsx

const messages: Record<string, string> = {
    'failed': 'Thanh toán thất bại. Vui lòng thử lại.',
    'cancelled': 'Giao dịch đã bị hủy.',  // ← Message cho cancelled
    'timeout': 'Không thể xác nhận thanh toán.',
};

setPaymentStatus({
    type: 'failed',
    message: messages[result.status] || 'Thanh toán không thành công.',
});
```

### 3. Timeout Protection

#### Backend Timeout

Nếu đơn hàng pending quá 15 phút → tự động failed:

```python
# apps/backend/app/modules/payment/routes_payment.py

elif result_status == "pending":
    # Kiểm tra timeout
    time_elapsed = (datetime.utcnow() - payment.created_at).total_seconds()
    if time_elapsed > 900:  # 15 phút
        payment.status = PaymentStatus.FAILED
        db.commit()
        logger.info(f"Payment {order_id} marked as FAILED due to timeout")
```

#### Frontend Timeout

Polling tối đa 30 lần × 5 giây = 2.5 phút:

```typescript
maxAttempts: 30  // Giảm từ 60 xuống 30
// Total: 30 × 5s = 150s = 2.5 phút
```

## Flow Diagram

### Trường Hợp 1: User Hủy Ngay

```
User click "Chọn Gói"
  ↓
Tạo đơn (status: pending)
  ↓
Chuyển đến ZaloPay
  ↓
User click "Hủy" ❌
  ↓
Redirect về trang
  ↓
Polling bắt đầu
  ↓
Query #1: return_code = -49 (cancelled)
  ↓
Backend: status → CANCELLED
  ↓
Frontend: Hiển thị "Giao dịch đã bị hủy" 🚫
```

### Trường Hợp 2: User Đóng Tab

```
User click "Chọn Gói"
  ↓
Tạo đơn (status: pending)
  ↓
Chuyển đến ZaloPay
  ↓
User đóng tab ❌
  ↓
Không redirect về
  ↓
Sau 15 phút...
  ↓
Backend timeout: status → FAILED
  ↓
User quay lại sau → Thấy "Thất bại"
```

### Trường Hợp 3: Polling Timeout

```
User click "Chọn Gói"
  ↓
Tạo đơn (status: pending)
  ↓
Chuyển đến ZaloPay
  ↓
User không làm gì
  ↓
Redirect về trang
  ↓
Polling 30 lần (2.5 phút)
  ↓
Vẫn pending → Timeout
  ↓
Frontend: "Giao dịch có thể đã bị hủy" ⏱️
```

## Testing

### Test Case 1: Hủy Giao Dịch

```bash
# Bước 1: Tạo payment
1. Click "Chọn Gói Premium"
2. Chuyển đến ZaloPay

# Bước 2: Hủy
3. Click nút "Hủy" hoặc "Quay lại"

# Bước 3: Kiểm tra
4. Redirect về trang
5. Modal hiện "Đang xử lý..."
6. Sau 5-10 giây → "Giao dịch đã bị hủy" ✅

# Bước 4: Verify DB
SELECT order_id, status FROM core.payments 
WHERE order_id = 'ORDER_xxx';
-- Expected: status = 'cancelled'
```

### Test Case 2: Timeout

```bash
# Bước 1: Tạo payment
1. Click "Chọn Gói"
2. Chuyển đến ZaloPay

# Bước 2: Không làm gì
3. Đợi ở trang ZaloPay (không thanh toán, không hủy)

# Bước 3: Quay lại
4. Click back hoặc đóng tab ZaloPay
5. Quay về trang payment

# Bước 4: Kiểm tra
6. Modal hiện "Đang xử lý..."
7. Polling 30 lần (2.5 phút)
8. Sau 2.5 phút → "Không thể xác nhận thanh toán" ✅
```

### Test với curl

```bash
# Tạo payment
ORDER_ID=$(curl -X POST http://localhost:8000/api/payment/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 299000, "description": "Test"}' \
  | jq -r '.order_id')

# Đợi 5 giây (để ZaloPay đánh dấu hủy)
sleep 5

# Query status
curl http://localhost:8000/api/payment/query/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.status'

# Expected: "cancelled" hoặc "pending"
```

## Logs

### Backend Logs

```
INFO: ZaloPay query order response: {
  "return_code": -49,
  "return_message": "Đơn hàng đã hết hạn"
}
INFO: Query result for ORDER_xxx: {
  "status": "cancelled",
  "return_code": -49
}
INFO: Payment ORDER_xxx updated to CANCELLED
```

### Frontend Console

```javascript
Polling attempt 1/30 for order ORDER_xxx
Polling result: {status: "cancelled", success: false}
Payment status: cancelled
```

## Configuration

### Polling Settings

```typescript
// apps/frontend/src/services/paymentService.ts

pollPaymentStatus(
    orderId,
    token,
    maxAttempts: 30,   // 30 lần (có thể điều chỉnh)
    interval: 5000     // 5 giây (có thể điều chỉnh)
)

// Tổng timeout = 30 × 5s = 150s = 2.5 phút
```

### Backend Timeout

```python
# apps/backend/app/modules/payment/routes_payment.py

time_elapsed > 900  # 15 phút (có thể điều chỉnh)
```

## Status Flow

```
PENDING → SUCCESS ✅
        ↓
        → FAILED ❌
        ↓
        → CANCELLED 🚫
        ↓
        → FAILED (timeout) ⏱️
```

## Database Schema

```sql
-- Payment status enum
CREATE TYPE payment_status AS ENUM (
    'pending',
    'success',
    'failed',
    'cancelled'  -- ← Đã có sẵn
);

-- Query cancelled payments
SELECT 
    order_id,
    amount,
    status,
    created_at,
    updated_at
FROM core.payments
WHERE status = 'cancelled'
ORDER BY created_at DESC;
```

## UI States

### Cancelled State

```
┌─────────────────────────────┐
│    🚫 (red circle)          │
│                             │
│   Giao dịch đã bị hủy       │
│                             │
│   Bạn đã hủy thanh toán     │
│   tại ZaloPay.              │
│                             │
│   [Thử lại]     [Đóng]     │
└─────────────────────────────┘
```

## Improvements

### ✅ Đã Cải Thiện

1. **Xử lý return_code -49**: Nhận diện đơn hàng bị hủy
2. **Giảm polling timeout**: Từ 5 phút → 2.5 phút
3. **Dừng polling sớm**: Khi gặp cancelled
4. **Backend timeout**: Tự động failed sau 15 phút
5. **Message rõ ràng**: "Giao dịch đã bị hủy"

### 🎯 Kết Quả

- ✅ User hủy → Hiển thị ngay (5-10 giây)
- ✅ Không chờ lâu (2.5 phút thay vì 5 phút)
- ✅ Message chính xác (cancelled vs failed)
- ✅ DB status đúng (CANCELLED)
- ✅ Logs đầy đủ để debug

## Troubleshooting

### Vấn Đề: Vẫn hiện "Đang xử lý..." mãi

**Check:**
1. Backend có nhận return_code -49 không?
2. Status có update thành CANCELLED không?
3. Frontend có dừng polling không?

**Debug:**
```bash
# Check backend logs
tail -f logs/app.log | grep "return_code"

# Check DB
SELECT order_id, status, updated_at 
FROM core.payments 
WHERE order_id = 'ORDER_xxx';
```

### Vấn Đề: Hiển thị "failed" thay vì "cancelled"

**Nguyên nhân**: Frontend không nhận diện status "cancelled"

**Giải pháp**: Đảm bảo polling dừng khi gặp cancelled:
```typescript
if (result.status === 'cancelled') {
    resolve(result);
    return;
}
```

## Summary

Hệ thống giờ xử lý hủy giao dịch **tự động và nhanh chóng**:

1. ✅ User hủy → ZaloPay return -49
2. ✅ Backend nhận diện → Update CANCELLED
3. ✅ Frontend polling → Dừng ngay
4. ✅ UI hiển thị → "Giao dịch đã bị hủy"
5. ✅ Timeout protection → 2.5 phút (frontend) + 15 phút (backend)

**Không còn "Đang xử lý..." mãi mãi!** 🎉
