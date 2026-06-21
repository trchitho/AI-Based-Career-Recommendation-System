import json, os, time
from app.core.logging import request_id_ctx

class AuditLogger:
    def __init__(self, name: str = "audit.log"):
        self.path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", name))
        
    def log_event(self, action: str, user_id: any = None, details: dict = None):
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

audit_logger = AuditLogger()
