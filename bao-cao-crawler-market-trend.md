# Báo Cáo Chi Tiết: Crawler & Dữ Liệu Động — Market Trends

**Dự án:** AI-Based Career Recommendation System (SRC)
**Module:** `app/modules/market_trends/crawlers/`
**Ngày kiểm tra:** 23/04/2026
**Nhóm:** C1SE.29

---

## 1. Kết Luận Nhanh

> **Dữ liệu hiện tại là 100% MOCK. Tất cả 6 crawlers có code nhưng KHÔNG THỂ chạy được do 3 lỗi chặn cứng.**

| Hạng mục | Trạng thái |
|----------|-----------|
| Dữ liệu trong DB | ❌ 100% mock (source = `'mock'`) |
| Google Trends Crawler | ❌ Không chạy — thiếu `pytrends` |
| TopCV / VietnamWorks / CareerBuilder / CareerLink / JobStreet | ❌ Không chạy — thiếu `requests`, `beautifulsoup4`, `lxml` |
| ON CONFLICT SQL | ❌ Sẽ crash — không có unique constraint tương ứng |
| SQL INTERVAL bug | ❌ Query trả về kết quả sai |
| Admin endpoint trigger crawl | ❌ Không tồn tại trong `routes.py` |

---

## 2. Kiểm Tra Dữ Liệu Thực Tế Trong DB

```sql
SELECT source, COUNT(*) as count,
       MIN(timestamp) as earliest,
       MAX(timestamp) as latest
FROM core.career_trends
GROUP BY source;
```

**Kết quả thực tế:**

```
 source | count |           earliest           |            latest
--------+-------+------------------------------+------------------------------
 mock   |   600 | 2026-03-24 12:36:36+00       | 2026-04-22 12:36:36+00
(1 row)
```

**Nhận xét:**
- Chỉ có 1 source duy nhất: `mock`
- 600 rows = 20 careers × 30 ngày — sinh ngẫu nhiên bởi `service.seed_mock_data()`
- Không có bất kỳ dữ liệu thực nào từ Google Trends, TopCV, VietnamWorks, v.v.
- Tổng careers trong hệ thống: **959**, nhưng chỉ **20** có trend data (2%)
- Summaries: 20 rows — 7 rising, 6 falling, 7 stable (phân bố ngẫu nhiên)

---

## 3. Phân Tích 3 Lỗi Chặn Crawlers

### Lỗi 1: Thiếu Python Dependencies (Chặn hoàn toàn)

**Kiểm tra thực tế venv:**

```
Package    Version
---------- -------
pip        24.0
setuptools 65.5.0
```

Venv chỉ có 2 package cơ bản. Toàn bộ dependencies cho crawler đều thiếu:

| Package | Dùng bởi | Hậu quả khi thiếu |
|---------|----------|-------------------|
| `pytrends` | `GoogleTrendsCrawler` | `ModuleNotFoundError` → `self.pytrends = None` → mọi crawl return 0 |
| `requests` | Tất cả 5 job portal crawlers | `ModuleNotFoundError` → crash khi import |
| `beautifulsoup4` | Tất cả 5 job portal crawlers | `ModuleNotFoundError` → crash khi import |
| `lxml` | Tất cả 5 job portal crawlers (HTML parser) | `ModuleNotFoundError` → crash khi import |

**Cách Google Trends xử lý (silent fail):**

```python
# google_trends_crawler.py — dòng 44-52
def _init_pytrends(self):
    try:
        from pytrends.request import TrendReq
        self.pytrends = TrendReq(hl='vi-VN', tz=420, timeout=(10, 25))
    except ImportError:
        logger.warning("⚠️  pytrends not installed.")
        self.pytrends = None   # ← set None, không crash

# crawl_career() — dòng 57-60
def crawl_career(self, ...):
    if not self.pytrends:
        logger.warning("PyTrends not available, skipping crawl")
        return 0   # ← return 0 ngay, không làm gì
```

→ Google Trends crawler **không crash** nhưng **không làm gì cả**, trả về 0 điểm.

