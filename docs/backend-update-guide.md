# Backend Update Guide — Clean Code Architecture
> Dành cho developer mới hoặc AI assistant khi cần thêm/sửa tính năng

---

## Cấu trúc 3 lớp (3-Layer Architecture)

```
HTTP Request
    │
    ▼
┌─────────────────────────────┐
│  CONTROLLER (routes.py)     │  ← Nhận request, validate HTTP, gọi Service
│  Biết: FastAPI, HTTP codes   │
│  Không biết: DB queries      │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  SERVICE (service_v2.py)    │  ← Business logic, orchestrate
│  Biết: domain rules         │
│  Không biết: HTTP, SQL      │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  REPOSITORY (repository.py) │  ← DB queries thuần túy
│  Biết: SQLAlchemy queries   │
│  Không biết: business rules │
└─────────────────────────────┘
    │
    ▼
  Database (PostgreSQL)
```

---

## Danh sách: Muốn sửa X → vào file nào?

### Mentor Matching

| Muốn thêm/sửa | Vào file | Hàm cụ thể |
|---------------|----------|------------|
| Đổi thuật toán scoring (trọng số skill/career/personality) | `matching_algorithm.py` | `calculate_overall_compatibility()` |
| Thêm nguồn mentor mới (vd: từ bảng khác) | `service_v2.py` | Thêm `_match_from_new_source()`, gọi trong `find_compatible_mentors()` |
| Đổi ngưỡng điểm tối thiểu hiển thị | `service_v2.py` | Hằng số `MINIMUM_COMPATIBILITY_THRESHOLD` |
| Thêm field vào MatchingResult output | `schemas.py` + `service_v2.py` | Class `MatchingResult` + `_score_mentor_against_mentee()` |
| Thêm filter (vd: lọc theo location) | `repository.py` | `MentorProfileRepository.find_active_mentors()` |
| Đổi format response của API | `routes.py` | Endpoint handler tương ứng |
| Thêm rating/review mentor | `service_v2.py` | Tạo `rate_mentor()` method mới |
| Phân trang danh sách mentor | `repository.py` + `routes.py` | `find_active_mentors()` thêm limit/offset |

### Skill Gap Analysis

| Muốn thêm/sửa | Vào file | Hàm cụ thể |
|---------------|----------|------------|
| Đổi AI model cho learning plan | `routes.py` | `get_learning_plan()` → thay `multi_stream_manager.get_cv_stream()` |
| Cache learning plan bằng Redis thay PG | `routes.py` | `_save_cache()` + `_run_stream_learning_plan()` |
| Streaming learning plan (SSE) | `sse_routes.py` | `_stream_learning_plan()` |
| Thêm field vào SkillGapAnalysis output | `models.py` + `routes.py` | Class `SkillGapAnalysis` + serialization |
| Đổi prompt Gemini | `routes.py` | Biến `prompt` trong `get_learning_plan()` |

### Chat & Schedule

| Muốn thêm/sửa | Vào file | Hàm cụ thể |
|---------------|----------|------------|
| Thêm loại notification mới (WS event) | `schedule_routes.py` + frontend | `nm.send()` calls + `ChatbotButton.tsx` switch-case |
| Đổi thời gian reminder (hiện: 30min) | `schedule_routes.py` | `_send_session_reminders()`: `window_start/end` |
| Tần suất chạy reminder job | `main.py` | `IntervalTrigger(minutes=5)` |
| Thêm trạng thái session mới | `schedule_models.py` + `schedule_routes.py` | Column `status` + validation |
| Đổi timezone xử lý lịch hẹn | `schedule_routes.py` | `timedelta(hours=7)` |

### Companies (Job Listings)

| Muốn thêm/sửa | Vào file | Hàm cụ thể |
|---------------|----------|------------|
| Thêm job board mới | `scraper.py` | Tạo `scrape_new_board()` + thêm vào `scrape_group()` |
| Đổi tần suất cập nhật hàng ngày | `scheduler.py` | `CronTrigger(hour=2, minute=0)` |
| Thêm field mới vào Company | `models.py` + migration | Thêm Column + `ALTER TABLE` |
| Thêm endpoint mới | `routes.py` | Thêm `@router.get(...)` |
| Đổi logic dedup công ty | `updater.py` | `_normalize_name()` + `upsert_companies()` |

### Binary Serialization / Cache

