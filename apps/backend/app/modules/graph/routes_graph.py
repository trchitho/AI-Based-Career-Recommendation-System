from fastapi import APIRouter, Request, HTTPException
from .neo4j_client import get_driver
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..content.models import Career, CareerKSA

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.post("/sync/careers")
def sync_careers_to_graph(request: Request):
    driver = get_driver()
    if not driver:
        raise HTTPException(status_code=503, detail="Neo4j not configured")
    session_db = _db(request)
    rows = session_db.execute(select(Career)).scalars().all()
    payload = [c.to_dict() for c in rows]
    with driver.session() as s:
        for c in payload:
            s.run(
                "MERGE (n:Career {id:$id}) SET n.title=$title, n.slug=$slug",
                id=str(c["id"]),
                title=c["title"],
                slug=c["slug"],
            )
    return {"synced": len(payload)}


@router.post("/sync/career-skills")
def sync_career_skills(request: Request):
    driver = get_driver()
    if not driver:
        raise HTTPException(status_code=503, detail="Neo4j not configured")
    db = _db(request)
    careers = db.execute(select(Career)).scalars().all()
    # Build map onet_code -> career id/title
    by_onet = {c.onet_code: c for c in careers if c.onet_code}
    ksas = db.execute(select(CareerKSA)).scalars().all()
    count = 0
    with driver.session() as s:
        for k in ksas:
            c = by_onet.get(k.onet_code)
            if not c:
                continue
            # MERGE Career node by career id
            s.run(
                "MERGE (c:Career {id:$cid}) SET c.title=$title",
                cid=str(c.id),
                title=c.title,
            )
            # MERGE Skill node
            s.run(
                "MERGE (sk:Skill {name:$name}) SET sk.category=$cat",
                name=k.name,
                cat=k.ksa_type,
            )
            # MERGE relation
            s.run(
                "MATCH (c:Career {id:$cid}), (sk:Skill {name:$name}) "
                "MERGE (c)-[r:REQUIRES]->(sk) "
                "SET r.level=$lvl, r.importance=$imp",
                cid=str(c.id),
                name=k.name,
                lvl=float(k.level) if k.level is not None else None,
                imp=float(k.importance) if k.importance is not None else None,
            )
            count += 1
    return {"relations": count}