**Cách job portal crawlers xử lý (hard crash):**

```python
# topcv_crawler.py — dòng 12-14
import requests           # ← ModuleNotFoundError ngay khi import file
from bs4 import BeautifulSoup
```

→ Khi `MultiSourceCrawler.__init__()` khởi tạo `TopCVCrawler(db)`, Python import file → crash ngay.

---

### Lỗi 2: `ON CONFLICT` Không Có Unique Constraint Tương Ứng

**Schema thực tế của bảng `core.career_trends`:**

```
Indexes:
    "career_trends_pkey" PRIMARY KEY, btree (id)
    "idx_career_trends_career_id" btree (career_id)
    "idx_career_trends_career_timestamp" btree (career_id, "timestamp" DESC)
    "idx_career_trends_onet_code" btree (onet_code)
    "idx_career_trends_timestamp" btree ("timestamp")
Check constraints:
    "career_trends_search_interest_check" CHECK (search_interest >= 0 AND <= 100)
```

**Không có UNIQUE constraint nào** ngoài primary key.

**Các crawlers dùng `ON CONFLICT` với columns không có unique constraint:**

```python
# google_trends_crawler.py + topcv_crawler.py
ON CONFLICT (career_id, timestamp) DO UPDATE ...
# → PostgreSQL error: "there is no unique or exclusion constraint
#   matching the ON CONFLICT specification"

# vietnamworks, careerbuilder, careerlink, jobstreet
ON CONFLICT (career_id, timestamp, source) DO UPDATE ...
# → Cùng lỗi trên
```

**Hậu quả:** Mỗi lần crawler chạy sẽ throw `psycopg2.errors.InvalidColumnReference` → `db.rollback()` → return 0, không lưu được gì.

**Fix cần thiết — thêm unique constraint vào migration:**

```sql
-- Cho google_trends và topcv (dùng ON CONFLICT career_id, timestamp)
ALTER TABLE core.career_trends
ADD CONSTRAINT uq_career_trends_career_ts
UNIQUE (career_id, timestamp, source);
-- Dùng (career_id, timestamp, source) để cover cả 2 loại ON CONFLICT
```

---

### Lỗi 3: SQL INTERVAL Bug Trong `multi_source_crawler.py`

**Code lỗi — dòng 107-113:**

```python
def combine_sources_for_career(self, career_id: int, days: int = 7) -> Dict:
    result = self.db.execute(text("""
        SELECT source, AVG(search_interest), COUNT(*), MAX(timestamp)
        FROM core.career_trends
        WHERE career_id = :cid
        AND timestamp >= CURRENT_DATE - INTERVAL ':days days'  -- ❌ BUG
        GROUP BY source
    """), {'cid': career_id, 'days': days})
```

**Vấn đề:** PostgreSQL không bind parameter vào bên trong string literal `':days days'`. Câu query thực tế gửi đến DB là:

```sql
WHERE timestamp >= CURRENT_DATE - INTERVAL ':days days'
-- PostgreSQL sẽ throw: invalid input syntax for type interval: ":days days"
```

**Fix đúng:**

```python
# Cách 1: Dùng Python timedelta (khuyến nghị)
from datetime import timedelta
cutoff = datetime.utcnow() - timedelta(days=days)
result = self.db.execute(text("""
    SELECT source, AVG(search_interest), COUNT(*), MAX(timestamp)
    FROM core.career_trends
    WHERE career_id = :cid
    AND timestamp >= :cutoff
    GROUP BY source
"""), {'cid': career_id, 'cutoff': cutoff})

# Cách 2: Dùng make_interval() của PostgreSQL
AND timestamp >= CURRENT_DATE - make_interval(days => :days)
```

---

## 4. Vấn Đề Thiết Kế: Không Có Endpoint Trigger Crawl

**Kiểm tra `routes.py` — toàn bộ endpoints hiện có:**

```
GET  /api/market/trends/trending
GET  /api/market/trends/compare
GET  /api/market/trends/score/{career_id}
GET  /api/market/trends/{career_id}/summary
GET  /api/market/trends/{career_id}
POST /api/market/admin/trends/update-summaries
POST /api/market/admin/trends/seed-mock-data      ← chỉ có mock
```

