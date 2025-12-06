# Fix: Redirect Khi Hủy Giao Dịch

## Vấn Đề

Khi user hủy giao dịch tại ZaloPay:
- ❌ ZaloPay redirect về backend callback URL
- ❌ Không có `order_id` trong URL
- ❌ Frontend không biết giao dịch nào bị hủy
- ❌ Hiển thị "Đang xử lý..." mãi mà không có kết quả

## Nguyên Nhân

### Trước Khi Fix

```python
# embed_data chỉ có callback_url (backend)
embed_data = json.dumps({
    "redirecturl": "http://localhost:8000/api/payment/callback"
})
```

**Flow:**
```
User hủy tại ZaloPay
  ↓
ZaloPay redirect → http://localhost:8000/api/payment/callback
  ↓
Backend callback (không có order_id)
  ↓
Frontend không biết gì ❌
```

## Giải Pháp

### Sau Khi Fix

```python
# embed_data có redirect_url (frontend) với order_id
redirect_url = f"{self.redirect_url}?order_id={order_id}"
embed_data = json.dumps({
    "redirecturl": redirect_url
})
```

**Flow:**
```
User hủy tại ZaloPay
  ↓
ZaloPay redirect → http://localhost:5173/payment?order_id=ORDER_xxx
  ↓
Frontend nhận order_id
  ↓
Bắt đầu polling tự động
  ↓
Query status → cancelled
  ↓
Hiển thị "Giao dịch đã bị hủy" ✅
```

## Code Changes

### 1. Backend Service

```python
# apps/backend/app/modules/payment/zalopay_service.py

class ZaloPayService:
    def __init__(
        self,
        app_id: str,
        key1: str,
        key2: str,
        endpoint: str = "https://sb-openapi.zalopay.vn/v2/create",
        callback_url: str = "",
        redirect_url: str = "",  # ← Thêm redirect_url
    ):
        self.app_id = app_id
        self.key1 = key1
        self.key2 = key2
        self.endpoint = endpoint
        self.callback_url = callback_url
        self.redirect_url = redirect_url  # ← Lưu redirect_url

    def create_order(self, ...):
        # Tạo redirect URL với order_id
        redirect_url = f"{self.redirect_url}?order_id={order_id}" if self.redirect_url else self.callback_url
        
        embed_data = json.dumps({
            "redirecturl": redirect_url  # ← Dùng redirect_url thay vì callback_url
        })
```

### 2. Backend Routes

```python
# apps/backend/app/modules/payment/routes_payment.py

def get_zalopay_service() -> ZaloPayService:
    return ZaloPayService(
        app_id=os.getenv("ZALOPAY_APP_ID", "2553"),
        key1=os.getenv("ZALOPAY_KEY1", "..."),
        key2=os.getenv("ZALOPAY_KEY2", "..."),
        endpoint=os.getenv("ZALOPAY_ENDPOINT", "..."),
        callback_url=os.getenv("ZALOPAY_CALLBACK_URL", "http://localhost:8000/api/payment/callback"),
        redirect_url=os.getenv("ZALOPAY_REDIRECT_URL", "http://localhost:5173/payment"),  # ← Thêm
    )
```

### 3. Environment Variables

```bash
# apps/backend/.env

# ZaloPay Payment Gateway (Sandbox)
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback
ZALOPAY_REDIRECT_URL=http://localhost:5173/payment  # ← Thêm redirect URL
```

## Cách Hoạt Động

### Khi Tạo Đơn Hàng

```python
# Backend tạo order với redirect URL
order_id = "ORDER_27_1733498733"
redirect_url = f"http://localhost:5173/payment?order_id={order_id}"

embed_data = {
    "redirecturl": "http://localhost:5173/payment?order_id=ORDER_27_1733498733"
}

# Gửi đến ZaloPay
zalopay.create_order(...)
```

### Khi User Thanh Toán Thành Công

