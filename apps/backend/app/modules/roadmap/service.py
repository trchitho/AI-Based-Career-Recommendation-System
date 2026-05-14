"""
Roadmap Service - handles roadmap operations with multilingual support
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from .models import Roadmap, RoadmapMilestone, UserProgress
from ..content.models import Career


class RoadmapService:
    """Service for managing roadmaps with multilingual support"""
    
    @staticmethod
    def get_roadmap_by_career_id(
        session: Session, 
        career_id: int, 
        language: str = "vn"
    ) -> Optional[Dict[str, Any]]:
        """Get roadmap by career ID with language preference"""
        roadmap = session.execute(
            select(Roadmap).where(Roadmap.career_id == career_id)
        ).scalar_one_or_none()
        
        if not roadmap:
            return None
            
        return roadmap.to_dict(language)
    
    @staticmethod
    def create_roadmap(
        session: Session,
        career_id: int,
        title_vn: Optional[str] = None,
        title_en: Optional[str] = None
    ) -> Roadmap:
        """Create new roadmap with multilingual titles"""
        if not title_vn and not title_en:
            # Get career title as fallback
            career = session.execute(
                select(Career).where(Career.id == career_id)
            ).scalar_one_or_none()
            
            if career:
                career_dict = career.to_dict()
                title_vn = f"{career_dict.get('title', 'Career')} Roadmap"
                title_en = f"{career_dict.get('title', 'Career')} Roadmap"
            else:
                title_vn = f"Career {career_id} Roadmap"
        
        roadmap = Roadmap(
            career_id=career_id,
            title_vn=title_vn,
            title_en=title_en
        )
        session.add(roadmap)
        session.flush()
        return roadmap
    
    @staticmethod
    def update_roadmap_titles(
        session: Session,
        roadmap_id: int,
        title_vn: Optional[str] = None,
        title_en: Optional[str] = None
    ) -> Optional[Roadmap]:
        """Update roadmap titles"""
        roadmap = session.execute(
            select(Roadmap).where(Roadmap.id == roadmap_id)
        ).scalar_one_or_none()
        
        if not roadmap:
            return None
        
        if title_vn is not None:
            roadmap.title_vn = title_vn
        if title_en is not None:
            roadmap.title_en = title_en
            
        session.flush()
        return roadmap
    
    @staticmethod
    def get_roadmap_with_milestones(
        session: Session,
        career_id: int,
        language: str = "vn"
    ) -> Dict[str, Any]:
        """Get roadmap with milestones for a career"""
        # Get roadmap
        roadmap = session.execute(
            select(Roadmap).where(Roadmap.career_id == career_id)
        ).scalar_one_or_none()
        
        if not roadmap:
            return {"roadmap": None, "milestones": []}
        
        # Get milestones
        milestones_query = text("""
            SELECT rm.id, rm.order_no, rm.skill_name_en, rm.skill_name_vn,
                   rm.description_en, rm.description_vn,
                   rm.estimated_duration_en, rm.estimated_duration_vn,
                   rm.resources_json_en, rm.resources_json_vn, rm.level
            FROM core.roadmap_milestones rm
            WHERE rm.roadmap_id = :roadmap_id
            ORDER BY rm.order_no ASC
        """)
        
        milestone_rows = session.execute(
            milestones_query, 
            {"roadmap_id": roadmap.id}
        ).mappings().all()
        
        milestones = []
        for row in milestone_rows:
            milestones.append({
                "id": row["id"],
                "order_no": row["order_no"],
                "skill_name": row["skill_name_en"] or row["skill_name_vn"] or "",
                "skill_name_vn": row["skill_name_vn"] or row["skill_name_en"] or "",
                "description": row["description_en"] or row["description_vn"] or "",
                "description_vn": row["description_vn"] or row["description_en"] or "",
                "estimated_duration": row["estimated_duration_en"] or row["estimated_duration_vn"] or "",
                "estimated_duration_vn": row["estimated_duration_vn"] or row["estimated_duration_en"] or "",
                "resources": row["resources_json_en"] or [],
                "resources_vn": row["resources_json_vn"] or [],
                "level": row["level"]
            })
        
        return {
            "roadmap": roadmap.to_dict(language),
            "milestones": milestones
        }