**Không có endpoint nào để:**
- Trigger crawl từ Google Trends
- Trigger crawl từ job portals
- Trigger `MultiSourceCrawler.crawl_all_sources()`
- Xem trạng thái crawl (freshness, last run)

Để chạy crawlers, hiện tại phải viết script Python riêng và chạy thủ công.

---

## 5. Đánh Giá Chi Tiết Từng Crawler

### 5.1 Google Trends Crawler

**File:** `crawlers/google_trends_crawler.py`

**Cơ chế hoạt động (khi đủ dependencies):**
1. Dùng `pytrends.TrendReq(hl='vi-VN', tz=420)` — timezone Việt Nam (UTC+7)
2. `build_payload(keywords, timeframe='today 1-m', geo='VN')` — lấy 30 ngày gần nhất
3. `interest_over_time()` → DataFrame với index là ngày, columns là keywords
4. Tính trung bình các keywords → `avg_interest`
5. Insert từng ngày vào `career_trends`

**Keyword mapping (17 nhóm):**

```python
CAREER_KEYWORDS = {
    "developer": ["lập trình viên", "developer", "software engineer"],
    "data":      ["data scientist", "data analyst", "khoa học dữ liệu"],
    "web":       ["web developer", "frontend", "backend"],
    "ai":        ["ai engineer", "machine learning", "artificial intelligence"],
    "devops":    ["devops", "cloud engineer", "sre"],
    "marketing": ["marketing", "digital marketing", "quảng cáo"],
    "product":   ["product manager", "pm", "quản lý sản phẩm"],
    "business":  ["business analyst", "ba", "phân tích kinh doanh"],
    "sales":     ["sales", "bán hàng", "kinh doanh"],
    "nurse":     ["y tá", "nurse", "điều dưỡng"],
    "doctor":    ["bác sĩ", "doctor", "physician"],
    "pharmacist":["dược sĩ", "pharmacist"],
    "teacher":   ["giáo viên", "teacher", "giảng viên"],
    "designer":  ["designer", "thiết kế", "graphic designer"],
    "ux":        ["ux designer", "ui designer", "product designer"],
    "accountant":["kế toán", "accountant"],
    "finance":   ["tài chính", "finance", "financial analyst"],
}
```

**Vấn đề logic:**
- Chỉ cover 17 nhóm nghề, trong khi DB có **959 careers**
- Careers không match → dùng `title.lower()` làm keyword → Google Trends thường trả về empty
- Rate limit: `time.sleep(2)` giữa mỗi career → crawl 959 careers mất ~32 phút
- Google Trends có rate limit riêng, có thể bị block sau ~100 requests liên tiếp

**Dữ liệu trả về:** Search interest 0-100 (Google normalize sẵn), đây là dữ liệu **thực và có giá trị nhất** trong 6 nguồn.

---

### 5.2 TopCV Crawler

**File:** `crawlers/topcv_crawler.py`

**URL pattern:** `https://www.topcv.vn/tim-viec-lam/{keyword-slug}`

**Cơ chế:**
1. GET trang search với keyword slug (vd: `lap-trinh-vien`)
2. Parse HTML tìm `<div class="job-count">` → số lượng jobs
3. Fallback: đếm `<div class="job-item">` cards
4. Normalize: `job_count / 10,000 × 100` (max 10,000 jobs)

**Keyword mapping (chỉ 8 nhóm):**

```python
CAREER_KEYWORDS = {
    "developer": "lap-trinh-vien",
    "data":      "data-analyst",
    "marketing": "marketing",
    "sales":     "kinh-doanh",
    "accountant":"ke-toan",
    "designer":  "thiet-ke",
    "hr":        "nhan-su",
    "teacher":   "giao-vien",
}
```

