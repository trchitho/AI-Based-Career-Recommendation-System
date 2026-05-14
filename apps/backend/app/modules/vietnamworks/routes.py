"""
VietnamWorks Job Categories API Routes
Cung cấp API endpoints để truy cập danh mục ngành nghề từ VietnamWorks
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from app.core.db import get_db

router = APIRouter()

# Simple test endpoint
@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "VietnamWorks API is working!", "status": "ok"}

# Pydantic models
class VietnamWorksCategory(BaseModel):
    id: int
    name: str
    slug: str
    vietnamese_name: str
    category_group: str
    description: Optional[str] = None
    vietnamworks_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

    class Config:
        from_attributes = True

class CategoryGroup(BaseModel):
    group_name: str
    category_count: int
    categories: List[VietnamWorksCategory]

class CareerCategoryMapping(BaseModel):
    career_id: int
    vietnamworks_category_id: int
    confidence_score: float
    mapping_method: str

    class Config:
        from_attributes = True

# API Endpoints

@router.get("/categories", response_model=List[VietnamWorksCategory])
async def get_all_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    group: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách tất cả các ngành nghề từ VietnamWorks
    """
    query = """
        SELECT 
            id, name, slug, vietnamese_name, category_group, 
            description, vietnamworks_url, is_active, sort_order
        FROM core.vietnamworks_categories
        WHERE 1=1
    """
    
    params = {}
    
    if group:
        query += " AND category_group = :group"
        params["group"] = group
    
    if active_only:
        query += " AND is_active = true"
    
    query += " ORDER BY category_group, sort_order, vietnamese_name"
    query += " LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params).fetchall()
    
    return [VietnamWorksCategory(**dict(row)) for row in result]

