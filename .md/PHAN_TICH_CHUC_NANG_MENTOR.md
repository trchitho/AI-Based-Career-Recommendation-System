# PHÂN TÍCH TOÀN DIỆN CHỨC NĂNG MENTOR MATCHING

> **Ngày phân tích:** 11/05/2026  
> **URL:** `localhost:3000/mentor_matching`  
> **Tên module:** AI-Powered Mentor Matching

---

## 1. TỔNG QUAN

Chức năng **Mentor Matching** là một hệ thống ghép đôi mentor-mentee sử dụng AI đa tín hiệu (5-signal pipeline), tích hợp Neo4j Graph Database và vi-SBERT để tìm kiếm mentor phù hợp nhất cho người dùng dựa trên kỹ năng, nghề nghiệp, tính cách và đồ thị tri thức.

### Mục tiêu chính:
- Kết nối mentee với mentor phù hợp nhất dựa trên AI
- Quản lý vòng đời mentorship: tìm kiếm → gửi yêu cầu → chấp nhận → nhắn tin → đặt lịch
- Tự động tạo hồ sơ từ dữ liệu có sẵn (CV, bài đánh giá)

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Frontend (React + TypeScript)

| File | Vai trò |
|------|---------|
| `MentorMatchingPage.tsx` | Trang chính (~900 dòng), chứa 5 tab |
| `mentorMatchingService.ts` | Service layer gọi API backend |
| `scheduleService.ts` | Service quản lý lịch hẹn |
| `useMentorMatching.ts` | Custom hooks (useMentors, useMentorshipRequests, useMentorSessions, useMentorProfile) |
| `CareerMentorSection.tsx` | Component hiển thị mentor theo nghề nghiệp cụ thể |
| `BookingModal.tsx` | Modal đặt lịch hẹn |
| `ChatModal.tsx` | Modal nhắn tin real-time (WebSocket + polling fallback) |

### 2.2 Backend (Python + FastAPI)

| File | Vai trò |
|------|---------|
| `routes.py` | API Router — 12 endpoints |
| `models.py` | SQLAlchemy models (PostgreSQL) |
| `schemas.py` | Pydantic schemas validation |
| `service.py` | Business logic chính + matching pipeline |
| `service_v2.py` | Phiên bản refactor dùng Repository Pattern |
| `repository.py` | Data access layer (tách biệt DB queries) |
| `matching_algorithm.py` | Thuật toán scoring 5 tín hiệu |
| `graph_gds.py` | Neo4j GDS integration (Jaccard, PageRank, Path Traversal) |

### 2.3 Scripts hỗ trợ

| File | Vai trò |
|------|---------|
| `seed_mentors_all_careers.py` | Seed 66 mentors cho 22 nhóm ngành |
| `sync_mentors_neo4j.py` | Đồng bộ mentor profiles lên Neo4j graph |

---

## 3. CÁC TAB CHỨC NĂNG

### 3.1 Tab "Tìm Mentor" (find)

**Luồng hoạt động:**
1. Kiểm tra mentee profile → nếu chưa có, tự động tạo từ dữ liệu assessment/CV
2. Gọi API `GET /api/mentor-matching/mentee/find-mentors`
3. Backend chạy 5-signal pipeline → trả về top 10 mentor phù hợp nhất
4. Hiển thị dạng grid card với điểm compatibility, thanh score bar, lý do phù hợp

**Thông tin hiển thị trên mỗi card:**
- Avatar (initials), tên, vị trí, công ty, số năm kinh nghiệm
- Điểm Match tổng (%)
- Score bars: Kỹ năng / Nghề nghiệp / Tính cách
- Tags chuyên môn
- Lý do phù hợp (text)
- Số slot còn trống (current/max mentees)
- Giờ/tuần có thể mentor
- 3 nút hành động: Gửi yêu cầu / Nhắn tin / Đặt lịch

**Trường hợp đặc biệt:**
- Chưa có profile → hiển thị form điền thủ công hoặc link làm bài đánh giá
- Không tìm thấy mentor → gợi ý cập nhật kỹ năng

### 3.2 Tab "Yêu cầu" (requests)

