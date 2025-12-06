# ZaloPay Quick Start - 5 phút

## 🚀 Bắt đầu nhanh

### 1. Cấu hình (1 phút)

```bash
# Thêm vào apps/backend/.env
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback
```

### 2. Tạo Database (1 phút)

```bash
psql -U postgres -d career_ai -f db/init/003_payments.sql
```

### 3. Khởi động Backend (1 phút)

```bash
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
```

### 4. Test API (2 phút)

Truy cập: http://localhost:8000/docs

1. Click **Authorize**, nhập: `Bearer YOUR_TOKEN`
2. Tìm `POST /api/payment/create`
3. Click **Try it out**
4. Nhập:

```json
{
  "amount": 50000,
  "description": "Test payment",
  "payment_method": "zalopay"
}
```

5. Click **Execute**
6. Copy `order_url` và mở trong browser
7. Thanh toán với:
   - SĐT: `0123456789`
   - OTP: `123456`
   - PIN: `111111`

### 5. Kiểm tra kết quả

```sql
SELECT * FROM core.payments ORDER BY created_at DESC LIMIT 1;
```

Status sẽ là `success` ✅

---

## 📱 Sử dụng trong Frontend

```tsx
import { PaymentButton } from '../components/payment/PaymentButton';

<PaymentButton
  amount={99000}
  description="Thanh toán gói Premium"
>
  Thanh toán ngay
</PaymentButton>
```

Hoặc truy cập: http://localhost:3000/payment

---

## 🔧 Troubleshooting nhanh

**Lỗi "Invalid token"**
→ Đăng nhập lại và lấy token mới

**Callback không nhận được**
→ Dùng ngrok: `ngrok http 8000`
→ Cập nhật `ZALOPAY_CALLBACK_URL=https://xxx.ngrok.io/api/payment/callback`

**Database error**
→ Kiểm tra PostgreSQL đang chạy: `pg_isready`

---

## 📚 Đọc thêm

- [Hướng dẫn chi tiết](./ZALOPAY_STEP_BY_STEP.md)
- [Tài liệu đầy đủ](./ZALOPAY_INTEGRATION.md)
- [ZaloPay Docs](https://docs.zalopay.vn/)

---

**Xong! Giờ bạn có thể nhận thanh toán qua ZaloPay 🎉**
