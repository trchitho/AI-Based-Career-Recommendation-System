from fastapi import APIRouter, HTTPException, Request, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.db import get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User
from ..content.models import Career, CareerKSA
from .neo4j_client import get_driver
from .graph_queries import (
    graph_health_check,
    find_mentors_by_skill_overlap,
    get_career_required_skills_from_graph,
    get_skill_path_to_career,
    recommend_careers_for_user,
)

router = APIRouter()


@router.get("/health")
def neo4j_health():
    """Kiem tra ket noi Neo4j va so luong nodes/edges trong graph."""
    driver = get_driver()
    return graph_health_check(driver)


@router.get("/mentors/by-skills")
def graph_find_mentors(
    skills: str = Query(..., description="Danh sach ky nang, phan cach bang dau phay"),
    career: str = Query("", description="Nghe nghe muc tieu"),
    limit: int = Query(10, le=20),
):
    """
    Tim mentor qua Neo4j graph traversal theo skill overlap.
    Nhanh hon PostgreSQL matching cho danh sach lon.
    """
    driver = get_driver()
    if not driver:
        raise HTTPException(503, "Neo4j not available")
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    return find_mentors_by_skill_overlap(driver, skill_list, career, limit)


@router.get("/careers/{career_id}/skills")
def graph_career_skills(
    career_id: str,
    min_importance: float = Query(0.0, ge=0, le=1),
):
    """Lay ky nang yeu cau cua nghe nghiep tu Neo4j graph."""
    driver = get_driver()
    if not driver:
        raise HTTPException(503, "Neo4j not available")
    return get_career_required_skills_from_graph(driver, career_id, min_importance)


@router.get("/careers/{career_id}/skill-path")
def graph_skill_path(
    career_id: str,
    current_skills: str = Query("", description="Ky nang hien co, phan cach bang dau phay"),
):
    """Con duong ky nang tu hien tai den nghe muc tieu."""
    driver = get_driver()
    if not driver:
        raise HTTPException(503, "Neo4j not available")
    skill_list = [s.strip() for s in current_skills.split(",") if s.strip()]
    return get_skill_path_to_career(driver, skill_list, career_id)


@router.get("/recommendations/careers")
def graph_career_recommendations(
    current_user: User = Depends(get_current_user_from_token),
    limit: int = Query(5, le=10),
):
    """Goi y nghe nghiep phu hop cho user hien tai dua tren graph."""
    driver = get_driver()
    if not driver:
        raise HTTPException(503, "Neo4j not available")
    return recommend_careers_for_user(driver, current_user.id, limit)


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
                title=c.to_dict().get("title"),
            )
            # MERGE Skill node
            s.run(
                "MERGE (sk:Skill {name:$name}) SET sk.category=$cat",
                name=k.name_en or "",
                cat=k.ksa_type,
            )
            # MERGE relation
            s.run(
                "MATCH (c:Career {id:$cid}), (sk:Skill {name:$name}) "
                "MERGE (c)-[r:REQUIRES]->(sk) "
                "SET r.level=$lvl, r.importance=$imp",
                cid=str(c.id),
                name=k.name_en or "",
                lvl=float(k.level) if k.level is not None else None,
                imp=float(k.importance) if k.importance is not None else None,
            )
            count += 1
    return {"relations": count}
