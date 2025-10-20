from __future__ import annotations
import os
from contextlib import asynccontextmanager
from typing import Iterable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# dotenv (optional)
try:
    from dotenv import load_dotenv  # type: ignore
    here = os.path.dirname(__file__)
    env_path = os.path.abspath(os.path.join(here, "..", ".env"))
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    pass

# DB Session (SQLAlchemy sync)
from sqlalchemy.orm import sessionmaker, scoped_session
from app.core.db import engine, test_connection
SessionLocal = scoped_session(sessionmaker(bind=engine, autocommit=False, autoflush=False))


def _split_csv_env(value: str | None, default: str) -> list[str]:
    raw = (value or default).strip()
    return [item.strip() for item in raw.split(",") if item.strip()]

def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}

@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        test_connection()
    except Exception as e:
        print("⚠️  DB connection check failed:", repr(e))
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title="NCKH API",
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
    )

    # CORS
    origins: Iterable[str] = _split_csv_env(os.getenv("ALLOWED_ORIGINS"), "http://localhost:3000")
    allow_headers = _split_csv_env(os.getenv("ALLOWED_HEADERS"), "*, Authorization, Content-Type")
    allow_methods = _split_csv_env(os.getenv("ALLOWED_METHODS"), "*")
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

    # DB session per-request
    @app.middleware("http")
    async def db_session_middleware(request: Request, call_next):
        request.state.db = SessionLocal()
        try:
            response = await call_next(request)
            request.state.db.commit()
            return response
        except Exception:
            request.state.db.rollback()
            raise
        finally:
            request.state.db.close()

    # Health & root
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url=app.docs_url or "/docs")

    # Routers (để bên trong cho an toàn import)
    # BFF (nếu có)
    try:
        from .bff import router as bff_router
        app.include_router(bff_router.router)
    except Exception as e:
        print("ℹ️  Skip BFF router:", repr(e))

    # Auth / Users
    from .modules.users.router_auth import router as auth_router
    from .modules.users.routers_users import router as users_router
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])

    # Content
    from .modules.content import routes_careers as careers_router
    from .modules.content import routes_blog as blog_router
    from .modules.content import routes_comments as comments_router
    from .modules.content import routes_essays as essays_router
    app.include_router(careers_router.router, prefix="/api/careers", tags=["careers"])
    app.include_router(blog_router.router, prefix="/api/blog", tags=["blog"])
    app.include_router(comments_router.router, prefix="/api/comments", tags=["comments"])
    app.include_router(essays_router.router, prefix="/api/essays", tags=["essays"])

    # Assessments (nếu đã thêm)
    try:
        from .modules.assessments import routes_assessments as assess_router
        app.include_router(assess_router.router, prefix="/api/assessments", tags=["assessments"])
    except Exception as e:
        print("ℹ️  Skip assessments router:", repr(e))

    # Admin (dashboard, careers, questions, skills)
    try:
        from .modules.admin import routes_admin as admin_router
        app.include_router(admin_router.router, prefix="/api/admin", tags=["admin"])
    except Exception as e:
        print("??  Skip admin router:", repr(e))

    # Notifications
    try:
        from .modules.notifications import routes_notifications as notif_router
        app.include_router(notif_router.router, prefix="/api/notifications", tags=["notifications"])
    except Exception as e:
        print("??  Skip notifications router:", repr(e))

    return app

app = create_app()
