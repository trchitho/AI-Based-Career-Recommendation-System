# Hướng Dẫn Phát Triển Tính Năng Mới

> **Dự án:** AI-Based Career Recommendation System  
> **Cập nhật:** 2026-04-23  
> **Đối tượng:** Developer tham gia dự án Capstone

---

## Mục Lục

1. [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
2. [Quy trình thêm tính năng mới](#2-quy-trình-thêm-tính-năng-mới)
3. [Backend — Pattern chuẩn](#3-backend--pattern-chuẩn)
4. [Frontend — Pattern chuẩn](#4-frontend--pattern-chuẩn)
5. [Tính năng Mentor Matching — Thiết kế chi tiết](#5-tính-năng-mentor-matching--thiết-kế-chi-tiết)
6. [Thuật toán Matching](#6-thuật-toán-matching)
7. [Hiệu năng: Indexing, Precompute, Caching](#7-hiệu-năng-indexing-precompute-caching)
8. [Realtime & WebSocket](#8-realtime--websocket)
9. [Seed dữ liệu test](#9-seed-dữ-liệu-test)
10. [Checklist khi tạo tính năng mới](#10-checklist-khi-tạo-tính-năng-mới)

---

## 1. Kiến Trúc Tổng Quan

```
apps/
├── backend/                        # FastAPI + PostgreSQL
│   └── app/
│       ├── core/                   # DB, auth, config, security
│       ├── modules/                # Mỗi tính năng = 1 module
│       │   ├── mentor_matching/    # models, routes, service, schemas
│       │   ├── chat/               # models, routes (chat + schedule)
│       │   ├── roadmap/            # models, routes
│       │   └── ...
│       └── main.py                 # Đăng ký tất cả routers
│
└── frontend/                       # React + Vite + TypeScript
    └── src/
        ├── pages/                  # Page components (1 route = 1 page)
        ├── components/             # Reusable UI components
        ├── services/               # Gọi API (axios wrappers)
        ├── contexts/               # Auth, theme context
        └── types/                  # TypeScript interfaces
```

### Nguyên tắc kiến trúc

| Lớp | Trách nhiệm | Không làm |
|-----|-------------|-----------|
| `routes.py` | Nhận HTTP request, validate, trả response | Chứa business logic |
| `service.py` | Business logic, query DB, tính toán | Biết về HTTP |
| `models.py` | SQLAlchemy ORM models | Logic nghiệp vụ |
| `schemas.py` | Pydantic request/response schemas | DB queries |
| `services/*.ts` | Gọi API, trả data cho component | UI rendering |
| `components/` | Render UI, handle user events | Gọi API trực tiếp |

---

## 2. Quy Trình Thêm Tính Năng Mới

### Bước 1 — Tạo module backend

```
apps/backend/app/modules/<ten_tinh_nang>/
    __init__.py
    models.py       # SQLAlchemy models
    schemas.py      # Pydantic schemas
    service.py      # Business logic
    routes.py       # FastAPI router
```

### Bước 2 — Đăng ký router trong `main.py`

```python
# apps/backend/app/main.py
from app.modules.ten_tinh_nang.routes import router as ten_router
app.include_router(ten_router)
```

### Bước 3 — Tạo service frontend

```
apps/frontend/src/services/tenTinhNangService.ts
```

### Bước 4 — Tạo/cập nhật component và page

```
apps/frontend/src/components/ten_tinh_nang/
apps/frontend/src/pages/TenTinhNangPage.tsx
```

### Bước 5 — Đăng ký route trong `App.tsx`

```tsx
<Route path="/ten-tinh-nang" element={<TenTinhNangPage />} />
```

---

## 3. Backend — Pattern Chuẩn

### 3.1 Model (SQLAlchemy)

```python
# models.py
from sqlalchemy import BigInteger, Column, String, Text, TIMESTAMP, func
from app.core.db import Base

class TenModel(Base):
    __tablename__ = "ten_bang"
    __table_args__ = {"schema": "core"}   # LUÔN dùng schema "core"

    id         = Column(BigInteger, primary_key=True)
    user_id    = Column(BigInteger, nullable=False)
    noi_dung   = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
```

> **Lưu ý:** Tất cả table đều dùng `schema="core"`. Không tạo schema mới.

### 3.2 Schema (Pydantic)

```python
# schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TenCreate(BaseModel):
    noi_dung: str
    user_id: Optional[int] = None

class TenOut(BaseModel):
    id: int
    noi_dung: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### 3.3 Routes (FastAPI)

```python
# routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User

router = APIRouter(prefix="/api/ten-tinh-nang", tags=["ten-tinh-nang"])

@router.get("/")
def list_items(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    # gọi service
    ...

@router.post("/")
def create_item(
    body: TenCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    ...
```

### 3.4 Auto-tạo bảng

```python
# Đặt ở đầu routes.py, sau khi import models
from app.core.db import Base, engine
try:
    Base.metadata.create_all(bind=engine, tables=[TenModel.__table__])
except Exception as e:
    print(f"Table init: {e}")
```

---

## 4. Frontend — Pattern Chuẩn

### 4.1 Service (axios wrapper)

```typescript
// services/tenService.ts
import api from '../lib/api';

export interface TenItem {
  id: number;
  noi_dung: string;
  created_at: string;
}

class TenService {
  async getList(): Promise<TenItem[]> {
    const res = await api.get('/api/ten-tinh-nang/');
    return res.data;
  }

  async create(noiDung: string): Promise<TenItem> {
    const res = await api.post('/api/ten-tinh-nang/', { noi_dung: noiDung });
    return res.data;
  }
}

export const tenService = new TenService();
```

### 4.2 Page component

```tsx
// pages/TenPage.tsx
import { useState, useEffect } from 'react';
import { tenService, TenItem } from '../services/tenService';

const TenPage = () => {
  const [items, setItems] = useState<TenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenService.getList()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.noi_dung}</div>
      ))}
    </div>
  );
};

export default TenPage;
```

### 4.3 Proxy WebSocket (vite.config.ts)

```typescript
// Đã cấu hình sẵn, không cần sửa thêm
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/ws':  { target: 'ws://localhost:8000',  ws: true, changeOrigin: true },
    '/bff': { target: 'http://localhost:8000', changeOrigin: true },
  }
}
```

---

## 5. Tính Năng Mentor Matching — Thiết Kế Chi Tiết

### 5.1 Hai nguồn dữ liệu (Dual Source)

Hệ thống matching hoạt động theo **2 hướng song song**, kết hợp kết quả, sort theo điểm rồi trả top 10:

```
┌──────────────────────────────────────────────────────────┐
│                  find_mentors_for_mentee()                │
│                                                          │
│  SOURCE 1                        SOURCE 2                │
│  mentor_profiles table           user_progress table     │
│  ─────────────────               ──────────────────      │
│  User đăng ký làm mentor         User hoàn thành bước    │
│  có hồ sơ chuyên môn             roadmap của một nghề    │
│                                                          │
│  Scoring:                        Scoring:                │
│  Skill overlap × 0.50            base_score từ % hoàn   │
│  Career match  × 0.30            thành roadmap           │
│  Personality   × 0.20            + skill/career overlap  │
│                                                          │
│          └──────────── merge + dedup ──────────┘         │
│                    sort by score DESC                    │
│                       return top 10                      │
└──────────────────────────────────────────────────────────┘
```

#### Source 1 — Mentor đăng ký hồ sơ

**Files:**
- Model: `app/modules/mentor_matching/models.py` → `MentorProfile`
- Logic: `app/modules/mentor_matching/service.py` → `find_mentors_for_mentee()`
- Algorithm: `app/modules/mentor_matching/matching_algorithm.py`

**Dữ liệu cần:**
```
mentor_profiles {
    expertise_areas: ["Python", "React", "AWS"]   ← so với desired_skills mentee
    current_position: "Software Engineer"          ← so với target_career mentee
    riasec_scores: {"I": 4.2, "E": 3.5, ...}     ← cosine similarity với mentee
    big_five_scores: {"openness": 4.0, ...}
}
```

**Seed dữ liệu test:**
```bash
cd apps/backend
python seed_mentors.py   # tạo 12 mentor profiles demo
```

#### Source 2 — User hoàn thành roadmap

**Files:**
- Model: `app/modules/roadmap/models.py` → `UserProgress`, `RoadmapMilestone`
- Logic: `service.py` → block `# Source 2` (dòng 178-282)

**Cách hoạt động:**
1. Lấy `UserProgress` có `completed_milestones` không rỗng
2. Nếu mentee có `target_career` → lọc theo career phù hợp
3. Nếu mentee không có → lấy tất cả user có progress
4. `base_score = min(0.5 + progress_percentage / 200, 0.95)` ← càng hoàn thành nhiều, điểm càng cao
5. `final_score = max(algorithm_score, base_score)`

**Hiển thị:** User Source 2 xuất hiện với badge "Đã hoàn thành X bước lộ trình {career}"

### 5.2 Career-specific matching (endpoint riêng)

Dùng khi hiển thị mentor cho một nghề cụ thể (trang Career Detail, Roadmap):

```
GET /api/mentor-matching/career-mentors
    ?career_title=Software+Engineer
    &career_slug=software-engineer
    &limit=5
```

**File:** `app/modules/mentor_matching/routes.py` → `@router.get("/career-mentors")`

Luồng:
1. Tìm Career trong DB theo `career_slug` (ưu tiên) hoặc `career_title` (ilike)
2. Lấy `UserProgress` của career đó
3. Fallback: nếu không tìm được career → lấy tất cả `UserProgress`

### 5.3 Database schema

```sql
-- mentor_profiles: user tự đăng ký làm mentor
core.mentor_profiles (
    id, user_id, full_name, current_position, company, bio,
    expertise_areas TEXT[],           -- mảng kỹ năng
    experience_years, available_hours_per_week,
    preferred_communication TEXT[],
    max_mentees, current_mentees_count,
    riasec_scores JSONB,              -- {"R":3.5,"I":4.0,"A":2.0,"S":3.8,"E":4.2,"C":3.1}
    big_five_scores JSONB,            -- {"openness":4.1,...}
    is_active BOOLEAN
)

-- mentee_profiles: user tìm mentor
core.mentee_profiles (
    id, user_id, full_name, target_career,
    current_skills TEXT[],
    desired_skills TEXT[],            -- so sánh với expertise_areas của mentor
    riasec_scores JSONB,
    big_five_scores JSONB
)

-- mentorship_requests: yêu cầu kết nối
core.mentorship_requests (
    id, mentee_id → mentee_profiles.id,
    mentor_id → mentor_profiles.id,
    compatibility_score FLOAT,
    status TEXT,    -- pending / accepted / rejected
    message TEXT, response_message TEXT
)
```

---

## 6. Thuật Toán Matching

### 6.1 Công thức tổng quát

```
overall_score = skill_match × 0.50
              + career_match × 0.30
              + personality_sim × 0.20    ← chỉ khi cả 2 có dữ liệu RIASEC/Big5

# Khi không có personality data:
overall_score = skill_match × 0.60
              + career_match × 0.40
```

**File:** `matching_algorithm.py` → `calculate_overall_compatibility()`

### 6.2 Skill Match (50%)

```python
def calculate_skill_match(desired_skills, mentor_expertise):
    # Case-insensitive substring matching
    # "react" matches "React Native", "TypeScript" matches "typescript"
    matched = set()
    for d in desired_skills:
        for e in mentor_expertise:
            if d.lower() in e.lower() or e.lower() in d.lower():
                matched.add(d)
    score = len(matched) / len(desired_skills)
    return score, list(matched)
```

**Ví dụ:**
```
mentee.desired_skills = ["Python", "Machine Learning", "SQL", "React"]
mentor.expertise_areas = ["Python", "TensorFlow", "SQL", "Data Analysis"]

matched = {"Python", "SQL"}  → score = 2/4 = 0.50
```

### 6.3 Career Match (30%)

```python
def calculate_career_match(mentee_target, mentor_position, mentor_expertise):
    keywords = [w for w in mentee_target.split() if len(w) > 3]
    hits = sum(1 for kw in keywords
               if kw in mentor_position.lower() or kw in expertise_str.lower())
    return min(hits / len(keywords), 1.0)
```

**Ví dụ:**
```
mentee.target_career = "Software Engineer"
keywords = ["Software", "Engineer"]

mentor_position = "Senior Software Engineer at FPT"
hits = 2  → score = 2/2 = 1.0
```

### 6.4 Personality Similarity (20%) — Cosine Similarity

```python
def calculate_personality_similarity(mentee_riasec, mentee_big5, mentor_riasec, mentor_big5):
    # Vector 11 chiều: [R,I,A,S,E,C, openness,conscientiousness,extraversion,agreeableness,neuroticism]
    mentee_vec = [mentee_riasec.get(k,0) for k in RIASEC_KEYS] + [mentee_big5.get(k,0) for k in BIG5_KEYS]
    mentor_vec = [mentor_riasec.get(k,0) for k in RIASEC_KEYS] + [mentor_big5.get(k,0) for k in BIG5_KEYS]

    # cosine_sim(u,v) = (u·v) / (|u|×|v|)
    dot = sum(a*b for a,b in zip(mentee_vec, mentor_vec))
    return dot / (norm(mentee_vec) * norm(mentor_vec))
```

**Lưu ý:** Nếu cả hai bên **đều chưa làm assessment** → trả 0.5 (neutral), không ảnh hưởng matching.

### 6.5 Source 2 Scoring

```python
# base_score tăng tuyến tính theo % hoàn thành roadmap
base_score = min(0.5 + progress_percentage / 200, 0.95)
# 0%   → 0.50
# 50%  → 0.75
# 100% → 0.95

# Lấy max để không bị thuật toán hạ xuống dưới base
final_score = max(algorithm_overall_score, base_score)
```

### 6.6 Ngưỡng lọc

```python
MATCH_THRESHOLD = 0.10  # loại mentor có score < 10%
# Source 2 không áp dụng threshold (base_score luôn >= 0.50)
```

---

## 7. Hiệu Năng: Indexing, Precompute, Caching

### 7.1 Vấn đề khi mạng lưới lớn

Khi DB có hàng nghìn mentor và mentee:

| Vấn đề | Nguyên nhân | Triệu chứng |
|--------|-------------|-------------|
| Query chậm | Full table scan `mentor_profiles` | `/find` > 3s |
| N+1 queries | Lấy từng mentor riêng lẻ | N × SELECT |
| Tính lại mỗi lần | Score không được cache | CPU cao |

### 7.2 Database Indexing

Thêm index vào các cột thường xuyên filter/sort:

```sql
-- Thêm vào migration hoặc models.py
CREATE INDEX idx_mentor_profiles_active
    ON core.mentor_profiles (is_active, current_mentees_count)
    WHERE is_active = true;

CREATE INDEX idx_mentor_profiles_expertise
    ON core.mentor_profiles USING GIN (expertise_areas);   -- GIN cho ARRAY

CREATE INDEX idx_user_progress_career
    ON core.user_progress (career_id, user_id);

CREATE INDEX idx_user_progress_completed
    ON core.user_progress USING GIN (completed_milestones);
```

**Trong SQLAlchemy model:**
```python
from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import ARRAY

# Trong class MentorProfile:
__table_args__ = (
    Index("idx_mentor_active", "is_active", "current_mentees_count"),
    {"schema": "core"},
)
```

### 7.3 Precomputed Relationships

Tính toán trước compatibility scores và lưu vào bảng cache:

```sql
-- Bảng precomputed scores
CREATE TABLE core.mentor_match_scores (
    mentee_id    BIGINT NOT NULL,
    mentor_id    BIGINT NOT NULL,
    score        FLOAT  NOT NULL,
    skill_score  FLOAT,
    career_score FLOAT,
    personality_score FLOAT,
    computed_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (mentee_id, mentor_id)
);
CREATE INDEX ON core.mentor_match_scores (mentee_id, score DESC);
```

**Khi nào recompute:**
- Mentor cập nhật `expertise_areas` → recompute cho tất cả mentee
- Mentee cập nhật `desired_skills` → recompute cho mentee đó
- Chạy cronjob mỗi 6h để refresh toàn bộ

```python
# service.py — precompute job
def precompute_all_scores(db: Session):
    mentees = db.query(MenteeProfile).all()
    mentors = db.query(MentorProfile).filter(MentorProfile.is_active == True).all()

    for mentee in mentees:
        for mentor in mentors:
            score = _compute_score(mentee, mentor)
            db.merge(MentorMatchScore(
                mentee_id=mentee.id,
                mentor_id=mentor.id,
                score=score,
            ))
    db.commit()
```

**API khi có precomputed:**
```python
# Thay vì tính mỗi lần:
results = db.query(MentorMatchScore)\
    .filter(MentorMatchScore.mentee_id == mentee.id)\
    .order_by(MentorMatchScore.score.desc())\
    .limit(10).all()
```

### 7.4 In-Memory Caching (Redis hoặc dict đơn giản)

**Caching đơn giản với Python dict (dev/staging):**

```python
# app/core/cache.py — đã có trong project
import time
from typing import Any, Optional

_cache: dict = {}

def cache_get(key: str) -> Optional[Any]:
    if key in _cache:
        value, expires = _cache[key]
        if expires > time.time():
            return value
        del _cache[key]
    return None

def cache_set(key: str, value: Any, ttl: int = 300):
    _cache[key] = (value, time.time() + ttl)
```

**Dùng trong routes:**
```python
@router.get("/find")
def find_mentors(current_user: User = Depends(...), db = Depends(get_db)):
    cache_key = f"mentors:{current_user.id}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    results = service.find_mentors_for_mentee(current_user.id)
    cache_set(cache_key, results, ttl=300)  # cache 5 phút
    return results
```

**Invalidate cache khi mentee cập nhật profile:**
```python
@router.post("/mentee/profile")
def update_mentee_profile(body, current_user, db):
    service.create_or_update_mentee_profile(current_user.id, body)
    cache_del(f"mentors:{current_user.id}")   # xóa cache cũ
    return {"message": "Profile updated"}
```

**Production — Redis:**
```python
import redis
r = redis.Redis(host="localhost", port=6379)

def cache_get(key): return r.get(key)
def cache_set(key, value, ttl=300): r.setex(key, ttl, json.dumps(value))
```

### 7.5 Tóm tắt chiến lược theo scale

| Scale | Giải pháp |
|-------|-----------|
| < 100 mentors | Tính realtime, không cần cache |
| 100 – 1000 | GIN index + in-memory dict cache 5 phút |
| 1000 – 10000 | Precomputed scores + Redis cache |
| > 10000 | Graph DB (Neo4j) + precomputed + Redis |

---

## 8. Realtime & WebSocket

### 8.1 Pattern hiện tại

```
Client A ──POST /api/chat/{id}/send──► Backend ──► DB (lưu)
                                              ──► WS broadcast (room)
                                              ──► WS notify (recipient)
Client B ──WS /ws/chat/{room_id}──► Nhận message realtime
Client B ──WS /ws/notifications──► Nhận thông báo
```

### 8.2 Thêm sự kiện WebSocket mới

```python
# app/modules/realtime/ws_notifications.py
from app.modules.realtime.ws_notifications import manager as nm

# Gửi đến một user cụ thể
await nm.send(user_id, {
    "type": "ten_su_kien",    # frontend lắng nghe theo type này
    "data": {...},
})
```

**Frontend lắng nghe:**
```typescript
// Trong useEffect của component
useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const ws = new WebSocket(`ws://localhost:8000/ws/notifications?token=${token}`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ten_su_kien') {
            // xử lý
        }
    };

    return () => ws.close();
}, []);
```

### 8.3 WS Proxy (Vite)

```typescript
// vite.config.ts — đã cấu hình
'/ws': { target: 'ws://localhost:8000', ws: true, changeOrigin: true }
```

---

## 9. Seed Dữ Liệu Test

### 9.1 Mentor profiles

```bash
cd apps/backend
python seed_mentors.py
# Tạo 12 mentor profiles với kỹ năng đa dạng
# Password: Demo@123456
```

### 9.2 Mentor profiles được tạo

| Email | Vị trí | Kỹ năng chính |
|-------|--------|---------------|
| mentor_software@demo.com | Senior Software Engineer @ FPT | Python, React, Node.js, AWS |
| mentor_data@demo.com | Data Scientist @ VNG | ML, TensorFlow, SQL, Python |
| mentor_ux@demo.com | UX/UI Design Lead @ Tiki | Figma, UX Research |
| mentor_pm@demo.com | Product Manager @ Shopee | Agile, SQL, A/B Testing |
| mentor_devops@demo.com | DevOps Engineer @ Grab | Kubernetes, Docker, AWS |
| mentor_marketing@demo.com | Digital Marketing Manager @ Vinamilk | SEO, Google Ads |
| mentor_finance@demo.com | Financial Analyst @ Techcombank | Excel, IFRS |
| mentor_teacher@demo.com | Education Specialist @ VUS | Curriculum Design, Teaching |
| mentor_cybersec@demo.com | Cybersecurity Engineer @ VNPT | Penetration Testing |
| mentor_hr@demo.com | HR Business Partner @ Masan | Recruitment, Talent Dev |
| mentor_mobile@demo.com | Mobile Developer @ MoMo | React Native, Flutter |
| mentor_accounting@demo.com | Chief Accountant @ PwC | ACCA, IFRS, SAP |

### 9.3 Để test matching hoạt động tốt

Mentee cần có ít nhất một trong:
- `target_career` (nghề mục tiêu)
- `desired_skills` (kỹ năng muốn học)

Hệ thống tự động tạo từ:
- Assessment kết quả (`career_recommendations`)
- CV upload (`skill_gaps`)

Hoặc điền thủ công trong tab "Tìm Mentor" → form.

---

## 10. Checklist Khi Tạo Tính Năng Mới

### Backend

- [ ] Tạo `models.py` với `__table_args__ = {"schema": "core"}`
- [ ] Thêm `Base.metadata.create_all(tables=[...])` vào đầu `routes.py`
- [ ] Tạo `schemas.py` với Pydantic models (request + response)
- [ ] Tạo `service.py` tách biệt business logic khỏi routes
- [ ] Đặt `prefix="/api/..."` trong router
- [ ] Dùng `Depends(get_current_user_from_token)` cho các route cần auth
- [ ] Đăng ký router trong `app/main.py`
- [ ] Xử lý lỗi với `HTTPException(status_code, detail="...")`
- [ ] Thêm index cho các cột filter thường xuyên

### Frontend

- [ ] Tạo `services/tenService.ts` với TypeScript interfaces
- [ ] Gọi API trong service, không gọi thẳng trong component
- [ ] Tạo page component trong `pages/`
- [ ] Tạo sub-components trong `components/ten_tinh_nang/`
- [ ] Handle loading + error + empty state
- [ ] Đăng ký route trong `App.tsx`
- [ ] Không gọi `getMentorProfile` (hoặc API có thể 404) khi init — gọi lazy theo tab

### WebSocket (nếu cần realtime)

- [ ] Backend: dùng `manager.send(user_id, {...})` từ `ws_notifications`
- [ ] Frontend: mở WS trong `useEffect`, đóng khi cleanup
- [ ] Phân biệt `type` để handle đúng loại sự kiện
- [ ] Fallback polling nếu WS không available

### Hiệu năng

- [ ] Thêm GIN index cho ARRAY/JSONB columns
- [ ] Cache kết quả tốn CPU (TTL 5–30 phút)
- [ ] Invalidate cache khi data thay đổi
- [ ] Không load toàn bộ bảng — dùng `.limit()` và `.offset()`

---

*Tài liệu này mô tả state hiện tại của dự án. Cập nhật khi có thay đổi kiến trúc lớn.*
