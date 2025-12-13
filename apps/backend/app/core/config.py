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
    JWT_SECRET_KEY: str = Field("dev-secret-change-me")
    # Dạng chuỗi: "http://localhost:3000,http://127.0.0.1:3000"
    ALLOWED_ORIGINS: str = Field("http://localhost:3000")

    # ======================================================
    # AI models or extra configs
    # ======================================================
    AI_MODELS_DIR: str | None = Field(None)

    # ======================================================
    # O*NET Web Services v2
    # ======================================================
    onet_v2_api_key: str = Field(...)
    onet_v2_base_url: AnyHttpUrl | str = Field("https://api-v2.onetcenter.org")
    onet_v2_timeout: int = Field(30)

    # ======================================================
    # Google OAuth (trùng với .env.example)
    # ======================================================
    google_client_id: str | None = Field(None)
    google_client_secret: str | None = Field(None)
    google_redirect_uri: str | None = Field(None)
    frontend_oauth_redirect: str | None = Field(None)

    # ======================================================
    # SMTP / Email verification (trùng .env.example)
    # ======================================================
    smtp_host: str | None = Field(None)
    smtp_port: int | None = Field(None)
    smtp_ssl: bool = Field(False)
    smtp_starttls: bool = Field(False)
    smtp_user: str | None = Field(None)
    smtp_password: str | None = Field(None)

    email_from: str | None = Field(None)
    frontend_verify_url: str | None = Field(None)

    email_deliverability_required: bool = Field(False)
    email_smtp_probe_port: int = Field(25)
    email_smtp_probe_timeout: int = Field(5)

    # ======================================================
    # ZaloPay Payment Gateway
    # ======================================================
    zalopay_app_id: str = Field("2553")
    zalopay_key1: str = Field("PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL")
    zalopay_key2: str = Field("kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz")
    zalopay_endpoint: str = Field("https://sb-openapi.zalopay.vn/v2/create")
    zalopay_callback_url: str = Field("http://localhost:8000/api/payment/callback")

    # ======================================================
    # Helper alias (nếu sau này muốn dùng snake_case)
    # ======================================================
    @property
    def database_url(self) -> str:
        return self.DATABASE_URL


settings = Settings()  # type: ignore[call-arg]  # loaded from env
