# apps/backend/app/main.py
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Iterable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# (tuỳ chọn) nạp .env nếu chạy local/CI
try:
    from dotenv import load_dotenv  # type: ignore

    # Tìm .env ở: apps/backend/.env
    here = os.path.dirname(__file__)
    env_path = os.path.abspath(os.path.join(here, "..", ".env"))
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    # Không bắt buộc có python-dotenv trong prod
    pass


def _split_csv_env(value: str | None, default: str) -> list[str]:
    raw = (value or default).strip()
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


# Lifespan (chuẩn FastAPI) — chỗ để init/close resources khi cần
@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ví dụ: mở pool, warmup model, etc.
    # from app.core.db import engine  # nếu cần đảm bảo import
    yield
    # Đóng tài nguyên ở đây nếu cần


def create_app() -> FastAPI:
    app = FastAPI(
        title="NCKH API",
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
    )

    # CORS
    origins: Iterable[str] = _split_csv_env(
        os.getenv("ALLOWED_ORIGINS"),
        default="http://localhost:3000",
    )
    allow_headers = _split_csv_env(
        os.getenv("ALLOWED_HEADERS"),
        default="*, Authorization, Content-Type",
    )
    allow_methods = _split_csv_env(
        os.getenv("ALLOWED_METHODS"),
        default="*",  # hoặc "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    )
    allow_credentials = _bool_env("ALLOW_CREDENTIALS", True)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(origins),
        allow_credentials=allow_credentials,
        allow_methods=list(allow_methods),
        allow_headers=list(allow_headers),
        expose_headers=["*"],
        max_age=600,
    )

    # Health
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    # Root → docs (đỡ 404 ở '/')
    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url=app.docs_url or "/docs")

    # Routers
    from app.bff import router as bff_router  # import sau khi app có sẵn

    app.include_router(bff_router.router)

    return app


# Uvicorn entrypoint: uvicorn app.main:app --reload --port 8000
app = create_app()
