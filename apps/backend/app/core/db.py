from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Nạp biến môi trường tự động khi module được import
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env.example"))

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT now();"))
        print("✅ DB Connected:", result.scalar())
