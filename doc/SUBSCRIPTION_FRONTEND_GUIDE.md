# 🎨 Frontend Subscription - Hướng dẫn sử dụng

## ✅ Đã tạo xong!

### 📦 Components đã tạo:

1. **LockedCareerCard** - Hiển thị nghề nghiệp bị khóa
2. **LockedRoadmapLevel** - Hiển thị level roadmap bị khóa
3. **AssessmentLimitBanner** - Banner hiển thị số lượt còn lại
4. **UpgradeModal** - Modal yêu cầu nâng cấp

### 🔧 Services & Hooks:

1. **subscriptionService.ts** - Service gọi API
2. **useSubscription.ts** - Hook quản lý subscription

### 📄 Pages:

1. **SubscriptionDemoPage** - Trang demo đầy đủ tính năng

---

## 🚀 Test ngay

### 1. Truy cập trang demo:
```
http://localhost:3000/subscription-demo
```

### 2. Xem thông tin plan hiện tại

Trang sẽ hiển thị:
- Gói đang dùng (Free/Basic/Premium/Enterprise)
- Số lượt đã dùng trong tháng
- Số lượt còn lại

### 3. Test các giới hạn

**Test làm bài:**
- Click "Làm bài test" nhiều lần
- Sau 5 lần (với gói Free) sẽ hiển thị modal yêu cầu nâng cấp

**Test xem nghề:**
- Click "Xem nghề #1" → OK
- Click "Xem nghề #2" → Bị chặn (gói Free chỉ xem 1 nghề)

**Test roadmap:**
- Click "Level 1" → OK
- Click "Level 2" → Bị chặn (gói Free chỉ xem Level 1)

---

## 💻 Cách sử dụng trong code

### 1. Sử dụng Hook

```tsx
import { useSubscription } from '../hooks/useSubscription';

const MyComponent = () => {
  const {
    plan,
    usage,
    isPremium,
    isFree,
    assessmentsRemaining,
    canTakeAssessment,
    recordAssessment,
  } = useSubscription();

  const handleStartAssessment = async () => {
    // Check trước
    const result = await canTakeAssessment();
    
    if (!result.allowed) {
      alert(result.message);
      return;
    }

    // Track
    await recordAssessment();
    
    // Tiếp tục...
  };

  return (
    <div>
      <p>Còn {assessmentsRemaining} lượt</p>
      <button onClick={handleStartAssessment}>
        Làm bài test
      </button>
    </div>
  );
};
```

### 2. Hiển thị Banner giới hạn

```tsx
import { AssessmentLimitBanner } from '../components/subscription/AssessmentLimitBanner';
import { useSubscription } from '../hooks/useSubscription';

const AssessmentPage = () => {
  const { plan, usage, isFree } = useSubscription();

  return (
    <div>
      {isFree && plan && usage && (
        <AssessmentLimitBanner
          remaining={plan.max_assessments_per_month - usage.assessments_count}
          total={plan.max_assessments_per_month}
        />
      )}
      
      {/* Nội dung trang */}
    </div>
  );
};
```

### 3. Hiển thị nghề bị khóa

```tsx
import { LockedCareerCard } from '../components/subscription/LockedCareerCard';
import { useSubscription } from '../hooks/useSubscription';

const CareersPage = () => {
  const { plan, usage } = useSubscription();
  const careers = [...]; // Danh sách nghề

  return (
    <div className="grid grid-cols-3 gap-4">
      {careers.map((career, index) => {
        // Kiểm tra đã xem nghề này chưa
        const isViewed = usage?.careers_viewed.includes(career.id);
        
        // Nếu là nghề đầu tiên hoặc đã xem → Hiển thị bình thường
        if (index === 0 || isViewed || plan?.can_view_all_careers) {
          return <CareerCard key={career.id} career={career} />;
        }
        
        // Còn lại → Hiển thị locked
        return <LockedCareerCard key={career.id} career={career} />;
      })}
    </div>
  );
};
```

### 4. Hiển thị roadmap bị khóa

```tsx
import { LockedRoadmapLevel } from '../components/subscription/LockedRoadmapLevel';
import { useSubscription } from '../hooks/useSubscription';

const RoadmapPage = () => {
  const { plan } = useSubscription();
  const levels = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const canView = 
          plan?.can_view_full_roadmap || 
          level <= (plan?.max_roadmap_level || 1);

        if (!canView) {
          return <LockedRoadmapLevel key={level} level={level} />;
        }

        return <LevelContent key={level} level={level} />;
      })}
    </div>
  );
};
```

### 5. Sử dụng Modal nâng cấp

```tsx
import { useState } from 'react';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { useSubscription } from '../hooks/useSubscription';

const MyComponent = () => {
  const [showModal, setShowModal] = useState(false);
  const { canTakeAssessment } = useSubscription();

  const handleAction = async () => {
    const result = await canTakeAssessment();
    
    if (!result.allowed) {
      setShowModal(true);
      return;
    }

    // Tiếp tục...
  };

  return (
    <>
      <button onClick={handleAction}>Action</button>
      
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Hết lượt làm bài test"
        message="Bạn đã sử dụng hết 5 lượt miễn phí trong tháng này."
        feature="Làm bài test không giới hạn"
      />
    </>
  );
};
```

