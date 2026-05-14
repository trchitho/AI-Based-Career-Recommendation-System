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
        print("[WARN]  DB connection check failed:", repr(e))

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

    # Auto-migrate course recommendation tables
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS core.course_catalog (
                    id           SERIAL PRIMARY KEY,
                    external_id  VARCHAR(255) UNIQUE NOT NULL,
                    title        VARCHAR(500) NOT NULL,
                    description  TEXT,
                    url          VARCHAR(1000),
                    platform     VARCHAR(50),
                    instructor   VARCHAR(255),
                    rating       FLOAT DEFAULT 0.0,
                    num_reviews  INTEGER DEFAULT 0,
                    price        FLOAT DEFAULT 0.0,
                    is_free      BOOLEAN DEFAULT FALSE,
                    level        VARCHAR(50),
                    duration_hrs FLOAT,
                    thumbnail    VARCHAR(1000),
                    language     VARCHAR(20) DEFAULT 'en',
                    tags         TEXT[] DEFAULT '{}',
                    embedding    FLOAT[],
                    is_embedded  BOOLEAN DEFAULT FALSE,
                    created_at   TIMESTAMPTZ DEFAULT NOW(),
                    updated_at   TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS core.course_skill_map (
                    id               SERIAL PRIMARY KEY,
                    course_id        INTEGER NOT NULL REFERENCES core.course_catalog(id) ON DELETE CASCADE,
                    skill_name       VARCHAR(255) NOT NULL,
                    similarity_score FLOAT NOT NULL,
                    created_at       TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(course_id, skill_name)
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_csm_skill_score
                ON core.course_skill_map(skill_name, similarity_score DESC)
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS core.skill_gap_course_recommendations (
                    id              SERIAL PRIMARY KEY,
                    analysis_id     INTEGER,
                    cache_key       VARCHAR(64) UNIQUE NOT NULL,
                    career_name     VARCHAR(255),
                    model_name      VARCHAR(120),
                    source          VARCHAR(50) NOT NULL,
                    status          VARCHAR(30) NOT NULL DEFAULT 'ready',
                    skill_groups    JSONB NOT NULL DEFAULT '{}'::jsonb,
                    owned_skills    JSONB NOT NULL DEFAULT '[]'::jsonb,
                    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
                    error_message   TEXT,
                    created_at      TIMESTAMPTZ DEFAULT NOW(),
                    updated_at      TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS ix_sg_course_cache_key
                ON core.skill_gap_course_recommendations(cache_key)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_sg_course_cache_analysis
                ON core.skill_gap_course_recommendations(analysis_id)
            """))
            conn.commit()
        print("✅ Course tables ready")
    except Exception as e:
        print("Skip course auto-migration:", repr(e))

    # Auto-seed + embed courses in background on startup (gated by env flag)
    # Set RUN_COURSE_PIPELINE_ON_STARTUP=true to enable (disabled by default in production)
    if _bool_env("RUN_COURSE_PIPELINE_ON_STARTUP", default=False):
        import threading

        def _course_startup_pipeline():
            """
            Runs once in background thread after server starts:
            1. Seed static courses (idempotent — skips already-inserted rows)
            2. Embed any un-embedded courses with SBERT
            3. Build skill ↔ course similarity map
            4. Sync to Neo4j (if available)
            """
            try:
                from sqlalchemy.orm import sessionmaker as _sm
                _Session = _sm(bind=engine, autocommit=False, autoflush=False)
                db = _Session()
                try:
                    from app.modules.courses import service as _cs
                    from app.modules.courses.models import CourseCatalog as _CC

                    # Step 1: Seed (fast, skips duplicates)
                    seed_result = _cs.seed_courses(db)
                    print(f"📚 Courses seed: {seed_result['inserted']} inserted, {seed_result['skipped']} skipped")

                    # Step 2: Embed only if there are un-embedded courses
                    need_embed = db.query(_CC).filter(_CC.is_embedded == False).count()
                    if need_embed > 0:
                        print(f"🔄 Embedding {need_embed} courses with SBERT…")
                        embed_result = _cs.run_embedding_pipeline(db)
                        print(f"✅ Embedded {embed_result['embedded']}/{embed_result['total']} courses")
                    else:
                        print("✅ All courses already embedded")

                    # Step 3: Build skill map if not yet populated
                    from app.modules.courses.models import CourseSkillMap as _CSM
                    map_count = db.query(_CSM).count()
                    if map_count == 0:
                        print("🗺️  Building skill-course similarity map…")
                        map_result = _cs.build_skill_course_map(db)
                        print(f"✅ Skill map: {map_result['mapped']} pairs")
                    else:
                        print(f"✅ Skill map already exists ({map_count} pairs)")

                    # Step 4: Web crawl (Coursera only on startup — reliable, no auth)
                    try:
                        from app.modules.courses.crawler import run_crawl
                        # Only crawl if we have few/no web-sourced courses already
                        existing_web = db.query(_CC).filter(
                            _CC.external_id.like("coursera-%")
                        ).count()
                        if existing_web < 30:
                            print("🌐 Crawling Coursera for fresh course data…")
                            crawl_kws = [
                                "Python", "Machine Learning", "Data Science",
                                "SQL", "React", "Docker", "AWS",
                            ]
                            crawl_result = run_crawl(db, keywords=crawl_kws, platforms=["coursera"], page_size=10)
                            print(f"🌐 Crawl: {crawl_result['inserted']} new, {crawl_result['updated']} updated")
                            # Re-embed and rebuild map if new data arrived
                            if crawl_result["inserted"] > 0:
                                _cs.run_embedding_pipeline(db)
                                _cs.build_skill_course_map(db)
                        else:
                            print(f"✅ Coursera already crawled ({existing_web} courses), skipping startup crawl")
                    except Exception as crawl_err:
                        print(f"⚠️  Startup crawl skipped: {crawl_err}")

                    # Step 5: Sync to Neo4j (best-effort)
                    try:
                        from app.modules.courses.neo4j_sync import sync_courses_to_neo4j
                        neo_result = sync_courses_to_neo4j(db)
                        print(f"✅ Neo4j synced: {neo_result['synced_courses']} courses, {neo_result['synced_mappings']} mappings")
                    except Exception as neo_err:
                        print(f"⚠️  Neo4j sync skipped: {neo_err}")

                finally:
                    db.close()
            except Exception as e:
                print(f"⚠️  Course startup pipeline error: {e}")

        # Delay 3 s to let the server finish booting before heavy work
        def _delayed_start():
            import time
            time.sleep(3)
            _course_startup_pipeline()

        threading.Thread(target=_delayed_start, daemon=True, name="course-pipeline").start()
        print("🚀 Course pipeline scheduled (runs in background after 3 s)")
    else:
        print("ℹ️  Course startup pipeline disabled (set RUN_COURSE_PIPELINE_ON_STARTUP=true to enable)")
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
    # ── Job crawling system: migrate tables + seed industries + start scheduler ──
    try:
        from app.modules.jobs.service import ensure_tables
        from app.core.db import SessionLocal as _SL
        _db = _SL()
        try:
            ensure_tables(_db)
            print("[OK] Job crawling tables ready")

            # Auto-trigger first crawl if DB is empty
            from app.modules.jobs.models import CrawledJob as _CJ
            job_count = _db.query(_CJ).count()
            if job_count == 0:
                print("[INFO] No jobs in DB — triggering initial crawl in background...")
                import threading as _t
                from app.modules.jobs.scheduler import _run_full_crawl_job
                _t.Thread(
                    target=_run_full_crawl_job,
                    daemon=True,
                    name="job-crawl-initial",
                ).start()
            else:
                print(f"[OK] Job DB has {job_count} existing jobs")
        finally:
            _db.close()
    except Exception as e:
        print(f"[WARN] Job crawling table setup failed: {e}")

    try:
        from app.modules.jobs.scheduler import start_job_scheduler
        start_job_scheduler()
        print("[OK] Job crawling scheduler started (full crawl every 6h)")
    except Exception as e:
        print(f"[WARN] Job crawling scheduler failed: {e}")

    # Start company update scheduler
    try:
        from app.modules.companies.scheduler import start_scheduler, stop_scheduler
        start_scheduler()
        print("[OK] Company update scheduler started")
    except Exception as e:
        print(f"[WARN]  Company scheduler failed to start: {e}")

    # Session reminder job — chay moi 5 phut, gui WS truoc 30 phut
    try:
        from app.modules.companies.scheduler import _scheduler
        import asyncio as _asyncio

        def _reminder_sync():
            loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
            try:
                from app.modules.chat.schedule_routes import _send_session_reminders
                loop.run_until_complete(_asyncio.wait_for(_send_session_reminders(), timeout=30))
            except _asyncio.TimeoutError:
                logger.warning("Session reminder job timed out after 30s")
            finally:
                loop.close()

        if _scheduler and _scheduler.running:
            from apscheduler.triggers.interval import IntervalTrigger as _IT
            _scheduler.add_job(
                _reminder_sync,
                trigger=_IT(minutes=5),
                id="session_reminder",
                name="Session reminders (30min before)",
                replace_existing=True,
            )
            print("[OK] Session reminder job registered (every 5min)")
    except Exception as e:
        print(f"[WARN]  Session reminder job failed: {e}")

    # Pre-load faster-whisper model in background so first STT call is fast
    def _preload_whisper():
        try:
            import importlib.util
            if importlib.util.find_spec("faster_whisper") is None:
                print("[INFO] faster-whisper not installed — STT will use fallback. Install with: pip install faster-whisper")
                return
            from app.modules.interview.faster_stt_service import _get_model
            model = _get_model()
            if model:
                print("[OK] faster-whisper model preloaded and ready")
            else:
                print("[WARN] faster-whisper model failed to load at startup")
        except Exception as e:
            print(f"[WARN] faster-whisper preload skipped: {e}")

    import threading as _threading
    _threading.Thread(target=_preload_whisper, daemon=True, name="whisper-preload").start()

    yield

    # Shutdown schedulers on app stop
    try:
        from app.modules.jobs.scheduler import stop_job_scheduler
        stop_job_scheduler()
    except Exception:
        pass

    try:
        from app.modules.companies.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass


def create_app() -> FastAPI:
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    try:
        print("OK Error tracking initialized")
    except Exception as e:
        print(f"WARN Error tracking initialization failed: {e}")

    from app.core.serialization import ORJSONResponse
    app = FastAPI(
        title="NCKH API",
        version=os.getenv("API_VERSION", "0.1.0"),
        docs_url=os.getenv("DOCS_URL", "/docs"),
        redoc_url=os.getenv("REDOC_URL", "/redoc"),
        lifespan=lifespan,
        default_response_class=ORJSONResponse,   # orjson for all JSON responses
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
        print("[OK] Performance monitoring enabled")
    except Exception as e:
        print(f"[WARN] Performance monitoring disabled: {e}")

    # Rate limiting middleware
    try:
        from .core.rate_limiter import RateLimitMiddleware

        app.add_middleware(RateLimitMiddleware, default_limit=100, default_window=60)
        print("[OK] Rate limiting enabled")
    except Exception as e:
        print(f"[WARN] Rate limiting disabled: {e}")

    # Ensure UTF-8 charset in responses (fix Vietnamese encoding)
    @app.middleware("http")
    async def ensure_utf8_response(request: Request, call_next):
        response = await call_next(request)
        
        # Ensure UTF-8 charset for JSON responses
        content_type = response.headers.get("content-type", "")
        if content_type.startswith("application/json") and "charset" not in content_type:
            response.headers["content-type"] = "application/json; charset=utf-8"
        
        return response

    # JWT Auth middleware — sets request.state.user (TC02 session management)
    # Added FIRST (inner) so db_session_middleware (outer) sets db BEFORE auth runs
    from .core.auth_middleware import jwt_auth_middleware
    app.middleware("http")(jwt_auth_middleware)

    # DB session per-request — added AFTER auth (outer) so it runs FIRST
    # This ensures request.state.db is available when jwt_auth_middleware executes
    @app.middleware("http")
    async def db_session_middleware(request: Request, call_next):
        db = SessionLocal()
        request.state.db = db
        try:
            response = await call_next(request)
            db.commit()
            return response
        except BaseException:
            try:
                db.rollback()
            except Exception:
                logger.exception("Failed to rollback request database session")
            raise
        finally:
            request.state.db = None
            try:
                db.close()
            except Exception:
                logger.debug("Request database session close skipped during shutdown", exc_info=True)

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
        print("[INFO]  Skip BFF router:", repr(e))

    # BFF Career API (career details from 5 tables)
    try:
        from .api import bff_career

        app.include_router(bff_career.router)
        print("[OK] BFF Career API")
    except Exception as e:
        print("[ERR] BFF Career API:", str(e)[:50])

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
        print("[OK] Assessments router registered")
    except Exception as e:
        print("[INFO]  Skip assessments router:", repr(e))
    
    # Gamification (optional - can be enabled after assessments work)
    try:
        from .modules.assessments import routes_gamification as gamification_router
        app.include_router(gamification_router.router, prefix="/api/assessments", tags=["gamification"])
        print("[OK] Gamification router registered")
    except Exception as e:
        print("[INFO]  Skip gamification router:", repr(e))

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

    # Job crawling & labor market intelligence
    try:
        from .modules.jobs.routes import router as jobs_router
        app.include_router(jobs_router)
        print("[OK] Job crawling & labor market intelligence API registered at /api/jobs")
    except Exception as e:
        print(f"??  Skip jobs router: {repr(e)}")

    # Trends & Market Analytics
    try:
        from .api import trends_router

        app.include_router(trends_router.router, tags=["trends"])
        print("[OK] Trends & Market Analytics router registered")
    except Exception as e:
        print("??  Skip trends router:", repr(e))

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
        print("[OK] Skill Gap Analysis router registered")
    except Exception as e:
        print("??  Skip skill gap router:", repr(e))

    # Learning Path (tổng quan lộ trình học tập)
    try:
        from .modules.learning_path.routes import router as learning_path_router
        app.include_router(learning_path_router, prefix="/api/learning-path", tags=["learning-path"])
        print("[OK] Learning Path router registered")
    except Exception as e:
        print("[WARN] Skip learning path router:", repr(e))

    # Skill Gap SSE (streaming AI responses)
    try:
        from .modules.skill_gap.sse_routes import router as sse_router
        app.include_router(sse_router)
        print("[OK] Skill Gap SSE router registered")
    except Exception as e:
        print("??  Skip skill gap SSE router:", repr(e))

    # Companies (job listings by career group)
    try:
        from .modules.companies.routes import router as companies_router
        app.include_router(companies_router)
        print("[OK] Companies router registered")
    except Exception as e:
        print("??  Skip companies router:", repr(e))

    # Mentor Matching
    try:
        from .modules.mentor_matching import routes as mentor_matching_router

        app.include_router(mentor_matching_router.router)
        print("[OK] Mentor Matching router registered")
    except Exception as e:
        print("??  Skip mentor matching router:", repr(e))

    # Chat (real-time messaging)
    try:
        from .modules.chat import routes as chat_router

        app.include_router(chat_router.router)
        print("[OK] Chat router registered")
    except Exception as e:
        print("??  Skip chat router:", repr(e))

    # Schedule (mentor session booking)
    try:
        from .modules.chat import schedule_routes as schedule_router

        app.include_router(schedule_router.router)
        print("[OK] Schedule router registered")
    except Exception as e:
        print("??  Skip schedule router:", repr(e))
    
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
        print("[OK] AI Mock Interview API")
    except Exception as e:
        print("[ERR] AI Mock Interview API:", str(e)[:50])

    # Admin Interview Management API
    try:
        from .modules.interview import routes_admin as interview_admin_router

        app.include_router(interview_admin_router.router, prefix="/api/admin", tags=["admin-interview"])
        print("[OK] Admin Interview Management API")
    except Exception as e:
        print("[ERR] Admin Interview Management API:", str(e)[:80])
    # Interview Answer Analysis (dedicated API key, SSE streaming, DB storage)
    try:
        from .api import interview_analysis as ia_router
        app.include_router(ia_router.router, tags=["interview-analysis"])
        print("[OK] Interview Analysis API (SSE streaming)")
    except Exception as e:
        print("[ERR] Interview Analysis API:", str(e)[:60])

    # WebSocket STT (faster-whisper realtime)
    try:
        from .api import ws_stt as ws_stt_router
        app.include_router(ws_stt_router.router, tags=["ws-stt"])
        print("[OK] WebSocket STT (faster-whisper)")
    except Exception as e:
        print("[ERR] WebSocket STT:", str(e)[:60])

    # Voice Interview API Routes
    try:
        from .api import voice_interview as voice_interview_router

        app.include_router(voice_interview_router.router, tags=["voice-interview"])
        print("[OK] Voice Interview API")
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
        print("[OK] NLP router registered at /api/nlp")
    except Exception as e:
        print("??  Skip NLP router:", repr(e))

    # Course Recommendation — Embedding + Neo4j (Cap2)
    try:
        from .modules.courses.router import router as courses_router

        app.include_router(courses_router, prefix="/api/courses", tags=["courses"])
        print("✅ Course Recommendation API registered at /api/courses")
    except Exception as e:
        print("❌ Course Recommendation API:", str(e)[:80])

    # Trends — Job market trending data from RankingSystem
    try:
        from .modules.trends import routes_trends as trends_router

        app.include_router(trends_router.router, prefix="/api/trends", tags=["trends"])
        print("✅ Trends API registered at /api/trends")
    except Exception as e:
        print("❌ Trends API:", str(e)[:80])

    # VietnamWorks Job Categories API - Direct endpoint for testing
    @app.get("/api/vietnamworks/test")
    async def vietnamworks_test():
        """Direct test endpoint for VietnamWorks API"""
        return {"message": "VietnamWorks API is working!", "status": "ok"}

    @app.get("/api/vietnamworks/stats")
    async def vietnamworks_stats():
        """Direct stats endpoint for VietnamWorks API"""
        return {
            "categories": {
                "total": 153,
                "active": 153,
                "groups": 22
            },
            "mappings": {
                "total": 0,
                "avg_confidence": 0.0,
                "high_confidence": 0
            }
        }

    @app.get("/api/vietnamworks/categories")
    async def vietnamworks_categories(skip: int = 0, limit: int = 100):
        """Direct categories endpoint for VietnamWorks API"""
        # Return mock data for now
        mock_categories = [
            {
                "id": 1,
                "name": "Sales Business Development",
                "slug": "ban-hang-phat-trien-kinh-doanh",
                "vietnamese_name": "Bán Hàng/Phát Triển Kinh Doanh",
                "category_group": "Bán Hàng & Kinh Doanh",
                "description": "Các vị trí bán hàng và phát triển kinh doanh",
                "vietnamworks_url": None,
                "is_active": True,
                "sort_order": 1
            },
            {
                "id": 2,
                "name": "General Accounting",
                "slug": "ke-toan-tong-hop",
                "vietnamese_name": "Kế Toán Tổng Hợp",
                "category_group": "Kế Toán & Tài Chính",
                "description": "Kế toán tổng hợp và báo cáo tài chính",
                "vietnamworks_url": None,
                "is_active": True,
                "sort_order": 10
            },
            {
                "id": 3,
                "name": "Software Development",
                "slug": "phan-mem-may-tinh",
                "vietnamese_name": "Phần Mềm Máy Tính",
                "category_group": "Công Nghệ Thông Tin",
                "description": "Lập trình và phát triển phần mềm",
                "vietnamworks_url": None,
                "is_active": True,
                "sort_order": 40
            }
        ]
        
        return mock_categories[skip:skip+limit]

    # VietnamWorks Job Categories API
    try:
        from .modules.vietnamworks.routes import router as vietnamworks_router

        app.include_router(vietnamworks_router, prefix="/api/vietnamworks", tags=["vietnamworks"])
        print("✅ VietnamWorks Job Categories API registered at /api/vietnamworks")
    except Exception as e:
        print("❌ VietnamWorks API:", str(e)[:80])

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
