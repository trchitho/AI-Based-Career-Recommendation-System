import json, os, time
from app.core.logging import request_id_ctx

class AuditLogger:
    def __init__(self, name: str = "audit.log"):
        self.path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", name))
        
    def log_event(self, action: str, user_id: any = None, details: dict = None, db: any = None):
        d = {}
        if details:
            bad = {"password", "token", "access_token", "refresh_token", "cv_text", "text", "transcript", "prompt", "audio"}
            d = {k: ("[REDACTED]" if k.lower() in bad else v) for k, v in details.items()}
        ev = {"timestamp": time.time(), "request_id": request_id_ctx.get(), "action": action, "user_id": user_id, "details": d}
        try:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
        except Exception:
            pass

        try:
            from app.core.db import SessionLocal
            from sqlalchemy import text
            active_db = db or SessionLocal()
            try:
                details_json = json.dumps(d) if d else None
                active_db.execute(text("""
                    INSERT INTO core.audit_logs 
                    (actor_id, action, entity, entity_id, data_json, user_id, resource_type, resource_id, details, created_at)
                    VALUES 
                    (:actor_id, :action, :entity, :entity_id, CAST(:data_json AS jsonb), :user_id, :resource_type, :resource_id, CAST(:details AS jsonb), NOW())
                """), {
                    "actor_id": user_id,
                    "action": action,
                    "entity": "system",
                    "entity_id": None,
                    "data_json": details_json,
                    "user_id": user_id,
                    "resource_type": "system",
                    "resource_id": None,
                    "details": details_json
                })
                if not db:
                    active_db.commit()
            finally:
                if not db:
                    active_db.close()
        except Exception:
            pass

audit_logger = AuditLogger()
