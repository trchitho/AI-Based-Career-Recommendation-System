from fastapi import APIRouter, Request
from sqlalchemy.orm import Session

from .models import AppSettings

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/settings")
def public_settings(request: Request):
    session = _db(request)
    s = session.get(AppSettings, 1)
    if not s:
        # Not found yet; return minimal defaults so FE can render
        return {
            "id": 1,
            "logo_url": None,
            "app_title": "CareerBridge AI",
            "app_name": "CareerBridge",
            "footer_html": "© 2025 CareerBridge AI",
            "updated_at": None,
            "updated_by": None,
        }
    return s.to_dict()
