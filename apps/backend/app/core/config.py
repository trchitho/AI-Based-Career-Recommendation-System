# apps/backend/app/core/config.py

from pathlib import Path

from pydantic import Field, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Pydantic Settings v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",   # nếu .env có key lạ thì bỏ qua, không quăng lỗi
    )

    # ======================================================
    # Database & Services
    # ======================================================
    DATABASE_URL: str

    REDIS_URL: str | None = None

    NEO4J_URL: str | None = None
    NEO4J_USER: str | None = None
    NEO4J_PASS: str | None = None

    # ======================================================
    # Search (Elastic)
    # ======================================================
    ES_URL: str | None = None
    ES_USER: str | None = None
    ES_PASS: str | None = None

    # ======================================================
    # External AI service (optional)
    # ======================================================
    AI_SERVICE_URL: str | None = None

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
    onet_v2_timeout: int = Field(30, env="ONET_V2_TIMEOUT")

    # ======================================================
    # Google OAuth (trùng với .env.example)
    # ======================================================
    google_client_id: str | None = Field(None, env="GOOGLE_CLIENT_ID")
    google_client_secret: str | None = Field(None, env="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str | None = Field(None, env="GOOGLE_REDIRECT_URI")
    frontend_oauth_redirect: str | None = Field(None, env="FRONTEND_OAUTH_REDIRECT")

    # ======================================================
    # SMTP / Email verification (trùng .env.example)
    # ======================================================
    smtp_host: str | None = Field(None, env="SMTP_HOST")
    smtp_port: int | None = Field(None, env="SMTP_PORT")
    smtp_ssl: bool = Field(False, env="SMTP_SSL")
    smtp_starttls: bool = Field(False, env="SMTP_STARTTLS")
    smtp_user: str | None = Field(None, env="SMTP_USER")
    smtp_password: str | None = Field(None, env="SMTP_PASSWORD")

    email_from: str | None = Field(None, env="EMAIL_FROM")
    frontend_verify_url: str | None = Field(None, env="FRONTEND_VERIFY_URL")

    email_deliverability_required: bool = Field(
        False,
        env="EMAIL_DELIVERABILITY_REQUIRED",
    )
    email_smtp_probe_port: int = Field(25, env="EMAIL_SMTP_PROBE_PORT")
    email_smtp_probe_timeout: int = Field(5, env="EMAIL_SMTP_PROBE_TIMEOUT")

    # ======================================================
    # Helper alias nếu muốn dùng snake_case
    # ======================================================
    @property
    def database_url(self) -> str:
        return self.DATABASE_URL


settings = Settings()
