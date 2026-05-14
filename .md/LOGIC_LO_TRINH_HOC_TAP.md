# LOGIC TẠO LỘ TRÌNH HỌC TẬP & LUỒNG DỮ LIỆU

> **Trang:** `http://localhost:3000/learning-path`  
> **Route:** `/learning-path` → `LearningPathPage.tsx`  
> **Backend:** `GET /api/learning-path/*` → `modules/learning_path/routes.py`

---

## 1. TỔNG QUAN

Trang `/learning-path` tổng hợp **3 nguồn dữ liệu** hiện có trong hệ thống để hiển thị lộ trình học tập cá nhân hóa cho user:

| Section | Tên hiển thị | Nguồn DB | Điều kiện hiển thị |
|---------|-------------|----------|-------------------|
| 1 | Lộ trình đang học | `user_progress` + `roadmaps` + `careers` | User đã bắt đầu ít nhất 1 roadmap |
| 2 | Lộ trình gợi ý | `career_recommendations` + `careers` + `roadmaps` | User đã hoàn thành bài đánh giá |
| 3 | Lộ trình cá nhân hóa từ CV | `skill_gap_analyses.learning_plan_cache` | User đã upload CV và AI đã tạo learning plan |

---

## 2. LUỒNG DỮ LIỆU TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: LearningPathPage.tsx                                      │
│                                                                      │
│  useEffect → Promise.all([                                           │
│    learningPathService.getMyRoadmaps(),        → GET /api/learning-path/my-roadmaps       │
│    learningPathService.getSuggestedRoadmaps(), → GET /api/learning-path/suggested-roadmaps │
│    learningPathService.getSkillGapPlans(),     → GET /api/learning-path/skill-gap-plans    │
│  ])                                                                  │
│                                                                      │
│  → setMyRoadmaps(data)   → Section 1: Cards với progress bar        │
│  → setSuggested(data)    → Section 2: Cards với score badge          │
│  → setPlans(data)        → Section 3: Expandable LearningPlan        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: modules/learning_path/routes.py (FastAPI)                  │
│                                                                      │
│  3 endpoints, mỗi endpoint = 1 SQL query JOIN nhiều bảng            │
│  Auth: JWT token → get_current_user_from_token → user_id             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DATABASE: PostgreSQL (schema: core)                                  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ user_progress    │  │ roadmaps     │  │ roadmap_milestones   │   │
│  │ ─────────────    │  │ ──────────   │  │ ──────────────────   │   │
│  │ user_id (FK)     │  │ id (PK)      │  │ roadmap_id (FK)      │   │
│  │ career_id (FK)   │  │ career_id    │  │ order_no             │   │
│  │ roadmap_id (FK)  │  │ title_vn     │  │ skill_name_en/vn     │   │
│  │ completed_miles  │  │ title_en     │  │ level                │   │
│  │ progress_%       │  └──────────────┘  └──────────────────────┘   │
│  │ last_updated_at  │                                                │
│  └──────────────────┘                                                │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ career_recommendations│  │ skill_gap_analyses                   │ │
│  │ ─────────────────────│  │ ─────────────────────                │ │
│  │ assessment_id (FK)   │  │ user_id (FK)                         │ │
│  │ career_id (FK)       │  │ career_id (varchar — ONET code)      │ │
│  │ score (numeric)      │  │ match_percentage (float)             │ │
│  │ rank (int)           │  │ missing_skills_count (int)           │ │
│  └──────────────────────┘  │ learning_plan_cache (JSONB) ← AI     │ │
│                             └──────────────────────────────────────┘ │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │ careers          │  │ assessment_sessions│                        │
│  │ ──────────       │  │ ──────────────────│                        │
│  │ id (PK)          │  │ id (PK)           │                        │
│  │ slug             │  │ user_id (FK)      │                        │
│  │ title_vi         │  │ created_at        │                        │
│  │ title_en         │  └──────────────────┘                         │
│  │ onet_code        │                                                │
│  └──────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. SECTION 1: LỘ TRÌNH ĐANG HỌC

### 3.1 Logic lấy dữ liệu

**Endpoint:** `GET /api/learning-path/my-roadmaps`

**SQL Query:**
```sql
SELECT 
    r.id AS roadmap_id,
    r.career_id,
    COALESCE(c.title_vi, c.title_en, '') AS career_title,
    c.slug AS career_slug,
    c.onet_code,
    COALESCE(r.title_vn, r.title_en, '') AS roadmap_title,
    COALESCE(up.progress_percentage, 0) AS progress_percentage,
    COALESCE(jsonb_array_length(up.completed_milestones), 0) AS completed_count,
    (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) AS total_milestones,
    up.last_updated_at::text AS last_updated
FROM core.user_progress up
JOIN core.roadmaps r ON r.id = up.roadmap_id
JOIN core.careers c ON c.id = r.career_id
WHERE up.user_id = :user_id
ORDER BY up.last_updated_at DESC
```

