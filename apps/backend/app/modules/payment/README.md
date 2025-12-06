# Payment Module - ZaloPay Integration

## Tổng quan

Module thanh toán ZaloPay đã được tích hợp thành công vào hệ thống.

## Files

- `models.py` - SQLAlchemy models cho bảng payments
- `schemas.py` - Pydantic schemas cho request/response
- `zalopay_service.py` - Service xử lý ZaloPay API
- `routes_payment.py` - FastAPI routes

## API Endpoints

### 1. POST /api/payment/create
Tạo đơn thanh toán mới

**Request:**
```json
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

### 2. POST /api/payment/callback
Callback từ ZaloPay (không cần auth)

### 3. GET /api/payment/query/{order_id}
Truy vấn trạng thái thanh toán

### 4. GET /api/payment/history
Lấy lịch sử thanh toán (có phân trang)

## Environment Variables

```bash
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/payment/callback
```

## Database Migration

Chạy migration:
```bash
psql -U postgres -d career_ai -f db/init/003_payments.sql
```

## Testing

1. Truy cập http://localhost:8000/docs
2. Tìm endpoint `/api/payment/create`
3. Authorize với JWT token
4. Tạo payment request
5. Mở order_url để thanh toán

## Xem thêm

- [ZALOPAY_INTEGRATION.md](../../../../../doc/ZALOPAY_INTEGRATION.md) - Hướng dẫn chi tiết
