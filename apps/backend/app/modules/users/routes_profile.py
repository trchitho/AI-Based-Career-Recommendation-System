from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from ...core.jwt import require_user

from sqlalchemy.orm import registry
from sqlalchemy import Column, BigInteger, Text, TIMESTAMP

mapper_registry = registry()

@mapper_registry.mapped
class UserGoal:
    __tablename__ = "user_goals"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger)
    goal_text = Column(Text)


@mapper_registry.mapped
class UserSkillMap:
    __tablename__ = "user_skills_map"
    __table_args__ = {"schema": "core"}
    user_id = Column(BigInteger, primary_key=True)
    skill_name = Column(Text, primary_key=True)
    level = Column(Text)


@mapper_registry.mapped
class CareerJourney:
    __tablename__ = "career_journey"
    __table_args__ = {"schema": "core"}
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger)
    title = Column(Text)
    description = Column(Text)


router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/goals")
def list_goals(request: Request):
    uid = require_user(request)
    session = _db(request)
    rows = session.execute(select(UserGoal).where(UserGoal.user_id == uid)).scalars().all()
    return [{"id": str(g.id), "goal_text": g.goal_text} for g in rows]


@router.post("/goals")
def add_goal(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    text = (payload.get("goal_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="goal_text required")
    g = UserGoal(user_id=uid, goal_text=text)
    session.add(g)
    session.commit()
    session.refresh(g)
    return {"id": str(g.id), "goal_text": g.goal_text}


@router.delete("/goals/{goal_id}")
def delete_goal(request: Request, goal_id: int):
    uid = require_user(request)
    session = _db(request)
    g = session.get(UserGoal, goal_id)
    if not g or g.user_id != uid:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(g)
    session.commit()
    return {"status": "ok"}


@router.get("/skills")
def list_skills(request: Request):
    uid = require_user(request)
    session = _db(request)
    rows = session.execute(select(UserSkillMap).where(UserSkillMap.user_id == uid)).scalars().all()
    return [{"skill_name": r.skill_name, "level": r.level} for r in rows]


@router.post("/skills")
def upsert_skill(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    name = (payload.get("skill_name") or "").strip()
    level = (payload.get("level") or "").strip() or None
    if not name:
        raise HTTPException(status_code=400, detail="skill_name required")
    existing = session.execute(select(UserSkillMap).where(UserSkillMap.user_id == uid, UserSkillMap.skill_name == name)).scalar_one_or_none()
    if existing:
        existing.level = level
    else:
        session.add(UserSkillMap(user_id=uid, skill_name=name, level=level))
    session.commit()
    return {"status": "ok"}


@router.delete("/skills/{skill_name}")
def delete_skill(request: Request, skill_name: str):
    uid = require_user(request)
    session = _db(request)
    r = session.execute(select(UserSkillMap).where(UserSkillMap.user_id == uid, UserSkillMap.skill_name == skill_name)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(r)
    session.commit()
    return {"status": "ok"}


@router.get("/journey")
def list_journey(request: Request):
    uid = require_user(request)
    session = _db(request)
    rows = session.execute(select(CareerJourney).where(CareerJourney.user_id == uid)).scalars().all()
    return [{"id": str(j.id), "title": j.title, "description": j.description} for j in rows]


@router.post("/journey")
def add_journey(request: Request, payload: dict):
    uid = require_user(request)
    session = _db(request)
    title = (payload.get("title") or "").strip()
    description = payload.get("description")
    if not title:
        raise HTTPException(status_code=400, detail="title required")
    j = CareerJourney(user_id=uid, title=title, description=description)
    session.add(j)
    session.commit()
    session.refresh(j)
    return {"id": str(j.id), "title": j.title, "description": j.description}

