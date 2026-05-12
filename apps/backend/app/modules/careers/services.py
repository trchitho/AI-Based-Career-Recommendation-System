# -*- coding: utf-8 -*-
"""
Career Services - Business logic cho Career Groups và Levels
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

from .models import CareerGroup, CareerGroupLevel, CareerGroupMapping
from .schemas import (
    CareerGroupCreate, CareerGroupOut,
    CareerOut, CareerGroupWithCareersOut, InterviewContextOut
)
from ..content.models import Career


class CareerGroupService:
    """Service cho Career Groups"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all_groups(self) -> List[CareerGroupOut]:
        """Lấy tất cả career groups với số lượng careers"""
        query = text("""
            SELECT 
                cg.*,
                COUNT(cgm.career_id) as career_count
            FROM core.career_groups cg
            LEFT JOIN core.career_group_mapping cgm ON cg.id = cgm.group_id
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
                "career_count": row.career_count or 0
            }
            groups.append(CareerGroupOut(**group_data))
        
        return groups
    
    def get_group_by_slug(self, slug: str) -> Optional[CareerGroupOut]:
        """Lấy group theo slug"""
        group = self.db.query(CareerGroup).filter(CareerGroup.slug == slug).first()
        if not group:
            return None
        
        # Đếm số careers trong group
        career_count = self.db.query(func.count(CareerGroupMapping.career_id))\
            .filter(CareerGroupMapping.group_id == group.id).scalar()
        
        group_dict = group.to_dict()
        group_dict["career_count"] = career_count
        
        return CareerGroupOut(**group_dict)
    
    def get_careers_by_group(self, group_slug: str, limit: int = 50, offset: int = 0) -> CareerGroupWithCareersOut:
        """Lấy careers theo group"""
        group = self.get_group_by_slug(group_slug)
        if not group:
            raise HTTPException(status_code=404, detail="Career group not found")
        
        # Lấy careers trong group
        query = text("""
            SELECT 
                c.id, c.slug, c.title_vi, c.title_en, c.short_desc_vi, c.short_desc_en,
                c.description_vi, c.description_en,
                c.onet_code, c.industry_category
            FROM core.careers c
            JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            WHERE cgm.group_id = :group_id
            ORDER BY c.title_vi, c.title_en
            LIMIT :limit OFFSET :offset
        """)
        
        result = self.db.execute(query, {
            "group_id": group.id,
            "limit": limit,
            "offset": offset
        }).fetchall()
        
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
                "industry_category": row.industry_category,
                "group": group
            }
            careers.append(CareerOut(**career_data))
        
        group_with_careers = group.dict()
        group_with_careers["careers"] = careers
        
        return CareerGroupWithCareersOut(**group_with_careers)


class InterviewService:
    """Service cho AI Interview với Level context"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def build_interview_context(self, career_id: int, level_slug: str) -> InterviewContextOut:
        """Xây dựng context cho AI Interview"""
        # Lấy thông tin career
        career_query = text("""
            SELECT 
                c.id, c.title_vi, c.title_en, c.slug, c.onet_code,
                cg.name as group_name
            FROM core.careers c
            LEFT JOIN core.career_group_mapping cgm ON c.id = cgm.career_id
            LEFT JOIN core.career_groups cg ON cgm.group_id = cg.id
            WHERE c.id = :career_id
        """)
        
        career_result = self.db.execute(career_query, {"career_id": career_id}).fetchone()
        if not career_result:
            raise HTTPException(status_code=404, detail="Career not found")
        
        # Lấy thông tin level từ enhanced system
        level_query = text("""
            SELECT cgl.level_name_vi, cgl.level_name_en, cgl.description_vi, 
                   cgl.min_exp_years, cgl.max_exp_years
            FROM core.career_group_levels cgl
            WHERE cgl.level_slug = :level_slug
            LIMIT 1
        """)
        
        level_result = self.db.execute(level_query, {"level_slug": level_slug}).fetchone()
        if not level_result:
            raise HTTPException(status_code=404, detail="Career level not found")
        
        # Lấy skills cho career
        skills_query = text("""
            SELECT element_name_vi, element_name_en
            FROM core.career_ksas
            WHERE onet_code = :onet_code
            ORDER BY level_value DESC
            LIMIT 10
        """)
        
        skills_result = self.db.execute(skills_query, {"onet_code": career_result.onet_code}).fetchall()
        skills = [row.element_name_vi or row.element_name_en for row in skills_result if row.element_name_vi or row.element_name_en]
        
        # Lấy tasks cho career
        tasks_query = text("""
            SELECT task_vi, task_en
            FROM core.career_tasks
            WHERE onet_code = :onet_code
            LIMIT 5
        """)
        
        tasks_result = self.db.execute(tasks_query, {"onet_code": career_result.onet_code}).fetchall()
        tasks = [row.task_vi or row.task_en for row in tasks_result if row.task_vi or row.task_en]
        
        # Xây dựng interview focus dựa trên level
        interview_focus = self._get_interview_focus_by_level(level_slug)
        
        # Xây dựng experience range
        experience_range = f"{level_result.min_exp_years}-{level_result.max_exp_years or '10+'} năm"
        
        # Tên career
        career_title = career_result.title_vi or career_result.title_en or career_result.slug.replace("-", " ").title()
        
        return InterviewContextOut(
            career=career_title,
            group=career_result.group_name or "Chưa phân loại",
            level=level_result.level_name_vi or level_result.level_name_en,
            level_description=level_result.description_vi or "",
            skills=skills,
            tasks=tasks,
            experience_range=experience_range,
            interview_focus=interview_focus
        )
    
    def _get_interview_focus_by_level(self, level_slug: str) -> List[str]:
        """Xác định focus của interview dựa trên level"""
        focus_mapping = {
            "fresher": [
                "Khả năng học hỏi và thích ứng",
                "Kiến thức cơ bản về ngành",
                "Động lực và thái độ làm việc",
                "Kỹ năng giao tiếp cơ bản"
            ],
            "junior": [
                "Kỹ năng thực hiện công việc cụ thể",
                "Khả năng giải quyết vấn đề cơ bản",
                "Làm việc nhóm và nhận hướng dẫn",
                "Hiểu biết về quy trình làm việc"
            ],
            "middle": [
                "Kỹ năng chuyên môn sâu",
                "Khả năng làm việc độc lập",
                "Giải quyết vấn đề phức tạp",
                "Hướng dẫn junior members"
            ],
            "senior": [
                "Thiết kế hệ thống và kiến trúc",
                "Khả năng đưa ra quyết định kỹ thuật",
                "Leadership và mentoring",
                "Đánh giá trade-offs và rủi ro"
            ],
            "lead": [
                "Quản lý team và dự án",
                "Chiến lược kỹ thuật dài hạn",
                "Stakeholder management",
                "Business impact và ROI"
            ]
        }
        
        return focus_mapping.get(level_slug, focus_mapping["junior"])