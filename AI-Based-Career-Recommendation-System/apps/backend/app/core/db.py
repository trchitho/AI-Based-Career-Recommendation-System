# apps/backend/app/core/db.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
import os

# Nạp .env (ưu tiên .env, fallback .env.example)
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
example_env_path = os.path.join(os.path.dirname(__file__), "../../.env.example")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv(example_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Please set it in your environment or .env file.")

# Engine dùng chung
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 🔴 Base dùng chung cho tất cả models (cái bạn đang thiếu)
Base = declarative_base()

def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT now();"))
        print("✅ DB Connected:", result.scalar())
