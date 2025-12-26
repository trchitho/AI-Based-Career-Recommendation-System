from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from .models import CareerKSA
from ...core.jwt import require_admin

router = APIRouter(prefix="/skills", tags=["admin-skills"])

def _db(req: Request) -> Session:
    """Lấy Session từ req.state.db"""
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
    name: str
    category: Optional[str] = None
    level: Optional[float] = None
    importance: Optional[float] = None
    source: Optional[str] = None

class SkillUpdateRequest(BaseModel):
    onet_code: Optional[str] = None
    ksa_type: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    level: Optional[float] = None
    importance: Optional[float] = None
    source: Optional[str] = None

@router.get("", response_model=SkillsListResponse)
def get_skills(
    page: int = Query(1, ge=1, description="Số trang"),
    per_page: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc category"),
    ksa_type: Optional[str] = Query(None, description="Lọc theo loại KSA"),
    onet_code: Optional[str] = Query(None, description="Lọc theo ONET code"),
    sort_by: str = Query("name", description="Sắp xếp theo field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Thứ tự sắp xếp"),
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """
    Lấy danh sách skills với phân trang và tìm kiếm
    """
    try:
        # Base query - sử dụng subquery để lấy ID nhỏ nhất cho mỗi combination unique
        subquery = db.query(
            func.min(CareerKSA.id).label('min_id')
        ).group_by(
            CareerKSA.onet_code,
            CareerKSA.ksa_type, 
            CareerKSA.name
        ).subquery()
        
        # Query chính chỉ lấy các records có ID trong subquery
        query = db.query(CareerKSA).filter(
            CareerKSA.id.in_(db.query(subquery.c.min_id))
        )
        
        # Tìm kiếm
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    CareerKSA.name.ilike(search_term),
                    CareerKSA.category.ilike(search_term),
                    CareerKSA.onet_code.ilike(search_term)
                )
            )
        
        # Lọc theo KSA type (case-insensitive)
        if ksa_type:
            query = query.filter(func.lower(CareerKSA.ksa_type) == ksa_type.lower())
        
        # Lọc theo ONET code
        if onet_code:
            query = query.filter(CareerKSA.onet_code == onet_code)
        
        # Đếm tổng số
        total = query.count()
        
        # Sắp xếp
        sort_column = getattr(CareerKSA, sort_by, CareerKSA.name)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Phân trang
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # Tính tổng số trang
        total_pages = (total + per_page - 1) // per_page
        
        # Chuyển đổi sang response format
        skill_items = []
        for item in items:
            skill_items.append(SkillResponse(
                id=item.id,
                onet_code=item.onet_code,
                ksa_type=item.ksa_type,
                name=item.name,
                category=item.category,
                level=float(item.level) if item.level else None,
                importance=float(item.importance) if item.importance else None,
                source=item.source,
                fetched_at=item.fetched_at.isoformat() if item.fetched_at else None
            ))
        
        return SkillsListResponse(
            items=skill_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        print(f"[skills] get_skills error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get skills"
        )

@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(
    skill_id: int,
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy thông tin chi tiết một skill"""
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    return SkillResponse(
        id=skill.id,
        onet_code=skill.onet_code,
        ksa_type=skill.ksa_type,
        name=skill.name,
        category=skill.category,
        level=float(skill.level) if skill.level else None,
        importance=float(skill.importance) if skill.importance else None,
        source=skill.source,
        fetched_at=skill.fetched_at.isoformat() if skill.fetched_at else None
    )

@router.post("", response_model=SkillResponse)
def create_skill(
    skill_data: SkillCreateRequest,
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Tạo skill mới"""
    try:
        skill = CareerKSA(
            onet_code=skill_data.onet_code,
            ksa_type=skill_data.ksa_type,
            name=skill_data.name,
            category=skill_data.category,
            level=skill_data.level,
            importance=skill_data.importance,
            source=skill_data.source or "manual"
        )
        
        db.add(skill)
        db.commit()
        db.refresh(skill)
        
        return SkillResponse(
            id=skill.id,
            onet_code=skill.onet_code,
            ksa_type=skill.ksa_type,
            name=skill.name,
            category=skill.category,
            level=float(skill.level) if skill.level else None,
            importance=float(skill.importance) if skill.importance else None,
            source=skill.source,
            fetched_at=skill.fetched_at.isoformat() if skill.fetched_at else None
        )
        
    except Exception as e:
        db.rollback()
        print(f"[skills] create_skill error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create skill"
        )

@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    skill_data: SkillUpdateRequest,
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Cập nhật skill"""
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    try:
        # Cập nhật các field được gửi
        update_data = skill_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(skill, field, value)
        
        db.commit()
        db.refresh(skill)
        
        return SkillResponse(
            id=skill.id,
            onet_code=skill.onet_code,
            ksa_type=skill.ksa_type,
            name=skill.name,
            category=skill.category,
            level=float(skill.level) if skill.level else None,
            importance=float(skill.importance) if skill.importance else None,
            source=skill.source,
            fetched_at=skill.fetched_at.isoformat() if skill.fetched_at else None
        )
        
    except Exception as e:
        db.rollback()
        print(f"[skills] update_skill error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update skill"
        )

@router.delete("/{skill_id}")
def delete_skill(
    skill_id: int,
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Xóa skill"""
    skill = db.query(CareerKSA).filter(CareerKSA.id == skill_id).first()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    try:
        db.delete(skill)
        db.commit()
        
        return {"message": "Skill deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"[skills] delete_skill error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete skill"
        )

@router.get("/stats/summary")
def get_skills_stats(
    db: Session = Depends(_db),
    _: dict = Depends(require_admin),
):
    """Lấy thống kê tổng quan về skills"""
    try:
        total_skills = db.query(CareerKSA).count()
        
        # Thống kê theo KSA type
        ksa_stats = db.query(
            CareerKSA.ksa_type,
            func.count(CareerKSA.id).label('count')
        ).group_by(CareerKSA.ksa_type).all()
        
        # Thống kê theo ONET code (top 10)
        onet_stats = db.query(
            CareerKSA.onet_code,
            func.count(CareerKSA.id).label('count')
        ).group_by(CareerKSA.onet_code).order_by(
            func.count(CareerKSA.id).desc()
        ).limit(10).all()
        
        return {
            "total_skills": total_skills,
            "ksa_type_distribution": [
                {"type": row[0], "count": row[1]} for row in ksa_stats
            ],
            "top_onet_codes": [
                {"onet_code": row[0], "count": row[1]} for row in onet_stats
            ]
        }
        
    except Exception as e:
        print(f"[skills] get_skills_stats error: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get skills stats"
        )