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
        title_vi: Optional[str] = None,
        title_en: Optional[str] = None
    ) -> Roadmap:
        """Create new roadmap with multilingual titles"""
        if not title_vi and not title_en:
            # Get career title as fallback
            career = session.execute(
                select(Career).where(Career.id == career_id)
            ).scalar_one_or_none()
            
            if career:
                career_dict = career.to_dict()
                title_vi = f"{career_dict.get('title', 'Career')} Roadmap"
                title_en = f"{career_dict.get('title', 'Career')} Roadmap"
            else:
                title_vi = f"Career {career_id} Roadmap"
        
        roadmap = Roadmap(
            career_id=career_id,
            title_vi=title_vi,
            title_en=title_en
        )
        session.add(roadmap)
        session.flush()
        return roadmap
    
    @staticmethod
    def update_roadmap_titles(
        session: Session,
        roadmap_id: int,
        title_vi: Optional[str] = None,
        title_en: Optional[str] = None
    ) -> Optional[Roadmap]:
        """Update roadmap titles"""
        roadmap = session.execute(
            select(Roadmap).where(Roadmap.id == roadmap_id)
        ).scalar_one_or_none()
        
        if not roadmap:
            return None
        
        if title_vi is not None:
            roadmap.title_vi = title_vi
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
            SELECT rm.id, rm.order_no, rm.skill_name, rm.description, 
                   rm.estimated_duration, rm.resources_json, rm.level
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
                "skill_name": row["skill_name"],
                "description": row["description"],
                "estimated_duration": row["estimated_duration"],
                "resources": row["resources_json"] or [],
                "level": row["level"]
            })
        
        return {
            "roadmap": roadmap.to_dict(language),
            "milestones": milestones
        }