**Hai phần:**
1. **Yêu cầu nhận được** (góc nhìn Mentor): Hiển thị requests từ mentee, có nút Chấp nhận/Từ chối
2. **Yêu cầu đã gửi** (góc nhìn Mentee): Hiển thị requests đã gửi với trạng thái

**Trạng thái request:** pending → accepted / rejected

**Hành động sau khi accepted:**
- Nút Nhắn tin (mở ChatModal)
- Nút Đặt lịch (mở BookingModal)

### 3.3 Tab "Mentee của tôi" (mentees)

- Hiển thị danh sách mentee đã chấp nhận (filter từ incoming requests có status = "accepted")
- Mỗi mentee có nút: Nhắn tin / Đặt lịch
- Hiển thị ngày kết nối và lời nhắn ban đầu

### 3.4 Tab "Lịch hẹn" (schedule)

**Chức năng:**
- Hiển thị tất cả sessions (cả vai trò mentor và mentee)
- Mỗi session hiển thị: ngày/giờ, tên đối tác, trạng thái, thời lượng, chủ đề, ghi chú
- Hành động theo vai trò:
  - **Mentor + pending:** Xác nhận / Từ chối
  - **Cả hai:** Huỷ session, Chat

**Trạng thái session:** pending → confirmed / cancelled / completed

**BookingModal cho phép:**
- Chọn ngày giờ (tối thiểu 30 phút sau hiện tại)
- Chọn thời lượng: 30 / 60 / 90 phút
- Nhập chủ đề và ghi chú

### 3.5 Tab "Trở thành Mentor" (become)

**Chức năng:**
- Form đăng ký / chỉnh sửa hồ sơ Mentor
- Nút "Tự động điền" từ CV + assessment (gọi API `create-from-profile`)
- Các trường: Họ tên, Vị trí, Công ty, Số năm KN, Giờ/tuần, Số mentee tối đa, Bio, Lĩnh vực chuyên môn (tag input), Hình thức liên lạc

---

## 4. THUẬT TOÁN AI MATCHING (5-Signal Pipeline)

### 4.1 Tổng quan trọng số

| # | Signal | Trọng số | Nguồn dữ liệu |
|---|--------|----------|----------------|
| 1 | Keyword Skill Match | 30% | Substring overlap kỹ năng |
| 2 | Semantic Skill (vi-SBERT) | 20% | Cosine similarity embedding |
| 3 | Career Match | 20% | Keyword + graph path |
| 4 | Personality Cosine | 15% | RIASEC (6D) + Big5 (5D) = 11D vector |
| 5 | Neo4j GDS Graph | 15% | Jaccard + Path Traversal + PageRank |

### 4.2 Chi tiết từng signal

#### Signal 1: Keyword Skill Match (30%)
- So sánh `desired_skills` của mentee với `expertise_areas` của mentor
- Case-insensitive substring matching
- Score = |matched| / |desired_skills|
- Trả về danh sách skills trùng khớp

#### Signal 2: Semantic Skill Similarity (20%)
- Sử dụng model **vi-SBERT** (Vietnamese Sentence-BERT)
- Embed cả 2 tập kỹ năng → tính cosine similarity giữa mean vectors
- Bắt được quan hệ ngữ nghĩa (VD: "React" ↔ "Frontend Development")
- Fallback về 0.0 nếu model chưa load

#### Signal 3: Career Match (20%)
- So sánh `target_career` của mentee với `current_position` + `expertise_areas` của mentor
- Tách keywords từ target career → đếm hits trong position/expertise
- Score = hits / total_keywords

#### Signal 4: Personality Cosine (15%)
- Vector 11 chiều: RIASEC (R, I, A, S, E, C) + Big5 (O, C, E, A, N)
- Cosine similarity giữa vector mentee và mentor
- Nếu không có dữ liệu personality → trả 0.5 (neutral)
- Dữ liệu lấy từ bài đánh giá tâm lý (assessment)

#### Signal 5: Neo4j GDS Graph (15%)
Gồm 3 sub-signals:
- **Jaccard Similarity (40%):** Overlap giữa WANTS_SKILL (mentee) và HAS_SKILL (mentor) trên graph
- **Career Path Traversal (40%):** Khoảng cách đồ thị từ Mentor đến Career đích (1 hop = CAN_GUIDE_FOR, 2 hops = qua Skill)
- **PageRank (20%):** Uy tín mentor trong mạng tri thức (GDS 2.6+ native)

