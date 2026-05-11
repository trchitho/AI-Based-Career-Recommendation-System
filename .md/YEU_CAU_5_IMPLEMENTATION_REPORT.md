# Báo Cáo Triển Khai - Yêu Cầu 5: Speech-to-Text (STT) Pipeline

## Tổng Quan

**Yêu Cầu:** Yêu Cầu 5 - Speech-to-Text (STT) Pipeline
**Trạng Thái:** ✅ HOÀN THÀNH - 100% Tiêu Chí Chấp Nhận Pass
**Backend Tests:** 35/35 PASSED (unit) + 11/11 PASSED (integration) = 46/46
**Regression:** Yêu Cầu 3+4 vẫn 50/50 PASSED

---

## Tiêu Chí Chấp Nhận - Kết Quả

| # | Tiêu Chí | Trạng Thái | Test Coverage |
|---|----------|-----------|---------------|
| 5.1 | STT_Service xử lý audio bằng Whisper model | ✅ PASS | `test_run_whisper_calls_model_with_vi_language` |
| 5.2 | Nhận dạng tiếng Việt với language='vi' | ✅ PASS | `test_transcribe_uses_vietnamese_language`, `test_transcribe_default_language_is_vi` |
| 5.3 | Trả về transcript dạng plain text | ✅ PASS | `test_transcribe_returns_plain_text`, `test_transcribe_strips_whitespace` |
| 5.4 | Xử lý audio 3–300 giây | ✅ PASS | `test_audio_too_short_raises_error`, `test_audio_too_long_raises_error`, `test_audio_exactly_3s_is_valid`, `test_audio_exactly_300s_is_valid` |
| 5.5 | File > 25MB → HTTP 413 | ✅ PASS | `test_file_too_large_raises_error`, `test_large_file_returns_413` |
| 5.6 | Không có giọng nói → STT_NO_SPEECH_DETECTED | ✅ PASS | `test_empty_transcript_raises_no_speech`, `test_stt_no_speech_returns_retry`, `test_stt_no_speech_still_saves_db_record` |
| 5.7 | Hỗ trợ WebM, MP4, WAV, MP3 | ✅ PASS | `test_supported_formats_include_required`, `test_supported_formats_accepted[audio/webm]`, `test_supported_formats_accepted[audio/mp4]`, `test_supported_formats_accepted[audio/wav]`, `test_supported_formats_accepted[audio/mpeg]` |
| 5.8 | Round-trip equivalence STT → transcript → submit_answer | ✅ PASS | `test_stt_transcript_equals_typed_text`, `test_transcript_passed_to_ai_pipeline`, `test_multiple_transcriptions_consistent` |

---

## Files Đã Tạo / Cập Nhật

### `apps/backend/app/modules/interview/whisper_stt_service.py` (mới)

**WhisperSTTService:**

```python
class WhisperSTTService:
    async def transcribe(audio_data, language='vi', content_type=None) -> str
    def _run_whisper(audio_path, language) -> tuple[str, float|None]
    def _get_extension(content_type) -> str
```

**Luồng xử lý:**
1. Validate file size > 25MB → `STTFileTooLargeError` (Tiêu chí 5.5)
2. Validate empty audio → `STTNoSpeechError`
3. Xác định extension từ content_type (Tiêu chí 5.7)
4. Write to temp file với đúng extension
5. `_run_whisper(tmp_path, language='vi')` → gọi Whisper (Tiêu chí 5.1, 5.2)
6. Validate duration 3–300s → `STTDurationError` (Tiêu chí 5.4)
7. Empty transcript → `STTNoSpeechError` (Tiêu chí 5.6)
8. Return `transcript.strip()` — plain text (Tiêu chí 5.3)

**Custom exceptions:**
| Exception | Tiêu chí | HTTP response |
|-----------|----------|---------------|
| `STTFileTooLargeError` | 5.5 | 413 |
| `STTNoSpeechError` | 5.6 | 200 + `STT_NO_SPEECH_DETECTED` |
| `STTDurationError` | 5.4 | 200 + `STT_DURATION_ERROR` |

**Constants:**
```python
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024   # 25MB
MIN_DURATION_SECONDS = 3.0
MAX_DURATION_SECONDS = 300.0
SUPPORTED_FORMATS = {"webm", "mp4", "wav", "mp3", "ogg", "m4a"}
```

