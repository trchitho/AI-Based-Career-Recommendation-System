import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# Load env but do not crash if missing; create engine lazily when needed
_HERE = os.path.dirname(__file__)
_ENV_PATH = os.path.join(_HERE, "../../.env")
_ENV_EXAMPLE = os.path.join(_HERE, "../../.env.example")
if os.path.exists(_ENV_PATH):
    load_dotenv(_ENV_PATH)
elif os.path.exists(_ENV_EXAMPLE):
    load_dotenv(_ENV_EXAMPLE)

_engine_cached: Engine | None = None


def _database_url() -> str | None:
    url = os.getenv("DATABASE_URL")
    return url.strip() if url and url.strip() else None


def get_engine() -> Engine:
    global _engine_cached
    if _engine_cached is not None:
        return _engine_cached
    url = _database_url()
    if not url:
        raise RuntimeError("DATABASE_URL is not configured in apps/backend/.env")
    _engine_cached = create_engine(url, pool_pre_ping=True)
    return _engine_cached


def test_connection() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
