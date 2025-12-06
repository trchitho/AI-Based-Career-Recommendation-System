# Tự Động Cập Nhật Trạng Thái Thanh Toán

## Tổng Quan

Hệ thống thanh toán đã được nâng cấp để **tự động** kiểm tra và hiển thị trạng thái thanh toán (thành công/thất bại) mà không cần thao tác thủ công.

## Cách Hoạt Động

### 1. **Quy Trình Thanh Toán**

```
User Click "Chọn Gói" 
  → Tạo đơn hàng (status: pending)
  → Chuyển đến ZaloPay
  → User thanh toán
  → ZaloPay callback (cập nhật DB)
  → User quay lại trang
  → Auto polling bắt đầu
  → Hiển thị kết quả tự động
```

### 2. **Auto Polling Mechanism**

Sau khi user quay lại từ ZaloPay, hệ thống tự động:

- **Bắt đầu polling**: Kiểm tra trạng thái mỗi 5 giây
- **Tối đa 60 lần**: Tổng cộng 5 phút
- **Dừng khi**: 
  - Thanh toán thành công ✅
  - Thanh toán thất bại ❌
  - Hết thời gian chờ ⏱️

### 3. **UI/UX Flow**

#### Bước 1: User click thanh toán
```typescript
<PaymentButton 
  onSuccess={(orderId) => {
    startPaymentPolling(orderId); // Tự động bắt đầu
  }}
/>
```

#### Bước 2: Hiển thị modal "Đang xử lý"
```
┌─────────────────────────┐
│   🔄 Đang xử lý...      │
│                         │
│ Đang kiểm tra trạng     │
│ thái thanh toán...      │
└─────────────────────────┘
```

#### Bước 3: Kết quả tự động
```
Thành công:
┌─────────────────────────┐
│   ✅ Thành công!        │
│                         │
│ Tài khoản đã được       │
│ nâng cấp.               │
│                         │
│ [Xem lịch sử] [Đóng]   │
└─────────────────────────┘

Thất bại:
┌─────────────────────────┐
│   ❌ Thất bại           │
│                         │
│ Vui lòng thử lại.       │
│                         │
│ [Thử lại] [Đóng]        │
└─────────────────────────┘
```

## Code Implementation

### Frontend: Auto Polling

```typescript
// apps/frontend/src/services/paymentService.ts

export const pollPaymentStatus = async (
    orderId: string,
    token: string,
    maxAttempts: number = 60,  // 60 lần
    interval: number = 5000     // 5 giây
): Promise<PaymentQueryResponse> => {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            attempts++;
            const result = await queryPayment(orderId, token);
            
            // Dừng nếu success hoặc failed
            if (result.status === 'success' || result.status === 'failed') {
                resolve(result);
                return;
            }
            
            // Timeout sau 60 lần
            if (attempts >= maxAttempts) {
                resolve({
                    success: false,
                    status: 'timeout',
                    message: 'Hết thời gian chờ',
                });
                return;
            }
            
            // Tiếp tục polling
            setTimeout(checkStatus, interval);
        };
        
        checkStatus();
    });
};
```

### Backend: Query Endpoint

```python
# apps/backend/app/modules/payment/routes_payment.py

@router.get("/query/{order_id}")
def query_payment(order_id: str, ...):
    """Tự động query từ ZaloPay và cập nhật DB"""
    
    payment = db.query(Payment).filter(...).first()
    
    # Nếu đã có kết quả cuối cùng, return luôn
    if payment.status in [PaymentStatus.SUCCESS, PaymentStatus.FAILED]:
        return PaymentQueryResponse(...)
    
    # Query từ ZaloPay nếu còn pending
    if payment.app_trans_id:
        result = zalopay.query_order(payment.app_trans_id)
        
        # Cập nhật DB
        if result.get("status") == "success":
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = datetime.utcnow()
            db.commit()
        elif result.get("status") == "failed":
            payment.status = PaymentStatus.FAILED
            db.commit()
    
    return PaymentQueryResponse(...)
```

### ZaloPay Service: Query Order

```python
# apps/backend/app/modules/payment/zalopay_service.py

def query_order(self, app_trans_id: str) -> Dict[str, Any]:
    """Query trạng thái từ ZaloPay"""
    
    # return_code:
    # 1 = success
    # 2 = failed  
    # 3 = pending
    
    return_code = result.get("return_code")
    
    return {
        "success": return_code == 1,
        "status": "success" if return_code == 1 
                 else "failed" if return_code == 2 
                 else "pending",
        "return_code": return_code,
        "message": result.get("return_message"),
    }
```

## Callback Handling

### ZaloPay Callback

Khi user thanh toán thành công, ZaloPay sẽ gọi callback:

