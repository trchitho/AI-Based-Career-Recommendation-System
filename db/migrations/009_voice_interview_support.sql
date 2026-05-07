-- Migration: Add Voice Interview Support
-- File: 009_voice_interview_support.sql
-- Description: Thêm hỗ trợ voice interview vào database schema hiện có
-- Date: 2026-04-25
-- Version: 1.4 (fix DO $$ syntax + add question_count constraint sync)

BEGIN;

-- ─── 1. Thêm cột vào interview_sessions ──────────────────────────────────────

ALTER TABLE interview.interview_sessions
    ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS interview_mode   VARCHAR(10) DEFAULT 'text';

-- Cập nhật NULL trước khi thêm constraint
UPDATE interview.interview_sessions SET interview_mode   = 'text' WHERE interview_mode   IS NULL;
UPDATE interview.interview_sessions SET tab_switch_count = 0      WHERE tab_switch_count IS NULL;

COMMENT ON COLUMN interview.interview_sessions.tab_switch_count IS 'Số lần user chuyển tab (voice interview rules)';
COMMENT ON COLUMN interview.interview_sessions.interview_mode   IS 'Chế độ phỏng vấn: text hoặc voice';

-- Constraints idempotent — DO $$ (double dollar, PostgreSQL standard)
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_tab_switch_count'
          AND conrelid = 'interview.interview_sessions'::regclass
    ) THEN
        ALTER TABLE interview.interview_sessions
            ADD CONSTRAINT chk_tab_switch_count
            CHECK (tab_switch_count >= 0 AND tab_switch_count <= 10);
    END IF;
END $$;

-- Đảm bảo chk_question_count_range tồn tại (đã có trong 008 nhưng sync lại)
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

-- Indexes cho voice interview columns
CREATE INDEX IF NOT EXISTS idx_interview_sessions_mode
    ON interview.interview_sessions(interview_mode);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_tab_switch
    ON interview.interview_sessions(tab_switch_count);

-- ─── 2. Tạo bảng interview_audio ─────────────────────────────────────────────
-- Nullable analysis:
--   id               UUID      NOT NULL  PK auto-generated
--   session_id       INTEGER   NOT NULL  FK bắt buộc
--   message_id       INTEGER   NULL      AI question không có message_id
--   audio_type       VARCHAR   NOT NULL  'user_answer' | 'ai_question'
--   file_url         TEXT      NOT NULL  URL storage (dùng 'pending://upload-failed' khi R2 chưa cấu hình)
--   duration_seconds FLOAT     NULL      Không phải lúc nào cũng biết
--   file_size_bytes  BIGINT    NULL      Không phải lúc nào cũng biết
--   transcript       TEXT      NULL      Chỉ user_answer có transcript; ai_question = NULL
--   created_at       TIMESTAMP NOT NULL  Auto-set bởi DB

CREATE TABLE IF NOT EXISTS interview.interview_audio (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id       INTEGER     NOT NULL,
    message_id       INTEGER     NULL,
    audio_type       VARCHAR(20) NOT NULL,
    file_url         TEXT        NOT NULL,
    duration_seconds FLOAT       NULL,
    file_size_bytes  BIGINT      NULL,
    transcript       TEXT        NULL,
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT interview_audio_pkey
        PRIMARY KEY (id),
    CONSTRAINT interview_audio_session_id_fkey
        FOREIGN KEY (session_id)
        REFERENCES interview.interview_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT interview_audio_message_id_fkey
        FOREIGN KEY (message_id)
        REFERENCES interview.interview_messages(id)
        ON DELETE SET NULL,
    CONSTRAINT interview_audio_audio_type_check
        CHECK (audio_type IN ('user_answer', 'ai_question'))
);

COMMENT ON TABLE  interview.interview_audio
    IS 'Metadata audio files trong voice interview';
COMMENT ON COLUMN interview.interview_audio.audio_type
    IS 'user_answer: câu trả lời ứng viên | ai_question: câu hỏi TTS của AI';
COMMENT ON COLUMN interview.interview_audio.file_url
    IS 'URL file audio trong Cloudflare R2. Dùng pending://upload-failed khi R2 chưa cấu hình';
COMMENT ON COLUMN interview.interview_audio.transcript
    IS 'Transcript từ Whisper STT — chỉ user_answer, NULL cho ai_question';
COMMENT ON COLUMN interview.interview_audio.duration_seconds
    IS 'Thời lượng audio tính bằng giây';
COMMENT ON COLUMN interview.interview_audio.file_size_bytes
    IS 'Kích thước file tính bằng bytes';

-- ─── 3. Indexes cho interview_audio ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_interview_audio_session_id
    ON interview.interview_audio(session_id);

CREATE INDEX IF NOT EXISTS idx_interview_audio_type
    ON interview.interview_audio(audio_type);

CREATE INDEX IF NOT EXISTS idx_interview_audio_created_at
    ON interview.interview_audio(created_at);

COMMIT;
