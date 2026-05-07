# Báo Cáo Kỹ Thuật: Chức Năng Market Trends

**Dự án:** AI-Based Career Recommendation System (SRC)
**Module:** `app/modules/market_trends`
**Ngày:** 23/04/2026
**Nhóm:** C1SE.29

---

## 1. Tổng Quan

Chức năng Market Trends cung cấp dữ liệu xu hướng thị trường lao động theo thời gian thực cho từng nghề nghiệp. Hệ thống thu thập dữ liệu từ **6 nguồn** (Google Trends + 5 trang tuyển dụng Việt Nam), lưu trữ dưới dạng time series, tổng hợp thành summary cache để phục vụ API nhanh.

**Kiến trúc tổng thể:**

```
6 Crawlers (Google Trends, TopCV, VietnamWorks, CareerBuilder, CareerLink, JobStreet)
        │
        ▼
core.career_trends          ← Time series (mỗi điểm = 1 nguồn × 1 nghề × 1 thời điểm)
        │
        ▼ (background job)
core.career_trend_summaries ← Cache tổng hợp (1 row/nghề, cập nhật định kỳ)
        │
        ▼
FastAPI /api/market/*       ← Public + Admin endpoints
```

---

## 2. Database Schema

### 2.1 Bảng `core.career_trends` — Time Series