```python
@router.post("/callback")
async def payment_callback(request: Request, db: Session):
    """Nhận callback từ ZaloPay"""
    
    # Verify MAC
    if not zalopay.verify_callback(callback_data):
        return {"return_code": -1}
    
    # Cập nhật trạng thái
    payment.status = PaymentStatus.SUCCESS
    payment.paid_at = datetime.utcnow()
    db.commit()
    
    return {"return_code": 1, "return_message": "success"}
```

## Testing

### Test Flow

1. **Tạo đơn hàng**
```bash
curl -X POST http://localhost:8000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 299000,
    "description": "Gói Premium"
  }'
```

2. **Thanh toán tại ZaloPay**
- Mở `order_url` từ response
- Thanh toán bằng sandbox account

3. **Quay lại trang**
- URL: `http://localhost:5173/payment?order_id=ORDER_123`
- Modal tự động hiện "Đang xử lý..."
- Sau vài giây → Hiển thị kết quả

4. **Kiểm tra DB**
```sql
SELECT order_id, status, paid_at 
FROM payments 
WHERE order_id = 'ORDER_123';
```

## Configuration

### Polling Settings

Có thể điều chỉnh trong `paymentService.ts`:

```typescript
pollPaymentStatus(
    orderId,
    token,
    maxAttempts: 60,  // Số lần thử (mặc định: 60)
    interval: 5000    // Khoảng cách (ms) (mặc định: 5s)
)
```

### Timeout Calculation

```
Total timeout = maxAttempts × interval
              = 60 × 5000ms
              = 300,000ms
              = 5 phút
```

## Error Handling

### Các Trường Hợp Lỗi

1. **Timeout**: Quá 5 phút không có kết quả
   - Hiển thị: "Hết thời gian chờ. Vui lòng kiểm tra lại sau."
   - Action: User có thể refresh hoặc check lịch sử

2. **Network Error**: Mất kết nối
   - Hiển thị: "Có lỗi xảy ra khi kiểm tra thanh toán."
   - Action: Thử lại

3. **Invalid Token**: Token hết hạn
   - Redirect về login page

4. **Order Not Found**: Không tìm thấy đơn hàng
   - HTTP 404: "Không tìm thấy đơn hàng"

## Benefits

### ✅ Ưu Điểm

1. **Tự động hoàn toàn**: Không cần user làm gì
2. **Real-time feedback**: Biết kết quả ngay lập tức
3. **UX tốt hơn**: Modal đẹp, thông báo rõ ràng
4. **Reliable**: Retry mechanism với timeout hợp lý
5. **Consistent**: Đồng bộ giữa DB và ZaloPay

### 🎯 Use Cases

- User thanh toán → Tự động hiển thị thành công
- User đóng tab → Quay lại vẫn thấy kết quả
- Callback chậm → Polling vẫn catch được
- Network issue → Retry tự động

## Monitoring

### Logs

Backend logs tất cả các bước:

```
INFO: ZaloPay callback received: {...}
INFO: Payment ORDER_123 marked as SUCCESS
INFO: Query result for ORDER_123: {...}
INFO: Payment ORDER_123 updated to SUCCESS
```

### Metrics

Có thể track:
- Số lần polling trung bình
- Thời gian từ callback đến user nhận kết quả
- Tỷ lệ timeout
- Tỷ lệ thành công/thất bại

## Future Improvements

1. **WebSocket**: Real-time push thay vì polling
2. **Push Notification**: Thông báo khi thanh toán xong
3. **Email Confirmation**: Gửi email xác nhận
4. **SMS**: Gửi SMS cho giao dịch lớn
5. **Analytics**: Dashboard theo dõi thanh toán

## Troubleshooting

### Vấn Đề: Modal không hiện

**Nguyên nhân**: URL không có `order_id`

**Giải pháp**: 
```typescript
// Đảm bảo PaymentButton trả về orderId
onSuccess={(orderId) => {
  if (orderId) {
    startPaymentPolling(orderId);
  }
}}
```

### Vấn Đề: Polling mãi không dừng

**Nguyên nhân**: Status không đổi từ pending

**Giải pháp**: 
- Check callback có được gọi không
- Check MAC verification
- Check DB có update không

### Vấn Đề: Hiển thị sai trạng thái

**Nguyên nhân**: Case sensitivity (PENDING vs pending)

**Giải pháp**:
```python
# Backend: Luôn dùng enum
payment.status = PaymentStatus.SUCCESS  # ✅
payment.status = "success"              # ❌
```

## Summary

Hệ thống thanh toán giờ đây **hoàn toàn tự động**:

1. ✅ User thanh toán → Tự động polling
2. ✅ Callback từ ZaloPay → Tự động cập nhật DB
3. ✅ Frontend query → Tự động lấy status mới nhất
4. ✅ Modal hiển thị → Tự động show kết quả
5. ✅ Timeout handling → Tự động báo lỗi

**Không cần thao tác thủ công!** 🎉