**Vấn đề:**
- Chỉ 8 nhóm, 951 careers còn lại dùng slug từ title → URL không hợp lệ → 404
- HTML selector `class_='job-count'` có thể đã thay đổi (TopCV thường update UI)
- `verify=False` — bỏ qua SSL certificate verification (không an toàn)
- Rate limit: `time.sleep(3)` → crawl 959 careers mất ~48 phút

---

### 5.3 VietnamWorks Crawler

**File:** `crawlers/vietnamworks_crawler.py`

**URL:** `https://www.vietnamworks.com/tim-viec-lam?q={keyword}&location=ho-chi-minh`

**Normalize:** `job_count / 5,000 × 100`

**Vấn đề:**
- VietnamWorks dùng React SPA — HTML trả về từ server thường không có job count, cần JavaScript render
- Selector `class_='result-count'` rất có thể không tồn tại trong server-side HTML
- Fallback đếm `class_='job-item'` cũng sẽ trả về 0 vì React chưa render
- Thực tế: hầu hết requests sẽ trả về `job_count = 0` → `interest = 0.0`

---

### 5.4 CareerBuilder Crawler

**File:** `crawlers/careerbuilder_crawler.py`

**URL:** `https://careerbuilder.vn/viec-lam?keywords={keyword}&location=29`

**Normalize:** `job_count / 3,000 × 100`

**Vấn đề:**
- Selectors `class_='job-found'` và `class_='total-job'` cần verify với HTML thực tế
- `location=29` là mã HCM City — hardcode, không linh hoạt
- Rate limit: `time.sleep(3)`

---

### 5.5 CareerLink Crawler

**File:** `crawlers/careerlink_crawler.py`

**URL:** `https://www.careerlink.vn/vieclam/list?keyword={keyword}&city=24`

**Normalize:** `job_count / 2,000 × 100`

**Vấn đề:**
- `city=24` là mã HCM City — hardcode
- Selectors `class_='number-job'` và `class_='total-jobs'` cần verify
- CareerLink ít phổ biến hơn, dữ liệu ít đa dạng

---

### 5.6 JobStreet Crawler

**File:** `crawlers/jobstreet_crawler.py`

**URL:** `https://www.jobstreet.vn/vi/job-search?keywords={keyword}&location=1000002`

**Normalize:** `job_count / 4,000 × 100`

**Vấn đề:**
- JobStreet (SEEK Asia) dùng React/Next.js — tương tự VietnamWorks, HTML server-side không có job count
- `data-automation='totalJobsCount'` là attribute của React component, không có trong static HTML
- Thực tế: hầu hết requests trả về 0

---

### 5.7 MultiSourceCrawler — Điều Phối

**File:** `crawlers/multi_source_crawler.py`

**Weighted average khi kết hợp nguồn:**

```
google_trends : 0.25  (search intent — chất lượng cao nhất)
topcv         : 0.15  (job postings VN)
vietnamworks  : 0.15  (job postings VN)
careerbuilder : 0.15  (job postings VN)
careerlink    : 0.15  (job postings VN)
jobstreet     : 0.15  (job postings VN)
─────────────────────
Tổng          : 1.00
```

**Vấn đề:** Tổng weights chỉ = 1.00 khi có đủ 6 nguồn. Nếu chỉ có 1 nguồn (vd: chỉ google_trends), `total_weight = 0.25` → `combined_score = weighted_sum / 0.25` → kết quả bị inflate 4x.

---

## 6. So Sánh: Mock vs Dữ Liệu Thực

| Tiêu chí | Mock (hiện tại) | Dữ liệu thực (khi crawlers hoạt động) |
|----------|----------------|--------------------------------------|
| Nguồn | `random.uniform(30, 80)` | Google Trends + 5 job portals |
| Độ chính xác | 0% — hoàn toàn ngẫu nhiên | Phản ánh thị trường thực |
| Số careers có data | 20/959 (2%) | Tối đa 959 (tùy keyword match) |
| Time series | 30 ngày giả | Google: 30 ngày thực; Job portals: 1 điểm/ngày |
| Trend direction | Ngẫu nhiên | Tính từ growth_rate_7d thực |
| Cập nhật | Thủ công (gọi API) | Có thể schedule hàng ngày |
| Giá trị cho user | Không có | Cao — phản ánh nhu cầu tuyển dụng thực |

