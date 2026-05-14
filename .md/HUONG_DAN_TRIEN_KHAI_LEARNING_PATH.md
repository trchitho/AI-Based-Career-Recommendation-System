# HƯỚNG DẪN TRIỂN KHAI CHỨC NĂNG: LỘ TRÌNH HỌC TẬP (`/learning-path`)

> **Ngày cập nhật:** 13/05/2026  
> **Mục tiêu:** Triển khai trang `/learning-path` — tổng quan lộ trình học tập, gợi ý nghề phù hợp, và lộ trình học cá nhân hóa từ kết quả phân tích CV.

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Database (bảng hiện có — KHÔNG tạo thêm)

| Bảng | Vai trò | Trạng thái DT |
|------|---------|---------------|
| `core.roadmaps` | Lộ trình cho mỗi nghề (1 career = 1 roadmap) | ✅ Đã có 959 records |
| `core.roadmap_milestones` | Các bước trong lộ trình (3-5 milestones/roadmap) | ✅ Đã import CSV |
| `core.skill_gap_analyses` | Kết quả phân tích CV + skill gaps + learning_plan_cache | ✅ Đã có DT thực |
| `core.career_recommendations` | Gợi ý nghề từ assessment | ✅ Đã có DT thực |
| `core.user_progress` | Tiến độ học của user | ✅ Đã có DT thực |
| `core.course_catalog` | Danh mục khóa học | ⚠️ Chỉ có DT mẫu — cần nạp thực |
| `core.course_skill_map` | Mapping skill ↔ course | ⚠️ Chỉ có DT mẫu — cần nạp thực |
| `core.skill_vectors` | Vector embedding 768-dim cho skill | ❌ Chưa có DT |

### 1.2 Codebase hiện có

| Layer | File | Chức năng |
|-------|------|-----------|
| **Frontend** | `pages/RoadmapPage.tsx` | Xem lộ trình 1 nghề cụ thể |
| **Frontend** | `pages/SkillGapPage.tsx` | Phân tích CV + hiển thị skill gap + lộ trình học |
| **Frontend** | `components/roadmap/RoadmapTimelineComponent.tsx` | Timeline UI với milestones |
| **Frontend** | `services/roadmapService.ts` | API calls cho roadmap |
| **Frontend** | `services/courseService.ts` | API calls cho khóa học |
| **Backend** | `modules/roadmap/service.py` | RoadmapService class |
| **Backend** | `modules/roadmap/models.py` | ORM models |
| **Backend** | `modules/content/service_careers.py` | `get_roadmap()`, `complete_milestone()` |
| **Backend** | `modules/skill_gap/` | Phân tích CV, tính skill gap, tạo learning plan |
| **Backend** | `modules/courses/service.py` | Course recommendation pipeline |
| **Backend** | `modules/courses/router.py` | Course API endpoints |

### 1.3 Route hiện tại

```
/careers/:groupSlug/:careerIdOrSlug/roadmap  → RoadmapPage (xem 1 lộ trình cứng)
/skill-gap/:analysisId                        → SkillGapPage (phân tích CV + lộ trình học)
/courses                                      → CourseRecommendationPage
/learning-path                                → NotFoundPage (CHƯA TRIỂN KHAI)
```

---

## 2. PHÂN BIỆT CÁC TRANG LIÊN QUAN

| Trang | Mục đích | Nguồn dữ liệu |
|-------|----------|---------------|
| `/careers/.../roadmap` | Lộ trình học **1 nghề cụ thể** (cứng, theo O*NET) | `roadmap_milestones` |
| `/skill-gap/:id` | Phân tích CV → skill gap → **lộ trình học cá nhân hóa** | `skill_gap_analyses.learning_plan_cache` |
| `/learning-path` | **Tổng quan** tất cả lộ trình + gợi ý + lộ trình từ CV | Kết hợp cả 3 nguồn |

---

## 3. FLOW CỦA TRANG `/learning-path`

