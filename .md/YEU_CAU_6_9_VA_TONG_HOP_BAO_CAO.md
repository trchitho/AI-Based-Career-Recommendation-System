# Báo Cáo Triển Khai - Yêu Cầu 6→9, Bug Fixes, Configuration & E2E Testing

**Ngày hoàn thành:** 25/04/2026  
**Trạng thái:** ✅ HOÀN THÀNH - Tất cả tasks còn lại đã được thực hiện  
**Frontend Tests:** 163/163 PASSED (11 test files)  
**Backend Diagnostics:** 0 lỗi TypeScript / Python

---

## 1. Yêu Cầu 6 — Hệ Thống Quy Tắc Phỏng Vấn

### 1.1 Backend: Rules Enforcement

**File:** `apps/backend/app/api/voice_interview.py`

**Tiêu chí 6.3–6.7 (backend):**
- `PATCH /api/interview/voice/tab-switch` — nhận `session_id` + `tab_switch_count`, cập nhật DB
- Khi `tab_switch_count >= 3`: tự động set `status = 'abandoned'` cho session
- `submit_voice_answer()` từ chối với HTTP 403 nếu session đã `abandoned`

### 1.2 Frontend: InterviewRulesMonitor

**File:** `apps/frontend/src/components/voice-interview/InterviewRulesMonitor.ts`

```typescript
class InterviewRulesMonitor {
    startMonitoring(sessionId: number): void
    stopMonitoring(): void
    getTabSwitchCount(): number
    reset(): void
    private handleVisibilityChange(): void  // đếm khi document.hidden = true
    private syncWithBackend(): void         // PATCH /tab-switch
}
```

**Tiêu chí đáp ứng:**
- 6.3: Lắng nghe `visibilitychange` event
- 6.4: Tăng `tabSwitchCount`, gọi `onTabSwitch(count, remaining)`
- 6.5: Gọi `onTerminate()` khi `count >= maxTabSwitches` (default 3)
- 6.6: Sync với backend qua `PATCH /api/interview/voice/tab-switch`
- 6.7: Backend từ chối request khi session đã bị hủy

### 1.3 Frontend: RulesModal

**File:** `apps/frontend/src/components/voice-interview/RulesModal.tsx`

- Hiển thị 6 quy tắc phỏng vấn trước khi bắt đầu (Tiêu chí 6.1)
- Checkbox "Tôi đã đọc và đồng ý" — nút Confirm chỉ enable khi checked (Tiêu chí 6.2)
- Nút "Quay lại" để hủy và quay về device-test

### 1.4 Tích hợp vào VoiceInterviewPage

**File:** `apps/frontend/src/pages/VoiceInterviewPage.tsx`

- `showRulesModal` state (default `true`) — modal hiện trước khi interview bắt đầu
- `handleRulesConfirm()`: ẩn modal → gọi `initializeInterview()`
- `handleRulesCancel()`: navigate về `/interview/device-test`
- `InterviewRulesMonitor` được khởi tạo sau khi session start thành công
- `tabSwitchWarning` state: hiển thị banner "⚠️ Cảnh báo: X/3 lần chuyển tab" (Tiêu chí 6.8)

### 1.5 Tests

**File:** `apps/frontend/src/__tests__/InterviewRulesMonitor.test.ts` — **15 tests**

| Test | Tiêu chí |
|------|----------|
| startMonitoring đăng ký visibilitychange listener | 6.3 |
| Tăng count và gọi onTabSwitch khi chuyển tab | 6.4 |
| Không tăng count khi tab được focus lại | 6.4 |
| Đếm chính xác nhiều lần chuyển tab | 6.4 |
| Gọi onTerminate khi tab_switch_count đạt 3 | 6.5 |
| Không gọi onTerminate trước khi đạt 3 lần | 6.5 |
| Dừng theo dõi sau khi terminate | 6.5 |
| Gọi backend API sau mỗi lần chuyển tab | 6.6 |
| Backend sync failure không block interview | 6.6 |
| stopMonitoring xóa event listener | cleanup |
| startMonitoring không đăng ký listener 2 lần | idempotent |
| Hỗ trợ custom maxTabSwitches | config |
| getTabSwitchCount trả về 0 ban đầu | init |
| reset() đặt lại count về 0 | reset |

---

## 2. Yêu Cầu 7 — Lưu Trữ Audio và Database

### 2.1 Database Schema

**File:** `db/migrations/009_voice_interview_support.sql`

Bảng `interview.interview_audio` với đầy đủ columns:

