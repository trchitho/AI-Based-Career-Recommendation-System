# Báo Cáo Triển Khai - Yêu Cầu 3: Luồng Ghi Âm và Xử Lý Câu Trả Lời

## Tổng Quan

**Yêu Cầu:** Yêu Cầu 3 - Luồng Ghi Âm và Xử Lý Câu Trả Lời  
**Trạng Thái:** ✅ HOÀN THÀNH - 100% Tiêu Chí Chấp Nhận Pass  
**Test Results:** 19 backend tests PASSED + 10 frontend tests PASSED

---

## Tiêu Chí Chấp Nhận - Kết Quả

| # | Tiêu Chí | Trạng Thái | Test Coverage |
|---|----------|-----------|---------------|
| 3.1 | Bắt đầu ghi âm từ microphone đã chọn bằng `MediaRecorder` | ✅ PASS | Frontend: `test_3.1_start_recording` |
| 3.2 | Hiển thị chỉ báo trực quan (waveform + timer) khi đang ghi | ✅ PASS | Frontend: `test_3.2_visual_indicator` |
| 3.3 | Dừng ghi âm và tạo audio blob định dạng WebM | ✅ PASS | Frontend: `test_3.3_stop_recording` |
| 3.4 | Upload audio blob lên `POST /api/interview/voice/answer` dạng multipart/form-data | ✅ PASS | Backend: `test_invalid_file_type_returns_400`, `test_full_pipeline_success` |
| 3.5 | Audio Pipeline chuyển audio sang STT Service | ✅ PASS | Backend: `test_full_pipeline_success` |
| 3.6 | Gọi `AIPipelineService.submit_answer(session_id, transcript)` | ✅ PASS | Backend: `test_full_pipeline_success` |
| 3.7 | Hiển thị câu hỏi tiếp theo và phát audio TTS | ✅ PASS | Backend: `test_full_pipeline_success`, `test_start_then_answer_flow` |
| 3.8 | Xử lý lỗi STT (no speech / exception) → hiển thị lỗi + cho retry | ✅ PASS | Backend: `test_stt_no_speech_detected`, `test_stt_exception_returns_retry` |
| 3.9 | Lưu metadata audio vào bảng `interview_audio` | ✅ PASS | Backend: `test_db_save_called_with_correct_columns`, `TestSaveAudioMetadata` |

---

## Bugs Nghiêm Trọng Đã Fix (Phát Hiện Khi Review Kỹ)

| # | Bug | Nguyên Nhân | Fix |
|---|-----|-------------|-----|
| 1 | `VoiceInterviewException` import error | Class không tồn tại trong `app.core.exceptions` | Xóa import không cần thiết |
| 2 | `audio_file.size` AttributeError | FastAPI `UploadFile` không có `.size` attribute | Đọc data trước, check `len(audio_data)` |
| 3 | Router 404 | Import fail khiến router không load | Fix import → router load thành công |
| 4 | `module 'app.api' has no attribute 'voice_interview'` | Module chưa được import trước khi patch | Thêm `import app.api.voice_interview` ở đầu test file |
| 5 | **Tiêu chí 3.9 KHÔNG lưu vào DB** | `upload_user_answer_audio()` chỉ upload R2, không INSERT vào `interview_audio` | Thêm hàm `save_audio_metadata()` với raw SQL INSERT |
| 6 | **TTS luôn fail silently** | `audio_result["success"]` — key không tồn tại trong `synthesize_text()` response | Fix key: dùng `audio_result.get("audio_url")` và `audio_result.get("duration_seconds")` |
| 7 | **TTS URL key sai** | `audio_result["file_url"]` — key sai, phải là `audio_result["audio_url"]` | Fix key name |
| 8 | `upload_user_answer_audio()` signature mismatch | Gọi với `content_type` param nhưng method không nhận param đó | Chuyển sang gọi `upload_audio()` trực tiếp với đầy đủ params |
| 9 | Migration `DO $` syntax sai | `DO $` (single dollar) không hợp lệ trong PostgreSQL | Sửa thành `DO $$` (double dollar) |
| 10 | `upload_audio()` raise ValueError khi `message_id=None` với `user_answer` | `AudioStorageService.upload_audio()` validate bắt buộc `message_id` cho `user_answer` | Dùng `effective_audio_type = "user_answer" if message_id else "ai_question"` cho upload path; DB record vẫn lưu `audio_type="user_answer"` |

