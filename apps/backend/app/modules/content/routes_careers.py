from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy.orm import Session
from ...core.jwt import require_user
from . import service_careers as svc

router = APIRouter()

def _db(request: Request) -> Session:
    return request.state.db

@router.get("")
def list_careers(
    request: Request,
    q: str | None = Query(None, description="search by title/slug"),
    category_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    session = _db(request)
    return svc.list_careers(session, q, category_id, limit, offset)

@router.get("/{id_or_slug}")
def get_career(request: Request, id_or_slug: str):
    session = _db(request)
    obj = svc.get_career(session, id_or_slug)
    if not obj:
        raise HTTPException(status_code=404, detail="Career not found")
    return obj


# ---- Roadmap (demo, không lưu DB) ----
@router.get("/{career_id}/roadmap")
def get_roadmap(request: Request, career_id: str):
    user_id = require_user(request)
    session = _db(request)
    data = svc.get_roadmap(session, user_id, career_id)
    if not data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return data


@router.post("/{career_id}/roadmap/milestone/{milestone_id}/complete")
def complete_milestone(request: Request, career_id: str, milestone_id: int):
    user_id = require_user(request)
    session = _db(request)
    data = svc.complete_milestone(session, user_id, career_id, milestone_id)
    if not data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return data
