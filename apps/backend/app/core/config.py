import os
from dotenv import load_dotenv
from pathlib import Path

# --- Load .env ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # tới thư mục /backend
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)


class Settings:
    # Database & Services
    DATABASE_URL = os.getenv("DATABASE_URL")
    REDIS_URL = os.getenv("REDIS_URL")
    NEO4J_URL = os.getenv("NEO4J_URL")
    NEO4J_USER = os.getenv("NEO4J_USER")
    NEO4J_PASS = os.getenv("NEO4J_PASS")

    # Search (Elastic)
    ES_URL = os.getenv("ES_URL")
    ES_USER = os.getenv("ES_USER")
    ES_PASS = os.getenv("ES_PASS")

    # External AI service (optional)
    AI_SERVICE_URL = os.getenv("AI_SERVICE_URL")

    # JWT & Security
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")

    # AI models or extra configs
    AI_MODELS_DIR = os.getenv("AI_MODELS_DIR")


settings = Settings()
