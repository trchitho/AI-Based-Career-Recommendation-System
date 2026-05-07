# Báo Cáo Kỹ Thuật: Chức Năng Roadmap & Course Recommendation

**Dự án:** AI-Based Career Recommendation System (SRC)  
**Module:** `courses` + `roadmap` + `careers`  
**Ngày:** 23/04/2026  
**Nhóm:** C1SE.29

---

## 1. Tổng Quan Chức Năng

Hệ thống cung cấp hai chức năng liên quan chặt chẽ:

1. **Career Roadmap** — Lộ trình học tập theo từng nghề nghiệp, chia theo milestone/level, có theo dõi tiến độ người dùng.
2. **Course Recommendation** — Gợi ý khóa học phù hợp với kỹ năng còn thiếu, sử dụng embedding SBERT + Neo4j + PostgreSQL.

---

## 2. Kiến Trúc Tổng Thể

```
Frontend (Next.js)
       │
       ▼
FastAPI Backend
       │
       ├── /api/careers/{id}/roadmap          ← Roadmap endpoint
       ├── /api/careers/{id}/trait-evidence   ← RIASEC evidence
       ├── /api/courses/recommend             ← Course recommendation
       ├── /api/courses/search                ← Course search
       └── /api/courses/admin/*               ← Pipeline management
              │
              ├── PostgreSQL (course_catalog, course_skill_map, roadmaps, roadmap_milestones, user_progress)
              └── Neo4j     (:Course)-[:TEACHES]->(:Skill)
```

---

## 3. Module Roadmap

### 3.1 Database Models

**File:** `app/modules/roadmap/models.py`

| Model | Bảng | Mô tả |
|-------|------|-------|
| `Roadmap` | `core.roadmaps` | Lộ trình gắn với một nghề (`career_id`) |
| `RoadmapMilestone` | `core.roadmap_milestones` | Từng bước học trong lộ trình |
| `UserProgress` | `core.user_progress` | Tiến độ của user trên một roadmap |

**Schema `RoadmapMilestone`:**

```python
id                 BigInteger  PK
roadmap_id         BigInteger  FK → roadmaps.id
order_no           Integer     Thứ tự hiển thị
skill_name         Text        Tên kỹ năng/bước
description        Text        Mô tả chi tiết
estimated_duration Text        Thời gian ước tính (vd: "2 weeks")
resources_json     JSONB       Danh sách tài nguyên học tập
level              Integer     Cấp độ (1–6), dùng cho subscription gate
```

**Schema `UserProgress`:**

```python
user_id                BigInteger
career_id              BigInteger
roadmap_id             BigInteger
completed_milestones   JSONB   # list[str] — milestone IDs đã hoàn thành
milestone_completions  JSONB   # dict[str, datetime] — thời điểm hoàn thành
current_milestone_id   BigInteger
progress_percentage    Text    # "0" → "100.0"
```

### 3.2 API Endpoints

#### `GET /api/careers/{career_id}/roadmap`

**Auth:** Bắt buộc (JWT Bearer)

**Logic:**

```
1. Xác thực user (require_user)
2. Gọi svc.get_roadmap(session, user_id, career_id)
   ├── Resolve career theo slug hoặc ONET code
   ├── Tìm Roadmap theo career_id
   │   └── Nếu chưa có → tạo roadmap demo (3 milestone mặc định)
   ├── Load tất cả RoadmapMilestone (ORDER BY order_no ASC)
   └── Load UserProgress của user
3. Kiểm tra subscription (SubscriptionService)
4. Gắn "locked" flag vào từng level nếu user là free
5. Trả về data + levels + upgrade_required
```

**Response mẫu:**