```
User vào /learning-path
    │
    ├── SECTION 1: "Lộ trình đang học"
    │   └── Lấy từ core.user_progress
    │       → Hiển thị roadmaps user đã bắt đầu + % hoàn thành
    │
    ├── SECTION 2: "Lộ trình gợi ý"
    │   └── Lấy từ core.career_recommendations (kết quả assessment)
    │       → Nghề phù hợp chưa bắt đầu học
    │
    └── SECTION 3: "Lộ trình học cá nhân hóa từ CV"
        └── Lấy từ core.skill_gap_analyses.learning_plan_cache
            → Cắt nguyên phần "Lộ trình học tập" từ /skill-gap/:id
            → Hiển thị trực tiếp tại đây (không redirect)
```

---

## 4. SECTION 3 — LỘ TRÌNH HỌC CÁ NHÂN HÓA TỪ CV

### 4.1 Nguồn dữ liệu

Bảng `core.skill_gap_analyses` đã có cột `learning_plan_cache` (JSONB) chứa lộ trình học được AI tạo ra. Ví dụ thực tế:

```json
{
  "summary": "Lộ trình này tập trung vào việc chuyển đổi từ kỹ năng kỹ thuật Machine Learning sang khả năng phân tích hệ thống...",
  "total_weeks": 16,
  "phases": [
    {
      "phase": 1,
      "title": "Nền tảng Đọc hiểu và Phân tích Dữ liệu Thống kê",
      "weeks": "Tuần 1-4",
      "focus": "Củng cố kỹ năng đọc hiểu tài liệu kỹ thuật và toán học thống kê cơ bản.",
      "skills": ["Reading Comprehension", "Mathematics"],
      "resources": [
        {"name": "Statistics with R Specialization", "type": "course", "platform": "Coursera", "free": false, "level": "beginner"},
        {"name": "Introduction to Statistics", "type": "course", "platform": "Stanford Online", "free": true, "level": "beginner"}
      ]
    }
  ],
  "milestones": [
    {"week": 4, "title": "Chứng chỉ Thống kê cơ bản", "description": "Hoàn thành các kiến thức toán học và đọc hiểu tài liệu thống kê."},
    {"week": 16, "title": "Sẵn sàng cho vai trò 51-4193-00", "description": "Hoàn thiện hồ sơ năng lực."}
  ]
}
```

### 4.2 Query lấy learning plan mới nhất của user

```sql
SELECT 
    sga.id as analysis_id,
    sga.career_id,
    c.title_vi as career_title,
    c.onet_code,
    sga.match_percentage,
    sga.missing_skills_count,
    sga.skill_gaps,
    sga.learning_plan_cache,
    sga.created_at
FROM core.skill_gap_analyses sga
JOIN core.careers c ON c.onet_code = sga.career_id
WHERE sga.user_id = :user_id
  AND sga.learning_plan_cache IS NOT NULL
ORDER BY sga.created_at DESC
LIMIT 3;
```

### 4.3 UI Component — Tái sử dụng từ SkillGapPage

Phần "Lộ trình học tập" đã được implement tại `SkillGapPage.tsx`. Cần:
1. **Extract** component `LearningPlanSection` từ `SkillGapPage.tsx` thành component riêng
2. **Import** và dùng lại tại `LearningPathPage.tsx`
3. **Không redirect** sang `/skill-gap/:id` — hiển thị trực tiếp

```typescript
// Component tái sử dụng
import LearningPlanSection from '../components/skillgap/LearningPlanSection';

// Trong LearningPathPage:
{latestAnalysis?.learning_plan_cache && (
  <LearningPlanSection 
    plan={latestAnalysis.learning_plan_cache}
    careerTitle={latestAnalysis.career_title}
    analysisId={latestAnalysis.analysis_id}
  />
)}
```

---

## 5. BACKEND — API ENDPOINTS CẦN TẠO

### 5.1 `GET /api/learning-path/my-roadmaps`

```sql
SELECT r.id, r.career_id, r.title_vn, r.title_en,
       c.title_vi as career_title, c.onet_code, c.slug,
       up.progress_percentage, up.completed_milestones,
       (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) as total_milestones
FROM core.user_progress up
JOIN core.roadmaps r ON r.id = up.roadmap_id
JOIN core.careers c ON c.id = r.career_id
WHERE up.user_id = :user_id
ORDER BY up.last_updated_at DESC
```

