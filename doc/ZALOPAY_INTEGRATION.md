# Tích hợp ZaloPay Payment Gateway

## Tổng quan

Hệ thống đã được tích hợp ZaloPay để xử lý thanh toán trực tuyến. Module này hỗ trợ:

- ✅ Tạo đơn thanh toán
- ✅ Xử lý callback từ ZaloPay
- ✅ Truy vấn trạng thái thanh toán
- ✅ Lịch sử giao dịch
- ✅ UI/UX hoàn chỉnh

## Cấu trúc

### Backend

```
apps/backend/app/modules/payment/
├── __init__.py
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── zalopay_service.py     # ZaloPay API client
└── routes_payment.py      # FastAPI routes
```

### Frontend

```
apps/frontend/src/
├── services/paymentService.ts           # API client
├── components/payment/PaymentButton.tsx # Payment button component
└── pages/PaymentPage.tsx                # Payment & history page
```

### Database

```
db/init/003_payments.sql   # Migration script
```

## Cấu hình

### 1. Environment Variables

Thêm vào file `.env`:

```bash
# ZaloPay Payment Gateway (Sandbox)
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback
```

**Lưu ý**: Đây là thông tin Sandbox. Khi lên Production, cần đăng ký tài khoản ZaloPay Business và thay đổi:
- `ZALOPAY_APP_ID`: App ID thực
- `ZALOPAY_KEY1`: Key1 thực
- `ZALOPAY_KEY2`: Key2 thực
- `ZALOPAY_ENDPOINT`: https://openapi.zalopay.vn/v2/create
- `ZALOPAY_CALLBACK_URL`: URL callback production

### 2. Database Migration

Chạy migration để tạo bảng `payments`:

```bash
psql -U postgres -d career_ai -f db/init/003_payments.sql
```

Hoặc nếu dùng Docker:

```bash
docker exec -i careerai_postgres psql -U postgres -d career_ai < db/init/003_payments.sql
```

### 3. Cài đặt Dependencies

Backend đã có sẵn `httpx` trong requirements.txt. Nếu chưa có:

```bash
cd apps/backend
pip install httpx loguru
```

## API Endpoints

### 1. Tạo thanh toán

```http
POST /api/payment/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 99000,
  "description": "Thanh toán gói Premium",
  "payment_method": "zalopay"
}
```

**Response:**

```json
{
  "success": true,
  "order_id": "ORDER_123_1234567890",
  "order_url": "https://sbgateway.zalopay.vn/order/..."
}
```

### 2. Callback (ZaloPay gọi)

```http
POST /api/payment/callback
Content-Type: application/x-www-form-urlencoded

data={...}&mac={...}&type=1
```

### 3. Truy vấn trạng thái

```http
GET /api/payment/query/{order_id}
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "status": "success",
  "payment": {
    "id": 1,
    "order_id": "ORDER_123_1234567890",
    "amount": 99000,
    "description": "Thanh toán gói Premium",
    "status": "success",
    "payment_method": "zalopay",
    "created_at": "2025-12-06T10:00:00Z",
    "paid_at": "2025-12-06T10:05:00Z"
  }
}
```

### 4. Lịch sử thanh toán

```http
GET /api/payment/history?skip=0&limit=20
Authorization: Bearer {token}
```

**Response:**

```json
[
  {
    "id": 1,
    "order_id": "ORDER_123_1234567890",
    "amount": 99000,
    "description": "Thanh toán gói Premium",
    "status": "success",
    "payment_method": "zalopay",
    "created_at": "2025-12-06T10:00:00Z",
    "paid_at": "2025-12-06T10:05:00Z"
  }
]
```

## Sử dụng Frontend

### 1. Import Component

```tsx
import { PaymentButton } from '../components/payment/PaymentButton';

// Trong component
<PaymentButton
  amount={99000}
  description="Thanh toán gói Premium"
  onSuccess={(orderId) => {
    console.log('Payment success:', orderId);
  }}
  onError={(error) => {
    console.error('Payment error:', error);
  }}
>
  Thanh toán ngay
</PaymentButton>
```

### 2. Sử dụng Service trực tiếp