```json
{
  "id": "12",
  "careerId": "45",
  "careerTitle": "Data Scientist",
  "milestones": [
    {
      "order": 1,
      "skillName": "Python Fundamentals",
      "description": "...",
      "estimatedDuration": "2 weeks",
      "resources": [{"title": "...", "url": "...", "type": "course"}],
      "level": 1
    }
  ],
  "levels": [
    {
      "level": 1,
      "title": "Python Fundamentals",
      "description": "...",
      "milestones": [...],
      "locked": false,
      "upgrade_required": false
    },
    {
      "level": 2,
      "title": "Machine Learning",
      "description": "🔒 Upgrade to unlock...",
      "milestones": [],
      "locked": true,
      "upgrade_required": true
    }
  ],
  "userProgress": {
    "completed_milestones": ["1"],
    "progress_percentage": 33.33
  },
  "upgrade_required": true,
  "max_free_level": 1
}
```

#### `POST /api/careers/{career_id}/roadmap/milestone/{milestone_id}/complete`

**Auth:** Bắt buộc

**Logic:**

```
1. Resolve career → roadmap
2. Upsert UserProgress (tạo mới nếu chưa có)
3. Thêm milestone_id vào completed_milestones (set, tránh trùng)
4. Ghi timestamp vào milestone_completions
5. Tính lại progress_percentage = len(completed) / total * 100
6. Commit và trả về {status, completed, progress}
```

### 3.3 Subscription Gate

**File:** `app/services/subscription_service.py`

```python
def can_view_roadmap_level(db, user_id, level) -> tuple[bool, str]:
    plan = SubscriptionService.get_user_plan(db, user_id)
    if plan.get("can_view_full_roadmap"):
        return True, ""
    max_level = plan.get("max_roadmap_level", 1)
    # -1 = unlimited
```

| Plan | `max_roadmap_level` | `can_view_full_roadmap` |
|------|---------------------|------------------------|
| Free | 1 | False |
| Pro  | -1 (unlimited) | True |

### 3.4 Trait Evidence (RIASEC)

**File:** `app/modules/careers/service_trait_evidence.py`

Endpoint `GET /api/careers/{career_id}/trait-evidence` trả về bằng chứng tính cách phù hợp dựa trên kết quả RIASEC của user.

**Flow:**

```
1. Lấy top RIASEC dimension của user (R/I/A/S/E/C) từ riasec_fused hoặc riasec_test
2. Lấy RIASEC tags của career từ career_riasec_map
3. Chọn scale phù hợp:
   - Ưu tiên: tag nào bắt đầu bằng user's top dimension
   - Fallback: chữ cái đầu của tag đầu tiên
4. Lấy assessment RIASEC gần nhất của user
5. Query assessment_responses theo pattern (S%, RIASEC_S_%, s%)
6. Trả về TraitEvidenceDTO {scale, items[]}
```

**Lỗi đang xảy ra trong log:**

```
WARNING | No RIASEC tags found for career: 53-7071-00
WARNING | No RIASEC tags for career 53-7071-00, returning empty evidence
```

**Nguyên nhân:** Career `53-7071-00` chưa có dữ liệu trong bảng `career_riasec_map`. Đây là vấn đề dữ liệu, không phải lỗi code.

---

## 4. Module Course Recommendation

### 4.1 Database Models

**File:** `app/modules/courses/models.py`

| Model | Bảng | Mô tả |
|-------|------|-------|
| `CourseCatalog` | `core.course_catalog` | Danh mục khóa học |
| `CourseSkillMap` | `core.course_skill_map` | Mapping course ↔ skill với cosine score |

**Schema `CourseCatalog`:**

```python
external_id   VARCHAR(255) UNIQUE   # "udemy-python-bootcamp"
title         VARCHAR(500)
description   Text
url           VARCHAR(1000)
platform      VARCHAR(50)           # "udemy" | "coursera" | "linkedin"
rating        Float
is_free       Boolean
level         VARCHAR(50)           # "beginner" | "intermediate" | "advanced"
tags          ARRAY(String)
embedding     ARRAY(Float)          # SBERT 384-dim vector
is_embedded   Boolean
```

### 4.2 Pipeline 4 Bước

```
Seed → Embed → Map → Recommend
```

#### Bước 1: Seed (`service.seed_courses`)

- Load 47 khóa học tĩnh từ `seed_data.py` vào PostgreSQL
- Idempotent: skip nếu `external_id` đã tồn tại
- Chạy tự động khi server khởi động