### 5.2 `GET /api/learning-path/suggested-roadmaps`

```sql
SELECT cr.career_id, cr.score, c.title_vi, c.slug, c.onet_code,
       r.id as roadmap_id, r.title_vn,
       (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) as total_milestones
FROM core.career_recommendations cr
JOIN core.careers c ON c.id = cr.career_id
LEFT JOIN core.roadmaps r ON r.career_id = c.id
WHERE cr.assessment_id = (
    SELECT id FROM core.assessment_sessions 
    WHERE user_id = :user_id 
    ORDER BY created_at DESC LIMIT 1
)
AND cr.career_id NOT IN (
    SELECT career_id FROM core.user_progress WHERE user_id = :user_id
)
ORDER BY cr.rank ASC
LIMIT 5
```

### 5.3 `GET /api/learning-path/skill-gap-plans`

**Mục đích:** Lấy các lộ trình học cá nhân hóa từ kết quả phân tích CV.

```sql
SELECT 
    sga.id as analysis_id,
    sga.career_id,
    c.title_vi as career_title,
    c.onet_code,
    sga.match_percentage,
    sga.missing_skills_count,
    sga.skill_gaps,
    sga.learning_plan_cache,
    sga.created_at
FROM core.skill_gap_analyses sga
LEFT JOIN core.careers c ON c.onet_code = sga.career_id
WHERE sga.user_id = :user_id
  AND sga.learning_plan_cache IS NOT NULL
ORDER BY sga.created_at DESC
LIMIT 3
```

**Response:**
```json
{
  "plans": [
    {
      "analysis_id": 18,
      "career_title": "Thợ vận hành máy mạ (kim loại và nhựa)",
      "onet_code": "51-4193-00",
      "match_percentage": 29.47,
      "missing_skills_count": 26,
      "learning_plan": { ...learning_plan_cache... }
    }
  ]
}
```

---

## 6. FRONTEND — COMPONENT MỚI

### 6.1 Tạo `pages/LearningPathPage.tsx`

```typescript
const LearningPathPage = () => {
  const [myRoadmaps, setMyRoadmaps] = useState([]);
  const [suggestedRoadmaps, setSuggestedRoadmaps] = useState([]);
  const [skillGapPlans, setSkillGapPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/learning-path/my-roadmaps'),
      api.get('/api/learning-path/suggested-roadmaps'),
      api.get('/api/learning-path/skill-gap-plans'),
    ]).then(([my, suggested, plans]) => {
      setMyRoadmaps(my.data.roadmaps);
      setSuggestedRoadmaps(suggested.data.roadmaps);
      setSkillGapPlans(plans.data.plans);
      setLoading(false);
    });
  }, []);

  return (
    <MainLayout>
      {/* Section 1: Lộ trình đang học */}
      <MyRoadmapsSection roadmaps={myRoadmaps} />
      
      {/* Section 2: Lộ trình gợi ý từ assessment */}
      <SuggestedRoadmapsSection roadmaps={suggestedRoadmaps} />
      
      {/* Section 3: Lộ trình học cá nhân hóa từ CV */}
      <SkillGapPlansSection plans={skillGapPlans} />
    </MainLayout>
  );
};
```

### 6.2 Cập nhật `App.tsx`

```typescript
import LearningPathPage from './pages/LearningPathPage';

// Thay thế NotFoundPage:
<Route path="/learning-path" element={<ProtectedRoute><LearningPathPage /></ProtectedRoute>} />
```

---

## 7. VỀ `core.course_catalog` VÀ `core.course_skill_map`

### 7.1 Kế hoạch nạp dữ liệu thực

Dựa trên **22 nhóm nghề** (theo phân loại O*NET), mỗi nhóm cần:
- **80-100 khóa học** phù hợp với kỹ năng của nhóm đó
- **Skills mapping** tương ứng với `career_ksas` của nhóm

**22 nhóm nghề:**
Computer & Mathematical, Business & Financial, Management, Healthcare Practitioners, Educational, Architecture & Engineering, Arts/Design/Media, Sales, Community & Social Service, Legal, Life/Physical/Social Science, Healthcare Support, Transportation, Construction, Office & Administrative, Production, Installation/Maintenance/Repair, Protective Service, Personal Care, Food Preparation, Farming/Fishing/Forestry, Building & Grounds Maintenance

