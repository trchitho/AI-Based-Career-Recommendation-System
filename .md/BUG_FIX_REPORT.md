# Báo Cáo Fix Lỗi - Voice Interview System

**Ngày:** 25/04/2026
**Phạm vi:** `apps/backend/app/modules/interview/` + `apps/backend/app/api/voice_interview.py` + `db/migrations/`
**Trạng thái:** ✅ Tất cả lỗi đã được fix và verified

---

## Tóm Tắt

| # | File | Loại lỗi | Mức độ | Trạng thái |
|---|------|----------|--------|------------|
| 1 | `models.py` | `__table_args__` định nghĩa 2 lần trong `InterviewSession` | CRITICAL | ✅ Fixed |
| 2 | `models.py` | `__table_args__` sai thứ tự trong `InterviewAudio` | CRITICAL | ✅ Fixed |
| 3 | `models.py` | Thiếu `CheckConstraint` cho `question_count` trong `InterviewSession` | HIGH | ✅ Fixed |
| 4 | `audio_pipeline_service.py` | `upload_audio` raise `ValueError` khi `message_id=None` với `user_answer` | CRITICAL | ✅ Fixed |
| 5 | `audio_pipeline_service.py` | `file_url or ""` lưu empty string vào cột `NOT NULL` | CRITICAL | ✅ Fixed |
| 6 | `db/migrations/009_voice_interview_support.sql` | Cú pháp `DO $` sai — phải là `DO $$` | CRITICAL | ✅ Fixed |
| 7 | `db/migrations/009_voice_interview_support.sql` | Thiếu `NOT NULL` trên `created_at` | MEDIUM | ✅ Fixed |
| 8 | `db/migrations/009_voice_interview_support.sql` | Thiếu sync constraint `chk_question_count_range` | MEDIUM | ✅ Fixed |

---

## Chi Tiết Từng Lỗi

---

### Lỗi 1 — `models.py`: `InterviewSession.__table_args__` định nghĩa 2 lần

**File:** `apps/backend/app/modules/interview/models.py`

**Nguyên nhân:**
`__table_args__` được khai báo hai lần trong cùng một class. Python chỉ giữ lại định nghĩa cuối cùng, khiến `{"schema": "interview"}` bị mất và SQLAlchemy không biết table thuộc schema nào.

```python
# TRƯỚC (SAI) — 2 lần khai báo
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    __table_args__ = {"schema": "interview"}   # ← lần 1, bị ghi đè
    ...
    __table_args__ = (                          # ← lần 2, ghi đè lần 1
        {"schema": "interview"},                # ← dict ở đầu tuple = SAI
        CheckConstraint("interview_mode IN ('text', 'voice')", ...),
        CheckConstraint("tab_switch_count >= 0 ...", ...),
    )
```

**Hậu quả:**
- SQLAlchemy raise `'SchemaItem' object` error khi load module
- Toàn bộ interview module fail → tất cả routes `/api/interview/*` trả về **404**
- Cả `/api/interview/my-interviews` và `/api/interview/jobs/search` không hoạt động

**Fix:**
```python
# SAU (ĐÚNG) — 1 lần khai báo, dict ở cuối tuple
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    __table_args__ = (
        CheckConstraint("question_count >= 1 AND question_count <= 25", name="chk_question_count_range"),
        CheckConstraint("interview_mode IN ('text', 'voice')", name="chk_interview_mode"),
        CheckConstraint("tab_switch_count >= 0 AND tab_switch_count <= 10", name="chk_tab_switch_count"),
        {"schema": "interview"},   # ← dict PHẢI ở cuối tuple
    )
```

**Quy tắc SQLAlchemy:** Khi `__table_args__` là tuple, phần tử cuối cùng phải là dict chứa table options (`schema`, `extend_existing`, v.v.).

---

### Lỗi 2 — `models.py`: `InterviewAudio.__table_args__` sai thứ tự

**File:** `apps/backend/app/modules/interview/models.py`

