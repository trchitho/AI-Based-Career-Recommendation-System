from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Iterable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

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
from app.core.db import engine, test_connection
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


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
        print("�s��,?  DB connection check failed:", repr(e))

    # Best-effort lightweight migration for email verification columns
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    ALTER TABLE core.users
                    ADD COLUMN IF NOT EXISTS is_email_verified boolean DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE core.users
                    SET is_email_verified = TRUE,
                        email_verified_at = COALESCE(email_verified_at, NOW())
                    WHERE is_email_verified IS NULL;
                    """
                )
            )
            conn.commit()
    except Exception as e:
        print("Skip email verification auto-migration:", repr(e))

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

    # Routers (bên trong cho an toàn import)
    # BFF (nếu có)
    try:
        from .bff import router as bff_router

        app.include_router(bff_router.router)
    except Exception as e:
        print("�,1�,?  Skip BFF router:", repr(e))

    # Auth / Users
    from .modules.users.router_auth import router as auth_router
    from .modules.users.routers_users import router as users_router

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])

    # Content
    from .modules.content import routes_blog as blog_router
    from .modules.content import routes_careers as careers_router
    from .modules.content import routes_comments as comments_router
    from .modules.content import routes_essays as essays_router

    app.include_router(careers_router.router, prefix="/api/careers", tags=["careers"])
    app.include_router(blog_router.router, prefix="/api/blog", tags=["blog"])
    app.include_router(comments_router.router, prefix="/api/comments", tags=["comments"])
    app.include_router(essays_router.router, prefix="/api/essays", tags=["essays"])

    # Assessments (n���u �`A� thA�m)
    try:
        from .modules.assessments import routes_assessments as assess_router

        app.include_router(assess_router.router, prefix="/api/assessments", tags=["assessments"])
    except Exception as e:
        print("�,1�,?  Skip assessments router:", repr(e))

    # Admin (dashboard, careers, questions, skills)
    try:
        from .modules.admin import routes_admin as admin_router

        app.include_router(admin_router.router, prefix="/api/admin", tags=["admin"])
    except Exception as e:
        print("??  Skip admin router:", repr(e))

    # Public system settings (no auth)
    try:
        from .modules.system import routes_public as system_public

        app.include_router(system_public.router, prefix="/api/app", tags=["app"])
    except Exception as e:
        print("??  Skip system public router:", repr(e))

    # Auth tokens (verify/reset)
    try:
        from .modules.auth import routes_google as auth_google
        from .modules.auth import routes_tokens as auth_tokens

        app.include_router(auth_tokens.router, prefix="/api/auth", tags=["auth"])
        app.include_router(auth_google.router, prefix="/api/auth", tags=["auth"])
    except Exception as e:
        print("??  Skip auth tokens router:", repr(e))

    # Profile extras (goals/skills/journey)
    try:
        from .modules.users import routes_profile as profile_router

        app.include_router(profile_router.router, prefix="/api/profile", tags=["profile"])
    except Exception as e:
        print("??  Skip profile router:", repr(e))

    # WS notifications
    try:
        from .modules.realtime import ws_notifications as ws_notifs

        app.include_router(ws_notifs.router)
    except Exception as e:
        print("??  Skip ws notifications:", repr(e))

    # Search API (Elastic or fallback)
    try:
        from .modules.search import routes_search as search_router

        app.include_router(search_router.router, prefix="/api/search", tags=["search"])
    except Exception as e:
        print("??  Skip search router:", repr(e))

    # Graph API (Neo4j) - sync
    try:
        from .modules.graph import routes_graph as graph_router

        app.include_router(graph_router.router, prefix="/api/graph", tags=["graph"])
    except Exception as e:
        print("??  Skip graph router:", repr(e))

    # Recommendation API (AI layer integration)
    try:
        from .modules.recommendation import routes_recommendations as rec_router

        app.include_router(rec_router.router, prefix="/api/recommendations", tags=["recommendations"])
    except Exception as e:
        print("??  Skip recommendations router:", repr(e))

    # Notifications
    try:
        from .modules.notifications import routes_notifications as notif_router

        app.include_router(notif_router.router, prefix="/api/notifications", tags=["notifications"])
    except Exception as e:
        print("??  Skip notifications router:", repr(e))

    return app


app = create_app()