### 7.2 Cách nạp dữ liệu

**Bước 1: Crawl khóa học theo nhóm nghề**
```bash
POST /api/courses/admin/crawl
Body: {
  "keywords": ["data analysis", "python", "machine learning"],  # skills của nhóm
  "platforms": ["coursera", "udemy", "edx"],
  "page_size": 100
}
```

**Bước 2: Chạy embedding pipeline**
```bash
POST /api/courses/admin/run-all
# seed → embed → build-map → sync-neo4j
```

### 7.3 Tại sao Section 3 KHÔNG phụ thuộc vào course_catalog

Section 3 dùng `learning_plan_cache` từ `skill_gap_analyses` — đây là lộ trình học đã được AI tạo sẵn với resources cụ thể (Coursera, edX, YouTube...). **Không cần** `course_catalog` hay `course_skill_map` để hiển thị Section 3.

`course_catalog` và `course_skill_map` chỉ cần khi muốn **đề xuất khóa học bổ sung** ngoài lộ trình AI đã tạo.

---

## 8. LUỒNG DỮ LIỆU ĐẦY ĐỦ

```
User vào /learning-path
    │
    ├── GET /api/learning-path/my-roadmaps
    │   └── core.user_progress + core.roadmaps + core.careers
    │
    ├── GET /api/learning-path/suggested-roadmaps
    │   └── core.career_recommendations + core.roadmaps (loại đã bắt đầu)
    │
    └── GET /api/learning-path/skill-gap-plans
        └── core.skill_gap_analyses.learning_plan_cache
            → Hiển thị lộ trình học cá nhân hóa từ CV
            → Tái sử dụng UI component từ SkillGapPage
```

---

## 9. CHECKLIST TRIỂN KHAI

### Backend:
- [ ] Tạo `modules/learning_path/routes.py` với 3 endpoints
- [ ] Đăng ký router: `app.include_router(lp_router, prefix="/api/learning-path")`
- [ ] Test endpoint `skill-gap-plans` với user có `learning_plan_cache`

### Frontend:
- [ ] Extract `LearningPlanSection` component từ `SkillGapPage.tsx`
- [ ] Tạo `pages/LearningPathPage.tsx` với 3 sections
- [ ] Tạo `services/learningPathService.ts`
- [ ] Cập nhật `App.tsx` route `/learning-path`
- [ ] Tạo components: `MyRoadmapCard`, `SuggestedRoadmapCard`

### Database (ưu tiên thấp — Section 3 không cần):
- [ ] Nạp `core.course_catalog` (80-100 courses × 22 nhóm nghề)
- [ ] Chạy embedding pipeline: `POST /api/courses/admin/run-all`
- [ ] Build `core.course_skill_map`

---

## 10. GHI CHÚ KỸ THUẬT

1. **Section 3 hoạt động ngay** — không cần nạp `course_catalog` vì dùng `learning_plan_cache` đã có
2. **Performance:** 3 API song song (`Promise.all`) → load nhanh
3. **Tái sử dụng UI:** Component lộ trình học từ `SkillGapPage` dùng lại hoàn toàn
4. **Không tạo bảng mới:** Tất cả dùng bảng hiện có
5. **Subscription gating:** Section 3 chỉ hiển thị nếu user đã upload CV và có `learning_plan_cache`

---

## 11. KẾT LUẬN

Trang `/learning-path` kết nối **3 nguồn dữ liệu** hiện có:

| Section | Nguồn | Trạng thái |
|---------|-------|-----------|
| Lộ trình đang học | `user_progress` + `roadmaps` | ✅ Sẵn sàng |
| Lộ trình gợi ý | `career_recommendations` | ✅ Sẵn sàng |
| Lộ trình từ CV | `skill_gap_analyses.learning_plan_cache` | ✅ Sẵn sàng |

**Ưu tiên triển khai:** Backend 3 endpoints → Frontend 3 sections → Test với user có đủ dữ liệu.