**Danh sách khóa học seed (47 courses):**

| Chủ đề | Số lượng | Ví dụ |
|--------|----------|-------|
| Python | 3 | Complete Python Bootcamp, Crash Course on Python |
| Machine Learning | 2 | ML Specialization (Andrew Ng), ML A-Z |
| Deep Learning | 2 | Deep Learning Specialization, PyTorch |
| Data Science | 2 | IBM Data Science, Data Analysis with Pandas |
| Web Dev | 4 | Web Dev Bootcamp, React Complete Guide |
| Java | 1 | Java Programming Masterclass |
| Docker/K8s | 2 | Docker & Kubernetes, GKE |
| Cloud | 2 | AWS SAA, Azure AZ-900 |
| NLP/LLM | 2 | NLP Specialization, LLM Engineering |
| SQL | 2 | SQL Bootcamp, Databases & SQL |
| ... | ... | ... |

#### Bước 2: Embed (`service.run_embedding_pipeline`)

**File:** `app/modules/courses/embedder.py`

```python
# Ưu tiên 1: SBERT all-MiniLM-L6-v2 (384-dim)
model = SentenceTransformer("all-MiniLM-L6-v2")
vec = model.encode(f"{title}. {description}", normalize_embeddings=True)

# Fallback: Gemini text-embedding-004
result = genai.embed_content(model="models/text-embedding-004", content=text)
```

- Batch size: 32 courses/lần
- Lưu vector vào `course_catalog.embedding` (ARRAY(Float))
- Đánh dấu `is_embedded = True` sau khi embed

#### Bước 3: Build Skill Map (`service.build_skill_course_map`)

```python
MIN_SIMILARITY = 0.40  # Ngưỡng cosine similarity tối thiểu

for skill in skills:
    skill_vec = embed(skill)
    for course in embedded_courses:
        score = cosine_similarity(skill_vec, course.embedding)
        if score >= MIN_SIMILARITY:
            upsert CourseSkillMap(course_id, skill_name, score)
```

**Danh sách 46 skills mặc định:**

```
Python, SQL, Machine Learning, Data Science, Deep Learning, NLP,
Statistics, Data Visualization, Tableau, Power BI, Excel,
JavaScript, TypeScript, React, Node.js, Java, Docker, Kubernetes,
AWS, Azure, GCP, Linux, Git, CI/CD, DevOps, Cybersecurity,
Networking, Algorithms, Data Structures, FastAPI, REST API,
GraphQL, MongoDB, PostgreSQL, Spring Boot, Microservices,
Agile, Scrum, Project Management, Leadership, Communication,
TensorFlow, PyTorch, Computer Vision, R, Linear Algebra, UX Design
```

#### Bước 4: Recommend (`service.recommend_courses_for_skills`)

**3-tier fallback strategy:**

```
1️⃣ Neo4j query (nhanh nhất, graph-based)
   MATCH (c:Course)-[r:TEACHES]->(s:Skill {name: skill})
   ORDER BY r.score DESC LIMIT top_k * len(skills)

2️⃣ PostgreSQL course_skill_map (pre-computed)
   JOIN CourseSkillMap + CourseCatalog
   WHERE skill_name = skill ORDER BY similarity_score DESC

3️⃣ On-the-fly embedding (chậm nhất, fallback cuối)
   Embed skills → cosine_similarity với tất cả embedded courses
   Cap 500 courses để tránh timeout
```

**Relevance labels:**

| Score | Label |
|-------|-------|
| ≥ 0.70 | Highly Relevant |
| ≥ 0.50 | Relevant |
| < 0.50 | Related |

### 4.3 Web Crawler

**File:** `app/modules/courses/crawler.py`

Hỗ trợ 3 platform, không cần API key:

| Platform | Chiến lược | Ghi chú |
|----------|-----------|---------|
| **Coursera** | Public REST API `api.coursera.org/api/courses.v1` | Đang bị HTTP 405 (xem mục 6) |
| **Udemy** | Parse `window.ud_api_cache` JSON blob từ HTML | 4 fallback strategies |
| **LinkedIn** | JSON-LD + HTML card scraping | Cần `LINKEDIN_SESSION_COOKIE` |

