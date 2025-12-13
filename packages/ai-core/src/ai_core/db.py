# packages/ai-core/src/ai_core/db.py
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# -------------------------------------------------
# 1) Nạp .env cho ai-core
# -------------------------------------------------
THIS_FILE = Path(__file__).resolve()
# .../packages/ai-core/src/ai_core/db.py
AI_CORE_DIR = THIS_FILE.parents[3]          # .../packages/ai-core
REPO_DIR = AI_CORE_DIR.parent               # .../AI-Based-Career-Recommendation-System
BACKEND_DIR = REPO_DIR / "apps" / "backend" # .../apps/backend

env_candidates = [
    AI_CORE_DIR / ".env",          # ưu tiên .env riêng của ai-core
    BACKEND_DIR / ".env",          # fallback sang .env của backend
    AI_CORE_DIR / ".env.example",
    BACKEND_DIR / ".env.example",
]

for p in env_candidates:
    if p.exists():
        load_dotenv(p)
        break

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set for ai_core. "
        "Please define it in packages/ai-core/.env hoặc apps/backend/.env."
    )

# -------------------------------------------------
# 2) SQLAlchemy engine + SessionLocal
# -------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session() -> Session:
    """
    Lấy một SQLAlchemy Session dùng cho AI-core.
    Caller tự chịu trách nhiệm đóng session.
    """
    return SessionLocal()


def test_connection() -> None:
    """Tiện debug nhanh."""
    with engine.connect() as conn:
        row = conn.execute(text("SELECT now()")).first()
        print("[ai_core.db] Connected, now():", row[0] if row else None)
        
