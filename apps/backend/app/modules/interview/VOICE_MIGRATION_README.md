# Voice Interview Migration Documentation

## Tổng Quan

Migration này thêm hỗ trợ voice interview vào hệ thống AI Mock Interview hiện có. Bao gồm:

1. **Bảng mới**: `interview_audio` để lưu metadata audio files
2. **Cột mới**: `tab_switch_count` và `interview_mode` trong `interview_sessions`
3. **Indexes**: Tối ưu performance cho voice interview queries
4. **Constraints**: Đảm bảo data integrity

## Files

- `voice_migration.sql` - Migration script chính
- `voice_migration_rollback.sql` - Rollback script
- `run_voice_migration.py` - Python script để chạy migration
- `test_voice_migration.py` - Unit tests và acceptance criteria tests
- `models.py` - Updated với InterviewAudio model

## Cách Sử Dụng

### Chạy Migration

```bash
cd apps/backend
python app/modules/interview/run_voice_migration.py
```

### Rollback Migration

```bash
cd apps/backend
python app/modules/interview/run_voice_migration.py --rollback
```

### Chạy Tests

```bash
cd apps/backend
python -m pytest app/modules/interview/test_voice_migration.py -v
```

## Schema Changes

### Bảng Mới: `interview_audio`

```sql
CREATE TABLE interview.interview_audio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id INTEGER NOT NULL REFERENCES interview.interview_sessions(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES interview.interview_messages(id) ON DELETE SET NULL,
    
    audio_type VARCHAR(20) NOT NULL CHECK (audio_type IN ('user_answer', 'ai_question')),
    file_url TEXT NOT NULL,
    duration_seconds FLOAT,
    file_size_bytes BIGINT,
    transcript TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Mục đích**: Lưu metadata cho tất cả audio files trong voice interview
- `user_answer`: Audio câu trả lời của user (có transcript từ STT)
- `ai_question`: Audio câu hỏi TTS của AI (không có transcript)

### Cột Mới trong `interview_sessions`

```sql
ALTER TABLE interview.interview_sessions 
ADD COLUMN tab_switch_count INTEGER DEFAULT 0,
ADD COLUMN interview_mode VARCHAR(10) DEFAULT 'text';
```

**Mục đích**:
- `tab_switch_count`: Đếm số lần user chuyển tab (voice interview rules)
- `interview_mode`: Phân biệt phiên 'text' vs 'voice'

### Indexes Mới

```sql
CREATE INDEX idx_interview_audio_session_id ON interview.interview_audio(session_id);
CREATE INDEX idx_interview_audio_type ON interview.interview_audio(audio_type);
CREATE INDEX idx_interview_audio_created_at ON interview.interview_audio(created_at);
CREATE INDEX idx_interview_sessions_mode ON interview.interview_sessions(interview_mode);
CREATE INDEX idx_interview_sessions_tab_switch ON interview.interview_sessions(tab_switch_count);
```

## Constraints

### Data Integrity

- `interview_mode` chỉ cho phép 'text' hoặc 'voice'
- `tab_switch_count` phải >= 0 và <= 10
- `audio_type` chỉ cho phép 'user_answer' hoặc 'ai_question'

### Foreign Keys

- `interview_audio.session_id` → `interview_sessions.id` (CASCADE DELETE)
- `interview_audio.message_id` → `interview_messages.id` (SET NULL, nullable cho TTS audio)

## Acceptance Criteria Validation

Migration này đáp ứng 100% Tiêu Chí Chấp Nhận của **Yêu Cầu 7: Lưu Trữ Audio và Database**:

✅ **7.2**: Bảng `interview_audio` có đầy đủ các trường: id (UUID), session_id, message_id, file_url, duration_seconds, file_size_bytes, transcript, created_at

✅ **7.3**: Foreign key `session_id` tham chiếu đến `interview_sessions`

✅ **7.4**: Foreign key `message_id` nullable (cho TTS audio)

✅ **7.6**: Trường `audio_type` phân biệt 'user_answer' và 'ai_question'

## Test Results

```
======================== 11 passed, 1 warning in 0.98s ========================
```

Tất cả 11 tests PASS, bao gồm:
- 7 unit tests cho migration structure
- 4 acceptance criteria tests cho Yêu Cầu 7

## Rollback Safety

Migration có thể rollback an toàn:
- Drop bảng `interview_audio` và tất cả data
- Remove các cột voice interview từ `interview_sessions`
- Drop tất cả indexes và constraints liên quan

## Next Steps

Sau khi migration hoàn tất, có thể tiếp tục với:
- Task 2: Audio Storage Service
- Task 4: TTS Service
- Task 5: STT Service

## Troubleshooting

### Lỗi thường gặp

1. **Database connection error**: Check DATABASE_URL trong .env
2. **Permission denied**: Đảm bảo user có quyền CREATE TABLE và ALTER TABLE
3. **Schema không tồn tại**: Migration sẽ tự tạo schema 'interview' nếu chưa có

### Verification Commands

```sql
-- Check bảng đã được tạo
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'interview' AND table_name = 'interview_audio';

-- Check cột mới
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'interview' 
AND table_name = 'interview_sessions' 
AND column_name IN ('tab_switch_count', 'interview_mode');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'interview' 
AND indexname LIKE '%audio%';
```