### 4.3 Công thức tổng hợp (adaptive weights)

```
Full (graph + personality):  skill×0.30 + semantic×0.20 + career×0.20 + personality×0.15 + graph×0.15
No graph:                    skill×0.35 + semantic×0.25 + career×0.25 + personality×0.15
No personality:              skill×0.40 + semantic×0.25 + career×0.25 + graph×0.10
Base (keyword only):         skill×0.60 + career×0.40
```

### 4.4 Nguồn mentor (2 sources)

1. **Source 1:** MentorProfile đã đăng ký (is_active=true, còn slot)
2. **Source 2:** Users đã hoàn thành roadmap career tương ứng (UserProgress)
   - Score dựa trên % hoàn thành roadmap + skill overlap
   - Hiển thị "Đã hoàn thành X bước lộ trình Y"

### 4.5 Ngưỡng và giới hạn
- **Ngưỡng tối thiểu:** 8% (MATCH_THRESHOLD = 0.08)
- **Số kết quả tối đa:** 10 mentor
- **Deduplication:** Giữ entry có score cao nhất nếu trùng user_id

---

## 5. DATABASE SCHEMA

### 5.1 PostgreSQL (schema: core)

#### Bảng `mentor_profiles`
| Cột | Kiểu | Mô tả |
|-----|------|--------|
| id | Integer PK | |
| user_id | BigInteger FK → users.id | Unique |
| full_name | String(200) | |
| current_position | String(200) | |
| company | String(200) | |
| bio | Text | |
| expertise_areas | ARRAY(String) | VD: ["Python", "ML"] |
| experience_years | Integer | |
| available_hours_per_week | Integer | Default: 2 |
| preferred_communication | ARRAY(String) | VD: ["video", "chat"] |
| max_mentees | Integer | Default: 5 |
| current_mentees_count | Integer | Default: 0 |
| riasec_scores | JSONB | VD: {"R": 3.5, "I": 4.0, ...} |
| big_five_scores | JSONB | VD: {"openness": 4.1, ...} |
| is_active | Boolean | Default: true |
| created_at / updated_at | DateTime | |

#### Bảng `mentee_profiles`
| Cột | Kiểu | Mô tả |
|-----|------|--------|
| id | Integer PK | |
| user_id | BigInteger FK → users.id | Unique |
| full_name | String(200) | |
| target_career | String(300) | Nghề mục tiêu |
| current_skills | ARRAY(String) | Kỹ năng hiện có |
| desired_skills | ARRAY(String) | Kỹ năng muốn học |
| learning_style | String(50) | structured/flexible/project-based |
| preferred_mentor_experience | String(20) | junior/senior/executive |
| riasec_scores | JSONB | |
| big_five_scores | JSONB | |
| created_at / updated_at | DateTime | |

#### Bảng `mentorship_requests`
| Cột | Kiểu | Mô tả |
|-----|------|--------|
| id | Integer PK | |
| mentee_id | Integer FK → mentee_profiles.id | |
| mentor_id | Integer FK → mentor_profiles.id | |
| compatibility_score | Float | Điểm tương thích lúc gửi |
| matching_reasons | JSONB | |
| status | String(20) | pending/accepted/rejected |
| message | Text | Lời nhắn từ mentee |
| response_message | Text | Phản hồi từ mentor |
| requested_at | DateTime | |
| responded_at | DateTime | Nullable |

### 5.2 Neo4j Graph

**Nodes:**
- `(:Mentor {user_id, name, position, company, experience_years, max_mentees, riasec_scores, big_five_scores})`
- `(:Mentee {user_id, riasec_scores, big_five_scores})`
- `(:Skill {name})`
- `(:Career {title})`

**Relationships:**
- `(Mentor)-[:HAS_SKILL {level}]->(Skill)`
- `(Mentor)-[:CAN_GUIDE_FOR]->(Career)`
- `(Mentee)-[:WANTS_SKILL]->(Skill)`

---

