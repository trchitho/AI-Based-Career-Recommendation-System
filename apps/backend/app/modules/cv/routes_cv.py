from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import io

from app.core.db import get_db
from app.core.jwt import get_current_user
from app.modules.cv.service import CVService
from app.modules.cv.schemas import CVCreate, CVUpdate, CVResponse, CVListItem
from app.modules.cv.pdf_generator import generate_cv_pdf

router = APIRouter(prefix="/bff/cv", tags=["CV"])


@router.get("/list", response_model=List[CVListItem])
def get_user_cvs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all CVs for the current user"""
    cvs = CVService.get_user_cvs(db, current_user["user_id"])
    return [
        CVListItem(
            id=cv.id,
            title=cv.title,
            template=cv.template,
            updatedAt=cv.updated_at
        )
        for cv in cvs
    ]


@router.get("/{cv_id}", response_model=CVResponse)
def get_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific CV by ID"""
    cv = CVService.get_cv_by_id(db, cv_id, current_user["user_id"])
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    return CVResponse(
        id=cv.id,
        userId=cv.user_id,
        title=cv.title,
        template=cv.template,
        personalInfo=cv.personal_info,
        education=cv.education or [],
        experience=cv.experience or [],
        skills=cv.skills or [],
        projects=cv.projects or [],
        certifications=cv.certifications or [],
        languages=cv.languages or [],
        createdAt=cv.created_at,
        updatedAt=cv.updated_at
    )


@router.post("", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
def create_cv(
    cv_data: CVCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new CV"""
    cv = CVService.create_cv(db, current_user["user_id"], cv_data)
    
    return CVResponse(
        id=cv.id,
        userId=cv.user_id,
        title=cv.title,
        template=cv.template,
        personalInfo=cv.personal_info,
        education=cv.education or [],
        experience=cv.experience or [],
        skills=cv.skills or [],
        projects=cv.projects or [],
        certifications=cv.certifications or [],
        languages=cv.languages or [],
        createdAt=cv.created_at,
        updatedAt=cv.updated_at
    )


@router.put("/{cv_id}", response_model=CVResponse)
def update_cv(
    cv_id: int,
    cv_data: CVUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing CV"""
    cv = CVService.update_cv(db, cv_id, current_user["user_id"], cv_data)
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    return CVResponse(
        id=cv.id,
        userId=cv.user_id,
        title=cv.title,
        template=cv.template,
        personalInfo=cv.personal_info,
        education=cv.education or [],
        experience=cv.experience or [],
        skills=cv.skills or [],
        projects=cv.projects or [],
        certifications=cv.certifications or [],
        languages=cv.languages or [],
        createdAt=cv.created_at,
        updatedAt=cv.updated_at
    )


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a CV"""
    success = CVService.delete_cv(db, cv_id, current_user["user_id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    return None


@router.get("/{cv_id}/export")
def export_cv_pdf(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export CV as PDF"""
    cv = CVService.get_cv_by_id(db, cv_id, current_user["user_id"])
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Generate PDF
    pdf_buffer = generate_cv_pdf(cv)
    
    # Return as streaming response
    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={cv.title.replace(' ', '_')}.pdf"
        }
    )
