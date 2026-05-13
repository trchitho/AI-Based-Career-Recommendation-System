# Hướng dẫn hệ thống Crawl dữ liệu việc làm

## 1. Tổng quan

Hệ thống tự động thu thập (crawl) dữ liệu việc làm từ các trang tuyển dụng Việt Nam, lưu vào PostgreSQL, và hiển thị trên trang **Phân tích thị trường** (Trends).

### Nguồn dữ liệu

| # | Trang | URL | Ghi chú |
|---|-------|-----|---------|
| 1 | VietnamWorks | vietnamworks.com | Đa ngành, ưu tiên chính |
| 2 | ITViec | itviec.com | Chỉ IT/Tech |
| 3 | TopCV | topcv.vn | Đa ngành |
| 4 | CareerViet | careerviet.vn | Đa ngành |

### 20 nhóm ngành nghề

Hệ thống crawl theo **20 nhóm ngành cố định** (không thay đổi):

1. Information Technology (Công nghệ thông tin)
2. Marketing and Communication (Marketing & Truyền thông)
3. Finance and Banking (Tài chính & Ngân hàng)
4. Accounting and Auditing (Kế toán & Kiểm toán)
5. Human Resources (Nhân sự)
6. Sales and Business Development (Kinh doanh & Phát triển)
7. Customer Service (Dịch vụ khách hàng)
8. Education and Training (Giáo dục & Đào tạo)
9. Healthcare and Medical (Y tế & Chăm sóc sức khỏe)
10. Logistics and Supply Chain (Logistics & Chuỗi cung ứng)
11. Manufacturing and Production (Sản xuất & Vận hành)
12. Construction and Engineering (Xây dựng & Kỹ thuật)
13. Real Estate (Bất động sản)
14. Retail and E-commerce (Bán lẻ & Thương mại điện tử)
15. Media and Content (Truyền thông & Nội dung)
16. Hospitality and Tourism (Khách sạn & Du lịch)
17. Legal and Compliance (Pháp lý & Tuân thủ)
18. Administration and Office Support (Hành chính & Văn phòng)
19. Transportation (Vận tải)
20. Energy and Environment (Năng lượng & Môi trường)

---

## 2. Cách lấy dữ liệu

### 2.1 Tự động (Scheduler)

Hệ thống tự động crawl **mỗi 1 giờ**. Không cần làm gì — chỉ cần server đang chạy.

```
Server khởi động → Scheduler start → Crawl mỗi 1 giờ
```

### 2.2 Thủ công (API)

**Crawl tất cả 20 ngành:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs/crawl/trigger" -Method POST -ContentType "application/json" -Body "{}"
```

**Crawl chỉ vài ngành cụ thể:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs/crawl/trigger" -Method POST -ContentType "application/json" -Body '{"industries": ["information-technology", "marketing-communication"]}'
```

**Crawl đồng bộ (chờ kết quả):**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/jobs/crawl/run-sync" -Method POST -ContentType "application/json" -Body '{"industries": ["information-technology"]}'
```

### 2.3 Swagger UI

Mở trình duyệt: `http://localhost:8000/docs`
→ Tìm section **jobs**
→ `POST /api/jobs/crawl/trigger`
→ Bấm "Try it out"

### 2.4 Kiểm tra trạng thái

```powershell
Invoke-RestMethod "http://localhost:8000/api/jobs/crawl/status"
```

---

## 3. Dữ liệu lưu ở đâu

### Database: PostgreSQL
- **Host:** localhost:5433
- **Database:** career_ai
- **Schema:** core

### 3 bảng chính:

#### Bảng `core.job_industry_groups`

Lưu 20 nhóm ngành cố định (seed 1 lần khi khởi động).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INTEGER | Primary key (1-20) |
| name | VARCHAR(120) | Tên tiếng Anh |
| slug | VARCHAR(80) | URL-safe key (unique) |
| name_vi | VARCHAR(120) | Tên tiếng Việt |
| is_active | BOOLEAN | Đang hoạt động |
| created_at | TIMESTAMPTZ | Ngày tạo |

#### Bảng `core.crawled_jobs` ⭐ (bảng chính)

Lưu **tất cả** việc làm đã crawl. Không bao giờ xóa — chỉ đánh dấu `is_active=false` khi hết hạn.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGINT | Primary key (auto) |
| industry_group_id | INTEGER | FK → job_industry_groups.id |
| industry_group_slug | VARCHAR(80) | Slug nhóm ngành |
| source_site | VARCHAR(50) | vietnamworks / itviec / topcv / careerviet |
| title | VARCHAR(500) | Tên vị trí |
| company | VARCHAR(300) | Tên công ty |
| location | VARCHAR(200) | Địa điểm |
| salary | VARCHAR(200) | Lương raw (text gốc) |
| salary_min | FLOAT | Lương tối thiểu (triệu VND/tháng) |
| salary_max | FLOAT | Lương tối đa (triệu VND/tháng) |
| skills | TEXT[] | Mảng kỹ năng extracted |
| experience_level | VARCHAR(100) | fresher/junior/mid/senior/lead/manager |
| employment_type | VARCHAR(80) | full-time/part-time/contract/internship |
| description | TEXT | Mô tả công việc |
| requirements | TEXT | Yêu cầu |
| posted_date | TIMESTAMPTZ | Ngày đăng |
| application_deadline | TIMESTAMPTZ | Hạn ứng tuyển |
| job_url | TEXT | URL gốc trên trang tuyển dụng (UNIQUE) |
| apply_url | TEXT | URL ứng tuyển |
| content_hash | VARCHAR(64) | SHA256(title+company+location) — dedup |
| is_active | BOOLEAN | Còn hiệu lực? |
| first_seen_at | TIMESTAMPTZ | Lần đầu crawl được |
| last_seen_at | TIMESTAMPTZ | Lần cuối thấy |
| created_at | TIMESTAMPTZ | Ngày tạo record |
| updated_at | TIMESTAMPTZ | Ngày cập nhật |
| raw_data | JSONB | Dữ liệu thô (debug) |

