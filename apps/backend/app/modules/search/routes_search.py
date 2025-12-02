from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..content.models import Career
from .es_client import get_es_client

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/careers")
def search_careers(request: Request, q: str, limit: int = 20):
    es = get_es_client()
    if es:
        try:
            resp = es.search(
                index="careers",
                query={"multi_match": {"query": q, "fields": ["title^2", "short_desc", "content_md"]}},
                size=limit,
            )
            hits = resp.get("hits", {}).get("hits", [])
            return [h.get("_source") for h in hits]
        except Exception:
            pass
    # Fallback to Postgres LIKE search
    session = _db(request)
    like = f"%{q.lower()}%"
    title_expr = func.coalesce(Career.title_vi, Career.title_en)
    desc_expr = func.coalesce(Career.short_desc_vn, Career.short_desc_en)
    rows = session.execute(
        select(Career.id, Career.slug, title_expr, desc_expr)
        .where(or_(title_expr.ilike(like), desc_expr.ilike(like)))
        .limit(limit)
    ).all()
    return [{"id": str(i), "slug": s, "title": t, "short_desc": d} for (i, s, t, d) in rows]


@router.post("/reindex")
def reindex_careers(_: Request):
    es = get_es_client()
    if not es:
        raise HTTPException(status_code=503, detail="ElasticSearch not configured")
    # Create index with simple mapping
    index = "careers"
    try:
        if es.indices.exists(index=index):  # type: ignore
            es.indices.delete(index=index)  # type: ignore
        es.indices.create(
            index=index,
            mappings={
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {"type": "text", "analyzer": "standard"},
                    "short_desc": {"type": "text"},
                    "content_md": {"type": "text"},
                }
            },
        )
    except Exception:
        pass
    # Bulk index from DB fallback
    from elasticsearch import helpers  # type: ignore
    from sqlalchemy.orm import sessionmaker

    # Late import request DB to avoid circular
    # This endpoint doesn't accept Request db session; open a new one via SQLAlchemy engine
    from ...core.db import engine
    from ..content.models import Career

    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    s = SessionLocal()
    try:
        items = s.execute(
            select(
                Career.id,
                Career.slug,
                func.coalesce(Career.title_vi, Career.title_en),
                func.coalesce(Career.short_desc_vn, Career.short_desc_en),
            )
        ).all()
        docs = (
            {
                "_index": index,
                "_id": str(i),
                "id": str(i),
                "title": t,
                "short_desc": d,
                "slug": sl,
            }
            for (i, sl, t, d) in items
        )
        helpers.bulk(es, docs)
    finally:
        s.close()
    return {"indexed": len(items)}