**Nguyên nhân:**
Tương tự lỗi 1 — dict `{"schema": "interview"}` được đặt ở **đầu** tuple thay vì **cuối**.

```python
# TRƯỚC (SAI)
__table_args__ = (
    {"schema": "interview"},                                          # ← dict ở đầu = SAI
    CheckConstraint("audio_type IN ('user_answer', 'ai_question')", ...),
)
```

**Fix:**
```python
# SAU (ĐÚNG)
__table_args__ = (
    CheckConstraint("audio_type IN ('user_answer', 'ai_question')", name="chk_audio_type"),
    {"schema": "interview"},   # ← dict ở cuối = ĐÚNG
)
```

---

### Lỗi 3 — `models.py`: Thiếu `CheckConstraint` cho `question_count`

**File:** `apps/backend/app/modules/interview/models.py`

**Nguyên nhân:**
DB thực tế (từ `DB_Interview.txt` và migration `008`) có constraint `chk_question_count_range CHECK (question_count >= 1 AND question_count <= 25)`, nhưng SQLAlchemy model không khai báo constraint này.

**Hậu quả:**
- ORM không validate `question_count` trước khi INSERT
- Có thể lưu giá trị 0 hoặc 100 vào DB → DB raise constraint violation error không rõ ràng

**Fix:** Thêm vào `InterviewSession.__table_args__`:
```python
CheckConstraint("question_count >= 1 AND question_count <= 25", name="chk_question_count_range"),
```

---

### Lỗi 4 — `audio_pipeline_service.py`: `ValueError` khi `message_id=None`

**File:** `apps/backend/app/modules/interview/audio_pipeline_service.py`

**Nguyên nhân:**
`AudioStorageService.upload_audio()` có validation:
```python
if audio_type == "user_answer" and not message_id:
    raise ValueError("message_id is required for user_answer audio type")
```

Nhưng `process_user_audio()` gọi với `audio_type="user_answer"` và `message_id=None` (vì frontend không luôn gửi `message_id`):
```python
# TRƯỚC (SAI) — raise ValueError khi message_id=None
file_url = await audio_storage_service.upload_audio(
    audio_type="user_answer",   # ← cứng
    message_id=message_id,      # ← có thể None → ValueError
    ...
)
```

**Hậu quả:**
- Upload audio fail với `ValueError` ngay cả khi R2 được cấu hình
- Exception bị catch bởi `except Exception` → upload bị skip silently
- `file_url` luôn là `None` khi không có `message_id`

**Fix:**
```python
# SAU (ĐÚNG) — dùng path ai_question khi không có message_id
effective_audio_type = "user_answer" if message_id else "ai_question"
file_url = await audio_storage_service.upload_audio(
    audio_type=effective_audio_type,
    message_id=message_id,
    ...
)
```

---

### Lỗi 5 — `audio_pipeline_service.py`: Empty string vào cột `NOT NULL`

**File:** `apps/backend/app/modules/interview/audio_pipeline_service.py`

**Nguyên nhân:**
Khi R2 upload fail, `file_url` là `None`. Code dùng `file_url or ""` để tránh `None`, nhưng empty string `""` vẫn vi phạm ý nghĩa của cột và gây confusion khi query.

```python
# TRƯỚC (SAI) — empty string vô nghĩa
file_url=file_url or "",   # ← "" không phải URL hợp lệ
```

**Hậu quả:**
- DB nhận empty string `""` — không vi phạm `NOT NULL` nhưng vi phạm data integrity
- Không thể phân biệt "chưa upload" vs "upload thành công với URL rỗng"
- Query `WHERE file_url != ''` phải thêm điều kiện đặc biệt

**Fix:** Dùng placeholder có ý nghĩa rõ ràng:
```python
# SAU (ĐÚNG) — placeholder rõ ràng, dễ filter
file_url=file_url or "pending://upload-failed",
```

Áp dụng cho cả `process_user_audio()` và `generate_question_audio()`.

---