```tsx
import { createPayment } from '../services/paymentService';

const handlePayment = async () => {
  const token = localStorage.getItem('token');
  
  const result = await createPayment(
    {
      amount: 99000,
      description: 'Thanh toán gói Premium',
      payment_method: 'zalopay',
    },
    token
  );
  
  if (result.success && result.order_url) {
    window.location.href = result.order_url;
  }
};
```

### 3. Trang thanh toán đầy đủ

```tsx
import { PaymentPage } from '../pages/PaymentPage';

// Trong router
<Route path="/payment" element={<PaymentPage />} />
```

## Luồng thanh toán

```
1. User chọn gói → Click "Thanh toán"
   ↓
2. Frontend gọi POST /api/payment/create
   ↓
3. Backend tạo record trong DB (status: pending)
   ↓
4. Backend gọi ZaloPay API tạo đơn hàng
   ↓
5. ZaloPay trả về order_url
   ↓
6. Frontend redirect user đến order_url
   ↓
7. User thanh toán trên ZaloPay
   ↓
8. ZaloPay gọi callback → POST /api/payment/callback
   ↓
9. Backend verify MAC, cập nhật status: success
   ↓
10. ZaloPay redirect user về frontend
   ↓
11. Frontend gọi GET /api/payment/query/{order_id}
   ↓
12. Hiển thị kết quả thanh toán
```

## Testing với Sandbox

### 1. Thông tin test

- **App ID**: 2553 (sandbox)
- **Endpoint**: https://sb-openapi.zalopay.vn
- **Test cards**: Xem tại https://docs.zalopay.vn/v2/

### 2. Test flow

```bash
# 1. Tạo thanh toán
curl -X POST http://localhost:8000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "description": "Test payment"
  }'

# 2. Mở order_url trong browser
# 3. Thanh toán với test card
# 4. Kiểm tra callback log
# 5. Query trạng thái
curl http://localhost:8000/api/payment/query/ORDER_XXX \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Bảo mật

### 1. MAC Verification

Tất cả callback từ ZaloPay đều được verify MAC bằng HMAC-SHA256:

```python
computed_mac = hmac.new(
    key2.encode(), 
    data.encode(), 
    hashlib.sha256
).hexdigest()

if not hmac.compare_digest(mac, computed_mac):
    return {"return_code": -1, "return_message": "Invalid MAC"}
```

### 2. HTTPS Required

Production **BẮT BUỘC** dùng HTTPS cho callback URL.

### 3. Token Authentication

Tất cả API đều yêu cầu JWT token hợp lệ.

## Troubleshooting

### 1. Callback không nhận được

- Kiểm tra `ZALOPAY_CALLBACK_URL` có public accessible không
- Dùng ngrok để expose local: `ngrok http 8000`
- Cập nhật callback URL: `ZALOPAY_CALLBACK_URL=https://xxx.ngrok.io/api/payment/callback`

### 2. MAC verification failed

- Kiểm tra `ZALOPAY_KEY2` đúng chưa
- Kiểm tra format data có đúng không

### 3. Order creation failed

- Kiểm tra `ZALOPAY_APP_ID` và `ZALOPAY_KEY1`
- Kiểm tra amount > 0
- Xem log chi tiết trong console

## Production Checklist

- [ ] Đăng ký tài khoản ZaloPay Business
- [ ] Lấy App ID, Key1, Key2 production
- [ ] Cập nhật endpoint sang production
- [ ] Setup HTTPS cho callback URL
- [ ] Test thanh toán thật
- [ ] Setup monitoring & alerting
- [ ] Backup database thường xuyên
- [ ] Implement retry mechanism cho callback
- [ ] Add logging & audit trail
- [ ] Setup webhook để notify user

## Tài liệu tham khảo

- [ZaloPay API Documentation](https://docs.zalopay.vn/)
- [ZaloPay Sandbox](https://sbgateway.zalopay.vn/)
- [ZaloPay Business Registration](https://business.zalopay.vn/)

## Support

Nếu gặp vấn đề, liên hệ:
- ZaloPay Support: support@zalopay.vn
- Documentation: https://docs.zalopay.vn/
