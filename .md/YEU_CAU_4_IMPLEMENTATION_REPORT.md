# Báo Cáo Triển Khai - Yêu Cầu 4: Text-to-Speech (TTS) và Đồng Bộ Văn Bản

## Tổng Quan

**Yêu Cầu:** Yêu Cầu 4 - Text-to-Speech (TTS) và Đồng Bộ Văn Bản
**Trạng Thái:** ✅ HOÀN THÀNH - 100% Tiêu Chí Chấp Nhận Pass
**Backend Tests:** 31/31 PASSED (Yêu Cầu 4) + 19/19 PASSED (Yêu Cầu 3 regression) = 50/50
**Frontend Tests:** 8/8 PASSED (Yêu Cầu 4) + 4/4 PASSED (Yêu Cầu 3 regression) = 12/12

---

## Tiêu Chí Chấp Nhận - Kết Quả

| # | Tiêu Chí | Trạng Thái | Test Coverage |
|---|----------|-----------|---------------|
| 4.1 | TTS_Service chuyển đổi text → audio với Edge TTS giọng tiếng Việt đã chọn | ✅ PASS | `test_returns_audio_data`, `test_uses_correct_female_voice`, `test_uses_correct_male_voice` |
| 4.2 | TTS_Service trả về audio MP3/WAV và lưu vào Audio_Storage | ✅ PASS | `test_stores_audio_when_session_id_provided`, `test_storage_failure_non_blocking`, `test_tts_no_audio_url_when_no_session` |
| 4.3 | TTS_Service trả về URL audio cùng với question_text trong response API | ✅ PASS | `test_returns_question_text`, `test_tts_success_female`, `test_all_required_keys_present` |
| 4.4 | Voice_Interview_Runtime phát audio qua loa đã chọn ở Device_Test_Page | ✅ PASS | `test_4.4_setSinkId` (frontend) |
| 4.5 | Hiển thị text câu hỏi với typing animation đồng bộ theo thời lượng audio | ✅ PASS | `test_4.5_typing_animation` (frontend) |
| 4.6 | Highlight từng từ trong text theo word timestamps | ✅ PASS | `test_word_timestamps_collected`, `test_duration_from_timestamps`, `test_tts_response_has_word_timestamps` |
| 4.7 | Kích hoạt nút "Bắt đầu trả lời" khi audio phát xong | ✅ PASS | `test_4.7_enable_button_after_audio` (frontend) |
| 4.8 | Hỗ trợ vi-VN-HoaiMyNeural (nữ) và vi-VN-NamMinhNeural (nam) | ✅ PASS | `test_female_voice_name`, `test_male_voice_name`, `test_tts_success_male` |

---

## Files Đã Tạo / Cập Nhật

### Backend

#### `apps/backend/app/modules/interview/edge_tts_service.py` (cập nhật)

**Thay đổi chính so với version cũ:**

1. `synthesize_text()` giờ trả về thêm 2 keys mới:
   - `question_text: str` — Tiêu chí 4.3
   - `word_timestamps: list[dict]` — Tiêu chí 4.6

2. Method mới `_generate_audio_with_timestamps()`:
   - Thu thập `WordBoundary` events từ Edge TTS stream song song với audio chunks
   - Convert offset từ 100-nanosecond units → milliseconds: `offset // 10_000`
   - Format: `{ "word": str, "offset_ms": int, "duration_ms": int }`

3. Method mới `_estimate_duration()`:
   - Ưu tiên tính từ last word timestamp (chính xác)
   - Fallback: word count / 2.5 words/second

**Response structure đầy đủ:**
```python
{
    "audio_data":       bytes,          # raw MP3 bytes
    "audio_url":        str | None,     # URL nếu đã upload R2
    "duration_seconds": float,          # thời lượng audio
    "voice_used":       str,            # tên voice đã dùng
    "question_text":    str,            # Tiêu chí 4.3
    "word_timestamps":  list[dict],     # Tiêu chí 4.6
}
```

#### `apps/backend/app/api/voice_interview.py` (cập nhật)

**Endpoint mới `POST /api/interview/voice/tts`:**

```
Input (Form):
  question_text:    str  (required)
  voice_preference: str  "female" | "male" (default: "female")
  session_id:       str  (optional — để upload R2)

Output (JSON):
  success:          bool
  audio_url:        str | None     — Tiêu chí 4.3
  question_text:    str            — Tiêu chí 4.3
  duration_seconds: float
  voice_used:       str            — Tiêu chí 4.8
  word_timestamps:  list[dict]     — Tiêu chí 4.6

Error codes:
  400: voice_preference không hợp lệ hoặc question_text rỗng
  422: thiếu question_text
  503: Edge TTS service unavailable
```

**`generate_tts_audio()` cập nhật:**
- Trả về `question_text` và `word_timestamps` trong response dict
- Lưu DB record cho `ai_question` audio (Tiêu chí 7.6)

### Frontend

#### `apps/frontend/src/pages/VoiceInterviewPage.tsx` (viết lại)

**Component mới `QuestionBubble`:**

```typescript
// Tiêu chí 4.5: Typing animation
// Hiển thị từng ký tự theo intervalMs = durationMs / totalChars
// Khi AI nói xong → hiển thị toàn bộ text ngay lập tức

// Tiêu chí 4.6: Word highlight
// Nếu có word_timestamps: highlight từng từ theo audioCurrentTimeMs
// isActive = audioCurrentTimeMs >= offset_ms && < offset_ms + duration_ms
// CSS: bg-yellow-200 text-yellow-900 rounded
```