```sql
CREATE TABLE core.career_trends (
    id             BIGSERIAL PRIMARY KEY,
    career_id      BIGINT NOT NULL,
    onet_code      TEXT,
    timestamp      TIMESTAMPTZ NOT NULL,
    search_interest NUMERIC(5,2) NOT NULL CHECK (search_interest BETWEEN 0 AND 100),
    source         TEXT NOT NULL DEFAULT 'internal',  -- google_trends | topcv | vietnamworks | ...
    region         TEXT,                              -- 'VN'
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `(career_id)`, `(onet_code)`, `(timestamp)`, `(career_id, timestamp DESC)`

### 2.2 Bảng `core.career_trend_summaries` — Cache Tổng Hợp

```sql
CREATE TABLE core.career_trend_summaries (
    id               BIGSERIAL PRIMARY KEY,
    career_id        BIGINT NOT NULL UNIQUE,
    onet_code        TEXT,
    current_interest NUMERIC(5,2) NOT NULL,   -- Điểm interest hiện tại (0-100)
    growth_rate_7d   NUMERIC(6,2),            -- % tăng trưởng 7 ngày
    growth_rate_30d  NUMERIC(6,2),            -- % tăng trưởng 30 ngày
    trend_direction  TEXT NOT NULL CHECK (trend_direction IN ('rising','falling','stable')),
    popularity_rank  BIGINT,                  -- Xếp hạng trong tất cả nghề
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:** `(career_id)`, `(onet_code)`, `(trend_direction)`, `(current_interest DESC)`

> **Lỗi hiện tại:** Cả 2 bảng này **chưa được tạo** trong database. Cần chạy migration trước khi dùng.

---

## 3. Models (SQLAlchemy)

**File:** `app/modules/market_trends/models.py`

| Class | Bảng | Ghi chú |
|-------|------|---------|
| `CareerTrend` | `core.career_trends` | Time series, nhiều rows/nghề |
| `CareerTrendSummary` | `core.career_trend_summaries` | Cache, 1 row/nghề (UNIQUE career_id) |

Cả 2 model đều có method `to_dict()` để serialize.

---

## 4. Service Layer

**File:** `app/modules/market_trends/service.py` — Class `MarketTrendService`

### 4.1 `get_trending_careers(db, limit, trend_type)`

Query `CareerTrendSummary` theo `trend_type`:

| trend_type | Filter | Sort |
|-----------|--------|------|
| `rising` | `trend_direction = 'rising'` | `growth_rate_7d DESC` |
| `falling` | `trend_direction = 'falling'` | `growth_rate_7d ASC` |
| `popular` | (không filter) | `current_interest DESC` |

Sau đó enrich thêm `slug`, `title`, `description` từ bảng `core.careers`.

**Đây là endpoint đang bị lỗi 500** vì bảng `career_trend_summaries` chưa tồn tại.

### 4.2 `get_career_trend_summary(db, career_id)`

1. Query `CareerTrendSummary` theo `career_id`
2. Nếu không có → gọi `_generate_trend_summary()` tính on-the-fly từ `career_trends`
3. Trả về dict

### 4.3 `get_career_trend_timeseries(db, career_id, days)`

Query `CareerTrend` trong khoảng `now - days` đến `now`, ORDER BY timestamp ASC.

### 4.4 `compare_careers(db, career_ids, days)`

So sánh time series của tối đa 5 nghề. Trả về dict keyed by `career_id`.

### 4.5 `calculate_trend_score(db, career_id)` → float [0, 1]

Công thức tính điểm xu hướng để dùng trong ranking algorithm:

```
score = interest_score + growth_score + direction_score

interest_score  = (current_interest / 100) × 0.5        → [0, 0.5]
growth_score    = clamp(growth_rate_7d / 100, -1, 1) × 0.3  → [-0.3, 0.3]
direction_score = rising: +0.2 | stable: 0.0 | falling: -0.2

Kết quả clamp về [0.0, 1.0]
```

### 4.6 `_generate_trend_summary(db, career_id)` — On-the-fly

Khi chưa có cache:
1. Lấy `search_interest` mới nhất từ `career_trends`
2. Tính `avg(search_interest)` trong 7 ngày và 30 ngày qua
3. Tính `growth_7d = (current - avg_7d) / avg_7d × 100`
4. Xác định `trend_direction`: growth_7d > 5% → rising, < -5% → falling, còn lại → stable
5. Trả về dict (không lưu vào DB)

### 4.7 `update_trend_summaries(db)` — Background Job

Duyệt tất cả `career_id` có trong `career_trends`, gọi `_generate_trend_summary()` cho từng cái, upsert vào `career_trend_summaries`. Trả về số lượng đã update.

### 4.8 `seed_mock_data(db, career_ids)` — Testing

Sinh 30 ngày dữ liệu giả cho danh sách career_ids. Mỗi nghề được gán ngẫu nhiên một trong 3 trend: rising / falling / stable, với `base_interest` ngẫu nhiên 30–80.

---

## 5. API Endpoints

**Prefix:** `/api/market` (đăng ký trong `main.py`)

### 5.1 Public Endpoints

#### `GET /api/market/trends/trending`

```
Query params:
  limit:      int    (1-50, default 10)
  trend_type: str    ("rising" | "falling" | "popular", default "rising")

Response:
  {success, trend_type, limit, careers: [TrendingCareer]}
```

**Lỗi hiện tại:** HTTP 500 — `relation "core.career_trend_summaries" does not exist`

#### `GET /api/market/trends/compare`

```
Query params:
  career_ids: str  (comma-separated, tối đa 5 IDs)
  days:       int  (1-365, default 30)

Response:
  {success, career_ids, days, data: {career_id: {slug, title, data[]}}}
```

#### `GET /api/market/trends/score/{career_id}`

```
Response:
  {success, career_id, trend_score: float}  ← điểm 0-1 cho ranking
```

#### `GET /api/market/trends/{career_id}/summary`

```
Response:
  {success, career_id, summary: TrendSummary}
  hoặc {success: false, message: "No trend data available"}
```

#### `GET /api/market/trends/{career_id}`

```
Query params:
  days: int (1-365, default 30)

Response:
  {success, career_id, days, data: [TrendDataPoint]}
```

> **Lưu ý routing:** Các route cụ thể (`/trending`, `/compare`, `/score/{id}`) phải khai báo **trước** route tham số (`/{career_id}`) để tránh conflict. Code hiện tại đã xử lý đúng.

### 5.2 Admin Endpoints

#### `POST /api/market/admin/trends/update-summaries`

Trigger `update_trend_summaries()` — tính lại toàn bộ cache từ raw data.

#### `POST /api/market/admin/trends/seed-mock-data`

```
Query params:
  career_ids: str (optional, comma-separated — mặc định lấy 20 careers đầu tiên)
```

Sinh dữ liệu giả 30 ngày cho testing.

---

## 6. Crawlers

**Thư mục:** `app/modules/market_trends/crawlers/`

### 6.1 Tổng Quan 6 Crawlers

| Crawler | Nguồn | Dữ liệu | Normalize |
|---------|-------|---------|-----------|
| `GoogleTrendsCrawler` | Google Trends (pytrends) | Search interest 0-100 | Trực tiếp |
| `TopCVCrawler` | topcv.vn | Số job postings | `/10,000 × 100` |
| `VietnamWorksCrawler` | vietnamworks.com | Số job postings | `/5,000 × 100` |
| `CareerBuilderCrawler` | careerbuilder.vn | Số job postings | `/3,000 × 100` |
| `CareerLinkCrawler` | careerlink.vn | Số job postings | `/2,000 × 100` |
| `JobStreetCrawler` | jobstreet.vn | Số job postings | `/4,000 × 100` |

Tất cả crawlers đều:
- Dùng `requests.Session` với User-Agent browser
- `verify=False` (bypass SSL)
- Rate limiting: 2–4 giây/request
- Lưu vào `core.career_trends` với `ON CONFLICT DO UPDATE`

### 6.2 Google Trends Crawler

Dùng thư viện `pytrends`. Có sẵn mapping keyword theo nhóm nghề:

```python
CAREER_KEYWORDS = {
    "developer": ["lập trình viên", "developer", "software engineer"],
    "data":      ["data scientist", "data analyst", "khoa học dữ liệu"],
    "marketing": ["marketing", "digital marketing", "quảng cáo"],
    # ... 17 nhóm tổng cộng
}
```

Flow: `build_payload(keywords, geo='VN', timeframe='today 1-m')` → `interest_over_time()` → tính trung bình các keywords → insert từng ngày.

**Phụ thuộc:** `pip install pytrends` (optional, graceful fallback nếu không có).

### 6.3 Job Portal Crawlers (TopCV, VietnamWorks, CareerBuilder, CareerLink, JobStreet)

Cùng pattern:
1. Tạo keyword từ career title (slug hóa)
2. GET search page với keyword
3. Parse số lượng job từ HTML (nhiều fallback selector)
4. Normalize về 0-100
5. Insert vào `career_trends`

**Vấn đề:** HTML selectors hardcode, dễ bị break khi website thay đổi layout.

### 6.4 MultiSourceCrawler — Điều Phối

**File:** `crawlers/multi_source_crawler.py`

```python
class MultiSourceCrawler:
    crawlers = {
        'google_trends': GoogleTrendsCrawler,
        'topcv': TopCVCrawler,
        'vietnamworks': VietnamWorksCrawler,
        'careerbuilder': CareerBuilderCrawler,
        'careerlink': CareerLinkCrawler,
        'jobstreet': JobStreetCrawler,
    }
```

**Weighted average** khi kết hợp nhiều nguồn:

| Nguồn | Trọng số |
|-------|---------|
| google_trends | 0.25 |
| topcv | 0.15 |
| vietnamworks | 0.15 |
| careerbuilder | 0.15 |
| careerlink | 0.15 |
| jobstreet | 0.15 |

**Lưu ý bug:** `combine_sources_for_career()` có lỗi trong SQL query — dùng f-string thay vì parameterized cho `:days`:

```python
# BUG: ':days days' không được bind đúng
WHERE timestamp >= CURRENT_DATE - INTERVAL ':days days'

# Đúng phải là:
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
# hoặc dùng Python timedelta thay vì SQL INTERVAL
```

---

## 7. Schemas (Pydantic)

**File:** `app/modules/market_trends/schemas.py`

```python
class TrendDataPoint:
    timestamp: datetime
    search_interest: float  # 0-100
    source: str

class TrendSummary:
    career_id: int
    onet_code: Optional[str]
    current_interest: float
    growth_rate_7d: float
    growth_rate_30d: float
    trend_direction: str    # rising | falling | stable
    popularity_rank: Optional[int]
    updated_at: datetime

class TrendingCareer:
    career_id: int
    slug: str
    title: str
    description: str
    current_interest: float
    growth_rate_7d: float
    trend_direction: str
```

---

## 8. Migration & Setup

**File:** `app/modules/market_trends/migration.sql`

Cần chạy migration này để tạo 2 bảng trước khi dùng bất kỳ endpoint nào:

```bash
# Cách 1: Chạy file SQL trực tiếp
psql -U <user> -d <database> -f apps/backend/app/modules/market_trends/migration.sql

# Cách 2: Dùng script Python có sẵn
python run_migration_fixed.py

# Cách 3: Seed dữ liệu mock ngay sau migration
python seed_market_data.py
# hoặc
python seed_more_realistic_data.py
```

**Kiểm tra sau migration:**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'core'
AND table_name IN ('career_trends', 'career_trend_summaries');
-- Phải trả về 2 rows
```

---

## 9. Luồng Dữ Liệu Đầy Đủ

```
[Startup / Cron Job]
        │
        ▼
MultiSourceCrawler.crawl_all_sources()
        │
        ├── GoogleTrendsCrawler.crawl_all_careers()
        │       └── pytrends API → INSERT core.career_trends (source='google_trends')
        │
        ├── TopCVCrawler.crawl_all_careers()
        │       └── scrape topcv.vn → normalize → INSERT core.career_trends (source='topcv')
        │
        ├── VietnamWorksCrawler / CareerBuilderCrawler / CareerLinkCrawler / JobStreetCrawler
        │       └── (tương tự TopCV)
        │
        ▼
MarketTrendService.update_trend_summaries()
        │
        ├── Tính growth_rate_7d, growth_rate_30d từ avg(search_interest)
        ├── Xác định trend_direction (rising/falling/stable)
        └── UPSERT core.career_trend_summaries


[API Request: GET /api/market/trends/trending?trend_type=rising]
        │
        ▼
MarketTrendService.get_trending_careers(db, limit=10, trend_type='rising')
        │
        ├── SELECT FROM core.career_trend_summaries
        │   WHERE trend_direction = 'rising'
        │   ORDER BY growth_rate_7d DESC LIMIT 10
        │
        ├── Enrich: SELECT slug, title, description FROM core.careers WHERE id = career_id
        │
        └── Response: {success, careers: [TrendingCareer]}
```

---

## 10. Phân Tích Lỗi Hiện Tại

### Lỗi chính: `relation "core.career_trend_summaries" does not exist`

```
GET /api/market/trends/trending?trend_type=rising  → 500
GET /api/market/trends/trending?trend_type=popular → 500
```

**Nguyên nhân gốc:** Migration chưa được chạy. Bảng `career_trends` và `career_trend_summaries` không tồn tại trong database.

**Ảnh hưởng:** Toàn bộ endpoints `/api/market/*` đều trả về 500.

**Cách fix:**

```bash
# Bước 1: Chạy migration
python run_migration_fixed.py

# Bước 2: Seed dữ liệu mock để test
python seed_more_realistic_data.py

# Bước 3: Hoặc gọi API để seed
POST /api/market/admin/trends/seed-mock-data

# Bước 4: Cập nhật summaries
POST /api/market/admin/trends/update-summaries
```

---

## 11. Issues Trong Code

| # | Vấn đề | File | Mức độ | Đề xuất |
|---|--------|------|--------|---------|
| 1 | Migration chưa được auto-run khi startup (khác với course_catalog) | `main.py` | Cao | Thêm auto-migration vào `lifespan()` như course tables |
| 2 | SQL INTERVAL bug trong `combine_sources_for_career` | `multi_source_crawler.py` | Cao | Dùng Python `timedelta` thay vì SQL INTERVAL với param |
| 3 | `verify=False` trên tất cả crawlers (bỏ qua SSL) | tất cả crawlers | Trung bình | Dùng `certifi` hoặc bundle CA cert |
| 4 | HTML selectors hardcode, không có fallback tốt | topcv, vietnamworks, ... | Trung bình | Thêm logging chi tiết khi parse fail |
| 5 | Không có auto-migration trong startup | `main.py` | Cao | Thêm `CREATE TABLE IF NOT EXISTS` vào lifespan |
| 6 | `seed_mock_data` dùng `source='mock'` nhưng không có trong `source_weights` | `service.py` + `multi_source_crawler.py` | Thấp | Thêm `'mock': 0.0` vào weights |
| 7 | `get_trending_careers` không handle trường hợp bảng rỗng (0 rows) | `service.py` | Thấp | Trả về `[]` thay vì crash |
| 8 | Không có cron job tự động cập nhật summaries | — | Trung bình | Dùng APScheduler hoặc Celery |

---

## 12. Trạng Thái Hiện Tại

| Chức năng | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| Database tables | ❌ Chưa tạo | Cần chạy migration |
| `GET /trends/trending` | ❌ HTTP 500 | Phụ thuộc bảng chưa có |
| `GET /trends/compare` | ❌ HTTP 500 | Phụ thuộc bảng chưa có |
| `GET /trends/{id}` | ❌ HTTP 500 | Phụ thuộc bảng chưa có |
| `GET /trends/score/{id}` | ❌ HTTP 500 | Phụ thuộc bảng chưa có |
| Google Trends crawler | ⚠️ Optional | Cần `pip install pytrends` |
| Job portal crawlers | ⚠️ Chưa test | HTML selectors có thể outdated |
| Admin seed mock data | ✅ Logic đúng | Chạy được sau khi có bảng |
| Admin update summaries | ✅ Logic đúng | Chạy được sau khi có bảng |

---

## 13. Hành Động Khuyến Nghị (Ưu Tiên)

1. **[Ngay lập tức]** Chạy migration để tạo 2 bảng:
   ```bash
   python run_migration_fixed.py
   ```

2. **[Ngay lập tức]** Seed dữ liệu mock để test frontend:
   ```bash
   python seed_more_realistic_data.py
   ```

3. **[Cao]** Thêm auto-migration vào `main.py` lifespan (như đã làm với `course_catalog`):
   ```python
   conn.execute(text("CREATE TABLE IF NOT EXISTS core.career_trends (...)"))
   conn.execute(text("CREATE TABLE IF NOT EXISTS core.career_trend_summaries (...)"))
   ```

4. **[Cao]** Fix SQL INTERVAL bug trong `multi_source_crawler.py`

5. **[Trung bình]** Thêm cron job tự động cập nhật summaries hàng ngày

6. **[Thấp]** Thay `verify=False` bằng proper SSL handling trong crawlers

---

*Báo cáo được tạo từ phân tích source code và server log ngày 23/04/2026.*