### `apps/backend/app/api/voice_interview.py` (cập nhật)

**`process_stt()` — thay thế mock bằng Whisper thực:**
```python
async def process_stt(audio_data: bytes, content_type: Optional[str] = None) -> str:
    return await whisper_stt_service.transcribe(
        audio_data=audio_data,
        language="vi",          # Tiêu chí 5.2
        content_type=content_type,
    )
```

**`submit_voice_answer()` — xử lý exceptions mới:**
- `STTNoSpeechError` → `STT_NO_SPEECH_DETECTED` + `allow_retry=True` (Tiêu chí 5.6)
- `STTDurationError` → `STT_DURATION_ERROR` + `allow_retry=True` (Tiêu chí 5.4)
- Generic exception → `STT_PROCESSING_ERROR` + `allow_retry=True`
- Tất cả cases đều lưu DB record với `transcript=None`

---

## Test Files

### `apps/backend/app/modules/interview/test_whisper_stt_req5.py` (35 tests)

| Class | Tests | Tiêu Chí |
|-------|-------|----------|
| `TestFileSizeLimit` | 4 | 5.5 |
| `TestDurationValidation` | 6 | 5.4 |
| `TestNoSpeechDetection` | 3 | 5.6 |
| `TestWhisperTranscription` | 5 | 5.1, 5.2, 5.3 |
| `TestSupportedFormats` | 9 | 5.7 |
| `TestRoundTripEquivalence` | 3 | 5.8 |
| `TestServiceProperties` | 4 | general |

### `apps/backend/app/api/test_stt_endpoint_req5.py` (11 tests)

| Class | Tests | Tiêu Chí |
|-------|-------|----------|
| `TestSTTViaAnswerEndpoint` | 2 | 5.1, 5.3, 5.7 |
| `TestFileSizeLimitViaEndpoint` | 1 | 5.5 |
| `TestNoSpeechViaEndpoint` | 2 | 5.6 |
| `TestDurationErrorViaEndpoint` | 1 | 5.4 |
| `TestFormatSupportViaEndpoint` | 4 | 5.7 |
| `TestRoundTripEquivalenceViaEndpoint` | 1 | 5.8 |

---

## Test Results Chi Tiết

### Yêu Cầu 5 (46/46 PASSED)

