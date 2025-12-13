"""
API routes for report generation and retrieval.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.jwt import get_current_user
from ..auth.models import User
from ..assessments.models import Assessment
from .service import ReportService
from .schemas import (
    FullReportResponse,
    ReportResponse,
    ReportEventCreate,
    ReportEventResponse,
    CoverData,
    NarrativeData,
    ScoreItem,
    Facet,
    FacetLabel,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _get_user_from_db(db: Session, user_id: int) -> User:
    """Get User object from database."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _build_report_response(report) -> ReportResponse:
    """Convert DB report to response schema."""
    cover_data = report.cover_json or {}
    narrative_data = report.narrative_json or {}
    scores_data = report.scores_json or []
    facets_data = report.facets_json or []
    
    # Build cover
    cover = CoverData(
        title=cover_data.get("title", ""),
        subtitle=cover_data.get("subtitle"),
        user_name=cover_data.get("user_name"),
        completed_at=cover_data.get("completed_at"),
        intro_paragraphs=cover_data.get("intro_paragraphs", []),
    )
    
    # Build narrative
    narrative = NarrativeData(
        type_name=narrative_data.get("type_name", ""),
        type_description=narrative_data.get("type_description", ""),
        paragraphs=narrative_data.get("paragraphs", []),
    )
    
    # Build scores
    scores = [
        ScoreItem(
            trait=s.get("trait", ""),
            score=s.get("score", 0),
            percentile_label=s.get("percentile_label", "Average"),
        )
        for s in scores_data
    ]
    
    # Build facets
    facets = []
    for f in facets_data:
        labels = [
            FacetLabel(
                name=l.get("name", ""),
                percent=l.get("percent", 0),
                description=l.get("description", ""),
            )
            for l in f.get("labels", [])
        ]
        facets.append(Facet(
            name=f.get("name", ""),
            title=f.get("title", ""),
            dominant=f.get("dominant", ""),
            dominant_percent=f.get("dominant_percent", 0),
            labels=labels,
        ))
    
    return ReportResponse(
        id=report.id,
        assessment_id=report.assessment_id,
        report_type=report.report_type,
        locale=report.locale,
        status=report.status,
        computed_at=report.computed_at,
        cover=cover,
        narrative=narrative,
        scores=scores,
        facets=facets,
        strengths=report.strengths_json or [],
        challenges=report.challenges_json or [],
    )


@router.get("/{assessment_id}", response_model=FullReportResponse)
async def get_full_report(
    assessment_id: int,
    locale: str = Query("en", description="Report locale (en/vi)"),
    db: Session = Depends(get_db),
    current_user_data: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get or generate full report for an assessment.
    Returns both Big5 and RIASEC reports.
    """
    user_id = current_user_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user from DB
    current_user = _get_user_from_db(db, user_id)
    
    # Verify assessment belongs to user
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this assessment")
    
    service = ReportService(db)
    
    # Get user name for cover
    user_name = current_user.full_name or current_user.email
    
    # Get scores from assessment
    scores = assessment.scores or {}
    
    # Determine assessment type and get appropriate scores
    big5_scores = None
    riasec_scores = None
    
    # Check if scores contain Big5 or RIASEC data
    if "openness" in scores or "conscientiousness" in scores:
        big5_scores = {
            "openness": scores.get("openness", 50),
            "conscientiousness": scores.get("conscientiousness", 50),
            "extraversion": scores.get("extraversion", 50),
            "agreeableness": scores.get("agreeableness", 50),
            "neuroticism": scores.get("neuroticism", 50),
        }
    
    if "realistic" in scores or "investigative" in scores:
        riasec_scores = {
            "realistic": scores.get("realistic", 50),
            "investigative": scores.get("investigative", 50),
            "artistic": scores.get("artistic", 50),
            "social": scores.get("social", 50),
            "enterprising": scores.get("enterprising", 50),
            "conventional": scores.get("conventional", 50),
        }
    
    # Try to get scores from related assessments if not in current one
    if not big5_scores or not riasec_scores:
        # Get all assessments for this user in the same session
        session_id = assessment.session_id
        if session_id:
            related = db.query(Assessment).filter(
                Assessment.session_id == session_id,
                Assessment.user_id == current_user.id,
            ).all()
            
            for rel in related:
                rel_scores = rel.scores or {}
                if not big5_scores and ("openness" in rel_scores or rel.a_type == "BigFive"):
                    big5_scores = {
                        "openness": rel_scores.get("openness", 50),
                        "conscientiousness": rel_scores.get("conscientiousness", 50),
                        "extraversion": rel_scores.get("extraversion", 50),
                        "agreeableness": rel_scores.get("agreeableness", 50),
                        "neuroticism": rel_scores.get("neuroticism", 50),
                    }
                if not riasec_scores and ("realistic" in rel_scores or rel.a_type == "RIASEC"):
                    riasec_scores = {
                        "realistic": rel_scores.get("realistic", 50),
                        "investigative": rel_scores.get("investigative", 50),
                        "artistic": rel_scores.get("artistic", 50),
                        "social": rel_scores.get("social", 50),
                        "enterprising": rel_scores.get("enterprising", 50),
                        "conventional": rel_scores.get("conventional", 50),
                    }
    
    # Generate reports
    big5_report = None
    riasec_report = None
    
    if big5_scores:
        big5_db = service.get_or_create_report(
            user_id=current_user.id,
            assessment_id=assessment_id,
            report_type="big5",
            scores=big5_scores,
            user_name=user_name,
            completed_at=assessment.created_at,
            session_id=assessment.session_id,
            locale=locale,
        )
        big5_report = _build_report_response(big5_db)
    
    if riasec_scores:
        riasec_db = service.get_or_create_report(
            user_id=current_user.id,
            assessment_id=assessment_id,
            report_type="riasec",
            scores=riasec_scores,
            user_name=user_name,
            completed_at=assessment.created_at,
            session_id=assessment.session_id,
            locale=locale,
        )
        riasec_report = _build_report_response(riasec_db)
    
    return FullReportResponse(
        assessment_id=assessment_id,
        user_id=current_user.id,
        big5=big5_report,
        riasec=riasec_report,
    )


@router.post("/events", response_model=ReportEventResponse)
async def log_report_event(
    payload: ReportEventCreate,
    db: Session = Depends(get_db),
    current_user_data: Dict[str, Any] = Depends(get_current_user),
):
    """
    Log a report viewing event for analytics.
    
    Idempotent: if event_uuid already exists, skip insert and return success.
    
    Rules:
    - tab_switch: requires tab_key
    - page_view: requires page_no
    - meta: defaults to {} if null
    """
    user_id = current_user_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate required fields based on event type
    if payload.event_type == "tab_switch" and not payload.tab_key:
        return ReportEventResponse(success=False, message="tab_switch requires tab_key")
    if payload.event_type == "page_view" and payload.page_no is None:
        return ReportEventResponse(success=False, message="page_view requires page_no")
    
    service = ReportService(db)
    
    try:
        event = service.log_event(
            user_id=user_id,
            assessment_id=payload.assessment_id,
            report_id=payload.report_id,
            report_type=payload.report_type,
            event_type=payload.event_type,
            event_uuid=payload.event_uuid,
            tab_key=payload.tab_key,
            page_no=payload.page_no,
            page_key=payload.page_key,
            meta=payload.meta or {},  # Ensure meta is never null
        )
        if event:
            return ReportEventResponse(success=True, event_id=event.id)
        else:
            # Duplicate event_uuid - skip but return success
            return ReportEventResponse(success=True, message="Event already logged")
    except Exception as e:
        return ReportEventResponse(success=False, message=str(e))
