"""
NLP API Routes
PB32 - Essay analysis (PhoBERT + Gemini fallback)
PB33 - Career embedding index management (SBERT)
PB34 - pgvector semantic / hybrid search
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.auth.deps import get_current_user, get_current_user_optional
from app.modules.users.models import User
from . import service_nlp as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["nlp"])


# ─── DB helper ────────────────────────────────────────��─────
def _db(req: Request) -> Session:
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="DB session not available")
    return db


def _require_admin(user: User) -> None:
    if getattr(user, "role", None) not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin only")


# ─── Schemas ────────────────────────────────────────────────

class EssayRequest(BaseModel):
    essay_text: str = Field(..., min_length=10, max_length=5000)
    lang: str = Field("auto", pattern="^(auto|vi|en)$")
    store_embedding: bool = Field(True, description="Persist embedding for future matching")


class EssayResult(BaseModel):
    source: str
    detected_lang: str
    riasec: List[float]
    big5: List[float]
    dominant: str
    traits_vi: List[str]
    has_embedding: bool
    # TC18 — performance metadata
    response_time_ms: float = 0.0
    from_cache: bool = False


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    top_k: int = Field(10, ge=1, le=50)
    min_score: float = Field(0.2, ge=0.0, le=1.0)
    riasec: Optional[List[float]] = Field(
        None,
        description="Optional RIASEC [R,I,A,S,E,C] to enable hybrid scoring",
    )
    semantic_weight: float = Field(0.7, ge=0.0, le=1.0)


class CareerMatch(BaseModel):
    career_id: str
    onet_code: Optional[str]
    title: str
    description: str
    similarity: float
    riasec_match: Optional[float] = None
    combined_score: Optional[float] = None


class SearchResult(BaseModel):
    query: str
    total: int
    items: List[CareerMatch]
    search_type: str


class BuildIndexRequest(BaseModel):
    force_rebuild: bool = Field(False, description="Re-index already-indexed careers")
    batch_size: int = Field(50, ge=10, le=200)


class IndexStatus(BaseModel):
    total_careers: int
    indexed_careers: int
    coverage_pct: float
    unindexed_careers: int
    user_embeddings: int
    vector_dim: int
    model: str
    last_built: Optional[str]
    pgvector_ready: bool
    ai_core_url: str


# ─── Routes ─────────────────────────────────────────────────


# ── 1. Status ────────────────────────────────────────────────
@router.get("/status", response_model=IndexStatus, summary="PB34 — Vector index status")
def get_status(request: Request):
    """
    Returns pgvector index coverage stats.
    - How many careers have embeddings
    - How many user essay embeddings are stored
    - Model name, last build time, etc.
    """
    db = _db(request)
    return svc.get_index_status(db)


# ── 2. Semantic / Hybrid Search ──────────────────────────────
@router.post("/search", response_model=SearchResult, summary="PB34 — Semantic career search")
def semantic_search(
    body: SemanticSearchRequest,
    request: Request,
):
    """
    PB34: Search careers by free-text query using vector cosine similarity.

    Pass optional `riasec` array to enable **hybrid scoring**:
    - `semantic_weight` portion comes from embedding cosine similarity
    - `(1 - semantic_weight)` portion comes from RIASEC profile dot-product
    """
    db = _db(request)
    svc.ensure_pgvector_schema(db)

    if body.riasec and len(body.riasec) == 6:
        items = svc.hybrid_search(
            db,
            query_text=body.query,
            riasec_scores=body.riasec,
            top_k=body.top_k,
            min_score=body.min_score,
            semantic_weight=body.semantic_weight,
        )
        search_type = "hybrid"
    else:
        items = svc.semantic_search(
            db,
            query_text=body.query,
            top_k=body.top_k,
            min_score=body.min_score,
        )
        search_type = "semantic"

    return SearchResult(
        query=body.query,
        total=len(items),
        items=items,
        search_type=search_type,
    )


# ── 3. User career match ──────────────────────────────────────
@router.get("/user-match", response_model=SearchResult, summary="PB34 — Match careers to user essay")
def user_match(
    request: Request,
    top_k: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """
    PB34: Find careers most similar to the current user's stored essay embedding.
    Requires the user to have previously submitted an essay assessment.
    """
    db = _db(request)
    items = svc.user_career_match(db, user_id=current_user.id, top_k=top_k)

    if not items:
        return SearchResult(
            query=f"user:{current_user.id}",
            total=0,
            items=[],
            search_type="user_embedding",
        )

    return SearchResult(
        query=f"user:{current_user.id}",
        total=len(items),
        items=items,
        search_type="user_embedding",
    )


# ── 4. Analyze essay ──────────────────────────────────────────
@router.post("/analyze-essay", response_model=EssayResult, summary="PB32 — Analyze essay → RIASEC + Big5")
def analyze_essay(
    body: EssayRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    PB32: Analyze a Vietnamese/English essay to extract:
    - RIASEC interest profile [R, I, A, S, E, C]
    - Big Five personality [O, C, E, A, N]
    - Dominant type and key traits

    Uses PhoBERT (AI-core) if available, falls back to Gemini LLM.
    If `store_embedding=True` and user is logged in, stores the embedding for future matching.
    """
    db = _db(request)

    if current_user and body.store_embedding:
        result = svc.analyze_and_store(db, current_user.id, body.essay_text, body.lang)
    else:
        result = svc.analyze_essay(body.essay_text, body.lang)

    return EssayResult(
        source=result["source"],
        detected_lang=result["detected_lang"],
        riasec=result["riasec"],
        big5=result["big5"],
        dominant=result.get("dominant", ""),
        traits_vi=result.get("traits_vi", []),
        has_embedding=bool(result.get("embedding")),
        response_time_ms=result.get("response_time_ms", 0.0),
        from_cache=result.get("from_cache", False),
    )


