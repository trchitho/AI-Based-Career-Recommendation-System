# 💳 Hệ thống thanh toán VNPay/Momo - Career AI

## 🎯 Tính năng đã triển khai

### 1. Giới hạn xem nghề nghiệp
- ✅ Người dùng miễn phí chỉ xem được **1 nghề nghiệp** đầu tiên
- ✅ Các nghề còn lại hiển thị prompt yêu cầu nâng cấp
- ✅ Người dùng premium xem được tất cả nghề nghiệp

### 2. Giới hạn làm test
- ✅ Mỗi tháng có **5 lần làm test miễn phí**
- ✅ Hết quota hiển thị thông báo yêu cầu nâng cấp
- ✅ Người dùng premium làm test **không giới hạn**
- ✅ Quota reset tự động đầu tháng

### 3. Giới hạn roadmap
- ✅ Người dùng miễn phí chỉ xem được **Level 1**
- ✅ Level 2-6 bị blur và có overlay yêu cầu nâng cấp
- ✅ Người dùng premium xem được **tất cả 6 levels**

### 4. Thanh toán
- ✅ Tích hợp **VNPay** (ATM, Visa, MasterCard)
- ✅ Tích hợp **Momo** (Ví điện tử)
- ✅ 4 gói dịch vụ: 1 tháng, 3 tháng, 6 tháng, 1 năm
- ✅ Callback xử lý kết quả thanh toán
- ✅ Tự động kích hoạt subscription sau thanh toán

---

## 📁 Cấu trúc file đã tạo

### Backend:
```
test/apps/backend/app/
├── modules/payment/
│   ├── __init__.py
│   ├── models.py                    # Database models
│   ├── schemas.py                   # Pydantic schemas
│   ├── service.py                   # Business logic
│   └── routes_payment.py            # API endpoints
├── core/
│   └── config.py                    # Cập nhật với VNPay/Momo config
└── main.py                          # Đã thêm payment router

test/db/init/
└── 003_payment_system.sql           # Database schema + functions
```

### Frontend:
```
test/apps/frontend/src/
├── services/
│   └── paymentService.ts            # Payment API client
├── components/payment/
│   ├── PricingModal.tsx             # Modal chọn gói và thanh toán
│   └── UpgradePrompt.tsx            # Component yêu cầu nâng cấp
└── pages/
    └── PaymentCallback.tsx          # Trang xử lý callback
```

### Documentation:
```
test/
├── PAYMENT_INTEGRATION_GUIDE.md     # Hướng dẫn chi tiết
└── PAYMENT_SYSTEM_README.md         # File này
```

---

## 🚀 Quick Start

### 1. Setup Database:

```bash
# Kết nối PostgreSQL
psql -U postgres -d career_ai

# Chạy migration
\i test/db/init/003_payment_system.sql
```

### 2. Cấu hình Backend:

```bash
# Cập nhật file .env
cd test/apps/backend
nano .env
```

Thêm vào `.env`:
```env
# VNPay
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# Momo
MOMO_PARTNER_CODE=YOUR_PARTNER_CODE
MOMO_ACCESS_KEY=YOUR_ACCESS_KEY
MOMO_SECRET_KEY=YOUR_SECRET_KEY
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
```

### 3. Khởi động Backend:

```bash
cd test/apps/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Khởi động Frontend:

```bash
cd test/apps/frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints

### Public Endpoints:
```
GET  /api/payment/plans              # Lấy danh sách gói dịch vụ
```

### Protected Endpoints (Cần token):
```
GET  /api/payment/permissions        # Lấy quyền của user
GET  /api/payment/subscription       # Lấy subscription hiện tại
POST /api/payment/create             # Tạo thanh toán
POST /api/payment/check-test-quota   # Kiểm tra quota test
POST /api/payment/increment-test-count # Tăng số lần test
```

### Callback Endpoints:
```
GET  /api/payment/callback/vnpay     # Callback từ VNPay
POST /api/payment/callback/momo      # Callback từ Momo
```

---

## 💡 Cách sử dụng trong code

### Kiểm tra quyền xem nghề nghiệp:

```tsx
const permissions = await paymentService.getUserPermissions();

careers.map((career, index) => {
  const canView = paymentService.canViewCareer(index, permissions);
  
  if (!canView) {
    return <UpgradePrompt message="Nâng cấp để xem thêm" />;
  }
  
  return <CareerCard career={career} />;
});
```

### Kiểm tra quota test:

```tsx
const handleStartTest = async () => {
  try {
    await paymentService.checkTestQuota();
    // Cho phép làm test
    startTest();
  } catch (error) {
    // Hết quota, hiển thị pricing modal
    setShowPricing(true);
  }
};
```

### Kiểm tra quyền xem roadmap:

```tsx
const canViewLevel = paymentService.canViewRoadmapLevel(level, permissions);

if (!canViewLevel) {
  return (
    <div className="relative">
      <div className="blur-sm"><LevelContent /></div>
      <UpgradePrompt variant="overlay" />
    </div>
  );
}
```

---

## 🧪 Testing

### Test với VNPay Sandbox:
- Thẻ test: `9704198526191432198`
- OTP: `123456`

### Test với Momo:
- SĐT: `0963181714`
- OTP: `111111`

### Test flow:
1. Đăng nhập vào hệ thống
2. Truy cập trang có giới hạn (Results/Assessment/Roadmap)
3. Click "Nâng cấp"
4. Chọn gói và phương thức thanh toán
5. Thanh toán với thông tin test
6. Kiểm tra callback và kích hoạt subscription

---

## 📊 Database Functions

Hệ thống cung cấp các PostgreSQL functions:

```sql
-- Kiểm tra user có subscription active
SELECT core.check_user_has_active_subscription(user_id);

-- Kiểm tra user còn quota test
SELECT core.check_user_test_quota(user_id);

-- Tăng số lần làm test
SELECT core.increment_user_test_count(user_id);

-- Lấy tất cả quyền của user
SELECT core.get_user_permissions(user_id);
```

---

## 🎨 UI Components

### PricingModal
Modal hiển thị các gói dịch vụ và xử lý thanh toán.

**Props:**
- `isOpen: boolean` - Hiển thị/ẩn modal
- `onClose: () => void` - Callback khi đóng
- `reason?: 'careers' | 'tests' | 'roadmap'` - Lý do hiển thị

### UpgradePrompt
Component yêu cầu nâng cấp với 3 variants.

**Props:**
- `message: string` - Thông báo hiển thị
- `onUpgrade: () => void` - Callback khi click nâng cấp
- `variant?: 'card' | 'banner' | 'overlay'` - Kiểu hiển thị

---

## 🔐 Security

- ✅ Verify signature từ payment gateway
- ✅ JWT authentication cho API
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ CORS configuration
- ✅ Environment variables cho credentials

---

## 📈 Monitoring

Các metrics cần theo dõi:
- Số lượng subscription mới/ngày
- Conversion rate (free → paid)
- Số lần làm test/user
- Revenue theo gói
- Failed payments

---

## 🐛 Troubleshooting

### Lỗi "Plan not found":
- Kiểm tra database đã seed plans chưa
- Chạy lại migration file

### Lỗi "Payment creation failed":
- Kiểm tra VNPay/Momo credentials
- Kiểm tra network connection
- Xem logs backend

### Callback không hoạt động:
- Kiểm tra return_url có đúng không
- Kiểm tra CORS settings
- Verify signature có đúng không

---

## 📞 Next Steps

1. **Tích hợp vào UI:**
   - Thêm PricingModal vào Results page
   - Thêm check quota vào Assessment page
   - Thêm giới hạn level vào Roadmap page

2. **Testing:**
   - Test với VNPay sandbox
   - Test với Momo test account
   - Test edge cases (expired subscription, etc.)

3. **Production:**
   - Đăng ký VNPay production account
   - Đăng ký Momo production account
   - Update credentials trong production env

4. **Enhancements:**
   - Email notification khi subscription sắp hết
   - Dashboard quản lý subscription
   - Analytics tracking
   - Refund flow

---

## 📚 Documentation

Xem thêm chi tiết tại: [PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md)
