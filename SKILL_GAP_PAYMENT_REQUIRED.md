# ✅ Skill Gap Analysis - Yêu Cầu Thanh Toán

## Tóm Tắt
Đã thay đổi chức năng Skill Gap Analysis từ miễn phí thành yêu cầu gói trả phí (Basic/Premium/Pro).

## Thay Đổi

### 1. Backend - API Routes (`apps/backend/app/modules/skill_gap/routes.py`)

**Endpoint:** `POST /api/skill-gap/analyze`

**Thêm kiểm tra subscription:**
```python
# KIỂM TRA SUBSCRIPTION - YÊU CẦU GÓI TRẢ PHÍ
from app.core.subscription import SubscriptionService

subscription = SubscriptionService.get_user_subscription(user_id, db)
plan_name = subscription.get("plan_name", "Free")

# Chỉ cho phép Basic, Premium, Pro - KHÔNG cho phép Free
if plan_name == "Free":
    raise HTTPException(
        status_code=402,  # Payment Required
        detail={
            "error": "payment_required",
            "message": "Chức năng Phân tích Skill Gap yêu cầu gói trả phí",
            "message_en": "Skill Gap Analysis requires a paid subscription",
            "current_plan": "Free",
            "required_plans": ["Basic", "Premium", "Pro"],
            "upgrade_url": "/pricing",
            "features": {
                "Basic": "Phân tích CV cơ bản, 20 lần/tháng",
                "Premium": "Phân tích không giới hạn + Lộ trình học tập AI",
                "Pro": "Tất cả tính năng Premium + Xuất PDF + AI Assistant"
            }
        }
    )
```

**Lưu ý:**
- Endpoint `/test-analyze` vẫn miễn phí (dùng cho testing)
- Chỉ endpoint `/analyze` yêu cầu thanh toán

### 2. Frontend - CVUploadForm (`apps/frontend/src/components/skillgap/CVUploadForm.tsx`)

**Xử lý lỗi 402 (Payment Required):**
```typescript
catch (err: any) {
  // Check for payment required error (402)
  if (err.response?.status === 402) {
    const errorData = err.response?.data?.detail;
    
    if (errorData && typeof errorData === 'object') {
      // Structured error response
      setError(
        `🔒 ${errorData.message || 'Chức năng này yêu cầu gói trả phí'}\n\n` +
        `Gói hiện tại: ${errorData.current_plan || 'Free'}\n` +
        `Vui lòng nâng cấp lên: ${errorData.required_plans?.join(', ') || 'Basic/Premium/Pro'}\n\n` +
        `Nhấn vào nút "Nâng cấp tài khoản" bên dưới để xem các gói.`
      );
    }
  }
}
```

**Hiển thị nút nâng cấp:**
```tsx
{error && (
  <div className="error-message">
    <span style={{ whiteSpace: 'pre-line' }}>⚠️ {error}</span>
    
    {/* Show upgrade button if payment required */}
    {error.includes('🔒') && (
      <button
        type="button"
        onClick={() => window.location.href = '/pricing'}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          // ...
        }}
      >
        💳 Nâng cấp tài khoản
      </button>
    )}
  </div>
)}
```

## Luồng Hoạt Động

```
User Upload CV
    ↓
Frontend gửi request → POST /api/skill-gap/analyze
    ↓
Backend kiểm tra subscription
    ↓
    ├─ Free Plan → Return 402 Payment Required
    │                ↓
    │           Frontend hiển thị:
    │           - Thông báo yêu cầu thanh toán
    │           - Nút "Nâng cấp tài khoản"
    │           - Link đến /pricing
    │
    └─ Basic/Premium/Pro → Tiếp tục phân tích CV
                            ↓
                       Trả về kết quả
```

## Các Gói Subscription

| Gói | Skill Gap Analysis | Giới Hạn | Giá |
|-----|-------------------|----------|-----|
| **Free** | ❌ Không được phép | - | Miễn phí |
| **Basic** | ✅ Được phép | 20 lần/tháng | 99,000 VND/năm |
| **Premium** | ✅ Được phép | Không giới hạn | 199,000 VND/năm |
| **Pro** | ✅ Được phép | Không giới hạn + AI Assistant | 299,000 VND/năm |

