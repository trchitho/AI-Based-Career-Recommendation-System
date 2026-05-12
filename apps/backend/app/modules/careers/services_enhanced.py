# -*- coding: utf-8 -*-
"""
Enhanced Career Services - Business logic cho Enhanced Career Levels
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

from .models import CareerGroup, CareerGroupLevel, CareerLevelMapping, CareerGroupMapping
from .schemas import (
    CareerGroupOut, CareerGroupLevelOut, CareerLevelMappingOut,
    CareerOut, CareerGroupWithCareersOut, CareerGroupWithLevelsOut,
    InterviewContextOut
)
from ..content.models import Career


class EnhancedCareerGroupService:
    """Service cho Career Groups với Enhanced Levels"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all_groups(self) -> List[CareerGroupOut]:
        """Lấy tất cả career groups với số lượng careers và levels"""
        query = text("""
            SELECT 
                cg.*,
                COUNT(DISTINCT cgm.career_id) as career_count,
                COUNT(DISTINCT cgl.id) as level_count
            FROM core.career_groups cg
            LEFT JOIN core.career_group_mapping cgm ON cg.id = cgm.group_id
            LEFT JOIN core.career_group_levels cgl ON cg.id = cgl.group_id
            GROUP BY cg.id, cg.name, cg.slug, cg.description, cg.onet_major_group, cg.created_at
            ORDER BY cg.name
        """)
        
        result = self.db.execute(query).fetchall()
        
        groups = []
        for row in result:
            group_data = {
                "id": row.id,
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "onet_major_group": row.onet_major_group,
                "created_at": row.created_at,
                "career_count": row.career_count or 0,
                "level_count": row.level_count or 0
            }
            groups.append(CareerGroupOut(**group_data))
        
        return groups
    
    def get_group_with_levels(self, slug: str) -> CareerGroupWithLevelsOut:
        """Lấy group với danh sách levels"""
        group = self.db.query(CareerGroup).filter(CareerGroup.slug == slug).first()
        if not group:
            raise HTTPException(status_code=404, detail="Career group not found")
        
        # Get levels for this group
        levels = self.db.query(CareerGroupLevel)\
            .filter(CareerGroupLevel.group_id == group.id)\
            .order_by(CareerGroupLevel.level_order).all()
        
        # Count careers
        career_count = self.db.query(func.count(CareerGroupMapping.career_id))\
            .filter(CareerGroupMapping.group_id == group.id).scalar()
        
        group_dict = group.to_dict()
        group_dict["career_count"] = career_count
        group_dict["level_count"] = len(levels)
        group_dict["levels"] = [CareerGroupLevelOut(**level.to_dict()) for level in levels]
        
        return CareerGroupWithLevelsOut(**group_dict)
    
    def get_careers_by_group(self, group_slug: str, limit: int = 50, offset: int = 0, search_query: Optional[str] = None) -> CareerGroupWithCareersOut:
        """Lấy careers theo group với search"""
        group_with_levels = self.get_group_with_levels(group_slug)
        
        # Build search condition
        search_condition = ""
        params = {
            "group_id": group_with_levels.id,
            "limit": limit,
            "offset": offset
        }
        
        if search_query and search_query.strip():
            search_condition = """
            AND (
                LOWER(c.title_vi) LIKE LOWER(:search) OR 
                LOWER(c.title_en) LIKE LOWER(:search) OR
                LOWER(c.short_desc_vi) LIKE LOWER(:search) OR
                LOWER(c.short_desc_en) LIKE LOWER(:search)
            )
            """
            params["search"] = f"%{search_query.strip()}%"
        
        # Lấy careers trong group với search
        query = text(f"""
            SELECT 
                c.id, c.slug, c.title_vi, c.title_en, c.short_desc_vi, c.short_desc_en,
                c.description_vi, c.description_en,
                c.onet_code, c.industry_category
            FROM core.careers c
            JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            WHERE cgm.group_id = :group_id
            {search_condition}
            ORDER BY c.title_vi, c.title_en
            LIMIT :limit OFFSET :offset
        """)
        
        result = self.db.execute(query, params).fetchall()
        
        # Count total careers for pagination
        count_query = text(f"""
            SELECT COUNT(*)
            FROM core.careers c
            JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            WHERE cgm.group_id = :group_id
            {search_condition}
        """)
        
        count_params = {"group_id": group_with_levels.id}
        if search_query and search_query.strip():
            count_params["search"] = f"%{search_query.strip()}%"
        
        total_careers = self.db.execute(count_query, count_params).scalar()
        
        careers = []
        for row in result:
            # Fallback title logic
            fallback = (row.slug or "").replace("-", " ").title() if row.slug else ""
            display_title = row.title_vi or row.title_en or fallback
            short_desc = row.short_desc_vi or row.short_desc_en or ""
            
            career_data = {
                "id": row.id,
                "slug": row.slug,
                "title": display_title,
                "title_vn": row.title_vi,
                "title_en": row.title_en,
                "short_desc": row.short_desc_vi or row.short_desc_en or "",
                "description_vn": row.description_vi or row.description_en or row.short_desc_vi or row.short_desc_en or "",
                "onet_code": row.onet_code,
                "industry_category": row.industry_category
            }
            careers.append(CareerOut(**career_data))
        
        group_dict = group_with_levels.dict()
        group_dict["careers"] = careers
        group_dict["total_careers"] = total_careers
        
        return CareerGroupWithCareersOut(**group_dict)


