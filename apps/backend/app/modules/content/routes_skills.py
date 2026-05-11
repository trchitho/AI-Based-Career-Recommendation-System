from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ...core.jwt import require_admin
from .models import CareerKSA

router = APIRouter(prefix="/skills", tags=["admin-skills"])


def _db(req: Request) -> Session:
    db = getattr(req.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database session not available",
        )
    return db


class SkillResponse(BaseModel):
    id: int
    onet_code: str
    ksa_type: str
    name: str
    name_vi: Optional[str] = None
    category: Optional[str] = None
    level: Optional[float] = None
    importance: Optional[float] = None
    source: Optional[str] = None
    fetched_at: Optional[str] = None


class SkillsListResponse(BaseModel):
    items: list[SkillResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class SkillCreateRequest(BaseModel):
    onet_code: str
    ksa_type: str
    name: str          # frontend gửi "name" → lưu vào name_en
    name_vi: Optional[str] = None
    category: Optional[str] = None
    level: Optional[float] = None
    importance: Optional[float] = None
    source: Optional[str] = None


class SkillUpdateRequest(BaseModel):
    onet_code: Optional[str] = None
    ksa_type: Optional[str] = None
    name: Optional[str] = None
    name_vi: Optional[str] = None
    category: Optional[str] = None
    level: Optional[float] = None
    importance: Optional[float] = None
    source: Optional[str] = None


def _to_response(item: CareerKSA) -> SkillResponse:
    return SkillResponse(
        id=item.id,
        onet_code=item.onet_code,
        ksa_type=item.ksa_type,
        name=item.name_en or "",
        name_vi=item.name_vn or "",
        category=item.category,
        level=float(item.level) if item.level else None,
        importance=float(item.importance) if item.importance else None,
        source=item.source,
        fetched_at=item.fetched_at.isoformat() if item.fetched_at else None,
    )


@router.get("", response_model=SkillsListResponse)
def get_skills(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    ksa_type: Optional[str] = Query(None),
    onet_code: Optional[str] = Query(None),
    sort_by: str = Query("name_en"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    try:
        # Deduplicate: lấy ID nhỏ nhất cho mỗi (onet_code, ksa_type, name_en)
        subquery = (
            db.query(func.min(CareerKSA.id).label("min_id"))
            .group_by(CareerKSA.onet_code, CareerKSA.ksa_type, CareerKSA.name_en)
            .subquery()
        )
        query = db.query(CareerKSA).filter(CareerKSA.id.in_(db.query(subquery.c.min_id)))

        if search:
            t = f"%{search}%"
            query = query.filter(
                or_(
                    CareerKSA.name_en.ilike(t),
                    CareerKSA.name_vn.ilike(t),
                    CareerKSA.category.ilike(t),
                    CareerKSA.onet_code.ilike(t),
                )
            )

        if ksa_type:
            query = query.filter(func.lower(CareerKSA.ksa_type) == ksa_type.lower())

        if onet_code:
            query = query.filter(CareerKSA.onet_code == onet_code)

        total = query.count()

        # sort_by từ frontend có thể là "name" → map sang "name_en"
        col_map = {"name": "name_en", "name_vi": "name_vn"}
        actual_sort = col_map.get(sort_by, sort_by)
        sort_col = getattr(CareerKSA, actual_sort, CareerKSA.name_en)
        query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        total_pages = (total + per_page - 1) // per_page

        return SkillsListResponse(
            items=[_to_response(i) for i in items],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    except Exception as e:
        print(f"[skills] get_skills error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to get skills")


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(skill_id: int, db: Session = Depends(_db), _: dict = Depends(require_admin)):
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _to_response(skill)


@router.post("", response_model=SkillResponse)
def create_skill(skill_data: SkillCreateRequest, db: Session = Depends(_db), _: dict = Depends(require_admin)):
    try:
        skill = CareerKSA(
            onet_code=skill_data.onet_code,
            ksa_type=skill_data.ksa_type,
            name_en=skill_data.name,          # frontend field "name" → DB column name_en
            name_vn=skill_data.name_vi,
            category=skill_data.category,
            level=skill_data.level,
            importance=skill_data.importance,
            source=skill_data.source or "manual",
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return _to_response(skill)
    except Exception as e:
        db.rollback()
        print(f"[skills] create_skill error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to create skill")


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(skill_id: int, skill_data: SkillUpdateRequest, db: Session = Depends(_db), _: dict = Depends(require_admin)):
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        update_data = skill_data.model_dump(exclude_unset=True)
        # map "name" → "name_en", "name_vi" → "name_vn"
        if "name" in update_data:
            update_data["name_en"] = update_data.pop("name")
        if "name_vi" in update_data:
            update_data["name_vn"] = update_data.pop("name_vi")
        for field, value in update_data.items():
            setattr(skill, field, value)
        db.commit()
        db.refresh(skill)
        return _to_response(skill)
    except Exception as e:
        db.rollback()
        print(f"[skills] update_skill error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to update skill")


@router.delete("/{skill_id}")
def delete_skill(skill_id: int, db: Session = Depends(_db), _: dict = Depends(require_admin)):
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        db.delete(skill)
        db.commit()
        return {"message": "Skill deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"[skills] delete_skill error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete skill")


@router.get("/stats/summary")
def get_skills_stats(db: Session = Depends(_db), _: dict = Depends(require_admin)):
    try:
        total_skills = db.query(CareerKSA).count()
        ksa_stats = db.query(CareerKSA.ksa_type, func.count(CareerKSA.id).label("count")).group_by(CareerKSA.ksa_type).all()
        onet_stats = (
            db.query(CareerKSA.onet_code, func.count(CareerKSA.id).label("count"))
            .group_by(CareerKSA.onet_code)
            .order_by(func.count(CareerKSA.id).desc())
            .limit(10)
            .all()
        )
        return {
            "total_skills": total_skills,
            "ksa_type_distribution": [{"type": r[0], "count": r[1]} for r in ksa_stats],
            "top_onet_codes": [{"onet_code": r[0], "count": r[1]} for r in onet_stats],
        }
    except Exception as e:
        print(f"[skills] get_skills_stats error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to get skills stats")
