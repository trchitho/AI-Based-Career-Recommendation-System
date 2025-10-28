from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from .es_client import get_es_client
from ..content.models import Career

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
                query={
                    "multi_match": {
                        "query": q,
                        "fields": ["title^2", "short_desc", "content_md"],
                    }
                },
                size=limit,
            )
            hits = resp.get("hits", {}).get("hits", [])
            return [h.get("_source") for h in hits]
        except Exception:
            pass
    # Fallback to Postgres LIKE search
    session = _db(request)
    like = f"%{q.lower()}%"
    rows = (
        session.execute(
            select(Career)
            .where(
                or_(
                    Career.title.ilike(like),
                    Career.short_desc.ilike(like),
                    Career.content_md.ilike(like),
                )
            )
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [c.to_dict() for c in rows]


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
    from ..content.models import Career

    # Late import request DB to avoid circular
    # This endpoint doesn't accept Request db session; open a new one via SQLAlchemy engine
    from ...core.db import engine
    from sqlalchemy.orm import sessionmaker

    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    s = SessionLocal()
    try:
        items = s.execute(select(Career)).scalars().all()
        docs = (
            {
                "_index": index,
                "_id": str(c.id),
                "id": str(c.id),
                "title": c.title,
                "short_desc": c.short_desc,
                "content_md": c.content_md,
            }
            for c in items
        )
        helpers.bulk(es, docs)
    finally:
        s.close()
    return {"indexed": len(items)}