class EnhancedCareerLevelService:
    """Service cho Enhanced Career Levels"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_levels_for_group(self, group_slug: str) -> List[CareerGroupLevelOut]:
        """Lấy tất cả levels cho một group"""
        group = self.db.query(CareerGroup).filter(CareerGroup.slug == group_slug).first()
        if not group:
            raise HTTPException(status_code=404, detail="Career group not found")
        
        levels = self.db.query(CareerGroupLevel)\
            .filter(CareerGroupLevel.group_id == group.id)\
            .order_by(CareerGroupLevel.level_order).all()
        
        return [CareerGroupLevelOut(**level.to_dict()) for level in levels]
    
    def get_level_by_slug(self, group_slug: str, level_slug: str) -> Optional[CareerGroupLevelOut]:
        """Lấy level theo group slug và level slug"""
        query = text("""
            SELECT cgl.*
            FROM core.career_group_levels cgl
            JOIN core.career_groups cg ON cgl.group_id = cg.id
            WHERE cg.slug = :group_slug AND cgl.level_slug = :level_slug
        """)
        
        result = self.db.execute(query, {
            "group_slug": group_slug,
            "level_slug": level_slug
        }).fetchone()
        
        if not result:
            return None
        
        level_data = {
            "id": result.id,
            "group_id": result.group_id,
            "level_order": result.level_order,
            "level_name_vi": result.level_name_vi,
            "level_name_en": result.level_name_en,
            "level_slug": result.level_slug,
            "min_exp_years": result.min_exp_years,
            "max_exp_years": result.max_exp_years,
            "job_zone_mapping": result.job_zone_mapping,
            "seniority_keywords": result.seniority_keywords or [],
            "description_vi": result.description_vi,
            "description_en": result.description_en,
            "created_at": result.created_at,
            "updated_at": result.updated_at
        }
        
        return CareerGroupLevelOut(**level_data)
    
    def get_levels_for_career(self, career_id: int) -> List[CareerLevelMappingOut]:
        """Lấy các levels đã được map cho một career"""
        query = text("""
            SELECT 
                clm.*,
                cgl.group_id,
                cgl.level_order,
                cgl.level_name_vi,
                cgl.level_name_en,
                cgl.level_slug,
                cgl.min_exp_years,
                cgl.max_exp_years,
                cgl.job_zone_mapping,
                cgl.seniority_keywords,
                cgl.description_vi,
                cgl.description_en
            FROM core.career_level_mapping clm
            JOIN core.career_group_levels cgl ON clm.group_level_id = cgl.id
            WHERE clm.career_id = :career_id
            ORDER BY clm.is_primary DESC, clm.confidence_score DESC, cgl.level_order
        """)
        
        result = self.db.execute(query, {"career_id": career_id}).fetchall()
        
        mappings = []
        for row in result:
            level_data = {
                "id": row.group_level_id,
                "group_id": row.group_id,
                "level_order": row.level_order,
                "level_name_vi": row.level_name_vi,
                "level_name_en": row.level_name_en,
                "level_slug": row.level_slug,
                "min_exp_years": row.min_exp_years,
                "max_exp_years": row.max_exp_years,
                "job_zone_mapping": row.job_zone_mapping,
                "seniority_keywords": row.seniority_keywords or [],
                "description_vi": row.description_vi,
                "description_en": row.description_en,
                "created_at": None,
                "updated_at": None
            }
            
            mapping_data = {
                "id": row.id,
                "career_id": row.career_id,
                "group_level_id": row.group_level_id,
                "is_primary": row.is_primary,
                "confidence_score": float(row.confidence_score),
                "detection_method": row.detection_method,
                "notes": row.notes,
                "level": CareerGroupLevelOut(**level_data)
            }
            mappings.append(CareerLevelMappingOut(**mapping_data))
        
        return mappings


class EnhancedInterviewService:
    """Service cho AI Interview với Enhanced Levels"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def build_interview_context(self, career_id: int, level_slug: str) -> InterviewContextOut:
        """Xây dựng context cho AI Interview với enhanced level"""
        # Lấy thông tin career
        career_query = text("""
            SELECT 
                c.id, c.title_vi, c.title_en, c.slug, c.onet_code,
                cg.name as group_name,
                cg.slug as group_slug
            FROM core.careers c
            LEFT JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            LEFT JOIN core.career_groups cg ON cgm.group_id = cg.id
            WHERE c.id = :career_id
        """)
        
        career_result = self.db.execute(career_query, {"career_id": career_id}).fetchone()
        if not career_result:
            raise HTTPException(status_code=404, detail="Career not found")
        
        # Lấy thông tin level
        level_query = text("""
            SELECT cgl.*
            FROM core.career_group_levels cgl
            JOIN core.career_groups cg ON cgl.group_id = cg.id
            WHERE cg.slug = :group_slug AND cgl.level_slug = :level_slug
        """)
        
        level_result = self.db.execute(level_query, {
            "group_slug": career_result.group_slug,
            "level_slug": level_slug
        }).fetchone()
        
        if not level_result:
            raise HTTPException(status_code=404, detail="Career level not found for this group")
        
        # Lấy skills cho career
        skills_query = text("""
            SELECT name_vi, name_en
            FROM core.career_ksas
            WHERE onet_code = :onet_code
            ORDER BY importance DESC, level DESC
            LIMIT 10
        """)
        
        skills_result = self.db.execute(skills_query, {"onet_code": career_result.onet_code}).fetchall()
        skills = [row.name_vi or row.name_en for row in skills_result if row.name_vi or row.name_en]
        
        # Lấy tasks cho career
        tasks_query = text("""
            SELECT task_vi, task_en
            FROM core.career_tasks
            WHERE onet_code = :onet_code
            ORDER BY importance DESC
            LIMIT 5
        """)
        
        tasks_result = self.db.execute(tasks_query, {"onet_code": career_result.onet_code}).fetchall()
        tasks = [row.task_vi or row.task_en for row in tasks_result if row.task_vi or row.task_en]
        
        # Xây dựng interview focus dựa trên level description
        interview_focus = self._parse_interview_focus(level_result.description_vi or level_result.description_en)
        
        # Xây dựng experience range
        max_exp_str = f"{level_result.max_exp_years}" if level_result.max_exp_years else "10+"
        experience_range = f"{level_result.min_exp_years}-{max_exp_str} năm"
        
        # Tên career
        career_title = career_result.title_vi or career_result.title_en or career_result.slug.replace("-", " ").title()
        
        return InterviewContextOut(
            career=career_title,
            group=career_result.group_name or "Chưa phân loại",
            level=level_result.level_name_vi,
            level_description=level_result.description_vi or level_result.description_en or "",
            skills=skills,
            tasks=tasks,
            experience_range=experience_range,
            interview_focus=interview_focus
        )
    
    def _parse_interview_focus(self, description: str) -> List[str]:
        """Parse interview focus from level description"""
        if not description:
            return ["Đánh giá kỹ năng chuyên môn", "Kinh nghiệm làm việc", "Khả năng giải quyết vấn đề"]
        
        # Simple parsing - split by common delimiters
        focuses = []
        for delimiter in [',', ';', '\n']:
            if delimiter in description:
                focuses = [f.strip() for f in description.split(delimiter) if f.strip()]
                break
        
        if not focuses:
            focuses = [description]
        
        return focuses[:5]  # Limit to 5 focus points