---

## Files Đã Tạo / Cập Nhật

### Backend

#### `apps/backend/app/api/voice_interview.py` (viết lại hoàn toàn)

**Hàm `save_audio_metadata()` — Tiêu chí 3.9:**
```python
def save_audio_metadata(db, session_id, audio_type, file_url,
                        message_id=None, duration_seconds=None,
                        file_size_bytes=None, transcript=None) -> str:
    """INSERT vào interview.interview_audio với đầy đủ columns"""
    record_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO interview.interview_audio
            (id, session_id, message_id, audio_type, file_url,
             duration_seconds, file_size_bytes, transcript, created_at)
        VALUES (:id, :session_id, :message_id, :audio_type, :file_url,
                :duration_seconds, :file_size_bytes, :transcript, NOW())
    """), {...})
    db.commit()
    return record_id
```

**Luồng xử lý đầy đủ trong `submit_voice_answer()`:**
1. Validate content-type, empty file, 25MB limit
2. Upload audio → R2 storage (structured path)
3. STT processing → transcript
4. **INSERT vào `interview_audio`** với transcript (kể cả khi STT fail)
5. AI Pipeline → evaluation + next_question
6. TTS generation cho next_question + **INSERT `ai_question` vào `interview_audio`**
7. Return response

**Fix `generate_tts_audio()`:**
- Dùng đúng keys: `result.get("audio_url")`, `result.get("duration_seconds")`
- Lưu DB record cho `ai_question` audio (Tiêu chí 7.6)

#### `apps/backend/app/api/test_voice_interview.py` (19 tests)

**Nhóm tests mới — `TestSaveAudioMetadata`:**
- `test_save_user_answer_all_columns`: Verify tất cả columns được truyền đúng
- `test_save_ai_question_nullable_columns`: Verify `message_id=None`, `transcript=None` hợp lệ
- `test_save_generates_uuid`: Verify mỗi record có UUID unique

**`test_db_save_called_with_correct_columns`:**
- Verify `session_id`, `message_id`, `audio_type`, `file_url`, `transcript`, `file_size_bytes` đều đúng

### Database

#### `db/migrations/009_voice_interview_support.sql` (v1.1)

**Thay đổi so với v1.0:**
- Đổi thứ tự: UPDATE NULL values → ADD CONSTRAINT (tránh constraint violation)
- Dùng `DO $$ IF NOT EXISTS` để idempotent (chạy nhiều lần không lỗi)
- Thêm `NOT NULL` cho `created_at`
- Thêm đầy đủ comments cho từng column

**Schema `interview_audio` đầy đủ:**
```sql
CREATE TABLE IF NOT EXISTS interview.interview_audio (
    id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       INTEGER   NOT NULL  FK → interview_sessions (CASCADE),
    message_id       INTEGER   NULL      FK → interview_messages (SET NULL),
    audio_type       VARCHAR(20) NOT NULL CHECK IN ('user_answer','ai_question'),
    file_url         TEXT      NOT NULL,
    duration_seconds FLOAT     NULL,
    file_size_bytes  BIGINT    NULL,
    transcript       TEXT      NULL,      -- chỉ user_answer
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Nullable analysis:**
| Column | NULL? | Lý do |
|--------|-------|-------|
| `id` | NOT NULL | PK auto-generated |
| `session_id` | NOT NULL | Bắt buộc — FK |
| `message_id` | NULL | AI question không có message |
| `audio_type` | NOT NULL | Bắt buộc phân biệt loại |
| `file_url` | NOT NULL | Bắt buộc — URL storage |
| `duration_seconds` | NULL | Không phải lúc nào cũng biết |
| `file_size_bytes` | NULL | Không phải lúc nào cũng biết |
| `transcript` | NULL | AI question không có transcript |
| `created_at` | NOT NULL | Auto-set bởi DB |

---

## Test Results Chi Tiết

### Backend Tests (19/19 PASSED)

```
TestHealthCheck::test_health_check                                    PASSED
TestStartVoiceInterview::test_start_success                           PASSED
TestStartVoiceInterview::test_start_first_question_structure          PASSED
TestSubmitVoiceAnswerValidation::test_invalid_file_type_returns_400   PASSED
TestSubmitVoiceAnswerValidation::test_empty_file_returns_400          PASSED
TestSubmitVoiceAnswerValidation::test_missing_session_id_returns_422  PASSED
TestSubmitVoiceAnswerValidation::test_missing_audio_file_returns_422  PASSED
TestSubmitVoiceAnswerValidation::test_large_file_returns_413          PASSED
TestSubmitVoiceAnswerSuccess::test_full_pipeline_success              PASSED
TestSubmitVoiceAnswerSuccess::test_db_save_called_with_correct_columns PASSED
TestSTTErrorHandling::test_stt_no_speech_detected                     PASSED
TestSTTErrorHandling::test_stt_whitespace_only_transcript             PASSED
TestSTTErrorHandling::test_stt_exception_returns_retry                PASSED
TestSTTErrorHandling::test_upload_failure_returns_500                 PASSED
TestSaveAudioMetadata::test_save_user_answer_all_columns              PASSED
TestSaveAudioMetadata::test_save_ai_question_nullable_columns         PASSED
TestSaveAudioMetadata::test_save_generates_uuid                       PASSED
TestVoiceInterviewIntegration::test_start_then_answer_flow            PASSED
TestVoiceInterviewIntegration::test_error_response_format_consistency PASSED