**Udemy parsing strategies (theo thứ tự ưu tiên):**

1. `window.ud_api_cache` JSON blob
2. `__NEXT_DATA__` (Next.js)
3. JSON-LD structured data
4. HTML card scraping

**Polite crawling:**

```python
_MIN_DELAY = 1.2  # giây
_MAX_DELAY = 2.8  # giây
# Rotate 4 User-Agent strings để tránh block
```

### 4.4 Neo4j Sync

**File:** `app/modules/courses/neo4j_sync.py`

**Schema Neo4j:**

```cypher
(:Course {external_id, db_id, title, url, platform, level, rating, is_free})
    -[:TEACHES {score: float}]->
(:Skill {name})
```

**Sync flow:**

```
1. Upsert Course nodes (MERGE on external_id)
2. Upsert TEACHES relationships (batch 100)
   MERGE (s:Skill {name: $skill})
   MATCH (c:Course {external_id: $eid})
   MERGE (c)-[r:TEACHES]->(s)
   SET r.score = $score
```

### 4.5 Admin Endpoints

| Endpoint | Mô tả |
|----------|-------|
| `POST /api/courses/admin/seed` | Load static dataset |
| `POST /api/courses/admin/embed` | Embed un-embedded courses (background) |
| `POST /api/courses/admin/build-map` | Rebuild skill-course map (background) |
| `POST /api/courses/admin/sync-neo4j` | Sync to Neo4j (background) |
| `POST /api/courses/admin/run-all` | Full pipeline: seed→embed→map→neo4j |
| `POST /api/courses/admin/crawl` | Web crawl + auto re-embed |
| `GET /api/courses/admin/status` | Pipeline status |

**Background task pattern:**

```python
# Tất cả admin tasks dùng session riêng để tránh conflict với request session
_BgSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def _with_new_session(fn):
    def wrapper(*args, **kwargs):
        db = _BgSession()
        try:
            fn(db, *args, **kwargs)
            db.commit()
        except Exception as exc:
            db.rollback()
            raise exc
        finally:
            db.close()
    return wrapper
```

### 4.6 Public Endpoints

#### `GET /api/courses/recommend`

```
Query params:
  skills: list[str]  (required) — danh sách kỹ năng còn thiếu
  top_k:  int        (1-10, default 3) — số khóa học mỗi skill

Response: CourseRecommendationsResponse
  {missing_skills, recommendations[], total, source}
```

#### `GET /api/courses/search`

```
Query params:
  q:        str      (required, min 2 chars)
  platform: str      (optional)
  level:    str      (optional)
  is_free:  bool     (optional)
  limit:    int      (1-50, default 20)

Logic: ILIKE search trên title + description, ORDER BY rating DESC
```

---

## 5. Startup Pipeline

Khi server khởi động, một background thread chạy sau 3 giây:

```
1. seed_courses()          → 0 inserted, 47 skipped (đã có)
2. run_embedding_pipeline() → skip nếu all embedded
3. build_skill_course_map() → skip nếu map_count > 0 (88 pairs)
4. run_crawl(platforms=["coursera"], keywords=[7 kws])
   → HTTP 405 từ Coursera API (xem mục 6)
5. sync_courses_to_neo4j()
   → AuthenticationRateLimit từ Neo4j (xem mục 6)
```

---

## 6. Phân Tích Lỗi Từ Log

### 6.1 Coursera API HTTP 405

```
HTTP 405 fetching https://api.coursera.org/api/courses.v1: 405 Method Not Allowed
```

**Nguyên nhân:** Coursera đã thay đổi API, endpoint `courses.v1` không còn hỗ trợ GET với query params này.

**Ảnh hưởng:** Crawl Coursera không hoạt động. Dữ liệu seed tĩnh vẫn hoạt động bình thường.