### 3.2 Luồng tạo dữ liệu (upstream)

```
User vào /careers/:slug/roadmap
    → Nhấn "Bắt đầu lộ trình" hoặc "Hoàn thành bước"
    → POST /api/careers/:id/roadmap/milestone/:milestoneId/complete
    → Backend tạo/cập nhật record trong core.user_progress:
        - user_id = current user
        - career_id = career đang xem
        - roadmap_id = roadmap của career đó
        - completed_milestones = JSONB array [1, 2, 3...] (order_no đã hoàn thành)
        - progress_percentage = (completed / total) * 100
        - last_updated_at = NOW()
```

### 3.3 Hiển thị UI

- Card với tên nghề (tiếng Việt)
- Progress bar: xanh lá (≥75%), vàng (≥40%), tím (≥10%), xám (<10%)
- Text: "X/Y bước" + ngày cập nhật
- Nút "Tiếp tục học" → navigate đến `/careers/:slug/roadmap`

---

## 4. SECTION 2: LỘ TRÌNH GỢI Ý

### 4.1 Logic lấy dữ liệu

**Endpoint:** `GET /api/learning-path/suggested-roadmaps`

**SQL Query:**
```sql
SELECT 
    cr.career_id, cr.score,
    COALESCE(c.title_vi, c.title_en, '') AS career_title,
    c.slug, c.onet_code,
    r.id AS roadmap_id,
    COALESCE(r.title_vn, r.title_en, '') AS roadmap_title,
    (SELECT COUNT(*) FROM core.roadmap_milestones rm WHERE rm.roadmap_id = r.id) AS total_milestones
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

### 4.2 Luồng tạo dữ liệu (upstream)

```
User hoàn thành bài đánh giá (RIASEC + Big5)
    → POST /api/assessments/submit
    → Backend xử lý:
        1. Tạo record trong core.assessment_sessions (id, user_id, created_at)
        2. Tính điểm RIASEC + Big5
        3. AI-core tìm nghề phù hợp (dựa trên RIASEC codes + personality)
        4. Lưu top 5 nghề vào core.career_recommendations:
            - assessment_id = session.id
            - career_id = FK → careers.id
            - score = điểm phù hợp (0-100)
            - rank = thứ tự (1, 2, 3...)
```

### 4.3 Logic lọc

- Chỉ lấy từ **assessment mới nhất** (`ORDER BY created_at DESC LIMIT 1`)
- **Loại bỏ** nghề user đã bắt đầu học (`NOT IN user_progress`)
- Tối đa **5 gợi ý**

### 4.4 Hiển thị UI

- Card với tên nghề + badge điểm phù hợp (%)
- Màu badge: xanh lá (≥80%), xanh dương (≥60%), tím (<60%)
- Text: "X bước trong lộ trình" + mã ONET
- Nút "Bắt đầu học" → navigate đến `/careers/:slug/roadmap`
- Nút disabled nếu `roadmap_id = NULL` (nghề chưa có roadmap)

---

## 5. SECTION 3: LỘ TRÌNH CÁ NHÂN HÓA TỪ CV

### 5.1 Logic lấy dữ liệu

**Endpoint:** `GET /api/learning-path/skill-gap-plans`

**SQL Query:**
```sql
SELECT 
    sga.id AS analysis_id,
    sga.career_id,
    COALESCE(c1.title_vi, c1.title_en, c2.title_vi, c2.title_en, sga.career_id) AS career_title,
    COALESCE(c1.onet_code, c2.onet_code) AS onet_code,
    sga.match_percentage,
    sga.missing_skills_count,
    sga.learning_plan_cache,
    sga.created_at::text AS created_at
FROM core.skill_gap_analyses sga
LEFT JOIN core.careers c1 ON c1.onet_code = REPLACE(sga.career_id, '-00', '.00')
LEFT JOIN core.careers c2 ON c2.slug = sga.career_id
WHERE sga.user_id = :user_id
  AND sga.learning_plan_cache IS NOT NULL
ORDER BY sga.created_at DESC
LIMIT 3
```

**Lưu ý JOIN đặc biệt:**
- `sga.career_id` lưu dạng `51-4193-00` (dấu gạch)
- `careers.onet_code` lưu dạng `51-4193.00` (dấu chấm)
- → Dùng `REPLACE(sga.career_id, '-00', '.00')` để match
- Fallback: JOIN bằng `slug` nếu career_id là slug (VD: `web-developers-15-1254-00`)

### 5.2 Luồng tạo dữ liệu (upstream — QUAN TRỌNG)

```
User vào /skill-gap → Upload CV → Chọn nghề mục tiêu
    │
    ▼
