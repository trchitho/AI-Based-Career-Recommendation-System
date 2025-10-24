# apps/backend/app/bff/router.py
from fastapi import APIRouter
from sqlalchemy import text
from app.core.db import get_engine

router = APIRouter(prefix="/bff")


@router.get("/health")
def health():
    db_ok = False
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "db_ok": db_ok}

@router.get("/db")
def db_time():
    with get_engine().connect() as conn:
        ts = conn.execute(text("SELECT now()"))
        return {"now": str(ts.scalar())}