**Giải pháp đề xuất:**
- Chuyển sang Coursera GraphQL API hoặc scrape HTML trực tiếp
- Hoặc tắt Coursera crawl trong startup, chỉ dùng seed data

### 6.2 Neo4j AuthenticationRateLimit

```
{neo4j_code: Neo.ClientError.Security.AuthenticationRateLimit}
The client has provided incorrect authentication details too many times in a row.
```

**Nguyên nhân:** Credentials Neo4j trong `.env` sai, dẫn đến nhiều lần thử xác thực thất bại liên tiếp → Neo4j tạm khóa client.

**Ảnh hưởng:** Toàn bộ TEACHES relationships không được sync. Course recommendation fallback về PostgreSQL (vẫn hoạt động).

**Giải pháp:**
1. Kiểm tra `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` trong `.env`
2. Đợi Neo4j tự unlock (thường 30 phút) hoặc restart Neo4j
3. Sau khi fix credentials, chạy `POST /api/courses/admin/sync-neo4j`

### 6.3 JWT Key Length Warning

```
InsecureKeyLengthWarning: The HMAC key is 20 bytes long, below minimum 32 bytes for SHA256
```

**Nguyên nhân:** `SECRET_KEY` trong `.env` quá ngắn (< 32 bytes).

**Giải pháp:** Tạo key mới đủ dài:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 6.4 No RIASEC Tags

```
WARNING | No RIASEC tags found for career: 53-7071-00
WARNING | No RIASEC tags for career 53-7071-00, returning empty evidence
```

**Nguyên nhân:** Career `53-7071-00` (Conveyor Operators) chưa có mapping trong `career_riasec_map`.

**Ảnh hưởng:** `trait-evidence` endpoint trả về `{scale: "", items: []}` — không crash, chỉ empty.

---

## 7. Logic Issues & Đề Xuất Cải Thiện

### 7.1 Roadmap Demo Data Không Liên Quan Đến Career

**Vấn đề:** Khi career chưa có roadmap, hệ thống tạo 3 milestone generic:
```python
("Fundamentals", "Master the foundational knowledge...")
("Tools & Workflow", "Get familiar with essential tools...")
("Project", "Practice with a small hands-on project...")
```

Những milestone này không liên quan đến nghề cụ thể (vd: Conveyor Operator).

**Đề xuất:** Gọi AI (Gemini) để generate milestone phù hợp với career title, hoặc dùng dữ liệu từ O*NET.

### 7.2 `progress_percentage` Lưu Dạng Text

**Vấn đề:**
```python
progress_percentage = Column(Text)  # "0" → "100.0"
```

Lưu số dưới dạng string gây khó khăn khi query/sort.

**Đề xuất:** Đổi sang `Float` hoặc `Numeric(5,2)`.

### 7.3 Cosine Similarity Tính Bằng Pure Python

**Vấn đề:** `cosine_similarity` trong `embedder.py` dùng vòng lặp Python thuần:
```python
dot = sum(a * b for a, b in zip(vec_a, vec_b))
```

Với 500 courses × 46 skills = 23,000 phép tính, mỗi phép tính 384 phép nhân → chậm.

**Đề xuất:** Dùng `numpy.dot` hoặc `scipy.spatial.distance.cosine`.

### 7.4 On-the-fly Fallback Cap 500 Courses

```python
.limit(500)  # cap to avoid timeout
```

Nếu catalog lớn hơn 500, các course sau sẽ không bao giờ được recommend qua fallback.

**Đề xuất:** Dùng pgvector `<=>` operator để tìm nearest neighbors trực tiếp trong DB.

### 7.5 Crawler Không Có Circuit Breaker

Nếu Coursera API liên tục trả 405, crawler vẫn retry mỗi lần startup. Nên thêm flag `crawl_failed_at` để skip nếu đã fail gần đây.

### 7.6 `complete_milestone` Không Validate Milestone Tồn Tại

```python
completed.add(str(milestone_id))  # Không check milestone_id có trong roadmap không
```

User có thể gửi bất kỳ `milestone_id` nào và nó sẽ được thêm vào `completed_milestones`.