## Error Response Format

### HTTP 402 - Payment Required

```json
{
  "detail": {
    "error": "payment_required",
    "message": "Chức năng Phân tích Skill Gap yêu cầu gói trả phí",
    "message_en": "Skill Gap Analysis requires a paid subscription",
    "current_plan": "Free",
    "required_plans": ["Basic", "Premium", "Pro"],
    "upgrade_url": "/pricing",
    "features": {
      "Basic": "Phân tích CV cơ bản, 20 lần/tháng",
      "Premium": "Phân tích không giới hạn + Lộ trình học tập AI",
      "Pro": "Tất cả tính năng Premium + Xuất PDF + AI Assistant"
    }
  }
}
```

## Testing

### Test Case 1: Free User Upload CV
1. Login với tài khoản Free
2. Truy cập `/skill-gap`
3. Upload CV và chọn career
4. Click "Analyze My Skills"
5. **Expected:** Hiển thị thông báo yêu cầu thanh toán + nút "Nâng cấp tài khoản"

### Test Case 2: Paid User Upload CV
1. Login với tài khoản Basic/Premium/Pro
2. Truy cập `/skill-gap`
3. Upload CV và chọn career
4. Click "Analyze My Skills"
5. **Expected:** Phân tích thành công, hiển thị kết quả

### Test Case 3: Click Upgrade Button
1. Trigger payment required error
2. Click nút "Nâng cấp tài khoản"
3. **Expected:** Redirect đến `/pricing`

## Files Modified

1. **Backend:**
   - `apps/backend/app/modules/skill_gap/routes.py` (line ~170-210)
     - Added subscription check in `/analyze` endpoint
     - Returns 402 error for Free users

2. **Frontend:**
   - `apps/frontend/src/components/skillgap/CVUploadForm.tsx` (line ~185-220, ~330-360)
     - Enhanced error handling for 402 status
     - Added upgrade button in error message
     - Improved error message formatting

## Database Schema

Sử dụng bảng có sẵn:
- `core.user_subscriptions` - Lưu subscription của user
- `core.subscription_plans` - Định nghĩa các gói
- `core.user_usage_tracking` - Theo dõi usage (optional)

## Subscription Service

Sử dụng service có sẵn:
```python
from app.core.subscription import SubscriptionService

# Get user subscription
subscription = SubscriptionService.get_user_subscription(user_id, db)
plan_name = subscription.get("plan_name", "Free")

# Check if premium
is_premium = subscription.get("is_premium", False)
```

## Migration Notes

**Không cần migration!** Hệ thống subscription đã có sẵn.

Chỉ cần:
1. ✅ Thêm kiểm tra vào routes
2. ✅ Cập nhật frontend xử lý lỗi
3. ✅ Test với user Free và Paid

## Rollback Plan

Nếu cần rollback:

1. **Backend:** Comment out subscription check
```python
# TEMPORARY ROLLBACK - Comment these lines:
# from app.core.subscription import SubscriptionService
# subscription = SubscriptionService.get_user_subscription(user_id, db)
# if plan_name == "Free":
#     raise HTTPException(...)
```

2. **Frontend:** Không cần thay đổi (vẫn hoạt động bình thường)

## Benefits

✅ **Tăng doanh thu:** User phải trả phí để dùng Skill Gap Analysis
✅ **Giá trị rõ ràng:** Feature này đủ giá trị để thu phí
✅ **UX tốt:** Thông báo rõ ràng + nút upgrade dễ dàng
✅ **Flexible:** Dễ dàng thay đổi logic kiểm tra sau này

## Next Steps

1. ✅ Implementation complete
2. ⏳ **Test với user Free** - Verify error message
3. ⏳ **Test với user Paid** - Verify analysis works
4. ⏳ Monitor conversion rate (Free → Paid)
5. ⏳ A/B test error message wording

---

**Implementation Date:** 2026-04-12
**Status:** ✅ READY FOR TESTING
**User Request:** "sua lai cai chuc nang cua skill chi thanh toan hoc mua cac goi moi duoc dung"
