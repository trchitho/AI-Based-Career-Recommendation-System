from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Iterable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# --- dotenv (optional, for local/CI)
try:
    from dotenv import load_dotenv  # type: ignore

    here = os.path.dirname(__file__)
    env_path = os.path.abspath(os.path.join(here, "..", ".env"))
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    pass

# --- DB Session (SQLAlchemy sync)
from sqlalchemy.orm import sessionmaker
from app.core.db import engine, test_connection

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# -------------------------
# Helpers for env handling
# -------------------------
def _split_csv_env(value: str | None, default: str) -> list[str]:
    raw = (value or default).strip()
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


# -------------------------
# Lifespan: warm-up checks
# -------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    # DB connectivity check (non-fatal)
    try:
        test_connection()
    except Exception as e:
        print("⚠️  DB connection check failed:", repr(e))
    yield


# -------------------------
# App factory
# -------------------------
def create_app() -> FastAPI:
    app = FastAPI(
        title=os.getenv("API_TITLE", "NCKH API"),
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
    )

    # ===== CORS (no duplicate keys) =====
    # If you want to allow all: set ALLOW_ALL_ORIGINS=1
    allow_all = _bool_env("ALLOW_ALL_ORIGINS", True)
    if allow_all:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=_bool_env("ALLOW_CREDENTIALS", True),
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
            max_age=600,
        )
    else:
        origins: Iterable[str] = _split_csv_env(
            os.getenv("ALLOWED_ORIGINS"), default="http://localhost:3000"
        )
        allow_headers = _split_csv_env(
            os.getenv("ALLOWED_HEADERS"), default="Authorization, Content-Type"
        )
        allow_methods = _split_csv_env(
            os.getenv("ALLOWED_METHODS"), default="GET,POST,PUT,PATCH,DELETE,OPTIONS"
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
    # ====================================

    # DB session per-request middleware (commit/rollback/close)
    @app.middleware("http")
    async def db_session_middleware(request: Request, call_next):
        db = SessionLocal()
        request.state.db = db
        try:
            response = await call_next(request)
            db.commit()
            return response
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    # Health & root
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url=app.docs_url or "/docs")

    # -------------------------
    # Routers (safe import)
    # -------------------------
    # BFF
    try:
        from app.bff.router import router as bff_router

        app.include_router(bff_router, prefix="/bff", tags=["bff"])
    except Exception as e:
        print("ℹ️  Skip BFF router:", repr(e))

    # Auth / Users
    try:
        from app.modules.users.router_auth import router as auth_router
        from app.modules.users.routers_users import router as users_router

        app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
        app.include_router(users_router, prefix="/api/users", tags=["users"])
    except Exception as e:
        print("ℹ️  Skip users/auth routers:", repr(e))

    # Content
    try:
        from app.modules.content import routes_careers as careers_router
        from app.modules.content import routes_blog as blog_router
        from app.modules.content import routes_comments as comments_router
        from app.modules.content import routes_essays as essays_router

        app.include_router(
            careers_router.router, prefix="/api/careers", tags=["careers"]
        )
        app.include_router(blog_router.router, prefix="/api/blog", tags=["blog"])
        app.include_router(
            comments_router.router, prefix="/api/comments", tags=["comments"]
        )
        app.include_router(essays_router.router, prefix="/api/essays", tags=["essays"])
    except Exception as e:
        print("ℹ️  Skip content routers:", repr(e))

    # Assessments
    try:
        from app.modules.assessments import routes_assessments as assess_router

        app.include_router(
            assess_router.router, prefix="/api/assessments", tags=["assessments"]
        )
    except Exception as e:
        print("ℹ️  Skip assessments router:", repr(e))

    # Admin
    try:
        from app.modules.admin import routes_admin as admin_router

        app.include_router(admin_router.router, prefix="/api/admin", tags=["admin"])
    except Exception as e:
        print("ℹ️  Skip admin router:", repr(e))

    # System public
    try:
        from app.modules.system import routes_public as system_public

        app.include_router(system_public.router, prefix="/api/app", tags=["app"])
    except Exception as e:
        print("ℹ️  Skip system public router:", repr(e))

    # Auth tokens & Google OAuth
    try:
        from app.modules.auth import routes_tokens as auth_tokens
        from app.modules.auth import routes_google as auth_google

        app.include_router(auth_tokens.router, prefix="/api/auth", tags=["auth"])
        app.include_router(auth_google.router, prefix="/api/auth", tags=["auth"])
    except Exception as e:
        print("ℹ️  Skip auth tokens/google:", repr(e))

    # Profile extras
    try:
        from app.modules.users import routes_profile as profile_router

        app.include_router(
            profile_router.router, prefix="/api/profile", tags=["profile"]
        )
    except Exception as e:
        print("ℹ️  Skip profile router:", repr(e))

    # WebSocket notifications
    try:
        from app.modules.realtime import ws_notifications as ws_notifs

        app.include_router(ws_notifs.router)
    except Exception as e:
        print("ℹ️  Skip ws notifications:", repr(e))

    # Search (Elastic / fallback)
    try:
        from app.modules.search import routes_search as search_router

        app.include_router(search_router.router, prefix="/api/search", tags=["search"])
    except Exception as e:
        print("ℹ️  Skip search router:", repr(e))

    # Graph (Neo4j)
    try:
        from app.modules.graph import routes_graph as graph_router

        app.include_router(graph_router.router, prefix="/api/graph", tags=["graph"])
    except Exception as e:
        print("ℹ️  Skip graph router:", repr(e))

    # Recommendation (AI layer)
    try:
        from app.modules.recommendation import routes_recommendations as rec_router

        app.include_router(
            rec_router.router, prefix="/api/recommendations", tags=["recommendations"]
        )
    except Exception as e:
        print("ℹ️  Skip recommendations router:", repr(e))

    # Notifications (REST)
    try:
        from app.modules.notifications import routes_notifications as notif_router

        app.include_router(
            notif_router.router, prefix="/api/notifications", tags=["notifications"]
        )
    except Exception as e:
        print("ℹ️  Skip notifications router:", repr(e))

    return app


# Uvicorn entrypoint:
# uvicorn app.main:app --reload --port 8000
app = create_app()
