# 💳 Hướng dẫn sử dụng thanh toán ZaloPay

## ✅ Đã tích hợp xong!

Hệ thống thanh toán ZaloPay đã được tích hợp đầy đủ vào ứng dụng.

## 🚀 Cách sử dụng

### 1. Truy cập trang test thanh toán

Mở trình duyệt và truy cập:

```
http://localhost:3000/test-payment
```

### 2. Hoặc từ trang Pricing

```
http://localhost:3000/pricing
```

Click vào nút "Choose Plan" của bất kỳ gói nào (Professional hoặc Enterprise)

### 3. Thanh toán

Khi click nút thanh toán, hệ thống sẽ:
1. Tạo đơn hàng trong database
2. Gọi ZaloPay API
3. Redirect bạn đến trang thanh toán ZaloPay

### 4. Thông tin test (Sandbox)

Trên trang ZaloPay, nhập:
- **Số điện thoại**: `0123456789`
- **OTP**: `123456`
- **PIN**: `111111`

### 5. Kiểm tra kết quả

Sau khi thanh toán, kiểm tra trong database:

```sql
SELECT * FROM core.payments ORDER BY created_at DESC LIMIT 5;
```

Hoặc xem lịch sử thanh toán tại:
```
http://localhost:3000/payment
```

## 📍 Các trang có sẵn

| URL | Mô tả |
|-----|-------|
| `/test-payment` | Trang test thanh toán đơn giản |
| `/payment` | Trang thanh toán đầy đủ + lịch sử |
| `/pricing` | Trang pricing với nút thanh toán |

## 🔧 Kiểm tra Backend API

Truy cập Swagger UI:
```
http://localhost:8000/docs
```

Tìm các endpoint:
- `POST /api/payment/create` - Tạo thanh toán
- `GET /api/payment/history` - Lịch sử thanh toán
- `GET /api/payment/query/{order_id}` - Truy vấn trạng thái
- `POST /api/payment/callback` - Callback từ ZaloPay

## 🐛 Troubleshooting

### Lỗi "Invalid token"
→ Đăng nhập lại để lấy token mới

### Không thấy trang thanh toán
→ Kiểm tra đã đăng nhập chưa (trang yêu cầu authentication)

### Backend không có payment API
→ Kiểm tra log backend, tìm dòng "Skip payment router"
→ Nếu có lỗi, xem file `doc/ZALOPAY_STEP_BY_STEP.md`

### Callback không nhận được
→ Dùng ngrok để expose local: `ngrok http 8000`
→ Cập nhật `ZALOPAY_CALLBACK_URL` trong `.env`

## 📚 Tài liệu chi tiết

- [Quick Start](doc/ZALOPAY_QUICKSTART.md) - Bắt đầu nhanh 5 phút
- [Step by Step](doc/ZALOPAY_STEP_BY_STEP.md) - Hướng dẫn từng bước
- [Integration Guide](doc/ZALOPAY_INTEGRATION.md) - Tài liệu kỹ thuật
- [README](doc/ZALOPAY_README.md) - Tổng quan

## ✨ Tính năng đã có

- ✅ Tạo đơn thanh toán
- ✅ Redirect đến ZaloPay
- ✅ Xử lý callback
- ✅ Verify MAC signature
- ✅ Lưu lịch sử thanh toán
- ✅ Truy vấn trạng thái
- ✅ UI/UX hoàn chỉnh
- ✅ Test page đơn giản
- ✅ Integration với Pricing page

## 🎯 Next Steps

1. Test thanh toán tại `/test-payment`
2. Kiểm tra database có record không
3. Test callback (cần ngrok cho local)
4. Đọc tài liệu để hiểu rõ hơn
5. Lên production khi sẵn sàng

---

**Chúc bạn test thành công! 🚀**
