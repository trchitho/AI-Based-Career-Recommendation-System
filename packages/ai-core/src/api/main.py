# src/api/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from .config import DB_URL, RETR_TABLE, MODEL_DIR, IVF_PROBES
from .routes_retrieval import router as retrieval_router
from .routes_traits import router as traits_router
from api.routes_rank import router as rank_router
from .routes_recs import router as recs_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load models on startup to avoid lazy loading delays"""
    print("[STARTUP] Pre-loading AI models...")
    
    try:
        # Pre-load retrieval model (vietnamese-sbert)
        from .config import get_retrieval_model
        print("[STARTUP] Loading retrieval model (vietnamese-sbert)...")
        get_retrieval_model()
        print("[STARTUP] ✓ Retrieval model loaded")
        
        # Pre-load PhoBERT models for traits prediction
        from ai_core.nlp.essay_infer import _get_riasec_model, _get_big5_model
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
    
    yield
    
    print("[SHUTDOWN] Cleaning up...")

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

app.include_router(retrieval_router)
app.include_router(traits_router)
app.include_router(rank_router)
app.include_router(recs_router)