```
User thanh toán thành công
  ↓
ZaloPay gọi callback → http://localhost:8000/api/payment/callback
  (Backend cập nhật DB: status = SUCCESS)
  ↓
ZaloPay redirect user → http://localhost:5173/payment?order_id=ORDER_xxx
  ↓
Frontend nhận order_id
  ↓
Polling query status
  ↓
Nhận status = SUCCESS
  ↓
Hiển thị "Thanh toán thành công!" ✅
```

### Khi User Hủy Giao Dịch

```
User click "Hủy" tại ZaloPay
  ↓
ZaloPay KHÔNG gọi callback (backend không biết)
  ↓
ZaloPay redirect user → http://localhost:5173/payment?order_id=ORDER_xxx
  ↓
Frontend nhận order_id
  ↓
Polling query status
  ↓
Query ZaloPay API → return_code = -49 (cancelled)
  ↓
Backend update DB: status = CANCELLED
  ↓
Frontend nhận status = CANCELLED
  ↓
Hiển thị "Giao dịch đã bị hủy" ✅
```

### Khi User Đóng Tab

```
User đóng tab ZaloPay (không thanh toán, không hủy)
  ↓
ZaloPay KHÔNG redirect
  ↓
Backend không biết gì
  ↓
User quay lại sau → Vào http://localhost:5173/payment
  ↓
Không có order_id trong URL
  ↓
Không có polling
  ↓
User xem lịch sử → Thấy status = PENDING
  ↓
Sau 15 phút → Backend timeout → status = FAILED
```

## Testing

### Test Case 1: Hủy Giao Dịch

```bash
# Bước 1: Tạo payment
1. Vào http://localhost:5173/payment
2. Click "Chọn Gói Premium"
3. Chuyển đến ZaloPay

# Bước 2: Hủy
4. Click nút "Hủy" hoặc "Quay lại" tại ZaloPay

# Bước 3: Kiểm tra redirect
5. ZaloPay redirect về: http://localhost:5173/payment?order_id=ORDER_xxx ✅
6. Modal hiện "Đang xử lý..."
7. Sau 5-10 giây → "Giao dịch đã bị hủy" ✅

# Bước 4: Verify logs
Backend logs:
INFO: ZaloPay query order response: {"return_code": -49, ...}
INFO: Payment ORDER_xxx updated to CANCELLED

Frontend console:
Polling attempt 1/30 for order ORDER_xxx
Polling result: {status: "cancelled"}
```

### Test Case 2: Thanh Toán Thành Công

```bash
# Bước 1: Tạo payment
1. Click "Chọn Gói Premium"
2. Chuyển đến ZaloPay

# Bước 2: Thanh toán
3. Nhập thông tin thẻ test
4. Xác nhận OTP

# Bước 3: Kiểm tra redirect
5. ZaloPay redirect về: http://localhost:5173/payment?order_id=ORDER_xxx ✅
6. Modal hiện "Đang xử lý..."
7. Sau 5-10 giây → "Thanh toán thành công!" ✅

# Bước 4: Verify
Backend logs:
INFO: ZaloPay callback received: {...}
INFO: Payment ORDER_xxx marked as SUCCESS
INFO: Query result: {"status": "success"}

Frontend console:
Polling attempt 1/30 for order ORDER_xxx
Polling result: {status: "success"}
```

### Test với curl

```bash
# Kiểm tra redirect URL trong order
curl -X POST http://localhost:8000/api/payment/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 299000,
    "description": "Test Payment"
  }' | jq '.order_url'

# Mở order_url trong browser
# Kiểm tra embed_data có chứa redirect URL đúng không
```

## URL Structure

### Callback URL (Backend)
```
http://localhost:8000/api/payment/callback
```
- Dùng cho: ZaloPay gọi callback khi thanh toán thành công
- Method: POST
- Body: JSON với MAC signature

### Redirect URL (Frontend)
```
http://localhost:5173/payment?order_id=ORDER_xxx
```
- Dùng cho: ZaloPay redirect user về sau khi hoàn tất/hủy
- Method: GET (browser redirect)
- Query param: `order_id`