POST /api/skill-gap/analyze
    │
    ├── 1. Parse CV (PDF/Image → text)
    │       → Trích xuất kỹ năng từ CV (cv_skills)
    │
    ├── 2. Lấy kỹ năng yêu cầu của nghề (job_skills)
    │       → Từ Neo4j graph hoặc ONET database
    │
    ├── 3. So sánh → Tính skill gap
    │       → matched_skills, skill_gaps (critical/important/nice-to-have)
    │       → match_percentage = matched / total_required * 100
    │       → missing_skills_count = total_required - matched
    │
    ├── 4. Lưu vào core.skill_gap_analyses
    │       → id, user_id, career_id, cv_skills, job_skills,
    │         matched_skills, skill_gaps, match_percentage,
    │         missing_skills_count, created_at
    │
    └── 5. (Async) Tạo Learning Plan bằng AI
            │
            ▼
        GET /api/skill-gap/learning-plan/:analysisId
        hoặc SSE streaming endpoint
            │
            ├── Input cho AI (Gemini):
            │     - Kỹ năng còn thiếu (skill_gaps)
            │     - Nghề mục tiêu (career_id)
            │     - Kỹ năng hiện có (cv_skills)
            │
            ├── AI tạo lộ trình học tập:
            │     {
            │       "summary": "Lộ trình 16 tuần...",
            │       "total_weeks": 16,
            │       "phases": [
            │         {
            │           "phase": 1,
            │           "title": "Nền tảng Đọc hiểu...",
            │           "weeks": "Tuần 1-4",
            │           "focus": "Củng cố kỹ năng...",
            │           "skills": ["Reading Comprehension", "Mathematics"],
            │           "resources": [
            │             {"name": "Statistics with R", "type": "course",
            │              "platform": "Coursera", "free": false, "level": "beginner"}
            │           ]
            │         }
            │       ],
            │       "milestones": [
            │         {"week": 4, "title": "Chứng chỉ Thống kê cơ bản", "description": "..."}
            │       ]
            │     }
            │
            └── Cache vào DB:
                  UPDATE core.skill_gap_analyses
                  SET learning_plan_cache = :plan_json
                  WHERE id = :analysis_id
