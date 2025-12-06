# 🐛 Debug Payment Issues

## Vấn đề: "Vui lòng đăng nhập để thanh toán"

### ✅ Đã sửa!

Vấn đề là token được lưu với key `accessToken` nhưng code thanh toán đang tìm key `token`.

### 🔧 Các thay đổi đã thực hiện:

1. ✅ Tạo helper function `getAccessToken()` trong `apps/frontend/src/utils/auth.ts`
2. ✅ Cập nhật `PaymentButton.tsx` để dùng helper
3. ✅ Cập nhật `PaymentPage.tsx` để dùng helper
4. ✅ Thêm logging để debug
5. ✅ Tạo trang `/debug-auth` để kiểm tra token

### 📍 Cách kiểm tra:

#### 1. Kiểm tra token trong browser

Mở DevTools (F12) → Console, chạy:

```javascript
// Kiểm tra token
console.log('accessToken:', localStorage.getItem('accessToken'));
console.log('token:', localStorage.getItem('token'));

// Decode token
const token = localStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

#### 2. Truy cập trang debug

```
http://localhost:3000/debug-auth
```

Trang này sẽ hiển thị:
- ✅ Auth status
- ✅ User info
- ✅ Token info (decoded)
- ✅ LocalStorage keys
- ✅ Token expiry

#### 3. Test thanh toán

```
http://localhost:3000/test-payment
```

Click nút thanh toán và xem console log:
- Nếu thấy "Token found: ..." → Token OK
- Nếu thấy lỗi "Vui lòng đăng nhập" → Token không tồn tại

### 🔍 Các bước debug:

#### Bước 1: Kiểm tra đã đăng nhập chưa

```
http://localhost:3000/debug-auth
```

Xem:
- "Authenticated" phải là ✅ Yes
- "Has Token" phải là ✅ Yes

#### Bước 2: Kiểm tra token hợp lệ

Trong trang debug, xem phần "Token Info":
- Token phải tồn tại
- Expires phải chưa hết hạn

#### Bước 3: Test thanh toán

```
http://localhost:3000/test-payment
```

Click "Thanh toán 50,000 VND"

Mở DevTools → Console, xem log:
```
Token found: eyJhbGciOiJIUzI1NiI...
```

Nếu thấy log này → Token OK, thanh toán sẽ hoạt động

#### Bước 4: Kiểm tra API response

Nếu vẫn lỗi, xem Network tab trong DevTools:
- Tìm request `POST /api/payment/create`
- Xem Response:
  - Status 401 → Token không hợp lệ
  - Status 200 → Thành công

### 🛠️ Các giải pháp:

#### Giải pháp 1: Đăng nhập lại

Nếu token hết hạn:
1. Logout
2. Login lại
3. Test thanh toán

#### Giải pháp 2: Clear localStorage

Nếu token bị lỗi:
1. Truy cập `/debug-auth`
2. Click "Clear LocalStorage"
3. Login lại

#### Giải pháp 3: Kiểm tra backend

Nếu vẫn lỗi, kiểm tra backend log:

```bash
# Xem log backend
# Tìm dòng có "POST /api/payment/create"
```

Nếu thấy lỗi "Invalid token" → JWT secret không khớp

### 📊 Checklist debug:

- [ ] Đã đăng nhập vào ứng dụng
- [ ] Token tồn tại trong localStorage (key: `accessToken`)
- [ ] Token chưa hết hạn
- [ ] Backend đang chạy (http://localhost:8000)
- [ ] Frontend đang chạy (http://localhost:3000)
- [ ] Database có bảng `core.payments`
- [ ] Đã test tại `/debug-auth`
- [ ] Console không có lỗi

### 🎯 Test flow hoàn chỉnh:

```bash
# 1. Kiểm tra services đang chạy
curl http://localhost:8000/health
curl http://localhost:3000

# 2. Đăng nhập
# Truy cập: http://localhost:3000/login
# Login với tài khoản

# 3. Kiểm tra token
# Truy cập: http://localhost:3000/debug-auth
# Xem token có hợp lệ không

# 4. Test thanh toán
# Truy cập: http://localhost:3000/test-payment
# Click "Thanh toán 50,000 VND"

# 5. Kiểm tra database
psql -U postgres -d career_ai -c "SELECT * FROM core.payments ORDER BY created_at DESC LIMIT 1;"
```

### 💡 Tips:

1. **Luôn kiểm tra Console log** - Mọi lỗi đều được log ra console
2. **Dùng Network tab** - Xem request/response chi tiết
3. **Kiểm tra token expiry** - Token có thể hết hạn
4. **Test với curl** - Bypass frontend để test backend trực tiếp

### 🔗 Links hữu ích:

- Debug Auth: http://localhost:3000/debug-auth
- Test Payment: http://localhost:3000/test-payment
- Payment Page: http://localhost:3000/payment
- Pricing Page: http://localhost:3000/pricing
- Backend Docs: http://localhost:8000/docs

---

**Nếu vẫn gặp vấn đề, hãy:**
1. Chụp màn hình trang `/debug-auth`
2. Copy console log
3. Copy network request/response
4. Gửi cho team để hỗ trợ