**Đề xuất:**
```python
valid_ids = {str(m.id) for m in total}
if str(milestone_id) not in valid_ids:
    raise HTTPException(404, "Milestone not found in this roadmap")
```

---

## 8. Luồng Dữ Liệu Đầy Đủ

```
User request: GET /api/careers/53-7071-00/roadmap
                    │
                    ▼
            require_user(request)  ← JWT validation
                    │
                    ▼
            svc.get_roadmap(session, user_id, "53-7071-00")
                    │
                    ├── SELECT * FROM core.careers WHERE onet_code = '53-7071-00'
                    │
                    ├── SELECT * FROM core.roadmaps WHERE career_id = {id}
                    │   └── [NOT FOUND] → CREATE demo roadmap + 3 milestones
                    │
                    ├── SELECT * FROM core.roadmap_milestones WHERE roadmap_id = {id}
                    │
                    └── SELECT * FROM core.user_progress WHERE user_id = {uid}
                    │
                    ▼
            SubscriptionService.get_user_subscription(user_id, session)
                    │
                    ▼
            Apply subscription gate (lock levels > max_level for free users)
                    │
                    ▼
            Response: {milestones, levels, userProgress, upgrade_required}


User request: GET /api/courses/recommend?skills=Python,SQL&top_k=3
                    │
                    ▼
            service.recommend_courses_for_skills(db, ["Python","SQL"], 3)
                    │
                    ├── 1️⃣ query_courses_for_skills(["Python","SQL"], top_k=3) [Neo4j]
                    │   └── [FAIL - AuthRateLimit] → []
                    │
                    ├── 2️⃣ _query_from_pg(db, ["Python","SQL"], 3) [PostgreSQL]
                    │   └── JOIN course_skill_map + course_catalog
                    │       WHERE skill_name IN ('Python','SQL')
                    │       ORDER BY similarity_score DESC LIMIT 3
                    │
                    └── Response: {recommendations[], source="postgresql"}
```

---

## 9. Tóm Tắt Trạng Thái Hiện Tại

| Chức năng | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| Roadmap CRUD | ✅ Hoạt động | Demo data khi chưa có roadmap thật |
| Milestone completion | ✅ Hoạt động | Thiếu validation milestone_id |
| Subscription gate | ✅ Hoạt động | Free = level 1 only |
| Trait evidence | ⚠️ Partial | Empty nếu career chưa có RIASEC tags |
| Course seed | ✅ Hoạt động | 47 courses, idempotent |
| Course embedding | ✅ Hoạt động | SBERT all-MiniLM-L6-v2 |
| Skill-course map | ✅ Hoạt động | 88 pairs, cosine ≥ 0.40 |
| Course recommend (PG) | ✅ Hoạt động | Fallback khi Neo4j down |
| Course recommend (Neo4j) | ❌ Lỗi | AuthenticationRateLimit |
| Coursera crawler | ❌ Lỗi | HTTP 405 |
| Udemy crawler | ⚠️ Chưa test | Phụ thuộc HTML structure |
| LinkedIn crawler | ⚠️ Cần cookie | `LINKEDIN_SESSION_COOKIE` |
| JWT key security | ⚠️ Warning | Key < 32 bytes |

---

## 10. Hành Động Khuyến Nghị (Ưu Tiên)

1. **[Cao]** Fix Neo4j credentials → chạy lại `POST /api/courses/admin/sync-neo4j`
2. **[Cao]** Tăng `SECRET_KEY` lên ≥ 32 bytes
3. **[Trung bình]** Seed RIASEC tags cho các career phổ biến vào `career_riasec_map`
4. **[Trung bình]** Validate `milestone_id` trong `complete_milestone`
5. **[Thấp]** Đổi `progress_percentage` từ `Text` sang `Float`
6. **[Thấp]** Thay cosine similarity Python thuần bằng numpy
7. **[Thấp]** Thêm circuit breaker cho Coursera crawler

---

*Báo cáo được tạo tự động từ phân tích source code và server log.*