```
test_whisper_stt_req5.py::TestFileSizeLimit::test_file_too_large_raises_error    PASSED
test_whisper_stt_req5.py::TestFileSizeLimit::test_file_exactly_25mb_raises_error PASSED
test_whisper_stt_req5.py::TestFileSizeLimit::test_empty_audio_raises_no_speech   PASSED
test_whisper_stt_req5.py::TestFileSizeLimit::test_max_file_size_constant         PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_audio_too_short_raises_error PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_audio_too_long_raises_error  PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_audio_exactly_3s_is_valid    PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_audio_exactly_300s_is_valid  PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_none_duration_skips_validation PASSED
test_whisper_stt_req5.py::TestDurationValidation::test_duration_constants           PASSED
test_whisper_stt_req5.py::TestNoSpeechDetection::test_empty_transcript_raises_no_speech    PASSED
test_whisper_stt_req5.py::TestNoSpeechDetection::test_whitespace_transcript_raises_no_speech PASSED
test_whisper_stt_req5.py::TestNoSpeechDetection::test_valid_transcript_returns_text         PASSED
test_whisper_stt_req5.py::TestWhisperTranscription::test_transcribe_returns_plain_text      PASSED
test_whisper_stt_req5.py::TestWhisperTranscription::test_transcribe_strips_whitespace       PASSED
test_whisper_stt_req5.py::TestWhisperTranscription::test_transcribe_uses_vietnamese_language PASSED
test_whisper_stt_req5.py::TestWhisperTranscription::test_transcribe_default_language_is_vi  PASSED
test_whisper_stt_req5.py::TestWhisperTranscription::test_run_whisper_calls_model_with_vi_language PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_supported_formats_include_required     PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_content_type_webm_maps_to_webm        PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_content_type_mp4_maps_to_mp4          PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_content_type_wav_maps_to_wav          PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_content_type_mp3_maps_to_mp3          PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_unknown_content_type_defaults_to_webm PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_none_content_type_defaults_to_webm    PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_transcribe_uses_correct_extension_for_webm PASSED
test_whisper_stt_req5.py::TestSupportedFormats::test_transcribe_uses_correct_extension_for_wav  PASSED
test_whisper_stt_req5.py::TestRoundTripEquivalence::test_stt_transcript_equals_typed_text   PASSED
test_whisper_stt_req5.py::TestRoundTripEquivalence::test_stt_transcript_is_plain_text_no_markup PASSED
test_whisper_stt_req5.py::TestRoundTripEquivalence::test_multiple_transcriptions_consistent PASSED
test_whisper_stt_req5.py::TestServiceProperties::test_model_size_property                  PASSED
test_whisper_stt_req5.py::TestServiceProperties::test_supported_formats_property           PASSED
test_whisper_stt_req5.py::TestServiceProperties::test_lazy_model_loading                   PASSED
test_whisper_stt_req5.py::TestServiceProperties::test_content_type_map_completeness        PASSED
test_stt_endpoint_req5.py::TestSTTViaAnswerEndpoint::test_stt_returns_transcript_in_response PASSED
test_stt_endpoint_req5.py::TestSTTViaAnswerEndpoint::test_stt_called_with_audio_data_and_content_type PASSED
test_stt_endpoint_req5.py::TestFileSizeLimitViaEndpoint::test_large_file_returns_413       PASSED
test_stt_endpoint_req5.py::TestNoSpeechViaEndpoint::test_stt_no_speech_returns_retry       PASSED
test_stt_endpoint_req5.py::TestNoSpeechViaEndpoint::test_stt_no_speech_still_saves_db_record PASSED
test_stt_endpoint_req5.py::TestDurationErrorViaEndpoint::test_stt_duration_error_returns_retry PASSED
test_stt_endpoint_req5.py::TestFormatSupportViaEndpoint::test_supported_formats_accepted[audio/webm-test.webm] PASSED
test_stt_endpoint_req5.py::TestFormatSupportViaEndpoint::test_supported_formats_accepted[audio/mp4-test.mp4]   PASSED
test_stt_endpoint_req5.py::TestFormatSupportViaEndpoint::test_supported_formats_accepted[audio/wav-test.wav]   PASSED
test_stt_endpoint_req5.py::TestFormatSupportViaEndpoint::test_supported_formats_accepted[audio/mpeg-test.mp3]  PASSED
test_stt_endpoint_req5.py::TestFormatSupportViaEndpoint::test_non_audio_content_type_rejected PASSED
test_stt_endpoint_req5.py::TestRoundTripEquivalenceViaEndpoint::test_transcript_passed_to_ai_pipeline PASSED

46 passed, 5 warnings in 4.21s
```

---

## Luồng STT Đầy Đủ (Tiêu Chí 5.1 → 5.8)

```
POST /api/interview/voice/answer (audio_file, session_id)
    │
    ▼ Validate: content-type, empty, 25MB (Tiêu chí 5.5)
    │
    ▼ Upload to R2 storage
    │
    ▼ process_stt(audio_data, content_type)
    │       └── whisper_stt_service.transcribe(audio_data, language='vi')
    │               ├── Validate file size > 25MB → STTFileTooLargeError (5.5)
    │               ├── Write to temp file với đúng extension (5.7)
    │               │       WebM → .webm, MP4 → .mp4, WAV → .wav, MP3 → .mp3
    │               ├── _run_whisper(tmp_path, language='vi') (5.1, 5.2)
    │               │       model.transcribe(path, language='vi', task='transcribe')
    │               ├── Validate duration 3–300s (5.4)
    │               ├── Empty transcript → STTNoSpeechError (5.6)
    │               └── Return transcript.strip() — plain text (5.3)
    │
    ├── STTNoSpeechError → STT_NO_SPEECH_DETECTED + allow_retry=True (5.6)
    ├── STTDurationError → STT_DURATION_ERROR + allow_retry=True (5.4)
    │
    ▼ save_audio_metadata(transcript=transcript) → DB INSERT
    │
    ▼ submit_to_ai_pipeline(session_id, transcript) (5.8 round-trip)
    │       transcript từ STT == text gõ trực tiếp → kết quả tương đương
    │
    ▼ Response: { success, transcript, file_url, ai_response, next_question_audio }
```
