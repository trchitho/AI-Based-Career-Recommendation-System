# src/api/main.py

from fastapi import FastAPI

from api.routes_rank import router as rank_router

from .config import DB_URL, IVF_PROBES, MODEL_DIR, RETR_TABLE
from .routes_recs import router as recs_router
from .routes_retrieval import router as retrieval_router
from .routes_traits import router as traits_router

app = FastAPI(
    title="AI Core Service",
    version="0.1.0",
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
