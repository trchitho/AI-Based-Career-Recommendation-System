# app/main.py
from __future__ import annotations

import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse


# ========= .ENV LOADER (robust) =========
def _load_env() -> None:
    """
    Load .env from apps/backend/.env (ưu tiên) hoặc repo root/.env.
    Hỗ trợ BOM (utf-8-sig). Nếu chỉ có JWT_SECRET thì set luôn SECRET_KEY.
    """
    try:
        from dotenv import load_dotenv  # pip install python-dotenv
    except Exception:
        print("[ENV] python-dotenv chưa cài -> bỏ qua load .env")
        return

    here = Path(__file__).resolve().parent  # .../apps/backend/app
    backend_env = (here / ".." / ".env").resolve()  # .../apps/backend/.env
    root_env = (here / ".." / ".." / ".env").resolve()  # .../.env (repo root)

    loaded = False
    for p in (backend_env, root_env):
        if p.exists():
            # encoding utf-8-sig để xử lý file có BOM
            ok = load_dotenv(dotenv_path=str(p), override=False, encoding="utf-8-sig")
            print(f"[ENV] Loaded {p}: {ok}")
            loaded = ok or loaded

    # Map JWT_SECRET -> SECRET_KEY nếu thiếu
    jwt = os.getenv("JWT_SECRET")
    sec = os.getenv("SECRET_KEY")
    if jwt and not sec:
        os.environ["SECRET_KEY"] = jwt
        print("[ENV] SECRET_KEY không có, đã ánh xạ từ JWT_SECRET")

    has_secret = bool(os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET"))
    print(f"[ENV] JWT/SECRET present? {has_secret}")


def _split_csv_env(value: str | None, default: str) -> List[str]:
    raw = (value or default).strip()
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


# gọi load env ngay khi import
_load_env()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Kiểm tra bắt buộc có SECRET trước khi phục vụ request
    secret = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET")
    if not secret:
        # Fail fast, để FE không nhận 500 ở bước tạo token
        raise RuntimeError("JWT_SECRET/SECRET_KEY is not configured in environment")
    yield
    # place for cleanup if needed


def create_app() -> FastAPI:
    app = FastAPI(
        title="NCKH API",
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
    )

    # ===== CORS =====
    allow_all = _bool_env("ALLOW_ALL_ORIGINS", True)
    if allow_all:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,  # '*' không đi với credentials
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
            max_age=600,
        )
    else:
        origins = _split_csv_env(os.getenv("ALLOWED_ORIGINS"), "http://localhost:3000")
        allow_headers = _split_csv_env(
            os.getenv("ALLOWED_HEADERS"), "Authorization, Content-Type"
        )
        allow_methods = _split_csv_env(
            os.getenv("ALLOWED_METHODS"), "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        )
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(origins),
            allow_credentials=_bool_env("ALLOW_CREDENTIALS", True),
            allow_methods=list(allow_methods),
            allow_headers=list(allow_headers),
            expose_headers=["*"],
            max_age=600,
        )
    # =================

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url=app.docs_url or "/docs")

    # Import routers SAU khi app đã tạo để tránh vòng lặp import
    from app.api.bff_career import router as bff_career_router
    from app.modules.auth.router import router as auth_router

    app.include_router(bff_career_router)
    app.include_router(auth_router)

    return app


# uvicorn entry: uvicorn app.main:app --reload --port 8000
app = create_app()