# ── 5. Build index (Admin) ────────────────────────────────────
@router.post("/build-index", summary="PB33 — Build career embedding index (Admin)")
def build_index(
    body: BuildIndexRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    PB33: Trigger batch indexing of all careers into pgvector.

    Runs in **background** — returns immediately.
    Use `GET /status` to monitor progress.

    Admin / Manager only.
    """
    _require_admin(current_user)
    db = _db(request)

    # Ensure schema exists before spawning background task
    svc.ensure_pgvector_schema(db)

    def _run():
        from app.main import SessionLocal
        bg_db = SessionLocal()
        try:
            result = svc.build_career_index(
                bg_db,
                batch_size=body.batch_size,
                force_rebuild=body.force_rebuild,
            )
            logger.info(f"[NLP] build_career_index done: {result}")
        finally:
            bg_db.close()

    background_tasks.add_task(_run)

    return {
        "status": "started",
        "message": "Career embedding index build started in background.",
        "force_rebuild": body.force_rebuild,
        "batch_size": body.batch_size,
    }


# ── 6. Rebuild single career (Admin) ─────────────────────────
@router.post("/rebuild-career/{career_id}", summary="PB33 — Re-index a single career")
def rebuild_single_career(
    career_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    PB33: Force-rebuild the embedding for a specific career.
    Useful after updating career descriptions.
    Admin / Manager only.
    """
    _require_admin(current_user)
    db = _db(request)
    svc.ensure_pgvector_schema(db)

    try:
        row = db.execute(text("""
            SELECT id, onet_code,
                   COALESCE(title_vi, title_en, title) AS title,
                   COALESCE(description_vi, description, '') AS description
            FROM core.careers WHERE id = :cid
        """), {"cid": career_id}).mappings().first()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    if not row:
        raise HTTPException(status_code=404, detail=f"Career {career_id} not found")

    title = (row.get("title") or "").strip()
    desc  = (row.get("description") or "").strip()
    embed_text = f"{title}. {desc}"[:1800]

    if not embed_text.strip():
        raise HTTPException(status_code=422, detail="Career has no indexable text")

    embedding = svc.get_embedding(embed_text, task_type="RETRIEVAL_DOCUMENT")
    if not embedding:
        raise HTTPException(status_code=503, detail="Could not generate embedding (no AI service available)")

    ok = svc.store_career_embedding(
        db, career_id, row.get("onet_code"), title, desc, embedding
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to store embedding")

    db.commit()
    return {
        "career_id":   career_id,
        "title":       title,
        "embedding_dim": len(embedding),
        "status":      "ok",
    }


# ── 7. Search benchmark (TC19) ───────────────────────────────
@router.get("/benchmark", summary="TC19 — pgvector search latency benchmark")
def search_benchmark(
    request: Request,
    top_k: int = Query(10, ge=1, le=100),
    ef_search: int = Query(100, ge=10, le=500),
    query: str = Query("Tôi thích làm việc với con người", min_length=2, max_length=500),
):
    """
    TC19: Run a timed pgvector similarity search and return latency stats.

    Returns:
    - query_time_ms: time for the DB vector query (HNSW cosine scan)
    - total_time_ms: end-to-end including embedding generation
    - sla_passed: True if query_time_ms < 5 000 ms
    - result_count: number of careers returned
    - ef_search: HNSW ef_search setting used
    """
    db = _db(request)
    import time as _time

    t_start = _time.perf_counter()
    results = svc.semantic_search(db, query_text=query, top_k=top_k, ef_search=ef_search)
    total_ms = round((_time.perf_counter() - t_start) * 1000, 1)

    query_ms = results[0]["query_time_ms"] if results else total_ms
    sla_passed = query_ms < svc.VECTOR_SEARCH_SLA_MS

    return {
        "query": query,
        "top_k": top_k,
        "ef_search": ef_search,
        "result_count": len(results),
        "query_time_ms": query_ms,
        "total_time_ms": total_ms,
        "sla_ms": svc.VECTOR_SEARCH_SLA_MS,
        "sla_passed": sla_passed,
    }


# ── 8. Ensure schema (Admin) ──────────────────────────────────
@router.post("/ensure-schema", summary="PB34 — Create pgvector tables if missing")
def ensure_schema(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    PB34: Create the ai schema, career_embeddings and user_embeddings tables,
    and HNSW indexes — safe to call even if they already exist.
    Admin / Manager only.
    """
    _require_admin(current_user)
    db = _db(request)
    ok = svc.ensure_pgvector_schema(db)
    return {"status": "ok" if ok else "error"}
