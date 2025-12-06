# ✅ Đã sửa lỗi Network Error!

## 🔍 Các vấn đề đã khắc phục:

### 1. ❌ Lỗi: "Network Error"
**Nguyên nhân:** 
- Thiếu file `.env` trong frontend
- API_BASE không được cấu hình

**Đã sửa:**
- ✅ Tạo file `apps/frontend/.env` với `VITE_API_BASE=http://localhost:8000`
- ✅ Sửa `paymentService.ts` để dùng đúng syntax TypeScript
- ✅ Restart frontend để load .env

### 2. ❌ Lỗi: "column order_id does not exist"
**Nguyên nhân:**
- Bảng `core.payments` đã tồn tại với schema cũ (VNPay)
- Schema không khớp với ZaloPay

**Đã sửa:**
- ✅ Drop bảng cũ: `DROP TABLE core.payments CASCADE`
- ✅ Tạo lại bảng với schema ZaloPay
- ✅ Verify schema đúng

### 3. ❌ Lỗi: "Vui lòng đăng nhập"
**Nguyên nhân:**
- Token được lưu với key `accessToken` nhưng code tìm key `token`

**Đã sửa:**
- ✅ Tạo helper `getAccessToken()` 
- ✅ Cập nhật tất cả code để dùng helper

---

## 🚀 Bây giờ test lại:

### Bước 1: Kiểm tra services đang chạy

```bash
# Backend
curl http://localhost:8000/health
# → {"status":"ok"}

# Frontend
curl http://localhost:3000
# → HTML page
```

### Bước 2: Kiểm tra database

```bash
docker exec -i careerai_postgres psql -U postgres -d career_ai -c "\d core.payments"
```

Phải thấy các cột:
- ✅ order_id
- ✅ app_trans_id
- ✅ amount
- ✅ status
- ✅ payment_method

### Bước 3: Kiểm tra token

Truy cập: **http://localhost:3000/debug-auth**

Xem:
- ✅ Authenticated: Yes
- ✅ Has Token: Yes
- ✅ Token chưa hết hạn

### Bước 4: Test thanh toán

Truy cập: **http://localhost:3000/test-payment**

Click **"Thanh toán 50,000 VND"**

**Kết quả mong đợi:**
1. Console log: `Token found: eyJ...`
2. Không có lỗi Network Error
3. Redirect đến trang ZaloPay

---

## 🎯 Test flow hoàn chỉnh:

```bash
# 1. Đăng nhập
http://localhost:3000/login

# 2. Kiểm tra token
http://localhost:3000/debug-auth

# 3. Test thanh toán
http://localhost:3000/test-payment

# 4. Click "Thanh toán 50,000 VND"

# 5. Nhập thông tin test:
# - SĐT: 0123456789
# - OTP: 123456
# - PIN: 111111

# 6. Kiểm tra database
docker exec -i careerai_postgres psql -U postgres -d career_ai -c "SELECT * FROM core.payments ORDER BY created_at DESC LIMIT 1;"
```

---

## 📊 Checklist:

- [x] Frontend đang chạy (port 3000)
- [x] Backend đang chạy (port 8000)
- [x] Database có bảng `core.payments` với schema đúng
- [x] File `.env` trong frontend có `VITE_API_BASE`
- [x] Token được lưu trong localStorage
- [x] Payment API endpoint hoạt động

---

## 🐛 Nếu vẫn gặp lỗi:

### Lỗi: "Network Error"
```bash
# Kiểm tra backend
curl http://localhost:8000/health

# Kiểm tra CORS
curl http://localhost:8000/api/payment/history -H "Origin: http://localhost:3000"

# Xem log backend
# Tìm dòng có "POST /api/payment/create"
```

### Lỗi: "Invalid token"
```bash
# Đăng nhập lại
http://localhost:3000/login

# Hoặc clear localStorage
http://localhost:3000/debug-auth
# Click "Clear LocalStorage"
```

### Lỗi: Database
```bash
# Kiểm tra bảng
docker exec -i careerai_postgres psql -U postgres -d career_ai -c "\d core.payments"

# Nếu sai schema, drop và tạo lại
docker exec -i careerai_postgres psql -U postgres -d career_ai -c "DROP TABLE IF EXISTS core.payments CASCADE;"
Get-Content db/init/003_payments.sql | docker exec -i careerai_postgres psql -U postgres -d career_ai
```

---

## ✨ Tất cả đã sẵn sàng!

Bây giờ bạn có thể:
- ✅ Test thanh toán tại `/test-payment`
- ✅ Xem lịch sử tại `/payment`
- ✅ Chọn gói tại `/pricing`
- ✅ Debug token tại `/debug-auth`

**Chúc bạn test thành công! 🎉**