---

## 7. Danh Sách Đầy Đủ Các Fix Cần Làm

### Fix 1: Cài Dependencies

```bash
# Trong venv của backend
pip install pytrends==4.9.2 requests==2.31.0 beautifulsoup4==4.12.3 lxml==5.1.0
```

Sau đó thêm vào `requirements.txt`:

```
pytrends==4.9.2
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0
```

---

### Fix 2: Thêm Unique Constraint Vào DB

```sql
-- Chạy trong PostgreSQL
ALTER TABLE core.career_trends
ADD CONSTRAINT uq_career_trends_career_ts_source
UNIQUE (career_id, timestamp, source);
```

Sau đó cập nhật `migration.sql` để thêm dòng này.

Và cập nhật `google_trends_crawler.py` + `topcv_crawler.py` để dùng `(career_id, timestamp, source)` thay vì `(career_id, timestamp)`:

```python
# google_trends_crawler.py — sửa ON CONFLICT
ON CONFLICT (career_id, timestamp, source) DO UPDATE
SET search_interest = EXCLUDED.search_interest
```

---

### Fix 3: Sửa SQL INTERVAL Bug

```python
# multi_source_crawler.py — combine_sources_for_career()
# TRƯỚC (sai):
AND timestamp >= CURRENT_DATE - INTERVAL ':days days'

# SAU (đúng):
from datetime import datetime, timedelta
cutoff = datetime.utcnow() - timedelta(days=days)
# Truyền :cutoff vào query thay vì :days
AND timestamp >= :cutoff
```

---

### Fix 4: Thêm Admin Endpoints Trigger Crawl

Thêm vào `routes.py`:

```python
@router.post("/admin/trends/crawl")
def trigger_crawl(
    sources: Optional[str] = Query(None, description="Comma-separated: google_trends,topcv,vietnamworks,..."),
    limit: Optional[int] = Query(None, description="Giới hạn số careers, None = all"),
    db: Session = Depends(get_db),
):
    """Admin: Trigger real data crawl từ các nguồn."""
    from .crawlers.multi_source_crawler import MultiSourceCrawler
    crawler = MultiSourceCrawler(db)
    source_list = [s.strip() for s in sources.split(",")] if sources else None
    result = crawler.crawl_all_sources(limit=limit, sources=source_list)
    return {"success": True, "result": result}


@router.get("/admin/trends/freshness")
def get_data_freshness(db: Session = Depends(get_db)):
    """Admin: Kiểm tra độ fresh của dữ liệu từng nguồn."""
    from .crawlers.multi_source_crawler import MultiSourceCrawler
    crawler = MultiSourceCrawler(db)
    return {"success": True, "freshness": crawler.get_data_freshness()}
```

---

### Fix 5: Sửa Weighted Average Khi Thiếu Nguồn

```python
# multi_source_crawler.py — combine_sources_for_career()
# TRƯỚC (sai khi thiếu nguồn):
combined_score = weighted_sum / total_weight if total_weight > 0 else 0

# SAU (normalize đúng):
# total_weight chỉ tính các nguồn thực sự có data
# → kết quả không bị inflate
# Đây đã đúng về mặt toán học, nhưng cần đảm bảo
# chỉ cộng weight của nguồn có data (code hiện tại đã làm đúng)
```

---

## 8. Hướng Dẫn Chạy Crawlers Sau Khi Fix

### Bước 1: Cài dependencies

```bash
# Windows (trong thư mục apps/backend)
.venv\Scripts\pip.exe install pytrends==4.9.2 requests==2.31.0 beautifulsoup4==4.12.3 lxml==5.1.0
```

### Bước 2: Thêm unique constraint

```powershell
$env:PGPASSWORD="123456"
psql -h localhost -p 5433 -U postgres -d career_ai -c "
ALTER TABLE core.career_trends
ADD CONSTRAINT uq_career_trends_career_ts_source
UNIQUE (career_id, timestamp, source);"
```