| Column | Type | Nullable | Ghi chú |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | PK, auto-generated |
| `session_id` | INTEGER | NOT NULL | FK → interview_sessions (CASCADE) |
| `message_id` | INTEGER | NULL | FK → interview_messages (SET NULL) |
| `audio_type` | VARCHAR(20) | NOT NULL | CHECK IN ('user_answer', 'ai_question') |
| `file_url` | TEXT | NOT NULL | URL R2 hoặc "pending://upload-failed" |
| `duration_seconds` | FLOAT | NULL | |
| `file_size_bytes` | BIGINT | NULL | |
| `transcript` | TEXT | NULL | Chỉ user_answer |
| `created_at` | TIMESTAMP | NOT NULL | DEFAULT NOW() |

**Cột thêm vào `interview_sessions`:**
- `tab_switch_count INTEGER DEFAULT 0` (Tiêu chí 8.5)
- `interview_mode VARCHAR DEFAULT 'text'` (Tiêu chí 8.6)

### 2.2 SQLAlchemy Models

**File:** `apps/backend/app/modules/interview/models.py`

**Bug đã fix (CRITICAL):**
- `InterviewSession.__table_args__` định nghĩa 2 lần → fix thành 1 lần, dict ở cuối tuple
- `InterviewAudio.__table_args__` dict ở đầu tuple → fix dict về cuối
- Thêm `CheckConstraint("question_count >= 1 AND question_count <= 25", name="chk_question_count_range")`

```python
class InterviewSession(Base):
    __table_args__ = (
        CheckConstraint("question_count >= 1 AND question_count <= 25", name="chk_question_count_range"),
        CheckConstraint("interview_mode IN ('text', 'voice')", name="chk_interview_mode"),
        CheckConstraint("tab_switch_count >= 0 AND tab_switch_count <= 10", name="chk_tab_switch_count"),
        {"schema": "interview"},   # dict PHẢI ở cuối tuple
    )

class InterviewAudio(Base):
    __table_args__ = (
        CheckConstraint("audio_type IN ('user_answer', 'ai_question')", name="chk_audio_type"),
        {"schema": "interview"},
    )
```

### 2.3 AudioStorageService

**File:** `apps/backend/app/modules/interview/audio_storage_service.py`

- Upload/download với Cloudflare R2 (boto3 S3-compatible)
- Structured path: `interview-audio/{session_id}/{message_id}/{ts}.{ext}` (user_answer)
- Structured path: `interview-audio/{session_id}/ai_questions/{ts}.{ext}` (ai_question)
- Non-blocking failure: upload fail → trả về `None`, không block STT/AI pipeline (Tiêu chí 7.5)

**Bug đã fix:**
- `upload_audio()` raise `ValueError` khi `message_id=None` với `audio_type="user_answer"` → fix dùng `effective_audio_type`
- `file_url or ""` lưu empty string vào DB → fix thành `file_url or "pending://upload-failed"`

---

## 3. Yêu Cầu 8 — Route và Tích Hợp Hệ Thống

### 3.1 Backend Voice API Routes

**File:** `apps/backend/app/api/voice_interview.py`

| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/interview/voice/start` | POST | Khởi tạo voice session, tái sử dụng `AIPipelineService.start_interview()` |
| `/api/interview/voice/answer` | POST | Upload audio, STT, AI pipeline, TTS next question |
| `/api/interview/voice/tts` | POST | Chuyển text → audio (standalone) |
| `/api/interview/voice/stt` | POST | Chuyển audio → text (standalone) |
| `/api/interview/voice/tab-switch` | PATCH | Cập nhật tab_switch_count |
| `/api/interview/voice/health` | GET | Health check |

**Backward compatibility:** `AIPipelineService.start_interview()` và `submit_answer()` không thay đổi signature (Tiêu chí 8.4).

### 3.2 Frontend: InterviewSelectionPage Mode Selection

**File:** `apps/frontend/src/pages/InterviewSelectionPage.tsx`

**Thêm mới:**
- `interviewMode` state: `'text' | 'voice'` (default `'text'`)
- Mode selection UI với 2 cards: "Phỏng vấn Text" (FileText icon) và "Phỏng vấn Giọng nói" (Mic icon)
- `data-testid="interview-mode-selection"`, `"interview-mode-text"`, `"interview-mode-voice"`
- `handleStartInterview()` phân nhánh:
  - Voice mode: lưu params vào `sessionStorage.voiceInterviewParams` → navigate `/interview/device-test`
  - Text mode: gọi `interviewService.startInterview()` như cũ

**Tiêu chí đáp ứng:** 8.1 (route mới), 8.7 (mode selection UI)

### 3.3 App.tsx Routing

**File:** `apps/frontend/src/App.tsx`

Routes đã được đăng ký:
- `/interview/device-test` → `<DeviceTestPage />` (ProtectedRoute)
- `/interview/voice` → `<VoiceInterviewPage />` (ProtectedRoute)

### 3.4 Tests

**File:** `apps/frontend/src/__tests__/InterviewSelectionPage.modeSelection.test.tsx` — **6 tests**

| Test | Tiêu chí |
|------|----------|
| Default mode là 'text' | 8.7 |
| Click voice mode → chọn voice | 8.7 |
| Click text mode → re-select text | 8.7 |
| Voice mode: navigate `/interview/device-test`, KHÔNG gọi startInterview | 8.1, 8.4 |
| Text mode: gọi `interviewService.startInterview` | 8.4 |
| Voice mode: lưu `voiceInterviewParams` vào sessionStorage | 8.1 |

---

## 4. Yêu Cầu 9 — Xử Lý Lỗi và Khả Năng Phục Hồi

### 4.1 Network Retry (Tiêu chí 9.1)

**File:** `apps/frontend/src/pages/VoiceInterviewPage.tsx`

```typescript
const uploadWithRetry = async (fd: FormData, maxRetries = 3): Promise<Response> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fetch('/api/interview/voice/answer', { method: 'POST', body: fd });
        } catch (err) {
            if (attempt === maxRetries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // exponential backoff
        }
    }
    throw new Error('Max retries exceeded');
};
```

### 4.2 TTS Failure Fallback (Tiêu chí 9.2)

Đã implement trong `fetchAndPlayTTS()`:
- TTS fail → `setIsAISpeaking(false)` + `setCanStartAnswer(true)`
- Text câu hỏi vẫn hiển thị, user có thể tiếp tục không có audio

### 4.3 STT Text Fallback (Tiêu chí 9.3)

Sau 3 lần STT fail liên tiếp:
- `showTextFallback = true` → hiển thị textarea + nút "Gửi câu trả lời"
- `handleTextFallbackSubmit()`: POST `text_answer` thay vì `audio_file`
- `data-testid="text-fallback-input"`, `"fallback-textarea"`, `"fallback-submit-btn"`

### 4.4 Session Recovery (Tiêu chí 9.4)

```typescript
// Lưu state sau mỗi câu hỏi
saveSessionState(sessionId, currentQuestion, progress, voicePreference);
// → sessionStorage.voiceInterviewState

