"""
Admin routes for monitoring system status
"""
import os

from app.core.db import get_db
from app.core.gemini_manager import multi_stream_manager
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session


def require_admin(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")):
    admin_token = os.getenv("ADMIN_API_TOKEN")
    if not admin_token or x_admin_token != admin_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)
@router.get("/gemini-status")
async def get_gemini_status():
    """
    Get detailed status of all Gemini streams including active models
    """
    try:
        status = multi_stream_manager.check_all_streams_status()
        
        return {
            "success": True,
            "streams": status,
            "summary": {
                "total_streams": len(status),
                "active_streams": sum(1 for s in status.values() if s['available']),
                "models_in_use": [s['model'] for s in status.values() if s['model']]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "streams": {}
        }

@router.post("/gemini-reinit")
async def reinitialize_gemini_streams():
    """
    Force reinitialize all Gemini streams (useful when models are updated)
    """
    try:
        # Reinitialize all streams
        multi_stream_manager.chatbot_stream._initialize_with_fallback()
        multi_stream_manager.assessment_stream._initialize_with_fallback()
        multi_stream_manager.cv_stream._initialize_with_fallback()
        
        # Get new status
        status = multi_stream_manager.check_all_streams_status()
        
        return {
            "success": True,
            "message": "All streams reinitialized",
            "streams": status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/health")
async def admin_health_check():
    """
    Simple health check for admin endpoints
    """
    return {
        "status": "healthy",
        "service": "admin-api"
    }


@router.get("/cv-documents")
async def get_cv_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Tìm theo tên/email"),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách CV mà user đã tải lên (dành cho admin)
    """
    from app.modules.skill_gap.models import SkillGapAnalysis
    from sqlalchemy import desc, or_

    try:
        query = (
            db.query(
                SkillGapAnalysis.id,
                SkillGapAnalysis.user_id,
                SkillGapAnalysis.career_id,
                SkillGapAnalysis.cv_filename,
                SkillGapAnalysis.cv_file_url,
                SkillGapAnalysis.cv_name,
                SkillGapAnalysis.cv_email,
                SkillGapAnalysis.cv_phone,
                SkillGapAnalysis.match_percentage,
                SkillGapAnalysis.matched_skills_count,
                SkillGapAnalysis.missing_skills_count,
                SkillGapAnalysis.total_required_skills,
                SkillGapAnalysis.created_at,
            )
        )

        if search:
            query = query.filter(
                or_(
                    SkillGapAnalysis.cv_name.ilike(f"%{search}%"),
                    SkillGapAnalysis.cv_email.ilike(f"%{search}%"),
                    SkillGapAnalysis.cv_filename.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        records = (
            query.order_by(desc(SkillGapAnalysis.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = []
        for r in records:
            items.append({
                "id": r.id,
                "user_id": r.user_id,
                "career_id": r.career_id,
                "cv_filename": r.cv_filename,
                "cv_file_url": r.cv_file_url,
                "cv_name": r.cv_name,
                "cv_email": r.cv_email,
                "cv_phone": r.cv_phone,
                "match_percentage": round(r.match_percentage or 0, 1),
                "matched_skills_count": r.matched_skills_count or 0,
                "missing_skills_count": r.missing_skills_count or 0,
                "total_required_skills": r.total_required_skills or 0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })

        return {
            "success": True,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "items": items,
        }

    except Exception as e:
        return {"success": False, "error": str(e), "items": [], "total": 0}