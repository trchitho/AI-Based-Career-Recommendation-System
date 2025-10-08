from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Nạp biến môi trường tự động khi module được import
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
example_env_path = os.path.join(os.path.dirname(__file__), "../../.env.example")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv(example_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. Please set it in your environment or .env file."
    )
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT now();"))
        print("✅ DB Connected:", result.scalar())
