# 🔒 Hệ thống giới hạn nội dung

## ✅ Đã triển khai

### 📊 Giới hạn cho user miễn phí:

1. **Nghề nghiệp**: Chỉ xem được 1 nghề, còn lại phải trả phí
2. **Bài test**: 5 lần/tháng miễn phí, quá 5 lần phải trả phí  
3. **Roadmap**: Chỉ xem Level 1, còn lại phải trả phí

### 📦 Các gói đã tạo:

| Gói | Giá | Bài test/tháng | Nghề nghiệp | Roadmap |
|-----|-----|----------------|-------------|---------|
| **Free** | 0đ | 5 lần | 1 nghề | Level 1 |
| **Basic** | 99,000đ | 20 lần | 5 nghề | Level 1-2 |
| **Premium** | 299,000đ | Không giới hạn | Tất cả | Đầy đủ |
| **Enterprise** | 999,000đ | Không giới hạn | Tất cả | Đầy đủ + API |

---

## 🔧 API Endpoints

### 1. Lấy thông tin plan hiện tại
```http
GET /api/subscription/my-plan
Authorization: Bearer {token}
```

**Response:**
```json
{
  "plan": {
    "name": "free",
    "max_assessments_per_month": 5,
    "max_career_views": 1,
    "max_roadmap_level": 1
  },
  "usage": {
    "assessments_count": 2,
    "careers_viewed": [123]
  }
}
```

### 2. Kiểm tra có thể làm bài test không
```http
GET /api/subscription/check/assessment
Authorization: Bearer {token}
```

**Response:**
```json
{
  "allowed": true,
  "message": "Còn 3/5 lượt"
}
```

### 3. Kiểm tra có thể xem nghề nghiệp không
```http
GET /api/subscription/check/career/{career_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "allowed": false,
  "message": "Bạn chỉ được xem 1 nghề nghiệp với gói miễn phí. Vui lòng nâng cấp để xem thêm."
}
```

### 4. Kiểm tra có thể xem roadmap level không
```http
GET /api/subscription/check/roadmap-level/{level}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "allowed": false,
  "message": "Bạn chỉ được xem đến Level 1 với gói miễn phí. Vui lòng nâng cấp để xem thêm."
}
```

### 5. Track việc làm bài test
```http
POST /api/subscription/track/assessment
Authorization: Bearer {token}
```

### 6. Track việc xem nghề nghiệp
```http
POST /api/subscription/track/career/{career_id}
Authorization: Bearer {token}
```

---

## 💻 Cách sử dụng trong Frontend

### 1. Kiểm tra trước khi làm bài test

```typescript
// Trong AssessmentPage.tsx
const checkAssessmentLimit = async () => {
  const token = getAccessToken();
  const response = await axios.get(
    'http://localhost:8000/api/subscription/check/assessment',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  if (!response.data.allowed) {
    alert(response.data.message);
    navigate('/pricing'); // Redirect đến trang pricing
    return false;
  }
  
  return true;
};

// Khi user bắt đầu làm bài
const startAssessment = async () => {
  if (!(await checkAssessmentLimit())) return;
  
  // Track
  await axios.post(
    'http://localhost:8000/api/subscription/track/assessment',
    {},
    { headers: { Authorization: `Bearer ${getAccessToken()}` } }
  );
  
  // Tiếp tục làm bài...
};
```

### 2. Giới hạn xem nghề nghiệp

```typescript
// Trong CareersPage.tsx
const careers = await fetchCareers();

// Chỉ hiển thị 1 nghề cho free user
const displayCareers = careers.map((career, index) => {
  if (index === 0) {
    return <CareerCard career={career} />;
  }
  
  // Các nghề còn lại hiển thị locked
  return (
    <LockedCareerCard 
      career={career}
      onUpgrade={() => navigate('/pricing')}
    />
  );
});
```

### 3. Giới hạn roadmap level

```typescript
// Trong RoadmapPage.tsx
const checkRoadmapLevel = async (level: number) => {
  const token = getAccessToken();
  const response = await axios.get(
    `http://localhost:8000/api/subscription/check/roadmap-level/${level}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data.allowed;
};