### Bước 3: Sửa code (3 files)

- `google_trends_crawler.py` — đổi `ON CONFLICT (career_id, timestamp)` → `(career_id, timestamp, source)`
- `topcv_crawler.py` — đổi `ON CONFLICT (career_id, timestamp)` → `(career_id, timestamp, source)`
- `multi_source_crawler.py` — fix SQL INTERVAL bug

### Bước 4: Trigger crawl qua API (sau khi thêm endpoint)

```powershell
# Crawl chỉ Google Trends trước (đáng tin cậy nhất)
Invoke-RestMethod -Uri "http://localhost:8000/api/market/admin/trends/crawl?sources=google_trends&limit=50" -Method Post

# Crawl tất cả nguồn, giới hạn 20 careers để test
Invoke-RestMethod -Uri "http://localhost:8000/api/market/admin/trends/crawl?limit=20" -Method Post

# Cập nhật summaries sau khi crawl xong
Invoke-RestMethod -Uri "http://localhost:8000/api/market/admin/trends/update-summaries" -Method Post
```

### Bước 5: Kiểm tra kết quả

```powershell
# Xem data freshness theo nguồn
Invoke-RestMethod -Uri "http://localhost:8000/api/market/admin/trends/freshness" -Method Get | ConvertTo-Json -Depth 3

# Xem trending careers với dữ liệu thực
Invoke-RestMethod -Uri "http://localhost:8000/api/market/trends/trending?trend_type=rising&limit=5" -Method Get | ConvertTo-Json -Depth 3
```

---

## 9. Khuyến Nghị Thực Tế

### Nguồn nào đáng dùng nhất?

| Nguồn | Đánh giá | Lý do |
|-------|---------|-------|
| **Google Trends** | ⭐⭐⭐⭐⭐ | Dữ liệu search intent thực, 30 ngày time series, normalize sẵn 0-100 |
| **TopCV** | ⭐⭐⭐ | Job portal lớn nhất VN, HTML tương đối ổn định |
| **CareerBuilder** | ⭐⭐⭐ | Dữ liệu tốt, HTML server-side |
| **CareerLink** | ⭐⭐ | Ít phổ biến hơn |
| **VietnamWorks** | ⭐ | React SPA — HTML không có job count |
| **JobStreet** | ⭐ | React/Next.js — HTML không có job count |

**Đề xuất:** Chỉ dùng Google Trends + TopCV + CareerBuilder trong giai đoạn đầu. VietnamWorks và JobStreet cần dùng Selenium/Playwright để render JavaScript.

### Nên schedule crawl như thế nào?

```
Google Trends : 1 lần/ngày (rate limit ~100 req/session)
Job portals   : 1 lần/ngày (polite crawling, 3-4s delay)
update-summaries : Sau mỗi lần crawl xong
```

---

## 10. Tóm Tắt Ưu Tiên Fix

| Ưu tiên | Việc cần làm | Thời gian ước tính |
|---------|-------------|-------------------|
| 🔴 Ngay | Cài `pytrends`, `requests`, `beautifulsoup4`, `lxml` | 2 phút |
| 🔴 Ngay | Thêm unique constraint vào DB | 1 phút |
| 🔴 Ngay | Fix `ON CONFLICT` trong google_trends + topcv crawler | 5 phút |
| 🟡 Cao | Fix SQL INTERVAL bug trong multi_source_crawler | 5 phút |
| 🟡 Cao | Thêm `/admin/trends/crawl` endpoint vào routes.py | 10 phút |
| 🟡 Cao | Thêm `/admin/trends/freshness` endpoint | 5 phút |
| 🟢 Trung bình | Mở rộng keyword mapping (17 → 50+ nhóm) | 30 phút |
| 🟢 Trung bình | Dùng Selenium cho VietnamWorks + JobStreet | 2-4 giờ |
| 🟢 Thấp | Schedule tự động hàng ngày (APScheduler) | 1 giờ |

---

*Báo cáo được tạo từ phân tích source code + kiểm tra DB thực tế ngày 23/04/2026.*
