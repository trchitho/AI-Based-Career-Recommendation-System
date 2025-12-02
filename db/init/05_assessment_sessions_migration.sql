-- Add assessment_sessions and refactor assessments

BEGIN;

-- 1) Tạo bảng core.assessment_sessions
CREATE TABLE IF NOT EXISTS core.assessment_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Index phụ cho user + created_at
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user
    ON core.assessment_sessions(user_id, created_at);

-- 3) Thêm cột session_id vào core.assessments
ALTER TABLE core.assessments
    ADD COLUMN IF NOT EXISTS session_id BIGINT NULL;

-- 4) Thêm FK từ core.assessments.session_id → core.assessment_sessions.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_assess_session'
          AND conrelid = 'core.assessments'::regclass
    ) THEN
        ALTER TABLE core.assessments
            ADD CONSTRAINT fk_assess_session
                FOREIGN KEY (session_id)
                REFERENCES core.assessment_sessions(id)
                ON DELETE SET NULL;
    END IF;
END$$;

-- 5) Insert session cho các assessments chưa có session_id
INSERT INTO core.assessment_sessions (user_id, created_at)
SELECT a.user_id, a.created_at
FROM core.assessments a
WHERE a.session_id IS NULL;

-- 6) Gán session_id cho core.assessments dựa trên (user_id, created_at)
UPDATE core.assessments a
SET session_id = s.id
FROM core.assessment_sessions s
WHERE a.session_id IS NULL
  AND a.user_id = s.user_id
  AND a.created_at = s.created_at;

-- 7) Bỏ FK cũ và cột response_set_id (nếu còn)
ALTER TABLE core.assessments
    DROP CONSTRAINT IF EXISTS assessments_response_set_id_fkey;

ALTER TABLE core.assessments
    DROP COLUMN IF EXISTS response_set_id;

-- 8) Gộp các session cùng user + cùng giây về 1 session_id nhỏ nhất
WITH canon AS (
    SELECT
        user_id,
        date_trunc('second', created_at) AS t,
        MIN(id) AS keep_session
    FROM core.assessment_sessions
    GROUP BY user_id, date_trunc('second', created_at)
)
UPDATE core.assessments a
SET session_id = c.keep_session
FROM canon c
WHERE a.user_id = c.user_id
  AND date_trunc('second', a.created_at) = c.t;

-- 9) Xoá các session không còn được tham chiếu
DELETE FROM core.assessment_sessions s
WHERE NOT EXISTS (
    SELECT 1
    FROM core.assessments a
    WHERE a.session_id = s.id
);

COMMIT;
