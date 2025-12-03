# 🛒 Checkout Page Guide

## 📋 Tổng quan

Đã tạo trang thanh toán riêng biệt với URL ngrok domain để xử lý payment callbacks.

## 🎯 Flow mới

```
1. User: http://localhost:3000/pricing
   ↓
2. Chọn gói → Click "Chọn gói này"
   ↓
3. Redirect → http://localhost:3000/checkout?plan=1
   ↓
4. Chọn phương thức thanh toán (VNPay/Momo)
   ↓
5. Click "Thanh toán"
   ↓
6. Backend tạo payment URL với return_url = ngrok domain
   ↓
7. Redirect → VNPay/Momo gateway
   ↓
8. User thanh toán
   ↓
9. Gateway callback → https://madonna-unpreposterous-unnationally.ngrok-free.dev/payment/callback
   ↓
10. Backend xử lý callback
   ↓
11. Redirect → http://localhost:3000/payment/callback
```

## 🆕 Files Created

### 1. CheckoutPage.tsx
Trang thanh toán độc lập với:
- ✅ Thông tin đơn hàng
- ✅ Chọn phương thức thanh toán (VNPay/Momo)
- ✅ Tổng cộng và features
- ✅ Security notice
- ✅ Payment button

### 2. Updated PricingPage.tsx
- ✅ Xóa payment method selection
- ✅ Button "Chọn gói này" thay vì "Mua ngay"
- ✅ Redirect đến /checkout?plan=ID

### 3. Updated App.tsx
- ✅ Thêm route /checkout

## 🌐 URLs

### Pricing Page
```
http://localhost:3000/pricing
```
Hiển thị tất cả gói, user chọn gói

### Checkout Page
```
http://localhost:3000/checkout?plan=1
```
Trang thanh toán với plan ID

### Payment Callback (Ngrok)
```
https://madonna-unpreposterous-unnationally.ngrok-free.dev/payment/callback
```
Nhận callback từ VNPay/Momo

### Payment Callback (Frontend)
```
http://localhost:3000/payment/callback
```
Hiển thị kết quả cho user

## 🎨 Checkout Page Features

### Left Column: Order Summary
- Tên gói
- Mô tả
- Thời hạn
- Tổng cộng (VND format)
- Danh sách features

### Right Column: Payment Method
- Radio buttons cho VNPay/Momo
- Icons và descriptions
- Security notice
- Payment button với loading state

## 🔧 Configuration

### Return URL trong CheckoutPage
```typescript
const returnUrl = `https://madonna-unpreposterous-unnationally.ngrok-free.dev/payment/callback`;
```

Ngrok domain được hardcode để đảm bảo callback hoạt động.

## 🧪 Test Flow

### 1. Start Services
```bash
# Terminal 1: Ngrok
ngrok http 8000 --domain=madonna-unpreposterous-unnationally.ngrok-free.dev

# Terminal 2: Backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd apps/frontend
npm run dev
```

### 2. Test Pricing Page
```
http://localhost:3000/pricing
```
- Xem tất cả gói
- Click "Chọn gói này"

### 3. Test Checkout Page
```
http://localhost:3000/checkout?plan=1
```
- Xem thông tin đơn hàng
- Chọn VNPay hoặc Momo
- Click "Thanh toán"

### 4. Test Payment
- Nhập thông tin test card
- Hoàn tất thanh toán
- Xem callback

## 📊 URL Parameters

### Checkout Page
```
/checkout?plan=1    # Gói Cơ Bản
/checkout?plan=2    # Gói Tiết Kiệm
/checkout?plan=3    # Gói Premium
/checkout?plan=4    # Gói Đặc Biệt
```

## 🎯 Benefits

### 1. Separated Concerns
- Pricing page: Chỉ hiển thị gói
- Checkout page: Xử lý thanh toán

### 2. Better UX
- User có thời gian xem lại đơn hàng
- Chọn phương thức thanh toán riêng
- Clear call-to-action

### 3. Ngrok Integration
- Return URL sử dụng ngrok domain
- Callback từ gateway hoạt động đúng
- Không cần config phức tạp

## 🔐 Security

### Return URL
```typescript
// Hardcoded ngrok domain
const returnUrl = `https://madonna-unpreposterous-unnationally.ngrok-free.dev/payment/callback`;
```

### Payment Gateway
- VNPay: Signature verification
- Momo: HMAC SHA256
- SSL encryption

## 📱 Responsive Design

Checkout page responsive với:
- Mobile: 1 column (stack)
- Tablet: 1 column
- Desktop: 2 columns (side by side)

## 🎨 UI Components

### Payment Method Cards
```tsx
<div className="border-2 rounded-xl p-4">
  <CreditCard icon />
  <div>VNPay/Momo</div>
  <div>Description</div>
  <Check icon if selected />
</div>
```

### Payment Button
```tsx
<button className="bg-gradient-to-r from-purple-600 to-blue-600">
  <CreditCard icon />
  Thanh toán {formatVND(price)}
</button>
```

## 🐛 Troubleshooting

### Issue 1: Checkout page không load
**Giải pháp**: Kiểm tra plan ID trong URL

### Issue 2: Payment button không hoạt động
**Giải pháp**: Kiểm tra backend đang chạy

### Issue 3: Callback không nhận được
**Giải pháp**: 
- Kiểm tra ngrok đang chạy
- Verify return_url đúng

## 📝 Customization

### Change Return URL
```typescript
// In CheckoutPage.tsx
const returnUrl = `YOUR_DOMAIN/payment/callback`;
```

### Add More Payment Methods
```typescript
// Add new radio button
<label>
  <input type="radio" value="zalopay" />
  <div>ZaloPay</div>
</label>
```

### Customize Styling
```typescript
// Change gradient colors
className="bg-gradient-to-r from-green-600 to-teal-600"
```

## ✅ Checklist

- [x] CheckoutPage.tsx created
- [x] Route /checkout added
- [x] PricingPage updated
- [x] Return URL uses ngrok domain
- [x] Payment methods selectable
- [x] Responsive design
- [x] Loading states
- [x] Error handling

---

**Checkout Page Ready! 🛒**