## 6. API ENDPOINTS

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/mentor-matching/mentor/profile` | Tạo/cập nhật profile Mentor |
| GET | `/api/mentor-matching/mentor/profile` | Lấy profile Mentor của tôi |
| GET | `/api/mentor-matching/mentor/requests` | Yêu cầu mentorship gửi đến tôi |
| POST | `/api/mentor-matching/mentor/respond` | Phản hồi yêu cầu (accept/reject) |
| POST | `/api/mentor-matching/mentor/create-from-profile` | Auto-tạo Mentor từ CV + assessment |
| POST | `/api/mentor-matching/mentee/profile` | Tạo/cập nhật profile Mentee |
| GET | `/api/mentor-matching/mentee/profile` | Lấy profile Mentee của tôi |
| GET | `/api/mentor-matching/mentee/find-mentors` | Tìm Mentor phù hợp (5-signal AI) |
| POST | `/api/mentor-matching/mentee/send-request` | Gửi yêu cầu mentorship |
| GET | `/api/mentor-matching/mentee/my-requests` | Yêu cầu tôi đã gửi |
| POST | `/api/mentor-matching/mentee/create-from-profile` | Auto-tạo Mentee từ assessment + skill gap |
| GET | `/api/mentor-matching/mentors` | Danh sách Mentor đang hoạt động (public) |
| GET | `/api/mentor-matching/career-mentors` | Tìm Mentor theo nghề nghiệp cụ thể |
| POST | `/api/mentor-matching/graph/sync-personality` | Đồng bộ RIASEC + Big5 lên Neo4j |
| POST | `/api/schedule/book` | Đặt lịch hẹn |
| GET | `/api/schedule/my` | Lịch hẹn của tôi |
| POST | `/api/schedule/respond` | Xác nhận/từ chối lịch hẹn |
| DELETE | `/api/schedule/{id}` | Huỷ lịch hẹn |

---

## 7. TÍNH NĂNG NHẮN TIN (Chat)

- **Giao thức:** WebSocket (real-time) + HTTP polling fallback (3 giây/lần)
- **Room ID:** Sắp xếp 2 user_id → `min_max` (VD: "3_15")
- **Hiển thị:** Modal chat góc phải, avatar initials, timestamp, bubble style
- **Tích hợp:** Nút đặt lịch ngay trong chat modal
- **Không bao gồm:** Gọi video trực tuyến (ghi rõ trong UI notice)

---

## 8. TÍNH NĂNG TỰ ĐỘNG TẠO HỒ SƠ

### 8.1 Auto-create Mentee Profile
Nguồn dữ liệu:
- `Assessment` → RIASEC scores, Big5 scores, career_recommendations → target_career
- `SkillGapAnalysis` → cv_skills → current_skills, skill_gaps → desired_skills

### 8.2 Auto-create Mentor Profile
Nguồn dữ liệu:
- `SkillGapAnalysis` → cv_skills → expertise_areas
- `Assessment` → career_recommendations → current_position, RIASEC, Big5
- `UserProgress` + `RoadmapMilestone` → skill_name từ milestones đã hoàn thành

---

## 9. SEED DATA

- **66 mentors** phủ **22 nhóm ngành nghề** (theo phân loại ONET)
- Mỗi nhóm có 3 mentors với thông tin thực tế (tên Việt Nam, công ty VN, kỹ năng chuyên ngành)
- Tự động tạo user accounts + mentor profiles + rebuild Neo4j graph

**22 nhóm ngành:**
Computer & Mathematical, Business & Financial, Management, Healthcare Practitioners, Educational, Architecture & Engineering, Arts/Design/Media, Sales, Community & Social Service, Legal, Life/Physical/Social Science, Healthcare Support, Transportation, Construction, Office & Administrative, Production, Installation/Maintenance/Repair, Protective Service, Personal Care, Food Preparation, Farming/Fishing/Forestry, Building & Grounds Maintenance

---

## 10. COMPONENT TÍCH HỢP: CareerMentorSection

- Hiển thị trong trang chi tiết nghề nghiệp
- Expandable section "Mentor cho nghề này"
- Gọi API `GET /api/mentor-matching/career-mentors?career_title=X&limit=3`
- Hiển thị top 3 mentor phù hợp với nghề đó
- Link "Xem tất cả Mentor" → navigate đến `/mentor-matching`

---

## 11. LUỒNG DỮ LIỆU TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                  │
│  MentorMatchingPage ──→ mentorMatchingService ──→ API calls     │
│       ↕                      ↕                                   │
│  useMentorMatching      scheduleService                          │
│       ↕                      ↕                                   │
│  ChatModal / BookingModal / CareerMentorSection                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│                                                                  │
│  routes.py (FastAPI Router)                                      │
│       │                                                          │
│       ▼                                                          │
│  service.py (Business Logic)                                     │
│       │                                                          │
│       ├──→ matching_algorithm.py (5 signals scoring)             │
│       │         │                                                │
│       │         ├──→ vi-SBERT (semantic similarity)              │
│       │         └──→ graph_gds.py (Neo4j GDS)                   │
│       │                   │                                      │
│       │                   ├──→ Jaccard Similarity                │
│       │                   ├──→ Career Path Traversal             │
│       │                   ├──→ PageRank                          │
│       │                   └──→ Personality Cosine on Graph       │
│       │                                                          │
│       └──→ repository.py (DB queries)                            │
│                   │                                              │
│                   ▼                                               │
│            PostgreSQL (core schema)                               │
│            + Neo4j (Graph Database)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. ĐIỂM MẠNH

1. **AI đa tín hiệu:** Kết hợp 5 signals khác nhau, adaptive weights theo dữ liệu có sẵn
2. **Graph Database:** Sử dụng Neo4j GDS cho Jaccard, PageRank, Path Traversal — phát hiện quan hệ ẩn
3. **vi-SBERT:** Hiểu ngữ nghĩa tiếng Việt, bắt được quan hệ kỹ năng không trùng keyword
4. **Auto-populate:** Tự động tạo hồ sơ từ dữ liệu có sẵn, giảm friction cho user
5. **Dual source:** Mentor đăng ký + Users hoàn thành roadmap → mở rộng pool mentor
6. **Real-time chat:** WebSocket với fallback polling
7. **Responsive UI:** Animations (Framer Motion), decorative elements, mobile-friendly
8. **Seed data phong phú:** 66 mentors / 22 ngành, dữ liệu thực tế Việt Nam

---

## 13. ĐIỂM CẦN CẢI THIỆN / HẠN CHẾ

1. **Không có video call:** Chỉ hỗ trợ chat text và đặt lịch, không tích hợp video meeting
2. **Duplicate service files:** Tồn tại cả `service.py` và `service_v2.py` — cần thống nhất
3. **Ngưỡng matching thấp:** MATCH_THRESHOLD = 0.08 (8%) có thể trả về mentor ít liên quan
4. **Không có rating/review:** Chưa có hệ thống đánh giá mentor sau khi mentorship kết thúc
5. **Không có notification:** Chưa thấy push notification khi có request mới hoặc session sắp đến
6. **Session lifecycle:** Chưa có cơ chế tự động chuyển status "completed" sau khi hết giờ
7. **Không có filter/search:** Tab "Tìm Mentor" chưa có bộ lọc theo ngành, kỹ năng, kinh nghiệm
8. **Cold start vi-SBERT:** Model load lần đầu mất ~30s, có thể gây timeout

---

## 14. CÔNG NGHỆ SỬ DỤNG

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18, TypeScript, Framer Motion, Lucide Icons |
| State | React hooks (useState, useEffect, useCallback) |
| API Client | Axios (qua `lib/api`) |
| Real-time | WebSocket native |
| Backend | Python 3.11+, FastAPI, SQLAlchemy ORM |
| Database | PostgreSQL (JSONB, ARRAY), Neo4j 5.x |
| Graph Algorithms | Neo4j GDS 2.6.9 (PageRank, Jaccard) |
| NLP | vi-SBERT (sentence-transformers) |
| Auth | JWT token (get_current_user_from_token) |
| Validation | Pydantic v2 |

---

## 15. KẾT LUẬN

Chức năng Mentor Matching là một module phức tạp và hoàn chỉnh, kết hợp nhiều kỹ thuật AI tiên tiến (NLP, Graph Algorithms, Personality Matching) để tạo ra trải nghiệm ghép đôi mentor-mentee chất lượng cao. Hệ thống có kiến trúc rõ ràng (routes → service → repository → models), UI hiện đại với animations, và khả năng tự động hóa cao (auto-create profiles). Các điểm cần cải thiện chủ yếu liên quan đến tính năng bổ sung (rating, notification, video call) và code maintenance (thống nhất service files).
