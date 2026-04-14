# Fix Lỗi Thanh Toán VNPay/ZaloPay

## Vấn đề
VNPay và ZaloPay sandbox không chấp nhận `localhost` URL cho return_url/callback_url.
Lỗi: "Không tìm thấy website" khi redirect về.

## Giải pháp

### Option 1: Sử dụng ngrok (Khuyến nghị cho test)

1. **Cài đặt ngrok:**
   ```bash
   # Download từ https://ngrok.com/download
   # Hoặc dùng chocolatey (Windows):
   choco install ngrok
   ```

2. **Chạy ngrok:**
   ```bash
   # Expose backend port 8000
   ngrok http 8000
   ```

3. **Copy URL từ ngrok** (ví dụ: `https://abc123.ngrok.io`)

4. **Cập nhật .env file:**
   ```env
   # Backend .env
   VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return
   ZALOPAY_CALLBACK_URL=https://abc123.ngrok.io/api/payment/callback
   ZALOPAY_REDIRECT_URL=https://abc123.ngrok.io/api/payment/redirect
   
   # Frontend URL (giữ nguyên localhost)
   FRONTEND_URL=http://localhost:3000
   ```

5. **Restart backend server**

### Option 2: Deploy lên server thực

1. Deploy backend lên Heroku/Railway/Render
2. Cập nhật return_url với domain thực
3. Đăng ký domain với VNPay/ZaloPay merchant portal

### Option 3: Sử dụng localtunnel (Alternative)

```bash
# Install
npm install -g localtunnel

# Run
lt --port 8000 --subdomain your-app-name

# Cập nhật .env với URL từ localtunnel
```

## Test Flow

1. Chạy ngrok: `ngrok http 8000`
2. Cập nhật .env với ngrok URL
3. Restart backend
4. Thử thanh toán lại
5. VNPay/ZaloPay sẽ redirect về ngrok URL → backend xử lý → redirect về frontend

## Lưu ý

- Ngrok free có giới hạn 40 connections/minute
- URL ngrok thay đổi mỗi lần restart (trừ khi dùng paid plan)
- Khi deploy production, dùng domain thực và đăng ký với payment gateway
