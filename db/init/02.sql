BEGIN;

ALTER TABLE core.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id INTEGER,
  ADD COLUMN IF NOT EXISTS entity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS data_json JSONB;

-- (Tuỳ chọn) index để query nhanh
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON core.audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON core.audit_logs(entity);

COMMIT;