```

### 5.3 Cấu trúc `learning_plan_cache` (JSONB)

```json
{
  "summary": "Lộ trình này tập trung vào việc chuyển đổi từ kỹ năng kỹ thuật...",
  "total_weeks": 16,
  "phases": [
    {
      "phase": 1,
      "title": "Nền tảng Đọc hiểu và Phân tích Dữ liệu Thống kê",
      "weeks": "Tuần 1-4",
      "focus": "Củng cố kỹ năng đọc hiểu tài liệu kỹ thuật và toán học thống kê cơ bản.",
      "skills": ["Reading Comprehension", "Mathematics"],
      "resources": [
        {
          "name": "Statistics with R Specialization",
          "type": "course",
          "platform": "Coursera",
          "free": false,
          "level": "beginner"
        },
        {
          "name": "Introduction to Statistics",
          "type": "course",
          "platform": "Stanford Online",
          "free": true,
          "level": "beginner"
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": 4,
      "title": "Chứng chỉ Thống kê cơ bản",
      "description": "Hoàn thành các kiến thức toán học và đọc hiểu tài liệu thống kê."
    },
    {
      "week": 16,
      "title": "Sẵn sàng cho vai trò 51-4193-00",
      "description": "Hoàn thiện hồ sơ năng lực."
    }
  ]
}
```

### 5.4 Hiển thị UI

- Card header: tên nghề + badges (% phù hợp, số kỹ năng thiếu, số tuần)
- Nút "Xem chi tiết" / "Thu gọn" → toggle expand
- Khi expand: render component `<LearningPlan>` với:
  - Timeline milestones (tuần → chứng chỉ)
  - Accordion phases (mỗi phase có skills + resources)
  - Resources có link tìm kiếm trên Coursera/Udemy/YouTube
  - Badge miễn phí/trả phí, level (Cơ bản/Trung cấp/Nâng cao)
  - Tổng thời gian ước tính

---

## 6. COMPONENT TREE

```
LearningPathPage
├── MainLayout (sidebar + header)
├── Hero (gradient banner)
├── Section 1: Lộ trình đang học
│   ├── Empty state (nếu chưa có) → CTA "Khám phá nghề nghiệp"
│   └── Grid cards
│       └── Card: title + meta + progress bar + "Tiếp tục học"
├── Section 2: Lộ trình gợi ý
│   ├── Empty state (nếu chưa đánh giá) → CTA "Làm bài đánh giá"
│   └── Grid cards
│       └── Card: title + score badge + milestones count + "Bắt đầu học"
└── Section 3: Lộ trình cá nhân hóa từ CV
    ├── Empty state (nếu chưa upload CV) → CTA "Phân tích CV"
    └── Plan cards (expandable)
        ├── Header: career title + tags (%, skills, weeks)
        ├── Summary (collapsed: 2 lines)
        └── LearningPlan component (expanded)
            ├── Timeline milestones (horizontal)
            ├── Phase accordions
            │   ├── Phase header (number, title, weeks, skills tags)
            │   └── Phase detail (skills list + resources links)
            └── Total time estimate
```

---

## 7. API RESPONSE EXAMPLES

### 7.1 `GET /api/learning-path/my-roadmaps`

```json
{
  "roadmaps": [
    {
      "roadmap_id": 456,
      "career_id": 789,
      "career_title": "Đại diện bán hàng, bán buôn và sản xuất",
      "career_slug": "sales-representatives-wholesale-41-4012-00",
      "onet_code": "41-4012.00",
      "roadmap_title": "Lộ trình Đại diện bán hàng",
      "progress_percentage": 40.0,
      "completed_count": 2,
      "total_milestones": 4,
      "last_updated": "2026-05-10 14:30:00+07"
    }
  ]
}
```

### 7.2 `GET /api/learning-path/suggested-roadmaps`

```json
{
  "roadmaps": [
    {
      "career_id": 42,
      "career_title": "Quản lý khoa học tự nhiên",
      "career_slug": "natural-sciences-managers-11-9121-00",
      "onet_code": "11-9121.00",
      "score": 95.0,
      "roadmap_id": 42,
      "roadmap_title": "Lộ trình Quản lý khoa học tự nhiên",
      "total_milestones": 5
    }
  ]
}
```

### 7.3 `GET /api/learning-path/skill-gap-plans`

```json
{
  "plans": [
    {
      "analysis_id": 18,
      "career_id": "51-4193-00",
      "career_title": "Thợ vận hành máy mạ (kim loại và nhựa)",
      "onet_code": "51-4193.00",
      "match_percentage": 29.47,
      "missing_skills_count": 26,
      "learning_plan": {
        "summary": "Lộ trình 16 tuần giúp bạn bổ sung...",
        "total_weeks": 16,
        "phases": [...],
        "milestones": [...]
      },
      "created_at": "2026-05-01 10:00:00+07"
    }
  ]
}
```

---

## 8. ĐIỀU KIỆN TIÊN QUYẾT ĐỂ CÓ DỮ LIỆU

| Section | User cần làm gì trước | Bảng DB được populate |
|---------|----------------------|---------------------|
| 1 | Vào roadmap của 1 nghề → hoàn thành ít nhất 1 milestone | `user_progress` |
| 2 | Hoàn thành bài đánh giá RIASEC + Big5 | `assessment_sessions` + `career_recommendations` |
| 3 | Upload CV tại `/skill-gap` → chọn nghề → AI tạo learning plan | `skill_gap_analyses` (cột `learning_plan_cache`) |

---

## 9. PERFORMANCE

- 3 API gọi **song song** (`Promise.all`) → không chờ tuần tự
- Mỗi API có `.catch(() => [])` → 1 API lỗi không ảnh hưởng 2 API còn lại
- Query dùng `LIMIT` (5 cho suggested, 3 cho plans) → không load quá nhiều
- `learning_plan_cache` là JSONB đã cache sẵn → không cần gọi AI lại
- Component `LearningPlan` chỉ render khi user expand (lazy)

---

## 10. FILES LIÊN QUAN

| Layer | File | Vai trò |
|-------|------|---------|
| Frontend Page | `pages/LearningPathPage.tsx` | Trang chính, 3 sections |
| Frontend CSS | `pages/LearningPathPage.css` | Styles (dark/light mode) |
| Frontend Service | `services/learningPathService.ts` | Gọi 3 API endpoints |
| Frontend Component | `components/skillgap/LearningPlan.tsx` | Render lộ trình học (phases + resources) |
| Frontend Types | `types/skillGap.ts` | Interface LearningPlan, LearningPhase |
| Backend Routes | `modules/learning_path/routes.py` | 3 GET endpoints |
| Backend (upstream) | `modules/skill_gap/service.py` | Tạo skill_gap_analyses |
| Backend (upstream) | `modules/skill_gap/sse_routes.py` | Streaming AI learning plan |
| Backend (upstream) | `modules/content/service_careers.py` | complete_milestone → user_progress |
| Backend (upstream) | `modules/recommendation/service.py` | Tạo career_recommendations |
| App Router | `App.tsx` | Route `/learning-path` → ProtectedRoute → LearningPathPage |
| Backend Main | `main.py` | `include_router(learning_path_router, prefix="/api/learning-path")` |
