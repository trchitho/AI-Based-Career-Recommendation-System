from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

logger = logging.getLogger(__name__)

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

# Initialize multi-stream Gemini manager
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
        print("⚠️  DB connection check failed:", repr(e))

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
                    SET is_email_verified = FALSE,
                        email_verified_at = COALESCE(email_verified_at, NOW())
                    WHERE is_email_verified IS NULL OR is_email_verified = FALSE;
                    """
                )
            )
            conn.commit()
    except Exception as e:
        print("Skip email verification auto-migration:", repr(e))

    # Auto-migration: tạo bảng interview.job_descriptions nếu chưa có
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS interview.job_descriptions (
                    id          SERIAL PRIMARY KEY,
                    user_id     INTEGER NOT NULL,
                    career_id   VARCHAR,
                    raw_text    TEXT NOT NULL,
                    extracted_data JSONB,
                    source      VARCHAR DEFAULT 'manual',
                    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jd_user_id ON interview.job_descriptions(user_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jd_career_id ON interview.job_descriptions(career_id)"))
            conn.commit()
            print("✅ interview.job_descriptions table ready")
    except Exception as e:
        print("Skip job_descriptions migration:", repr(e))

    # Auto-migration: thêm cột question_count và question_distribution vào interview_sessions
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE interview.interview_sessions ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 5"))
            conn.commit()
            print("✅ interview_sessions.question_count ready")
    except Exception as e:
        print("Skip question_count migration:", repr(e))

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE interview.interview_sessions ADD COLUMN IF NOT EXISTS question_distribution JSONB"))
            conn.commit()
            print("✅ interview_sessions.question_distribution ready")
    except Exception as e:
        print("Skip question_distribution migration:", repr(e))

    yield


def create_app() -> FastAPI:
    # Initialize error tracking first
    try:
        print("✅ Error tracking initialized")
    except Exception as e:
        print(f"⚠️ Error tracking initialization failed: {e}")

    app = FastAPI(
        title="NCKH API",
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
    )

    # CORS - Fix for payment issues
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Temporary fix for development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )

    # Performance monitoring middleware
    try:
        from .core.monitoring import PerformanceMonitoringMiddleware, set_performance_monitor

        class RegisteredPerformanceMonitoringMiddleware(PerformanceMonitoringMiddleware):
            def __init__(self, app, *args, **kwargs):
                super().__init__(app, *args, **kwargs)
                set_performance_monitor(self)

        app.add_middleware(RegisteredPerformanceMonitoringMiddleware)
        print("✅ Performance monitoring enabled")
    except Exception as e:
        print(f"⚠️ Performance monitoring disabled: {e}")

    # Rate limiting middleware
    try:
        from .core.rate_limiter import RateLimitMiddleware

        app.add_middleware(RateLimitMiddleware, default_limit=100, default_window=60)
        print("✅ Rate limiting enabled")
    except Exception as e:
        print(f"⚠️ Rate limiting disabled: {e}")

    # Ensure UTF-8 charset in responses (fix Vietnamese encoding)
    @app.middleware("http")
    async def ensure_utf8_response(request: Request, call_next):
        response = await call_next(request)
        
        # Ensure UTF-8 charset for JSON responses
        content_type = response.headers.get("content-type", "")
        if content_type.startswith("application/json") and "charset" not in content_type:
            response.headers["content-type"] = "application/json; charset=utf-8"
        
        return response

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

    # JWT Auth middleware — sets request.state.user (TC02 session management)
    from .core.auth_middleware import jwt_auth_middleware
    app.middleware("http")(jwt_auth_middleware)

    # Health & root
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @app.get("/health/detailed", tags=["system"])
    async def detailed_health():
        """Comprehensive health check with performance metrics"""
        try:
            from .core.monitoring import get_health_checker

            health_checker = get_health_checker()
            return await health_checker.get_system_health()
        except Exception:
            logger.exception("Detailed health check failed")
            return {"status": "error", "message": "Failed to retrieve detailed health status"}

    @app.get("/metrics", tags=["system"])
    def get_metrics():
        """Get comprehensive performance metrics"""
        try:
            from .core.cache import cache_manager
            from .core.database_monitor import db_monitor
            from .core.error_tracking import error_tracker
            from .core.monitoring import get_performance_monitor

            monitor = get_performance_monitor()

            metrics = {"performance": monitor.get_metrics_summary() if monitor else {}, "timestamp": time.time()}

            # Add database metrics if available
            if db_monitor:
                metrics["database"] = db_monitor.get_metrics()

            # Add cache metrics if available
            if cache_manager:
                metrics["cache"] = cache_manager.get_stats()

            # Add error tracking metrics
            metrics["errors"] = error_tracker.get_error_stats()

            return metrics
        except Exception:
            logger.exception("Metrics retrieval failed")
            return {"status": "error", "message": "Failed to retrieve metrics"}

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

    # BFF Career API (career details from 5 tables)
    try:
        from .api import bff_career

        app.include_router(bff_career.router)
        print("✅ BFF Career API")
    except Exception as e:
        print("❌ BFF Career API:", str(e)[:50])

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
    from .modules.content import routes_skills as skills_router

    app.include_router(careers_router.router, prefix="/api/careers", tags=["careers"])
    app.include_router(blog_router.router, prefix="/api/blog", tags=["blog"])
    app.include_router(comments_router.router, prefix="/api/comments", tags=["comments"])
    app.include_router(essays_router.router, prefix="/api/essays", tags=["essays"])
    app.include_router(skills_router.router, prefix="/api/content", tags=["admin-skills"])

    # Assessments (nếu có thêm)
    try:
        from .modules.assessments import routes_assessments as assess_router
        app.include_router(assess_router.router, prefix="/api/assessments", tags=["assessments"])
        print("✅ Assessments router registered")
    except Exception as e:
        print("ℹ️  Skip assessments router:", repr(e))
    
    # Gamification (optional - can be enabled after assessments work)
    try:
        from .modules.assessments import routes_gamification as gamification_router
        app.include_router(gamification_router.router, prefix="/api/assessments", tags=["gamification"])
        print("✅ Gamification router registered")
    except Exception as e:
        print("ℹ️  Skip gamification router:", repr(e))

    # Admin (dashboard, careers, questions, skills)
    try:
        from .modules.admin import routes_admin as admin_router

        app.include_router(admin_router.router, prefix="/api/admin", tags=["admin"])
        print("Admin router registered OK")
    except Exception as e:
        import traceback
        print("!! Skip admin router:", repr(e))
        traceback.print_exc()

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

    # WS comments (real-time comment updates)
    try:
        from .modules.realtime import ws_comments as ws_comments

        app.include_router(ws_comments.router)
    except Exception as e:
        print("??  Skip ws comments:", repr(e))

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

        # routes_recommendations đã có prefix /api/recommendations
        app.include_router(rec_router.router, prefix="/api/recommendations", tags=["recommendations"])
    except Exception as e:
        print("??  Skip recommendations router:", repr(e))

    # Notifications
    try:
        from .modules.notifications import routes_notifications as notif_router

        app.include_router(notif_router.router, prefix="/api/notifications", tags=["notifications"])
    except Exception as e:
        print("??  Skip notifications router:", repr(e))

    # User profile (traits, goals, skills, journey)
    try:
        from .modules.user_profile import router as user_profile_router

        app.include_router(user_profile_router.router, prefix="/api/users", tags=["users"])
    except Exception as e:
        print("??  Skip user profile router:", repr(e))

    # Payment (ZaloPay)
    try:
        from .modules.payment import routes_payment as payment_router

        app.include_router(payment_router.router, prefix="/api/payment", tags=["payment"])
    except Exception as e:
        print("??  Skip payment router:", repr(e))

    # Payment Admin
    try:
        from .modules.payment import routes_admin as payment_admin_router

        app.include_router(payment_admin_router.router, prefix="/api/payment", tags=["payment-admin"])
    except Exception as e:
        print("??  Skip payment admin router:", repr(e))

    # Subscription
    try:
        from .modules.subscription import routes as subscription_router

        app.include_router(subscription_router.router, prefix="/api/subscription", tags=["subscription"])
    except Exception as e:
        print("??  Skip subscription router:", repr(e))

    # Career Goals (Pro feature)
    try:
        from .modules.goals import routes_goals as goals_router

        app.include_router(goals_router.router, prefix="/api/goals", tags=["goals"])
    except Exception as e:
        print("??  Skip goals router:", repr(e))

    # Analytics tracking
    try:
        from .modules.analytics import routes_tracking as tracking_router

        app.include_router(tracking_router.router, prefix="/api/analytics", tags=["analytics"])
    except Exception as e:
        print("??  Skip analytics tracking router:", repr(e))

    # Chatbot (Gemini AI)
    try:
        from .modules.chatbot import routes as chatbot_router

        app.include_router(chatbot_router.router, tags=["chatbot"])
    except Exception as e:
        print("??  Skip chatbot router:", repr(e))

    # Skill Gap Analysis
    try:
        from .modules.skill_gap import routes as skill_gap_router

        app.include_router(skill_gap_router.router, prefix="/api/skill-gap", tags=["skill-gap"])
        print("✅ Skill Gap Analysis router registered")
    except Exception as e:
        print("??  Skip skill gap router:", repr(e))
    
    # Career Groups & Levels (NEW)
    try:
        from .modules.careers.routes import router as career_groups_router

        app.include_router(career_groups_router, prefix="/api/career-system", tags=["career-groups"])
        print("✅ Career Groups & Levels router registered")
    except Exception as e:
        print("??  Skip career groups router:", repr(e))

    # Career Trait Evidence (EXISTING)
    try:
        from .modules.careers import routes_trait_evidence as career_router

        app.include_router(career_router.router, prefix="/api/careers", tags=["careers"])
    except Exception as e:
        print("??  Skip career router:", repr(e))

    # Reports (Personality & Career Report)
    try:
        from .modules.reports import routes as reports_router

        app.include_router(reports_router.router)
    except Exception as e:
        print("??  Skip reports router:", repr(e))

    # AI Mock Interview
    try:
        from .modules.interview import routes as interview_router

        app.include_router(interview_router.router, prefix="/api/interview", tags=["interview"])
        print("✅ AI Mock Interview API")
    except Exception as e:
        print("❌ AI Mock Interview API:", str(e)[:50])

    # Voice Interview API Routes
    try:
        from .api import voice_interview as voice_interview_router

        app.include_router(voice_interview_router.router, tags=["voice-interview"])
        print("✅ Voice Interview API")
    except Exception as e:
        print("❌ Voice Interview API:", str(e)[:50])

    # Voice Interview Streaming API Routes
    try:
        from .api import voice_interview_streaming as voice_streaming_router

        app.include_router(voice_streaming_router.router, tags=["voice-interview-streaming"])
        print("✅ Voice Interview Streaming API")
    except Exception as e:
        print("❌ Voice Interview Streaming API:", str(e)[:50])

    # Voice Preferences API Routes
    try:
        from .api import voice_preferences as voice_preferences_router

        app.include_router(voice_preferences_router.router, tags=["voice-preferences"])
        print("✅ Voice Preferences API")
    except Exception as e:
        print("❌ Voice Preferences API:", str(e)[:50])

    # NLP — PB32 essay analysis, PB33 career embeddings, PB34 pgvector search
    try:
        from .modules.nlp import routes_nlp as nlp_router

        app.include_router(nlp_router.router, prefix="/api/nlp", tags=["nlp"])
        print("✅ NLP router registered at /api/nlp")
    except Exception as e:
        print("??  Skip NLP router:", repr(e))

    # CV Documents admin endpoint (direct registration - guaranteed)
    from fastapi import Depends as _Depends
    from fastapi import Query as _Query
    from sqlalchemy.orm import Session as _Session

    from .core.db import get_db as _get_db

    @app.get("/api/admin/cv-documents", tags=["admin"])
    async def admin_cv_documents(
        page: int = _Query(1, ge=1),
        page_size: int = _Query(20, ge=1, le=100),
        search: str = _Query(""),
        db: _Session = _Depends(_get_db),
    ):
        from sqlalchemy import desc, or_

        from .modules.skill_gap.models import SkillGapAnalysis

        try:
            query = db.query(
                SkillGapAnalysis.id,
                SkillGapAnalysis.user_id,
                SkillGapAnalysis.career_id,
                SkillGapAnalysis.cv_filename,
                SkillGapAnalysis.cv_file_url,
                SkillGapAnalysis.cv_name,
                SkillGapAnalysis.cv_email,
                SkillGapAnalysis.cv_phone,
                SkillGapAnalysis.match_percentage,
                SkillGapAnalysis.matched_skills_count,
                SkillGapAnalysis.missing_skills_count,
                SkillGapAnalysis.total_required_skills,
                SkillGapAnalysis.created_at,
            )
            if search:
                query = query.filter(
                    or_(
                        SkillGapAnalysis.cv_name.ilike(f"%{search}%"),
                        SkillGapAnalysis.cv_email.ilike(f"%{search}%"),
                        SkillGapAnalysis.cv_filename.ilike(f"%{search}%"),
                    )
                )
            total = query.count()
            records = (
                query.order_by(desc(SkillGapAnalysis.created_at))
                .offset((page - 1) * page_size)
                .limit(page_size)
                .all()
            )
            items = [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "career_id": r.career_id,
                    "cv_filename": r.cv_filename,
                    "cv_file_url": r.cv_file_url,
                    "cv_name": r.cv_name,
                    "cv_email": r.cv_email,
                    "cv_phone": r.cv_phone,
                    "match_percentage": round(r.match_percentage or 0, 1),
                    "matched_skills_count": r.matched_skills_count or 0,
                    "missing_skills_count": r.missing_skills_count or 0,
                    "total_required_skills": r.total_required_skills or 0,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in records
            ]
            return {
                "success": True,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total else 1,
                "items": items,
            }
        except Exception as e:
            return {"success": False, "error": str(e), "items": [], "total": 0}

    @app.get("/api/admin/r2-status", tags=["admin"])
    def admin_r2_status():
        """Check R2 storage configuration and test upload"""
        import os

        from .core.r2_storage import r2_storage
        result = {
            "is_configured": r2_storage.is_configured,
            "account_id": os.getenv("CF_R2_ACCOUNT_ID", "")[:8] + "..." if os.getenv("CF_R2_ACCOUNT_ID") else "NOT SET",
            "bucket": os.getenv("CF_R2_BUCKET_NAME", "NOT SET"),
            "public_url": os.getenv("CF_R2_PUBLIC_URL", "NOT SET"),
            "test_upload": None,
            "error": None,
        }
        if r2_storage.is_configured:
            try:
                url = r2_storage.upload_cv(b"R2 test ping", "r2_test.txt", 0)
                result["test_upload"] = url
            except Exception as e:
                result["error"] = str(e)
        return result

    return app


app = create_app()