// Render roadmap
const renderLevel = (level: number) => {
  const canView = await checkRoadmapLevel(level);
  
  if (!canView) {
    return (
      <LockedLevel 
        level={level}
        onUpgrade={() => navigate('/pricing')}
      />
    );
  }
  
  return <LevelContent level={level} />;
};
```

---

## 🎨 UI Components cần tạo

### 1. LockedCareerCard
```tsx
const LockedCareerCard = ({ career, onUpgrade }) => (
  <div className="relative opacity-60">
    <CareerCard career={career} />
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="text-center text-white">
        <LockIcon className="w-12 h-12 mx-auto mb-2" />
        <p className="font-semibold">Nâng cấp để xem</p>
        <button 
          onClick={onUpgrade}
          className="mt-2 px-4 py-2 bg-blue-600 rounded"
        >
          Nâng cấp ngay
        </button>
      </div>
    </div>
  </div>
);
```

### 2. AssessmentLimitBanner
```tsx
const AssessmentLimitBanner = ({ remaining, total }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
    <p className="text-yellow-800">
      ⚠️ Bạn còn <strong>{remaining}/{total}</strong> lượt làm bài test miễn phí trong tháng này.
      <a href="/pricing" className="ml-2 text-blue-600 underline">
        Nâng cấp để không giới hạn
      </a>
    </p>
  </div>
);
```

### 3. LockedRoadmapLevel
```tsx
const LockedRoadmapLevel = ({ level, onUpgrade }) => (
  <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center">
    <LockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
    <h3 className="font-semibold text-gray-700">Level {level} - Locked</h3>
    <p className="text-sm text-gray-500 mt-2">
      Nâng cấp gói Premium để mở khóa level này
    </p>
    <button 
      onClick={onUpgrade}
      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded"
    >
      Nâng cấp ngay
    </button>
  </div>
);
```

---

## 🔄 Luồng xử lý

### Khi user làm bài test:
```
1. User click "Bắt đầu làm bài"
2. Frontend gọi GET /api/subscription/check/assessment
3. Nếu allowed = false → Hiển thị modal yêu cầu nâng cấp
4. Nếu allowed = true → Gọi POST /api/subscription/track/assessment
5. Tiếp tục làm bài
```

### Khi user xem nghề nghiệp:
```
1. User click vào nghề nghiệp
2. Frontend gọi GET /api/subscription/check/career/{id}
3. Nếu allowed = false → Hiển thị modal yêu cấp
4. Nếu allowed = true → Gọi POST /api/subscription/track/career/{id}
5. Hiển thị chi tiết nghề
```

### Khi user xem roadmap:
```
1. User mở roadmap
2. Với mỗi level, gọi GET /api/subscription/check/roadmap-level/{level}
3. Nếu allowed = false → Hiển thị locked state
4. Nếu allowed = true → Hiển thị nội dung đầy đủ
```

---

## 🧪 Test

### 1. Test với user miễn phí

```bash
# Đăng nhập
# Lấy token

# Kiểm tra plan
curl http://localhost:8000/api/subscription/my-plan \
  -H "Authorization: Bearer YOUR_TOKEN"

# Làm bài test 5 lần
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/subscription/track/assessment \
    -H "Authorization: Bearer YOUR_TOKEN"
done

# Lần thứ 6 sẽ bị chặn
curl -X POST http://localhost:8000/api/subscription/track/assessment \
  -H "Authorization: Bearer YOUR_TOKEN"
# → 403 Forbidden
```

### 2. Test xem nghề nghiệp

```bash
# Xem nghề đầu tiên - OK
curl -X POST http://localhost:8000/api/subscription/track/career/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Xem nghề thứ 2 - Bị chặn
curl -X POST http://localhost:8000/api/subscription/track/career/2 \
  -H "Authorization: Bearer YOUR_TOKEN"
# → 403 Forbidden
```

---

## 📝 TODO - Cần implement trong Frontend

- [ ] Tạo LockedCareerCard component
- [ ] Tạo AssessmentLimitBanner component
- [ ] Tạo LockedRoadmapLevel component
- [ ] Thêm check limit vào AssessmentPage
- [ ] Thêm locked state vào CareersPage
- [ ] Thêm locked state vào RoadmapPage
- [ ] Tạo modal "Nâng cấp gói" đẹp
- [ ] Hiển thị số lượt còn lại trong UI
- [ ] Tích hợp với payment flow

---

**Hệ thống đã sẵn sàng! Backend API hoạt động, bây giờ cần implement UI trong Frontend.** 🚀