| Muốn thêm/sửa | Vào file | Hàm cụ thể |
|---------------|----------|------------|
| Đổi format cache (msgpack → orjson) | `serialization.py` | `cache_serialize()` |
| Thêm Redis pool config | `cache.py` | `CacheManager.__init__()` |
| Đổi TTL cache mặc định | `cache.py` | `cache_manager.set(ttl=3600)` |
| Thêm metric hit/miss monitoring | `cache.py` | `CacheManager.get_stats()` |

---

## Quy tắc đặt tên (Naming Convention)

```python
# ✅ Đúng — tự giải thích
mentor_profile_repository = MentorProfileRepository(db)
active_mentors_list = mentor_profile_repository.find_active_mentors()
minimum_compatibility_threshold = 0.10

# ❌ Sai — mơ hồ
repo = MentorProfileRepository(db)
d = repo.get()
t = 0.10
```

### Quy tắc đặt tên hàm

| Loại hàm | Prefix | Ví dụ |
|----------|--------|-------|
| Query DB, trả None nếu không có | `find_*` | `find_by_user_id()` |
| Query DB, raise nếu không có | `get_*_or_raise()` | `get_mentor_profile_or_raise()` |
| Tạo mới | `create_*` | `create_mentor_profile()` |
| Cập nhật | `update_*` | `update_mentor_profile_fields()` |
| Tạo hoặc cập nhật | `upsert_*` | `upsert_mentor_profile()` |
| Logic tính toán | `calculate_*` | `calculate_compatibility_score()` |
| Kiểm tra boolean | `is_*` / `has_*` | `is_mentor_available()` |
| Hàm private (internal only) | `_*` | `_parse_completed_orders()` |

---

## Quy tắc comment

### JSDoc cho mỗi function

```python
def find_compatible_mentors(self, mentee_user_id: int) -> List[MatchingResult]:
    """Tìm mentor phù hợp với mentee theo thuật toán AI matching.

    @param mentee_user_id: user_id của mentee (từ JWT token)
    @returns: Danh sách MatchingResult đã sort theo điểm, tối đa 10 kết quả
    @raises ResourceNotFoundError: Nếu mentee chưa tạo profile
    """
```

### Numbered steps trong hàm phức tạp

```python
def send_mentorship_request(self, mentee_user_id, data):
    # 1. Lấy profile của mentee (raise nếu chưa tạo)
    mentee_profile = self.get_mentee_profile_or_raise(mentee_user_id)

    # 2. Kiểm tra mentor tồn tại
    mentor_profile = self._mentor_repo.find_by_id(data.mentor_id)

    # 3. Ngăn gửi request trùng lặp
    existing = self._request_repo.find_pending_duplicate(...)

    # 4. Tính điểm compatibility
    score = self._calculate_quick_compatibility(mentee_profile, mentor_profile)

    # 5. Tạo và lưu request
    return self._request_repo.save(new_request)
```

---

## Exception Handling

```python
# Controller — convert domain error → HTTP
from app.core.exceptions import raise_http, ResourceNotFoundError

@router.get("/mentor/profile")
def get_mentor_profile(current_user = Depends(...), db = Depends(get_db)):
    try:
        service = MentorMatchingService(db)
        profile = service.get_mentor_profile_or_raise(current_user.id)
        return profile
    except AppError as e:
        raise_http(e)  # Tự động map sang đúng HTTP status code

# Service — raise domain error
raise ResourceNotFoundError("MentorProfile", user_id)  # → 404
raise BusinessRuleError("Cannot book in the past")      # → 400
raise PermissionDeniedError("delete this session")      # → 403
raise DuplicateResourceError("MentorshipRequest")       # → 409
```

---

## Kiểm tra file khi đọc code mới

1. **Tìm logic ở đâu?** → `service.py` hoặc `service_v2.py`
2. **Tìm query DB?** → `repository.py`
3. **Tìm HTTP endpoint?** → `routes.py`
4. **Tìm data structure?** → `schemas.py` (Pydantic) hoặc `models.py` (SQLAlchemy)
5. **Tìm custom error?** → `app/core/exceptions.py`
6. **Tìm caching?** → `app/core/cache.py` + `app/core/serialization.py`
7. **Tìm scheduler/job?** → `app/modules/companies/scheduler.py`
8. **Tìm WS notification?** → `app/modules/realtime/ws_notifications.py`