@router.get("/categories/groups", response_model=List[CategoryGroup])
def get_category_groups(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách nhóm ngành nghề và số lượng ngành nghề trong mỗi nhóm
    """
    query = """
        SELECT 
            category_group,
            COUNT(*) as category_count
        FROM core.vietnamworks_categories
        WHERE 1=1
    """
    
    params = {}
    
    if active_only:
        query += " AND is_active = true"
    
    query += " GROUP BY category_group ORDER BY category_count DESC, category_group"
    
    groups_result = db.execute(text(query), params).fetchall()
    
    groups = []
    for group_row in groups_result:
        group_name = group_row.category_group
        category_count = group_row.category_count
        
        # Get categories for this group
        cat_query = """
            SELECT 
                id, name, slug, vietnamese_name, category_group, 
                description, vietnamworks_url, is_active, sort_order
            FROM core.vietnamworks_categories
            WHERE category_group = :group_name
        """
        
        cat_params = {"group_name": group_name}
        
        if active_only:
            cat_query += " AND is_active = true"
        
        cat_query += " ORDER BY sort_order, vietnamese_name"
        
        categories_result = db.execute(text(cat_query), cat_params).fetchall()
        categories = [VietnamWorksCategory(**dict(row._mapping)) for row in categories_result]
        
        groups.append(CategoryGroup(
            group_name=group_name,
            category_count=category_count,
            categories=categories
        ))
    
    return groups

@router.get("/categories/{category_id}", response_model=VietnamWorksCategory)
async def get_category_by_id(
    category_id: int,
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết một ngành nghề theo ID
    """
    query = """
        SELECT 
            id, name, slug, vietnamese_name, category_group, 
            description, vietnamworks_url, is_active, sort_order
        FROM core.vietnamworks_categories
        WHERE id = :category_id
    """
    
    result = db.execute(text(query), {"category_id": category_id}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return VietnamWorksCategory(**dict(result))

@router.get("/categories/slug/{slug}", response_model=VietnamWorksCategory)
async def get_category_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin chi tiết một ngành nghề theo slug
    """
    query = """
        SELECT 
            id, name, slug, vietnamese_name, category_group, 
            description, vietnamworks_url, is_active, sort_order
        FROM core.vietnamworks_categories
        WHERE slug = :slug AND is_active = true
    """
    
    result = db.execute(text(query), {"slug": slug}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return VietnamWorksCategory(**dict(result))

@router.get("/categories/search", response_model=List[VietnamWorksCategory])
async def search_categories(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Tìm kiếm ngành nghề theo tên (tiếng Anh hoặc tiếng Việt)
    """
    query = """
        SELECT 
            id, name, slug, vietnamese_name, category_group, 
            description, vietnamworks_url, is_active, sort_order
        FROM core.vietnamworks_categories
        WHERE is_active = true
        AND (
            LOWER(name) ILIKE LOWER(:search) OR
            LOWER(vietnamese_name) ILIKE LOWER(:search) OR
            LOWER(description) ILIKE LOWER(:search)
        )
        ORDER BY 
            CASE 
                WHEN LOWER(vietnamese_name) ILIKE LOWER(:search) THEN 1
                WHEN LOWER(name) ILIKE LOWER(:search) THEN 2
                ELSE 3
            END,
            vietnamese_name
        LIMIT :limit
    """
    
    search_pattern = f"%{q}%"
    result = db.execute(text(query), {"search": search_pattern, "limit": limit}).fetchall()
    
    return [VietnamWorksCategory(**dict(row)) for row in result]

@router.get("/mapping/career/{career_id}", response_model=List[CareerCategoryMapping])
async def get_career_mappings(
    career_id: int,
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách mapping giữa một career và VietnamWorks categories
    """
    query = """
        SELECT 
            cvm.career_id,
            cvm.vietnamworks_category_id,
            cvm.confidence_score,
            cvm.mapping_method,
            vwc.vietnamese_name as category_name,
            vwc.slug as category_slug
        FROM core.career_vietnamworks_mapping cvm
        JOIN core.vietnamworks_categories vwc ON cvm.vietnamworks_category_id = vwc.id
        WHERE cvm.career_id = :career_id
        AND cvm.confidence_score >= :min_confidence
        AND vwc.is_active = true
        ORDER BY cvm.confidence_score DESC
    """
    
    result = db.execute(text(query), {"career_id": career_id, "min_confidence": min_confidence}).fetchall()
    
    return [CareerCategoryMapping(**dict(row)) for row in result]

@router.get("/mapping/category/{category_id}", response_model=List[CareerCategoryMapping])
async def get_category_mappings(
    category_id: int,
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách careers được mapping với một VietnamWorks category
    """
    query = """
        SELECT 
            cvm.career_id,
            cvm.vietnamworks_category_id,
            cvm.confidence_score,
            cvm.mapping_method,
            c.title_en as career_title_en,
            c.title_vi as career_title_vi
        FROM core.career_vietnamworks_mapping cvm
        JOIN core.careers c ON cvm.career_id = c.id
        WHERE cvm.vietnamworks_category_id = :category_id
        AND cvm.confidence_score >= :min_confidence
        ORDER BY cvm.confidence_score DESC
        LIMIT :limit
    """
    
    result = db.execute(text(query), {"category_id": category_id, "min_confidence": min_confidence, "limit": limit}).fetchall()
    
    return [CareerCategoryMapping(**dict(row)) for row in result]

@router.get("/stats")
async def get_vietnamworks_stats(db: Session = Depends(get_db)):
    """
    Lấy thống kê về VietnamWorks categories
    """
    stats_query = """
        SELECT 
            COUNT(*) as total_categories,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_categories,
            COUNT(DISTINCT category_group) as total_groups
        FROM core.vietnamworks_categories
    """
    
    mapping_query = """
        SELECT 
            COUNT(*) as total_mappings,
            AVG(confidence_score) as avg_confidence,
            COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence_mappings
        FROM core.career_vietnamworks_mapping
    """
    
    stats_result = db.execute(text(stats_query)).fetchone()
    mapping_result = db.execute(text(mapping_query)).fetchone()
    
    return {
        "categories": {
            "total": stats_result.total_categories,
            "active": stats_result.active_categories,
            "groups": stats_result.total_groups
        },
        "mappings": {
            "total": mapping_result.total_mappings,
            "avg_confidence": float(mapping_result.avg_confidence) if mapping_result.avg_confidence else 0.0,
            "high_confidence": mapping_result.high_confidence_mappings
        }
    }

@router.post("/mapping/auto")
async def auto_map_careers_to_categories(
    min_confidence: float = Query(0.7, ge=0.0, le=1.0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Tự động mapping careers với VietnamWorks categories dựa trên tên và industry
    """
    # Get unmapped careers
    careers_query = """
        SELECT 
            c.id as career_id,
            c.title_en,
            c.title_vi,
            c.industry_category
        FROM core.careers c
        WHERE c.id NOT IN (
            SELECT DISTINCT career_id FROM core.career_vietnamworks_mapping
        )
        LIMIT :limit
    """
    
    careers_result = db.execute(text(careers_query), {"limit": limit}).fetchall()
    
    mappings_created = 0
    
    for career in careers_result:
        # Try to find best matching category
        match_query = """
            SELECT 
                id as vietnamworks_category_id,
                CASE 
                    WHEN LOWER(vietnamese_name) ILIKE LOWER(:title_vi_pattern) THEN 0.9
                    WHEN LOWER(name) ILIKE LOWER(:title_en_pattern) THEN 0.9
                    WHEN LOWER(vietnamese_name) ILIKE ANY(:vi_keywords) THEN 0.8
                    WHEN LOWER(name) ILIKE ANY(:en_keywords) THEN 0.8
                    WHEN industry_match = true THEN 0.7
                    ELSE 0.5
                END as confidence_score
            FROM core.vietnamworks_categories,
            LATERAL (
                SELECT 
                    CASE WHEN LOWER(:industry_category) = LOWER(category_group) THEN true ELSE false END as industry_match
            ) industry_match
            WHERE is_active = true
            AND (
                LOWER(vietnamese_name) ILIKE LOWER(:title_vi_pattern) OR
                LOWER(name) ILIKE LOWER(:title_en_pattern) OR
                LOWER(vietnamese_name) ILIKE ANY(:vi_keywords) OR
                LOWER(name) ILIKE ANY(:en_keywords) OR
                industry_match = true
            )
            ORDER BY confidence_score DESC
            LIMIT 1
        """
        
        title_en_pattern = f"%{career.title_en.lower().split()[0]}%"
        title_vi_pattern = f"%{career.title_vi.lower().split()[0]}%"
        
        # Extract keywords from career titles
        en_keywords = [f"%{word}%" for word in career.title_en.lower().split() if len(word) > 3]
        vi_keywords = [f"%{word}%" for word in career.title_vi.lower().split() if len(word) > 3]
        
        params = {
            "title_en_pattern": title_en_pattern,
            "title_vi_pattern": title_vi_pattern,
            "en_keywords": en_keywords if en_keywords else ["%"],
            "vi_keywords": vi_keywords if vi_keywords else ["%"],
            "industry_category": career.industry_category
        }
        
        try:
            match_result = db.execute(text(match_query), params).fetchone()
            
            if match_result and match_result.confidence_score >= min_confidence:
                # Insert mapping
                insert_query = """
                    INSERT INTO core.career_vietnamworks_mapping 
                    (career_id, vietnamworks_category_id, confidence_score, mapping_method)
                    VALUES (:career_id, :category_id, :confidence, 'auto')
                    ON CONFLICT (career_id, vietnamworks_category_id) DO NOTHING
                """
                
                db.execute(text(insert_query), {
                    "career_id": career.career_id,
                    "category_id": match_result.vietnamworks_category_id,
                    "confidence": match_result.confidence_score
                })
                
                mappings_created += 1
                
        except Exception as e:
            # Skip this career if matching fails
            continue
    
    db.commit()
    
    return {
        "careers_processed": len(careers_result),
        "mappings_created": mappings_created,
        "min_confidence_used": min_confidence
    }