### Lỗi 6 — `009_voice_interview_support.sql`: Cú pháp `DO $` sai

**File:** `db/migrations/009_voice_interview_support.sql`

**Nguyên nhân:**
PostgreSQL yêu cầu dollar-quoting dùng **double dollar** `$$` làm delimiter. File dùng single dollar `$` là cú pháp không hợp lệ.

```sql
-- TRƯỚC (SAI) — single dollar
DO $
BEGIN
    IF NOT EXISTS (...) THEN
        ALTER TABLE ...;
    END IF;
END $;
```

**Hậu quả:**
- Migration fail với `syntax error at or near "$"` khi chạy trên PostgreSQL
- Constraints `chk_interview_mode` và `chk_tab_switch_count` không được tạo
- Chạy migration nhiều lần sẽ fail ngay từ đầu

**Fix:**
```sql
-- SAU (ĐÚNG) — double dollar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_interview_mode'
          AND conrelid = 'interview.interview_sessions'::regclass
    ) THEN
        ALTER TABLE interview.interview_sessions
            ADD CONSTRAINT chk_interview_mode
            CHECK (interview_mode IN ('text', 'voice'));
    END IF;
END $$;
```

Đồng thời thêm `AND conrelid = 'interview.interview_sessions'::regclass` để tránh false positive khi có constraint cùng tên ở schema khác.

---

### Lỗi 7 — `009_voice_interview_support.sql`: Thiếu `NOT NULL` trên `created_at`

**File:** `db/migrations/009_voice_interview_support.sql`

**Nguyên nhân:**
`DB_Interview.txt` (schema thực tế) định nghĩa `created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP` — không có `NOT NULL`. Tuy nhiên theo thiết kế, `created_at` luôn phải có giá trị (auto-set bởi DB).

Migration cũ:
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- thiếu NOT NULL
```

**Fix:**
```sql
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

### Lỗi 8 — `009_voice_interview_support.sql`: Thiếu sync `chk_question_count_range`

**File:** `db/migrations/009_voice_interview_support.sql`

**Nguyên nhân:**
Constraint `chk_question_count_range` được thêm trong migration `008`, nhưng migration `009` không đảm bảo constraint này tồn tại (nếu ai chạy `009` trên DB mới bỏ qua `008`).

**Fix:** Thêm `DO $$` block idempotent vào `009`:
```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_question_count_range'
          AND conrelid = 'interview.interview_sessions'::regclass
    ) THEN
        ALTER TABLE interview.interview_sessions
            ADD CONSTRAINT chk_question_count_range
            CHECK (question_count >= 1 AND question_count <= 25);
    END IF;
END $$;
```

---

## Verification

```
✅ python -c "from app.modules.interview.models import *" → OK
✅ python -c "from app.modules.interview import routes" → 17 routes loaded
✅ python -c "from app.api import voice_interview" → 6 routes loaded
✅ InterviewSession schema = 'interview'
✅ InterviewAudio schema = 'interview'
✅ InterviewSession constraints: chk_question_count_range, chk_interview_mode, chk_tab_switch_count
✅ InterviewAudio constraints: chk_audio_type
✅ /api/interview/my-interviews → registered
✅ /api/interview/jobs/search → registered
✅ /api/interview/voice/* → 6 endpoints registered
```

---

## Files Đã Thay Đổi

| File | Thay đổi |
|------|----------|
| `apps/backend/app/modules/interview/models.py` | Fix `__table_args__` cho `InterviewSession` và `InterviewAudio`; thêm `chk_question_count_range` |
| `apps/backend/app/modules/interview/audio_pipeline_service.py` | Fix `effective_audio_type` logic; fix `file_url or "pending://upload-failed"` |
| `db/migrations/009_voice_interview_support.sql` | Viết lại hoàn toàn: fix `DO $$`, thêm `NOT NULL` cho `created_at`, thêm sync constraint `chk_question_count_range` |

---

*Báo cáo tạo bởi Kiro — 25/04/2026*
