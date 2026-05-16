"""
API routes for report generation and retrieval.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.jwt import get_current_user
from ..assessments.models import Assessment
from ..auth.models import User
from .schemas import (
    CoverData,
    Facet,
    FacetLabel,
    FullReportResponse,
    NarrativeData,
    ReportEventCreate,
    ReportEventResponse,
    ReportResponse,
    ScoreItem,
    SendReportEmailRequest,
    SendReportEmailResponse,
)
from .service import ReportService

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
                name=label.get("name", ""),
                percent=label.get("percent", 0),
                description=label.get("description", ""),
            )
            for label in f.get("labels", [])
        ]
        facets.append(
            Facet(
                name=f.get("name", ""),
                title=f.get("title", ""),
                dominant=f.get("dominant", ""),
                dominant_percent=f.get("dominant_percent", 0),
                labels=labels,
            )
        )

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

    # Helper to extract Big5 scores - supports both letter keys (O,C,E,A,N) and full names
    def _extract_big5(s: dict, a_type: str = None) -> dict | None:
        # Only extract if this is a BigFive assessment or has Big5-specific keys
        has_big5_keys = "O" in s or "N" in s  # O and N are unique to Big5
        has_full_names = "openness" in s or "conscientiousness" in s or "neuroticism" in s

        if a_type == "BigFive" or has_big5_keys or has_full_names:
            if has_big5_keys:
                # Scores are stored as 1-5 scale, convert to 0-100
                return {
                    "openness": (float(s.get("O", 3.0)) - 1) * 25,
                    "conscientiousness": (float(s.get("C", 3.0)) - 1) * 25,
                    "extraversion": (float(s.get("E", 3.0)) - 1) * 25,
                    "agreeableness": (float(s.get("A", 3.0)) - 1) * 25,
                    "neuroticism": (float(s.get("N", 3.0)) - 1) * 25,
                }
            elif has_full_names:
                return {
                    "openness": float(s.get("openness", 50)),
                    "conscientiousness": float(s.get("conscientiousness", 50)),
                    "extraversion": float(s.get("extraversion", 50)),
                    "agreeableness": float(s.get("agreeableness", 50)),
                    "neuroticism": float(s.get("neuroticism", 50)),
                }
        return None

    # Helper to extract RIASEC scores - supports both letter keys and full names
    def _extract_riasec(s: dict, a_type: str = None) -> dict | None:
        # Only extract if this is a RIASEC assessment or has RIASEC-specific keys
        has_riasec_keys = "R" in s or "I" in s or "S" in s  # R, I, S are unique to RIASEC
        has_full_names = "realistic" in s or "investigative" in s or "social" in s

        if a_type == "RIASEC" or has_riasec_keys or has_full_names:
            if has_riasec_keys:
                # Scores are stored as 1-5 scale, convert to 0-100
                return {
                    "realistic": (float(s.get("R", 3.0)) - 1) * 25,
                    "investigative": (float(s.get("I", 3.0)) - 1) * 25,
                    "artistic": (float(s.get("A", 3.0)) - 1) * 25,
                    "social": (float(s.get("S", 3.0)) - 1) * 25,
                    "enterprising": (float(s.get("E", 3.0)) - 1) * 25,
                    "conventional": (float(s.get("C", 3.0)) - 1) * 25,
                }
            elif has_full_names:
                return {
                    "realistic": float(s.get("realistic", 50)),
                    "investigative": float(s.get("investigative", 50)),
                    "artistic": float(s.get("artistic", 50)),
                    "social": float(s.get("social", 50)),
                    "enterprising": float(s.get("enterprising", 50)),
                    "conventional": float(s.get("conventional", 50)),
                }
        return None

    # Check current assessment scores based on type
    if assessment.a_type == "BigFive":
        big5_scores = _extract_big5(scores, "BigFive")
    elif assessment.a_type == "RIASEC":
        riasec_scores = _extract_riasec(scores, "RIASEC")
    else:
        # Try both formats for generic assessment
        big5_scores = _extract_big5(scores)
        riasec_scores = _extract_riasec(scores)

    # Try to get scores from related assessments if not in current one
    if not big5_scores or not riasec_scores:
        # Get all assessments for this user in the same session
        session_id = assessment.session_id
        if session_id:
            related = (
                db.query(Assessment)
                .filter(
                    Assessment.session_id == session_id,
                    Assessment.user_id == current_user.id,
                )
                .all()
            )

            for rel in related:
                rel_scores = rel.scores or {}
                if not big5_scores and rel.a_type == "BigFive":
                    big5_scores = _extract_big5(rel_scores, "BigFive")
                if not riasec_scores and rel.a_type == "RIASEC":
                    riasec_scores = _extract_riasec(rel_scores, "RIASEC")

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


@router.post("/send-email", response_model=SendReportEmailResponse)
async def send_report_email(
    payload: SendReportEmailRequest,
    db: Session = Depends(get_db),
    current_user_data: Dict[str, Any] = Depends(get_current_user),
):
    """
    Send the full report to an email address as a PDF attachment.

    - If use_logged_in_email is True, send to the logged-in user's email
    - Otherwise, send to the provided email address
    - Generates a professional PDF report and attaches it to the email
    """
    from datetime import datetime

    from ...core.email_utils import EmailAttachment, send_email_with_attachment
    from .pdf_generator import generate_report_pdf

    user_id = current_user_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user from DB
    current_user = _get_user_from_db(db, user_id)

    # Verify assessment belongs to user
    assessment = db.query(Assessment).filter(Assessment.id == payload.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this assessment")

    # Determine target email
    if payload.use_logged_in_email:
        target_email = current_user.email
    elif payload.email:
        target_email = payload.email
    else:
        return SendReportEmailResponse(success=False, message="Vui lòng cung cấp địa chỉ email hoặc chọn 'Gửi đến email của tôi'")

    # Get report data
    user_name = current_user.full_name or current_user.email
    scores = assessment.scores or {}

    # Extract scores
    big5_scores = None
    riasec_scores = None

    if assessment.a_type == "BigFive" or "O" in scores or "openness" in scores:
        if "O" in scores:
            big5_scores = {
                "openness": (float(scores.get("O") or 3.0) - 1) * 25,
                "conscientiousness": (float(scores.get("C") or 3.0) - 1) * 25,
                "extraversion": (float(scores.get("E") or 3.0) - 1) * 25,
                "agreeableness": (float(scores.get("A") or 3.0) - 1) * 25,
                "neuroticism": (float(scores.get("N") or 3.0) - 1) * 25,
            }
        elif "openness" in scores:
            big5_scores = {
                "openness": float(scores.get("openness") or 50),
                "conscientiousness": float(scores.get("conscientiousness") or 50),
                "extraversion": float(scores.get("extraversion") or 50),
                "agreeableness": float(scores.get("agreeableness") or 50),
                "neuroticism": float(scores.get("neuroticism") or 50),
            }

    if assessment.a_type == "RIASEC" or "R" in scores or "realistic" in scores:
        if "R" in scores:
            riasec_scores = {
                "realistic": (float(scores.get("R") or 3.0) - 1) * 25,
                "investigative": (float(scores.get("I") or 3.0) - 1) * 25,
                "artistic": (float(scores.get("A") or 3.0) - 1) * 25,
                "social": (float(scores.get("S") or 3.0) - 1) * 25,
                "enterprising": (float(scores.get("E") or 3.0) - 1) * 25,
                "conventional": (float(scores.get("C") or 3.0) - 1) * 25,
            }
        elif "realistic" in scores:
            riasec_scores = {
                "realistic": float(scores.get("realistic") or 50),
                "investigative": float(scores.get("investigative") or 50),
                "artistic": float(scores.get("artistic") or 50),
                "social": float(scores.get("social") or 50),
                "enterprising": float(scores.get("enterprising") or 50),
                "conventional": float(scores.get("conventional") or 50),
            }

    # Get strengths/challenges from existing report if available
    strengths = []
    challenges = []
    try:
        from .models import AssessmentReport
        existing_report = db.query(AssessmentReport).filter(
            AssessmentReport.assessment_id == payload.assessment_id,
            AssessmentReport.report_type == "big5",
        ).first()
        if existing_report:
            strengths = existing_report.strengths_json or []
            challenges = existing_report.challenges_json or []
    except Exception:
        pass

    # Generate PDF
    report_date = assessment.created_at.strftime("%d/%m/%Y") if assessment.created_at else datetime.now().strftime("%d/%m/%Y")

    if not big5_scores and not riasec_scores:
        return SendReportEmailResponse(
            success=False,
            message="Không có dữ liệu điểm số để tạo báo cáo. Vui lòng hoàn thành bài đánh giá trước.",
        )

    try:
        pdf_bytes = generate_report_pdf(
            user_name=user_name,
            user_email=current_user.email,
            assessment_id=payload.assessment_id,
            report_date=report_date,
            big5_scores=big5_scores,
            riasec_scores=riasec_scores,
            strengths=strengths,
            challenges=challenges,
        )
    except Exception as e:
        print(f"[reports] PDF generation failed: {repr(e)}")
        return SendReportEmailResponse(success=False, message=f"Không thể tạo PDF: {str(e)}")

    # Build email HTML body
    base_url = "https://careerverse.ai"
    report_url = f"{base_url}/results/{payload.assessment_id}/report"

    body_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 16px; padding: 32px; text-align: center; color: white; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 24px;">CareerVerse AI</h1>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Báo Cáo Đánh Giá Tính Cách & Nghề Nghiệp</p>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; color: #0f172a; font-size: 16px;">
                Xin chào <strong>{user_name}</strong>,
            </p>
            <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                Cảm ơn bạn đã hoàn thành bài đánh giá tính cách tại CareerVerse AI!
                Báo cáo chi tiết của bạn đã được đính kèm dưới dạng file PDF.
            </p>
            <p style="margin: 0; color: #475569; font-size: 14px;">
                <strong>Ngày đánh giá:</strong> {report_date}<br>
                <strong>Mã đánh giá:</strong> #{payload.assessment_id}
            </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
            <a href="{report_url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                Xem Báo Cáo Trực Tuyến
            </a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © {datetime.now().year} CareerVerse AI System. All rights reserved.<br>
                Email này được gửi tự động. Vui lòng không trả lời.
            </p>
        </div>
    </div>
    """

    body_text = (
        f"Xin chào {user_name},\n\n"
        f"Cảm ơn bạn đã hoàn thành bài đánh giá tính cách tại CareerVerse AI!\n"
        f"Báo cáo chi tiết của bạn đã được đính kèm dưới dạng file PDF.\n\n"
        f"Ngày đánh giá: {report_date}\n"
        f"Mã đánh giá: #{payload.assessment_id}\n\n"
        f"Xem báo cáo trực tuyến: {report_url}\n\n"
        f"---\n"
        f"© {datetime.now().year} CareerVerse AI System."
    )

    # Create PDF attachment
    pdf_filename = f"CareerVerse_Report_{payload.assessment_id}_{report_date.replace('/', '-')}.pdf"
    attachment = EmailAttachment(
        filename=pdf_filename,
        content=pdf_bytes,
        mime_type="application/pdf",
    )

    # Send email with PDF attachment
    sent_ok, error_msg, dev_fallback = send_email_with_attachment(
        to_email=target_email,
        subject=f"CareerVerse AI - Báo Cáo Đánh Giá #{payload.assessment_id}",
        body_html=body_html,
        body_text=body_text,
        attachments=[attachment],
    )

    if sent_ok:
        return SendReportEmailResponse(
            success=True,
            message="Báo cáo PDF đã được gửi thành công đến email của bạn!",
            email_sent_to=target_email,
        )
    elif dev_fallback:
        return SendReportEmailResponse(
            success=True,
            message="Báo cáo đã được ghi log (chế độ phát triển - email chưa thực sự gửi)",
            email_sent_to=target_email,
        )
    else:
        return SendReportEmailResponse(
            success=False,
            message=f"Gửi email thất bại: {error_msg or 'Lỗi không xác định'}",
        )
