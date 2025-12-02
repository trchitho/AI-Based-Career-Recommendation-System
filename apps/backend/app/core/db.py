# apps/backend/app/core/db.py
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base

import asyncpg

# Nạp .env (ưu tiên .env, fallback .env.example)
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
example_env_path = os.path.join(os.path.dirname(__file__), "../../.env.example")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv(example_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please set it in your environment or .env file."
    )

# Engine dùng chung
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Base dùng chung cho tất cả models
Base = declarative_base()


def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT now();"))
        print("✅ DB Connected:", result.scalar())


# Ensure UTF-8 client encoding for all connections (Vietnamese content)
try:

    @event.listens_for(engine, "connect")
    def _set_client_encoding(dbapi_connection, connection_record):
        try:
            dbapi_connection.set_client_encoding("UTF8")
        except Exception:
            try:
                with dbapi_connection.cursor() as cur:
                    cur.execute("SET client_encoding TO 'UTF8';")
            except Exception:
                pass

except Exception:
    pass


_pg_pool: asyncpg.Pool | None = None


async def get_pg_pool() -> asyncpg.Pool:
    """
    Tạo và cache asyncpg pool, dùng cho các ETL async (onet_enrich_main, v.v.).
    """
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=1,
            max_size=5,
            command_timeout=60,
        )
    return _pg_pool


async def close_pg_pool() -> None:
    global _pg_pool
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None