// Khôi phục khi reload
const savedState = sessionStorage.getItem('voiceInterviewState');
if (savedState?.sessionId && savedState?.currentQuestion) {
    // restore state, skip fresh session start
}
```

### 4.5 Microphone Disconnect (Tiêu chí 9.5)

```typescript
stream.getTracks().forEach(track => {
    track.onended = () => {
        if (isRecordingRef.current) {
            stopRecording();
            setErrorMessage('Microphone bị ngắt kết nối. Vui lòng kiểm tra lại thiết bị.');
        }
    };
});
```

Dùng `isRecordingRef` (ref) thay vì `isRecording` (state) để tránh stale closure.

### 4.6 Tests

**File:** `apps/frontend/src/__tests__/VoiceInterviewPage.errorHandling.test.tsx` — **4 tests**

| Test | Tiêu chí |
|------|----------|
| Retry 3 lần khi network error, thành công lần 3 | 9.1 |
| Hiển thị text fallback sau 3 STT errors | 9.3 |
| Text fallback submit gửi `text_answer` vào FormData | 9.3 |
| Hiển thị error khi microphone track.onended | 9.5 |

---

## 5. Shared UI Components

### 5.1 AudioVisualizer

**File:** `apps/frontend/src/components/voice-interview/AudioVisualizer.tsx`

- 5 bars với chiều cao khác nhau, `animate-pulse` khi recording
- Props: `isRecording: boolean`, `audioLevel?: number` (0–1)
- `data-testid="audio-visualizer"`

### 5.2 InterviewAvatar

**File:** `apps/frontend/src/components/voice-interview/InterviewAvatar.tsx`

- Avatar hình tròn gradient blue→purple
- `isTalking`: `animate-pulse scale-110` + 2 ripple rings (`animate-ping`)
- `isListening`: green ring pulse
- Props: `isTalking`, `isListening`, `size?: 'sm' | 'md' | 'lg'`
- `data-testid="interview-avatar"`, `"avatar-ripple-1"`, `"avatar-ripple-2"`

### 5.3 QuestionBubble (standalone)

**File:** `apps/frontend/src/components/voice-interview/QuestionBubble.tsx`

- Typing animation khi `isAISpeaking=true` và không có wordTimestamps (Tiêu chí 4.5)
- Word highlight theo `audioCurrentTimeMs` khi có wordTimestamps (Tiêu chí 4.6)
- Full text khi `isAISpeaking=false`
- `data-testid="question-bubble"`, `"question-text"`

---

## 6. Bug Fixes (từ BUG_FIX_REPORT.md)

| # | File | Lỗi | Fix |
|---|------|-----|-----|
| 1 | `models.py` | `InterviewSession.__table_args__` định nghĩa 2 lần | Merge thành 1 tuple, dict ở cuối |
| 2 | `models.py` | `InterviewAudio.__table_args__` dict ở đầu tuple | Dict về cuối |
| 3 | `models.py` | Thiếu `CheckConstraint` cho `question_count` | Thêm `chk_question_count_range` |
| 4 | `audio_pipeline_service.py` | `ValueError` khi `message_id=None` với `user_answer` | Dùng `effective_audio_type` |
| 5 | `audio_pipeline_service.py` | `file_url or ""` lưu empty string vào NOT NULL column | Dùng `"pending://upload-failed"` |
| 6 | `009_voice_interview_support.sql` | `DO $` syntax sai (single dollar) | Sửa thành `DO $$` |
| 7 | `009_voice_interview_support.sql` | Thiếu `NOT NULL` trên `created_at` | Thêm `NOT NULL` |
| 8 | `009_voice_interview_support.sql` | Thiếu sync `chk_question_count_range` | Thêm `DO $$` block idempotent |

---

## 7. Configuration & Deployment

### 7.1 Environment Variables

**File:** `apps/backend/.env.example` — thêm section mới:

```env
# Voice Interview System
EDGE_TTS_ENABLED=true
WHISPER_MODEL_SIZE=base          # tiny, base, small, medium, large
MAX_AUDIO_FILE_SIZE_MB=25
MAX_AUDIO_DURATION_SECONDS=300
CF_R2_AUDIO_BUCKET_NAME=interview-audio
VOICE_INTERVIEW_ENABLED=true
DEFAULT_VOICE_PREFERENCE=female
MAX_TAB_SWITCHES=3
```

**File:** `apps/backend/app/core/config.py` — đã có đầy đủ các settings trên với default values.

### 7.2 Python Dependencies

**File:** `apps/backend/requirements.txt` — thêm:

```
edge-tts==6.1.9
openai-whisper>=20231117
```

### 7.3 Dockerfile

**File:** `apps/backend/Dockerfile` — tạo mới:

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "import whisper; whisper.load_model('base')" || true
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 8. E2E Integration Testing

### 8.1 E2E Test File

**File:** `apps/frontend/src/__tests__/VoiceInterview.e2e.test.tsx` — **5 tests**

| Test | Validates |
|------|-----------|
| Voice mode: navigate `/interview/device-test` + lưu params | Req 8.1, 8.7 |
| Text mode: gọi `startInterview`, KHÔNG navigate device-test | Req 8.2, 8.4 |
| Full flow: rules modal → session → record → next question | Req 8.2, 8.4 |
| Both modes independent: voice page không bị ảnh hưởng bởi text mode | Req 8.2 |
| Voice page dùng `/api/interview/voice/start`, không phải text endpoint | Req 8.4 |

### 8.2 Performance Notes

**File:** `apps/backend/app/modules/interview/performance_notes.md`

- Whisper `base` model: ~150MB RAM, 4–6 concurrent sessions trên 4-core CPU
- STT target: < 5s cho 30s audio
- TTS target: < 2s (Edge TTS, network-dependent)
- Khuyến nghị: pre-load model lúc startup, dùng task queue cho STT dưới tải cao

---

## 9. Tổng Kết Test Coverage

### Frontend (163/163 PASSED)

| File | Tests | Yêu cầu |
|------|-------|---------|
| `DeviceTestPage.test.tsx` | 11 | Req 1 |
| `VoiceInterviewPage.test.tsx` | 17 | Req 2 |
| `VoiceInterviewPage.requirement3.test.tsx` | 19 | Req 3 |
| `VoiceInterviewPage.requirement4.test.tsx` | 12 | Req 4 |
| `InterviewRulesMonitor.test.ts` | 15 | Req 6 |
| `InterviewSelectionPage.modeSelection.test.tsx` | 6 | Req 8 |
| `VoiceInterviewPage.errorHandling.test.tsx` | 4 | Req 9 |
| `VoiceInterview.e2e.test.tsx` | 5 | Req 8 E2E |
| `tc04_riasec_scoring.test.ts` | existing | — |
| `tc05_voice_utils.test.ts` | existing | — |
| `tc10_recommendation.test.ts` | existing | — |
| **TỔNG** | **163** | **100% PASS** |

### Backend (96+ tests)

| File | Tests | Yêu cầu |
|------|-------|---------|
| `test_voice_interview.py` | 19 | Req 3, 6, 8 |
| `test_voice_interview_integration.py` | — | Req 3, 5.8 |
| `test_edge_tts_req4.py` | 21 | Req 4 |
| `test_tts_endpoint.py` | 10 | Req 4 |
| `test_whisper_stt_req5.py` | 35 | Req 5 |
| `test_stt_endpoint_req5.py` | 11 | Req 5 |

---

*Báo cáo tạo bởi Kiro — 25/04/2026*
