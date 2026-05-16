# src/api/main.py
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes_rank import router as rank_router

from .cache import recs_cache
from .config import DB_URL, IVF_PROBES, MODEL_DIR, RETR_TABLE
from .metrics import metrics
from .routes_recs import router as recs_router
from .routes_retrieval import router as retrieval_router
from .routes_traits import router as traits_router
from .scheduler import FeatureRebuildScheduler

# Configure root logger to use INFO level (so logger.info shows up in uvicorn output)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)


# Module-level scheduler reference (kept alive for entire app lifetime)
_scheduler: FeatureRebuildScheduler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load models + start background jobs on startup."""
    global _scheduler

    print("[STARTUP] Pre-loading AI models...")

    try:
        # Pre-load retrieval model (vietnamese-sbert)
        from .config import get_retrieval_model
        print("[STARTUP] Loading retrieval model (vietnamese-sbert)...")
        get_retrieval_model()
        print("[STARTUP] ✓ Retrieval model loaded")

        # Pre-load PhoBERT models for traits prediction
        from ai_core.nlp.essay_infer import _get_big5_model, _get_riasec_model
        print("[STARTUP] Loading PhoBERT RIASEC model...")
        _get_riasec_model()
        print("[STARTUP] ✓ PhoBERT RIASEC model loaded")

        print("[STARTUP] Loading PhoBERT Big5 model...")
        _get_big5_model()
        print("[STARTUP] ✓ PhoBERT Big5 model loaded")

        print("[STARTUP] ✅ All models loaded successfully!")

    except Exception as e:
        print(f"[STARTUP] ⚠️ Warning: Failed to pre-load some models: {e}")
        print("[STARTUP] Models will be loaded on first use (lazy loading)")

    # Start feature-rebuild scheduler (auto-update user_feats.json/item_feats.json)
    if os.getenv("AI_CORE_DISABLE_SCHEDULER", "false").lower() not in {"true", "1", "yes"}:
        try:
            interval = int(os.getenv("AI_CORE_REBUILD_INTERVAL_SECONDS", str(6 * 3600)))
            _scheduler = FeatureRebuildScheduler(
                interval_seconds=interval,
                run_on_startup=os.getenv("AI_CORE_REBUILD_ON_STARTUP", "true").lower() in {"true", "1", "yes"},
            )
            _scheduler.start()
            print(f"[STARTUP] ✓ Feature rebuild scheduler started (interval={interval}s)")
        except Exception as e:
            print(f"[STARTUP] ⚠️ Failed to start scheduler: {e}")
    else:
        print("[STARTUP] ℹ️  Feature rebuild scheduler disabled (AI_CORE_DISABLE_SCHEDULER=true)")

    yield

    print("[SHUTDOWN] Cleaning up...")
    if _scheduler is not None:
        _scheduler.stop()


app = FastAPI(
    title="AI Core Service",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "ai-core",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "up"}


@app.get("/debug/config")
def debug_cfg():
    return {
        "retr_table": RETR_TABLE,
        "model_dir": MODEL_DIR,
        "database_url": DB_URL,
        "ivf_probes": str(IVF_PROBES),
    }


@app.get("/debug/metrics")
def debug_metrics():
    """Operational metrics: cold-start ratio, cache hit rate, request counts, etc."""
    snap = metrics.snapshot()
    snap["cache_size"] = recs_cache.size()
    return snap


@app.post("/debug/scheduler/trigger")
def trigger_rebuild():
    """Manually trigger a feature rebuild (useful for testing)."""
    if _scheduler is None:
        return {"status": "error", "message": "Scheduler not initialized"}
    _scheduler.trigger_now()
    return {"status": "ok", "message": "Rebuild triggered in background"}


app.include_router(retrieval_router)
app.include_router(traits_router)
app.include_router(rank_router)
app.include_router(recs_router)