---

## 🎨 Tùy chỉnh UI

### Thay đổi màu sắc

Các components sử dụng Tailwind CSS, bạn có thể tùy chỉnh:

```tsx
<LockedCareerCard 
  career={career}
  className="border-red-500" // Custom border color
/>

<AssessmentLimitBanner
  remaining={3}
  total={5}
  className="mb-4" // Custom spacing
/>
```

### Thay đổi text

```tsx
<UpgradeModal
  isOpen={true}
  onClose={() => {}}
  title="Custom Title"
  message="Custom message here"
  feature="Custom feature description"
/>
```

---

## 📊 Các trường hợp sử dụng

### 1. Assessment Page

```tsx
// apps/frontend/src/pages/AssessmentPage.tsx
import { useSubscription } from '../hooks/useSubscription';
import { AssessmentLimitBanner } from '../components/subscription/AssessmentLimitBanner';
import { UpgradeModal } from '../components/subscription/UpgradeModal';

const AssessmentPage = () => {
  const {
    plan,
    usage,
    isFree,
    assessmentsRemaining,
    canTakeAssessment,
    recordAssessment,
  } = useSubscription();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleStartAssessment = async () => {
    const result = await canTakeAssessment();
    
    if (!result.allowed) {
      setShowUpgradeModal(true);
      return;
    }

    // Track
    await recordAssessment();
    
    // Bắt đầu làm bài...
    navigate('/assessment/start');
  };

  return (
    <div>
      {/* Banner */}
      {isFree && plan && usage && (
        <AssessmentLimitBanner
          remaining={assessmentsRemaining}
          total={plan.max_assessments_per_month}
        />
      )}

      {/* Start button */}
      <button onClick={handleStartAssessment}>
        Bắt đầu làm bài
      </button>

      {/* Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Hết lượt làm bài test"
        message="Bạn đã sử dụng hết 5 lượt miễn phí trong tháng này."
      />
    </div>
  );
};
```

### 2. Careers Page

```tsx
// apps/frontend/src/pages/CareersPage.tsx
import { useSubscription } from '../hooks/useSubscription';
import { LockedCareerCard } from '../components/subscription/LockedCareerCard';

const CareersPage = () => {
  const { plan, usage, canViewCareer, recordCareerView } = useSubscription();
  const [careers, setCareers] = useState([]);

  const handleCareerClick = async (career) => {
    const result = await canViewCareer(career.id);
    
    if (!result.allowed) {
      // Hiển thị modal hoặc redirect
      navigate('/pricing');
      return;
    }

    // Track
    await recordCareerView(career.id);
    
    // Xem chi tiết
    navigate(`/careers/${career.id}`);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {careers.map((career, index) => {
        const isViewed = usage?.careers_viewed.includes(career.id);
        const canView = index === 0 || isViewed || plan?.can_view_all_careers;

        if (!canView) {
          return <LockedCareerCard key={career.id} career={career} />;
        }

        return (
          <CareerCard
            key={career.id}
            career={career}
            onClick={() => handleCareerClick(career)}
          />
        );
      })}
    </div>
  );
};
```

### 3. Roadmap Page

```tsx
// apps/frontend/src/pages/RoadmapPage.tsx
import { useSubscription } from '../hooks/useSubscription';
import { LockedRoadmapLevel } from '../components/subscription/LockedRoadmapLevel';

const RoadmapPage = () => {
  const { plan, canViewRoadmapLevel } = useSubscription();
  const [levels, setLevels] = useState([1, 2, 3, 4, 5]);

  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const canView = 
          plan?.can_view_full_roadmap || 
          level <= (plan?.max_roadmap_level || 1);

        if (!canView) {
          return <LockedRoadmapLevel key={level} level={level} />;
        }

        return <LevelContent key={level} level={level} />;
      })}
    </div>
  );
};
```

---

## 🧪 Testing Checklist

- [ ] Đăng nhập với user mới (gói Free)
- [ ] Truy cập `/subscription-demo`
- [ ] Xem thông tin plan hiển thị đúng
- [ ] Click "Làm bài test" 5 lần → Lần thứ 6 hiển thị modal
- [ ] Click "Xem nghề #1" → OK
- [ ] Click "Xem nghề #2" → Hiển thị modal
- [ ] Click "Level 1" → OK
- [ ] Click "Level 2" → Hiển thị modal
- [ ] Nâng cấp gói Premium
- [ ] Test lại → Tất cả đều OK

---

## 📝 TODO - Tích hợp vào pages thật

- [ ] Tích hợp vào AssessmentPage
- [ ] Tích hợp vào CareersPage
- [ ] Tích hợp vào CareerDetailPage
- [ ] Tích hợp vào RoadmapPage
- [ ] Thêm indicator "Premium" vào các tính năng cao cấp
- [ ] Thêm tooltip giải thích giới hạn
- [ ] Tạo animation cho locked state
- [ ] Thêm confetti khi nâng cấp thành công

---

**Tất cả components đã sẵn sàng! Bây giờ chỉ cần tích hợp vào các trang thật.** 🎉
