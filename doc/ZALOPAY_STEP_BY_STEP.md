# Hướng dẫn từng bước tích hợp ZaloPay

## 📋 Mục lục

1. [Chuẩn bị](#1-chuẩn-bị)
2. [Cấu hình Backend](#2-cấu-hình-backend)
3. [Tạo Database](#3-tạo-database)
4. [Cấu hình Frontend](#4-cấu-hình-frontend)
5. [Test thanh toán](#5-test-thanh-toán)
6. [Xử lý callback](#6-xử-lý-callback)
7. [Lên Production](#7-lên-production)

---

## 1. Chuẩn bị

### 1.1. Đăng ký tài khoản ZaloPay

**Môi trường Sandbox (Test):**
- Không cần đăng ký
- Sử dụng thông tin test có sẵn:
  - App ID: `2553`
  - Key1: `PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL`
  - Key2: `kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz`

**Môi trường Production:**
1. Truy cập: https://business.zalopay.vn/
2. Đăng ký tài khoản doanh nghiệp
3. Hoàn tất xác minh (CMND/CCCD, giấy phép kinh doanh)
4. Lấy thông tin:
   - App ID
   - Key1 (dùng để tạo MAC khi gọi API)
   - Key2 (dùng để verify MAC từ callback)

### 1.2. Kiểm tra môi trường

```bash
# Kiểm tra Python
python --version  # >= 3.11

# Kiểm tra Node.js
node --version    # >= 18

# Kiểm tra PostgreSQL
psql --version    # >= 13
```

---

## 2. Cấu hình Backend

### 2.1. Thêm biến môi trường

Tạo/cập nhật file `apps/backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai

# ZaloPay Sandbox
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback

# JWT
JWT_SECRET_KEY=your-secret-key-change-me

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### 2.2. Cài đặt dependencies

```bash
cd apps/backend

# Nếu dùng uv (khuyến nghị)
uv pip install requests loguru

# Hoặc dùng pip
pip install requests loguru
```

### 2.3. Kiểm tra module đã load

Khởi động backend:

```bash
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
```

Kiểm tra log, không có lỗi "Skip payment router" là OK.

Truy cập: http://localhost:8000/docs

Tìm các endpoint:
- `POST /api/payment/create`
- `POST /api/payment/callback`
- `GET /api/payment/query/{order_id}`
- `GET /api/payment/history`

---

## 3. Tạo Database

### 3.1. Chạy migration

**Cách 1: Dùng psql trực tiếp**

```bash
psql -U postgres -d career_ai -f db/init/003_payments.sql
```

**Cách 2: Dùng Docker**

```bash
docker exec -i careerai_postgres psql -U postgres -d career_ai < db/init/003_payments.sql
```

**Cách 3: Chạy SQL thủ công**

Kết nối database và chạy:

```sql
CREATE TABLE IF NOT EXISTS core.payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    app_trans_id VARCHAR(100) UNIQUE,
    amount INTEGER NOT NULL,
    description TEXT,
    payment_method VARCHAR(20) DEFAULT 'zalopay',
    status VARCHAR(20) DEFAULT 'pending',
    zp_trans_token VARCHAR(255),
    order_url TEXT,
    callback_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON core.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON core.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON core.payments(status);
```

### 3.2. Kiểm tra bảng đã tạo

```sql
\dt core.payments
SELECT * FROM core.payments LIMIT 1;
```

---

## 4. Cấu hình Frontend

### 4.1. Cài đặt dependencies

```bash
cd apps/frontend
npm install axios
```

### 4.2. Cấu hình API base URL

Tạo/cập nhật file `apps/frontend/.env`:

```bash
VITE_API_BASE=http://localhost:8000
```

### 4.3. Thêm route thanh toán

Cập nhật file router (ví dụ: `src/App.tsx` hoặc `src/router.tsx`):

```tsx
import { PaymentPage } from './pages/PaymentPage';

// Trong routes
<Route path="/payment" element={<PaymentPage />} />
```

### 4.4. Khởi động frontend

```bash
cd apps/frontend
npm run dev
```

Truy cập: http://localhost:3000/payment

---

## 5. Test thanh toán

### 5.1. Đăng nhập và lấy token

1. Truy cập: http://localhost:3000
2. Đăng nhập với tài khoản
3. Mở DevTools (F12) → Console
4. Chạy: `localStorage.getItem('token')`
5. Copy token

### 5.2. Test qua Swagger UI

1. Truy cập: http://localhost:8000/docs
2. Click nút **Authorize** ở góc trên
3. Nhập: `Bearer YOUR_TOKEN_HERE`
4. Click **Authorize**

5. Tìm endpoint `POST /api/payment/create`
6. Click **Try it out**
7. Nhập request body:

```json
{
  "amount": 50000,
  "description": "Test thanh toán gói Premium",
  "payment_method": "zalopay"
}
```

8. Click **Execute**

9. Kết quả mong đợi:

```json
{
  "success": true,
  "order_id": "ORDER_123_1701234567",
  "order_url": "https://sbgateway.zalopay.vn/order/..."
}
```

### 5.3. Test qua Frontend

1. Truy cập: http://localhost:3000/payment
2. Chọn một gói (Basic/Premium/Enterprise)
3. Click **Chọn gói này**
4. Hệ thống sẽ redirect đến trang thanh toán ZaloPay

### 5.4. Thanh toán trên ZaloPay Sandbox

**Thông tin test:**

- **Số điện thoại**: 0123456789
- **OTP**: 123456
- **Mã PIN**: 111111

**Các bước:**

1. Nhập số điện thoại: `0123456789`
2. Click **Tiếp tục**
3. Nhập OTP: `123456`
4. Nhập PIN: `111111`
5. Xác nhận thanh toán

### 5.5. Kiểm tra kết quả

**Trong database:**

```sql
SELECT * FROM core.payments ORDER BY created_at DESC LIMIT 5;
```

Status sẽ chuyển từ `pending` → `success`

**Qua API:**

```bash
curl http://localhost:8000/api/payment/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. Xử lý callback

### 6.1. Callback flow

```
User thanh toán → ZaloPay xử lý → ZaloPay gọi callback URL
                                          ↓
                              POST /api/payment/callback
                                          ↓
                              Verify MAC với Key2
                                          ↓
                              Cập nhật status = success
                                          ↓
                              Return {"return_code": 1}
```

### 6.2. Test callback local với ngrok

**Vấn đề:** ZaloPay không thể gọi callback đến `localhost`

**Giải pháp:** Dùng ngrok để expose local server

```bash
# Cài ngrok
# Windows: choco install ngrok
# Mac: brew install ngrok
# Linux: snap install ngrok

# Chạy ngrok
ngrok http 8000
```

Kết quả:

```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

**Cập nhật callback URL:**

```bash
# Trong .env
ZALOPAY_CALLBACK_URL=https://abc123.ngrok.io/api/payment/callback
```

**Restart backend** để áp dụng thay đổi.

### 6.3. Kiểm tra callback log

Sau khi thanh toán, kiểm tra log backend:

```
INFO: ZaloPay callback received: {...}
INFO: Payment ORDER_XXX marked as SUCCESS
```

### 6.4. Test callback thủ công

```bash
# Tạo test callback data
curl -X POST http://localhost:8000/api/payment/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "data={...}&mac={...}&type=1"
```

---

## 7. Lên Production

### 7.1. Đăng ký ZaloPay Business

1. Truy cập: https://business.zalopay.vn/
2. Đăng ký và xác minh
3. Lấy thông tin production:
   - App ID
   - Key1
   - Key2

### 7.2. Cập nhật environment variables

```bash
# Production .env
ZALOPAY_APP_ID=YOUR_PRODUCTION_APP_ID
ZALOPAY_KEY1=YOUR_PRODUCTION_KEY1
ZALOPAY_KEY2=YOUR_PRODUCTION_KEY2
ZALOPAY_ENDPOINT=https://openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=https://yourdomain.com/api/payment/callback
```

### 7.3. Setup HTTPS

**Bắt buộc:** Callback URL phải dùng HTTPS

**Các cách:**

1. **Nginx + Let's Encrypt**

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location /api/payment/callback {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **Cloudflare** (tự động HTTPS)

3. **AWS ALB/ELB** với SSL certificate

### 7.4. Whitelist IP (nếu cần)

ZaloPay có thể yêu cầu whitelist IP callback server.

Liên hệ support@zalopay.vn để được hỗ trợ.

### 7.5. Monitoring & Logging

**Setup logging:**

```python
# Trong zalopay_service.py
logger.add(
    "logs/payment_{time}.log",
    rotation="1 day",
    retention="30 days",
    level="INFO"
)
```

**Setup alerting:**

- Sentry cho error tracking
- Slack/Email notification cho payment failed
- Dashboard để monitor payment success rate

### 7.6. Backup & Recovery

```bash
# Backup database hàng ngày
pg_dump -U postgres career_ai > backup_$(date +%Y%m%d).sql

# Hoặc dùng cron
0 2 * * * pg_dump -U postgres career_ai > /backups/career_ai_$(date +\%Y\%m\%d).sql
```

---

## 🔍 Troubleshooting

### Lỗi: "Invalid MAC"

**Nguyên nhân:** Key2 không đúng hoặc data format sai

**Giải pháp:**
1. Kiểm tra `ZALOPAY_KEY2` trong .env
2. Kiểm tra log để xem data nhận được
3. Verify MAC computation

### Lỗi: "Payment not found"

**Nguyên nhân:** app_trans_id không khớp

**Giải pháp:**
1. Kiểm tra database có record không
2. Kiểm tra app_trans_id format
3. Xem log callback data

### Lỗi: "Token expired"

**Nguyên nhân:** JWT token hết hạn

**Giải pháp:**
1. Đăng nhập lại
2. Lấy token mới
3. Tăng JWT expiry time trong config

### Callback không nhận được

**Nguyên nhân:** URL không accessible

**Giải pháp:**
1. Dùng ngrok cho local test
2. Kiểm tra firewall
3. Verify HTTPS certificate
4. Check ZaloPay IP whitelist

### Database connection error

**Nguyên nhân:** PostgreSQL không chạy hoặc config sai

**Giải pháp:**
1. Kiểm tra PostgreSQL: `pg_isready`
2. Verify DATABASE_URL
3. Check user permissions

---

## 📚 Tài liệu tham khảo

- [ZaloPay API Documentation](https://docs.zalopay.vn/)
- [ZaloPay Sandbox](https://sbgateway.zalopay.vn/)
- [ZaloPay Business](https://business.zalopay.vn/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

---

## 💡 Tips & Best Practices

### 1. Security

- ✅ Luôn verify MAC từ callback
- ✅ Dùng HTTPS cho production
- ✅ Không log sensitive data (Key1, Key2)
- ✅ Validate amount > 0
- ✅ Rate limiting cho API

### 2. Performance

- ✅ Index database columns (user_id, order_id, status)
- ✅ Cache payment status (Redis)
- ✅ Async processing cho callback
- ✅ Connection pooling

### 3. User Experience

- ✅ Loading state khi tạo payment
- ✅ Error handling với message rõ ràng
- ✅ Redirect về trang kết quả sau thanh toán
- ✅ Email notification khi thanh toán thành công
- ✅ Retry mechanism cho failed payments

### 4. Testing

- ✅ Unit tests cho ZaloPay service
- ✅ Integration tests cho payment flow
- ✅ Mock ZaloPay API trong tests
- ✅ Test callback với different scenarios

### 5. Monitoring

- ✅ Track payment success rate
- ✅ Monitor callback response time
- ✅ Alert on payment failures
- ✅ Dashboard cho revenue metrics

---

## 🎯 Checklist triển khai

### Development
- [ ] Cài đặt dependencies
- [ ] Tạo database tables
- [ ] Cấu hình .env
- [ ] Test create payment
- [ ] Test callback với ngrok
- [ ] Test query payment status
- [ ] Test payment history

### Staging
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Setup HTTPS
- [ ] Test với ZaloPay sandbox
- [ ] Verify callback hoạt động
- [ ] Load testing

### Production
- [ ] Đăng ký ZaloPay Business
- [ ] Lấy production credentials
- [ ] Cập nhật environment variables
- [ ] Setup monitoring & alerting
- [ ] Backup strategy
- [ ] Go live!

---

## 📞 Support

Nếu gặp vấn đề:

1. **ZaloPay Support:**
   - Email: support@zalopay.vn
   - Hotline: 1900 5555 77

2. **Documentation:**
   - [ZALOPAY_INTEGRATION.md](./ZALOPAY_INTEGRATION.md)
   - [Payment Module README](../apps/backend/app/modules/payment/README.md)

3. **Community:**
   - ZaloPay Developer Group
   - Stack Overflow

---

**Chúc bạn tích hợp thành công! 🚀**