**Indexes:**
- `UNIQUE(job_url)` — dedup theo URL
- `UNIQUE(content_hash)` — dedup theo nội dung
- `ix_crawled_jobs_industry` — filter theo ngành
- `ix_crawled_jobs_source` — filter theo nguồn
- `ix_crawled_jobs_active` — filter active
- `ix_crawled_jobs_posted` — sort theo ngày đăng

#### Bảng `core.crawl_runs`

Lịch sử mỗi lần crawl (audit log).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGINT | Primary key |
| industry_group_slug | VARCHAR(80) | Ngành đã crawl |
| source_site | VARCHAR(50) | Nguồn |
| started_at | TIMESTAMPTZ | Bắt đầu |
| finished_at | TIMESTAMPTZ | Kết thúc |
| status | VARCHAR(20) | running/success/failed |
| jobs_found | INTEGER | Số jobs tìm được |
| jobs_inserted | INTEGER | Số jobs mới |
| jobs_updated | INTEGER | Số jobs cập nhật |
| jobs_skipped | INTEGER | Số jobs trùng |
| error_message | TEXT | Lỗi (nếu có) |

---

## 4. Luồng dữ liệu

```
Scheduler (mỗi 1h)
    ↓
CrawlerEngine
    ↓
┌─────────────────────────────────────────┐
│ VietnamWorks  │ ITViec │ TopCV │ CareerViet │
│ (Playwright)  │        │       │            │
└─────────────────────────────────────────┘
    ↓
Normalizer (parse salary, extract skills, clean text)
    ↓
Deduplication (check job_url → content_hash)
    ↓
PostgreSQL: core.crawled_jobs
    ↓
API: /api/jobs/trending
    ↓
Frontend: Trang Phân tích thị trường
```

---

## 5. Deduplication (chống trùng)

Khi crawl job mới:
1. Kiểm tra `job_url` đã tồn tại chưa?
2. Nếu chưa → kiểm tra `content_hash` (SHA256 của title+company+location)
3. Nếu **trùng** → chỉ update `last_seen_at` + các field thay đổi
4. Nếu **mới** → INSERT record mới

**Không bao giờ xóa job** — chỉ đánh dấu `is_active=false` khi hết hạn.

---

## 6. API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/jobs/trending | Tất cả jobs active (cho frontend) |
| GET | /api/jobs/industries | 20 nhóm ngành |
| GET | /api/jobs?industry=xxx | Jobs theo ngành |
| GET | /api/jobs/analytics/demand | Thống kê nhu cầu |
| GET | /api/jobs/analytics/salary-trends | Xu hướng lương |
| GET | /api/jobs/analytics/skills | Top kỹ năng |
| GET | /api/jobs/analytics/trends-summary | Tổng hợp cho charts |
| POST | /api/jobs/crawl/trigger | Trigger crawl (background) |
| POST | /api/jobs/crawl/run-sync | Crawl đồng bộ (chờ) |
| GET | /api/jobs/crawl/status | Trạng thái scheduler |
| GET | /api/jobs/crawl/history | Lịch sử crawl |

---

## 7. Cấu trúc code

```
apps/backend/app/modules/jobs/
├── __init__.py
├── constants.py      # 20 nhóm ngành + keywords
├── models.py         # SQLAlchemy models (3 bảng)
├── normalizer.py     # Parse salary, extract skills, clean text
├── persistence.py    # Upsert + dedup logic
├── crawler.py        # Playwright scrapers (VNW, ITViec, TopCV, CareerViet)
├── service.py        # Pipeline + analytics queries
├── scheduler.py      # APScheduler (mỗi 1h)
├── routes.py         # FastAPI endpoints
└── HUONG_DAN_CRAWL_DU_LIEU.md  # File này
```

---

## 8. Troubleshooting

### Crawl không lấy được dữ liệu
- Kiểm tra internet
- VietnamWorks có thể block nếu crawl quá nhanh → hệ thống tự retry 3 lần
- Xem log server: tìm `[JobCrawler]` hoặc `[vietnamworks]`

### Query chậm
- Đảm bảo indexes đã tạo (tự động khi server start)
- Nếu > 1000 jobs, cân nhắc thêm `limit_per_industry` param

### Lương hiển thị sai
- Salary được parse nguyên giá trị từ trang tuyển dụng (đơn vị: triệu VND)
- Không có cap/giới hạn — giữ nguyên data thật
- Khi mẫu lớn hơn, trung bình sẽ tự cân bằng
- Kiểm tra: `SELECT salary, salary_min, salary_max FROM core.crawled_jobs WHERE salary_min IS NOT NULL ORDER BY salary_min DESC LIMIT 10`