19 passed, 5 warnings in 4.27s
```

### Frontend Tests (10/10 PASSED)

```
✓ Tiêu chí 3.1: Bắt đầu ghi âm từ microphone đã chọn bằng MediaRecorder
✓ Tiêu chí 3.2: Hiển thị chỉ báo trực quan khi đang ghi âm
✓ Tiêu chí 3.3: Dừng ghi âm và tạo audio blob định dạng WebM
✓ Tiêu chí 3.4: Upload audio blob lên endpoint POST /api/interview/voice/answer
✓ Tiêu chí 3.5 & 3.6: Audio Pipeline xử lý STT và AI Pipeline
✓ Tiêu chí 3.7: Hiển thị câu hỏi tiếp theo và phát audio TTS
✓ Tiêu chí 3.8: Xử lý lỗi STT và cho phép ghi âm lại
✓ Tiêu chí 3.9: Lưu metadata audio vào database
✓ Complete voice interview flow with multiple questions
✓ Error handling and recovery flow

10 passed
```

---

## Luồng Xử Lý Đầy Đủ (Tiêu Chí 3.1 → 3.9)

```
User nhấn "Bắt đầu trả lời"
    │
    ▼ (3.1) MediaRecorder.start() với deviceId từ Device Test Page
    │
    ▼ (3.2) Hiển thị waveform animation + RecordingTimer
    │
User nhấn "Dừng trả lời"
    │
    ▼ (3.3) MediaRecorder.stop() → Blob(audio/webm)
    │
    ▼ (3.4) FormData upload → POST /api/interview/voice/answer
    │
    ▼ Validate: content-type, empty, 25MB limit
    │
    ▼ (7.1) audio_storage.upload_audio() → file_url (R2 structured path)
    │
    ▼ (3.5) process_stt(audio_data) → transcript
    │
    ├── transcript rỗng/whitespace → (3.8) STT_NO_SPEECH_DETECTED
    │       └── (3.9) save_audio_metadata(transcript=None) → DB INSERT
    │
    ├── STT exception → (3.8) STT_PROCESSING_ERROR + allow_retry=True
    │       └── (3.9) save_audio_metadata(transcript=None) → DB INSERT
    │
    ▼ (3.9) save_audio_metadata(transcript=transcript) → DB INSERT interview_audio
    │       Columns: id(UUID), session_id, message_id, audio_type='user_answer',
    │                file_url, file_size_bytes, transcript, created_at
    │
    ▼ (3.6) submit_to_ai_pipeline(session_id, transcript) → evaluation + next_question
    │
    ▼ (3.7) generate_tts_audio(next_question.text) → audio_url
    │       └── (7.6) save_audio_metadata(audio_type='ai_question') → DB INSERT
    │
    ▼ Response: {success, transcript, file_url, audio_record_id, ai_response, next_question_audio}
```
