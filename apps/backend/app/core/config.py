# apps/backend/app/core/config.py

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field, AnyHttpUrl
from pydantic_settings import BaseSettings


# --- Load .env thủ công (ưu tiên .env ở backend root) ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)


class Settings(BaseSettings):
    # ======================================================
    # Database & Services
    # ======================================================
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    REDIS_URL: str | None = Field(None, env="REDIS_URL")

    NEO4J_URL: str | None = Field(None, env="NEO4J_URL")
    NEO4J_USER: str | None = Field(None, env="NEO4J_USER")
    NEO4J_PASS: str | None = Field(None, env="NEO4J_PASS")

    # ======================================================
    # Search (Elastic)
    # ======================================================
    ES_URL: str | None = Field(None, env="ES_URL")
    ES_USER: str | None = Field(None, env="ES_USER")
    ES_PASS: str | None = Field(None, env="ES_PASS")

    # ======================================================
    # External AI service (optional)
    # ======================================================
    AI_SERVICE_URL: str | None = Field(None, env="AI_SERVICE_URL")

    # ======================================================
    # JWT & Security
    # ======================================================
    JWT_SECRET_KEY: str = Field(
        "dev-secret-change-me",
        env="JWT_SECRET_KEY",
    )
    # Dạng chuỗi: "http://localhost:3000,http://127.0.0.1:3000"
    ALLOWED_ORIGINS: str = Field(
        "http://localhost:3000",
        env="ALLOWED_ORIGINS",
    )

    # ======================================================
    # AI models or extra configs
    # ======================================================
    AI_MODELS_DIR: str | None = Field(None, env="AI_MODELS_DIR")

    # ======================================================
    # O*NET Web Services v2
    # ======================================================
    onet_v2_api_key: str = Field(..., env="ONET_V2_API_KEY")
    onet_v2_base_url: AnyHttpUrl | str = Field(
        "https://api-v2.onetcenter.org",
        env="ONET_V2_BASE_URL",
    )
    onet_v2_timeout: int = Field(10, env="ONET_V2_TIMEOUT")

    # ======================================================
    # Google OAuth (những key đang gây lỗi extra_forbidden)
    # ======================================================
    google_client_id: str | None = Field(None, env="google_client_id")
    google_client_secret: str | None = Field(None, env="google_client_secret")
    google_redirect_uri: str | None = Field(None, env="google_redirect_uri")
    frontend_oauth_redirect: str | None = Field(None, env="frontend_oauth_redirect")

    # ======================================================
    # Helper alias (nếu sau này muốn dùng snake_case)
    # ======================================================
    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    class Config:
        # vẫn cho phép đọc .env
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