## Configuration

### Development
```bash
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback
ZALOPAY_REDIRECT_URL=http://localhost:5173/payment
```

### Production
```bash
ZALOPAY_CALLBACK_URL=https://api.yourdomain.com/api/payment/callback
ZALOPAY_REDIRECT_URL=https://yourdomain.com/payment
```

### With ngrok (for testing callback)
```bash
# Terminal 1: Start ngrok
ngrok http 8000

# Terminal 2: Update .env
ZALOPAY_CALLBACK_URL=https://abc123.ngrok.io/api/payment/callback
ZALOPAY_REDIRECT_URL=http://localhost:5173/payment

# Restart backend
```

## Diagram

### Before Fix
```
┌─────────┐         ┌──────────┐         ┌─────────┐
│ User    │────────>│ ZaloPay  │────────>│ Backend │
│         │  Pay    │          │ Redirect│ Callback│
└─────────┘         └──────────┘         └─────────┘
                                               │
                                               ❌ No order_id
                                               │
                                         ┌─────────┐
                                         │Frontend │
                                         │ (không  │
                                         │  biết)  │
                                         └─────────┘
```

### After Fix
```
┌─────────┐         ┌──────────┐         ┌─────────┐
│ User    │────────>│ ZaloPay  │────────>│ Backend │
│         │  Pay    │          │ Callback│         │
└─────────┘         └──────────┘         └─────────┘
     ↑                    │                     │
     │                    │ Redirect            │
     │                    │ with order_id       │
     │                    ↓                     │
     │              ┌─────────┐                 │
     └──────────────│Frontend │<────────────────┘
        Display     │ Polling │    Query status
        result      └─────────┘
```

## Benefits

### ✅ Ưu Điểm

1. **User Experience**: User luôn thấy kết quả (success/failed/cancelled)
2. **Automatic**: Không cần thao tác thủ công
3. **Reliable**: Hoạt động cho cả success và cancelled
4. **Clear**: URL có order_id rõ ràng
5. **Debuggable**: Dễ debug với order_id trong URL

### 🎯 Use Cases

- ✅ User thanh toán thành công → Redirect với order_id → Polling → Success
- ✅ User hủy giao dịch → Redirect với order_id → Polling → Cancelled
- ✅ User đóng tab → Không redirect → Quay lại sau → Xem lịch sử
- ✅ Callback chậm → Redirect trước → Polling catch được

## Troubleshooting

### Vấn Đề: Vẫn không redirect về frontend

**Check:**
1. `.env` có `ZALOPAY_REDIRECT_URL` chưa?
2. Backend có restart sau khi update .env chưa?
3. `embed_data` có chứa redirect URL đúng không?

**Debug:**
```python
# Thêm log trong create_order
logger.info(f"Redirect URL: {redirect_url}")
logger.info(f"Embed data: {embed_data}")
```

### Vấn Đề: Redirect về nhưng không có order_id

**Check:**
1. URL format có đúng không: `?order_id=ORDER_xxx`
2. Frontend có parse query param không?

**Debug:**
```typescript
// Frontend
const [searchParams] = useSearchParams();
const orderId = searchParams.get('order_id');
console.log('Order ID from URL:', orderId);
```

### Vấn Đề: Redirect về URL khác

**Nguyên nhân**: ZaloPay cache embed_data

**Giải pháp**: 
- Tạo order mới (order_id mới)
- Hoặc đợi vài phút để cache hết hạn

## Summary

Với fix này, hệ thống giờ hoạt động **hoàn hảo**:

1. ✅ User thanh toán → Redirect về frontend với order_id
2. ✅ User hủy → Redirect về frontend với order_id
3. ✅ Frontend polling → Tự động query status
4. ✅ Hiển thị kết quả → Success/Failed/Cancelled
5. ✅ Không còn "Đang xử lý..." mãi mãi

**Perfect user experience!** 🎉
