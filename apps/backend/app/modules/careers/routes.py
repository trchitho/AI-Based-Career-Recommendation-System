# -*- coding: utf-8 -*-
"""
Career Routes - API endpoints cho Enhanced Career Groups và Levels
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from ...core.db import get_db
from .services_enhanced import (
    EnhancedCareerGroupService,
    EnhancedCareerLevelService,
    EnhancedInterviewService
)
from .schemas import (
    CareerGroupOut, CareerGroupLevelOut, CareerOut,
    CareerGroupWithCareersOut, CareerGroupWithLevelsOut,
    CareerLevelMappingOut, CareerGroupsResponse,
    InterviewStartRequest, InterviewContextOut
)

router = APIRouter(tags=["careers"])


# ===== DEBUG ENDPOINT =====

@router.get("/debug")
def debug_endpoint():
    """Debug endpoint để test routing"""
    return {"message": "Enhanced Career Groups & Levels API is working!", "version": "2.0"}


# ===== CAREER LOOKUP =====

@router.get("/lookup/{onet_code}")
def lookup_career_group(onet_code: str, db: Session = Depends(get_db)):
    """Tìm group slug từ onet_code để redirect"""
    try:
        # Handle both ONET code formats: 39-5094-00 and 39-5094.00
        onet_dash = onet_code  # 39-5094-00
        onet_dot = onet_code.replace('-', '.', 1).replace('-', '.', 1)  # 39-5094.00
        
        query = text("""
            SELECT cg.slug as group_slug, c.slug as career_slug, c.title_vi, c.title_en, c.onet_code
            FROM core.careers c
            JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            JOIN core.career_groups cg ON cgm.group_id = cg.id
            WHERE c.onet_code = :onet_dash OR c.onet_code = :onet_dot OR c.slug = :onet_code
            LIMIT 1
        """)
        
        result = db.execute(query, {
            "onet_dash": onet_dash,
            "onet_dot": onet_dot,
            "onet_code": onet_code
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Career with onet_code {onet_code} not found")
        
        return {
            "onet_code": onet_code,
            "group_slug": result.group_slug,
            "career_slug": result.career_slug,
            "title": result.title_vi or result.title_en,
            "redirect_url": f"/careers/{result.group_slug}/{onet_code}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ===== CAREER GROUPS =====

@router.get("/groups", response_model=CareerGroupsResponse)
def get_career_groups(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lấy tất cả nhóm ngành nghề với pagination"""
    try:
        service = EnhancedCareerGroupService(db)
        groups = service.get_all_groups()
        
        # Apply pagination
        total = len(groups)
        paginated_groups = groups[offset:offset + limit]
        
        return {
            "items": paginated_groups,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/groups/{group_slug}", response_model=CareerGroupWithCareersOut)
def get_careers_by_group(
    group_slug: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lấy danh sách nghề theo nhóm ngành"""
    service = EnhancedCareerGroupService(db)
    return service.get_careers_by_group(group_slug, limit, offset)


@router.get("/groups/{group_slug}/careers")
def get_careers_by_group_with_search(
    group_slug: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Search query"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách nghề theo nhóm ngành với search"""
    service = EnhancedCareerGroupService(db)
    result = service.get_careers_by_group(group_slug, limit, offset, q)
    
    # Transform to match frontend expectations
    return {
        "items": [
            {
                "id": str(career.id),
                "slug": career.slug,
                "title": career.title,
                "title_vn": career.title_vn,
                "title_en": career.title_en,
                "short_desc": career.short_desc,
                "description_vn": career.description_vn,
                "onet_code": career.onet_code,
                "industry_category": career.industry_category
            }
            for career in result.careers
        ],
        "total": result.total_careers,
        "limit": limit,
        "offset": offset,
        "group": {
            "id": result.id,
            "name": result.name,
            "slug": result.slug,
            "description": result.description
        }
    }


@router.get("/groups/{group_slug}/levels", response_model=CareerGroupWithLevelsOut)
def get_group_with_levels(group_slug: str, db: Session = Depends(get_db)):
    """Lấy nhóm ngành với danh sách levels"""
    service = EnhancedCareerGroupService(db)
    return service.get_group_with_levels(group_slug)


# ===== CAREER LEVELS =====

@router.get("/groups/{group_slug}/levels/list", response_model=List[CareerGroupLevelOut])
def get_levels_for_group(group_slug: str, db: Session = Depends(get_db)):
    """Lấy tất cả levels cho một nhóm ngành"""
    service = EnhancedCareerLevelService(db)
    return service.get_levels_for_group(group_slug)


@router.get("/groups/{group_slug}/levels/{level_slug}", response_model=CareerGroupLevelOut)
def get_level_detail(group_slug: str, level_slug: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một level"""
    service = EnhancedCareerLevelService(db)
    level = service.get_level_by_slug(group_slug, level_slug)
    if not level:
        raise HTTPException(status_code=404, detail="Career level not found")
    return level


@router.get("/{career_id}/levels", response_model=List[CareerLevelMappingOut])
def get_levels_for_career(career_id: int, db: Session = Depends(get_db)):
    """Lấy các levels đã được map cho một career"""
    service = EnhancedCareerLevelService(db)
    return service.get_levels_for_career(career_id)


# ===== INTERVIEW INTEGRATION =====

@router.post("/interview/context", response_model=InterviewContextOut)
def build_interview_context(
    request: InterviewStartRequest,
    db: Session = Depends(get_db)
):
    """Xây dựng context cho AI Interview với enhanced level"""
    service = EnhancedInterviewService(db)
    return service.build_interview_context(request.career_id, request.level_slug)


# ===== LEGACY COMPATIBILITY =====

@router.get("", response_model=List[CareerOut])
def get_careers(
    group: Optional[str] = Query(None, description="Filter by group slug"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Search query"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách nghề nghiệp (với filter theo group và search)
    Endpoint này để tương thích với frontend hiện tại
    """
    if group:
        # Redirect to group-specific endpoint
        service = EnhancedCareerGroupService(db)
        result = service.get_careers_by_group(group, limit, offset, q)
        return result.careers
    
    # Trả về tất cả careers (fallback) với search
    from sqlalchemy import text
    
    # Build search condition
    search_condition = ""
    params = {"limit": limit, "offset": offset}
    
    if q and q.strip():
        search_condition = """
        WHERE (
            LOWER(c.title_vi) LIKE LOWER(:search) OR 
            LOWER(c.title_en) LIKE LOWER(:search) OR
            LOWER(c.short_desc_vi) LIKE LOWER(:search) OR
            LOWER(c.short_desc_en) LIKE LOWER(:search) OR
            LOWER(cg.name) LIKE LOWER(:search)
        )
        """
        params["search"] = f"%{q.strip()}%"
    
    query = text(f"""
        SELECT 
            c.id, c.slug, c.title_vi, c.title_en, c.short_desc_vi, c.short_desc_en,
            c.description_vi, c.description_en,
            c.onet_code, c.industry_category,
            cg.name as group_name, cg.slug as group_slug
        FROM core.careers c
        LEFT JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
        LEFT JOIN core.career_groups cg ON cgm.group_id = cg.id
        {search_condition}
        ORDER BY c.title_vi, c.title_en
        LIMIT :limit OFFSET :offset
    """)
    
    result = db.execute(query, params).fetchall()
    
    careers = []
    for row in result:
        # Fallback title logic
        fallback = (row.slug or "").replace("-", " ").title() if row.slug else ""
        display_title = row.title_vi or row.title_en or fallback
        short_desc = row.short_desc_vi or row.short_desc_en or ""
        
        group_data = None
        if row.group_name:
            group_data = {
                "id": 0,  # Placeholder
                "name": row.group_name,
                "slug": row.group_slug,
                "description": None,
                "onet_major_group": None,
                "created_at": None,
                "career_count": None,
                "level_count": None
            }
        
        career_data = {
            "id": row.id,
            "slug": row.slug,
            "title": display_title,
            "title_vn": row.title_vi,
            "title_en": row.title_en,
            "short_desc": row.short_desc_vi or row.short_desc_en or "",
            "description_vn": row.description_vi or row.description_en or row.short_desc_vi or row.short_desc_en or "",
            "onet_code": row.onet_code,
            "industry_category": row.industry_category,
            "group": group_data,
            "levels": None
        }
        careers.append(CareerOut(**career_data))
    
    return careers