**`playQuestionAudio()` cập nhật:**

```typescript
// Tiêu chí 4.4: setSinkId
if ('setSinkId' in audio && config?.speakerId) {
    await (audio as any).setSinkId(config.speakerId);
}

// Tiêu chí 4.6: cập nhật currentTime mỗi 50ms
audio.onplay = () => {
    if (wordTimestamps.length > 0) {
        timeUpdateRef.current = setInterval(() => {
            setAudioCurrentTimeMs(Math.round(audio.currentTime * 1000));
        }, 50);
    }
};

// Tiêu chí 4.7: kích hoạt nút sau khi audio phát xong
audio.onended = () => {
    setIsAISpeaking(false);
    setCanStartAnswer(true);  // ← kích hoạt nút "Bắt đầu trả lời"
};
```

**`fetchAndPlayTTS()` mới:**
- Gọi `POST /api/interview/voice/tts` khi không có `audio_url` từ `/start`
- Cập nhật `currentQuestion` với `wordTimestamps` và `durationSeconds` từ response
- Tiêu chí 9.2: TTS failure → `setCanStartAnswer(true)` để tiếp tục không có audio

---

## Test Files

### Backend Tests

#### `apps/backend/app/modules/interview/test_edge_tts_req4.py` (21 tests)

| Class | Tests | Tiêu Chí |
|-------|-------|----------|
| `TestVoiceSupport` | 6 | 4.8 |
| `TestSynthesizeText` | 6 | 4.1, 4.3, 4.8 |
| `TestAudioStorage` | 3 | 4.2 |
| `TestWordTimestamps` | 4 | 4.6 |
| `TestResponseStructure` | 2 | 4.3, 4.6 |

#### `apps/backend/app/api/test_tts_endpoint.py` (10 tests)

| Test | Tiêu Chí |
|------|----------|
| `test_tts_success_female` | 4.1, 4.3, 4.8 |
| `test_tts_success_male` | 4.8 |
| `test_tts_invalid_voice_returns_400` | 4.8 |
| `test_tts_empty_text_returns_400` | validation |
| `test_tts_missing_text_returns_422` | validation |
| `test_tts_service_unavailable_returns_503` | error handling |
| `test_tts_response_has_word_timestamps` | 4.6 |
| `test_tts_no_audio_url_when_no_session` | 4.2 |
| `test_tts_db_save_ai_question_columns` | 4.2 + DB columns |
| `test_tts_no_db_save_when_no_audio_url` | 4.2 + DB guard |

### Frontend Tests

#### `apps/frontend/src/__tests__/VoiceInterviewPage.requirement4.test.tsx` (12 tests)

| Test | Tiêu Chí |
|------|----------|
| `4.3: Hiển thị question_text từ API response` | 4.3 |
| `4.4: Phát audio qua loa đã chọn (setSinkId)` | 4.4 |
| `4.5: Hiển thị typing animation khi AI đang nói` | 4.5 |
| `4.7: Kích hoạt nút "Bắt đầu trả lời" sau khi audio phát xong` | 4.7 |
| `4.8: Nút chọn giọng nữ (vi-VN-HoaiMyNeural)` | 4.8 |
| `4.8: Nút chọn giọng nam (vi-VN-NamMinhNeural)` | 4.8 |
| `4.6: QuestionBubble render với word timestamps` | 4.6 |
| `4.2: Gọi /tts endpoint khi start không trả về audio_url` | 4.2 |
| `3.1: Ghi âm từ microphone đã chọn` | Regression 3.1 |
| `3.2: Hiển thị chỉ báo trực quan khi ghi âm` | Regression 3.2 |
| `3.3 + 3.4: Dừng ghi âm và upload lên /answer` | Regression 3.3, 3.4 |
| `3.8: Hiển thị lỗi STT và cho phép retry` | Regression 3.8 |

---

## Test Results Chi Tiết

### Backend (50/50 PASSED)

```
app/modules/interview/test_edge_tts_req4.py (21 tests) — tất cả PASSED
app/api/test_tts_endpoint.py (10 tests)               — tất cả PASSED
app/api/test_voice_interview.py (19 tests)             — tất cả PASSED

50 passed, 5 warnings in 4.47s
```

---

## Luồng TTS Đầy Đủ (Tiêu Chí 4.1 → 4.7)

```
AIPipelineService trả về next_question.text
    │
    ▼ (4.1) EdgeTTSService.synthesize_text(text, voice_preference)
    │       └── edge_tts.Communicate(text, voice_name).stream()
    │           ├── chunk["type"] == "audio"        → audio_data bytes
    │           └── chunk["type"] == "WordBoundary" → word_timestamps
    │
    ▼ (4.2) audio_storage_service.upload_ai_question_audio(audio_data)
    │       └── R2 path: interview-audio/{session_id}/ai_questions/{ts}.mp3
    │
    ▼ (4.3) Response: { audio_url, question_text, duration_seconds, word_timestamps }
    │
    ▼ (4.4) Frontend: new Audio(audio_url) → setSinkId(speakerId)
    │
    ▼ (4.5) QuestionBubble: typing animation (intervalMs = durationMs / totalChars)
    │       hoặc
    ▼ (4.6) QuestionBubble: word highlight (isActive = currentTimeMs in [offset, offset+duration])
    │       setInterval(50ms) → setAudioCurrentTimeMs(audio.currentTime * 1000)
    │
    ▼ (4.7) audio.onended → setCanStartAnswer(true) → nút "Bắt đầu trả lời" enabled
```
