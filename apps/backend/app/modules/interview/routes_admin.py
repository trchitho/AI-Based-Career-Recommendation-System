"""
Admin routes for Interview management.
Prefix: /api/admin/interview
All endpoints require admin role.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ...core.auth_deps import get_current_user_from_token
from ...core.db import get_db
from ..auth.models import User
from .models import InterviewMessage, InterviewSession

router = APIRouter(prefix="/interview", tags=["admin-interview"])


# ─── Auth helper ──────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user_from_token)) -> User:
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập",
        )
    return current_user


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_interview_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Tổng quan thống kê phỏng vấn cho admin dashboard."""
    total = db.query(InterviewSession).count()
    completed = db.query(InterviewSession).filter(InterviewSession.status == "completed").count()
    active = db.query(InterviewSession).filter(InterviewSession.status == "active").count()
    abandoned = db.query(InterviewSession).filter(InterviewSession.status == "abandoned").count()

    avg_score = (
        db.query(func.avg(InterviewSession.overall_score))
        .filter(InterviewSession.overall_score.isnot(None))
        .scalar()
    ) or 0.0

    voice = db.query(InterviewSession).filter(InterviewSession.interview_mode == "voice").count()
    text_mode = db.query(InterviewSession).filter(InterviewSession.interview_mode == "text").count()

    pass_count = db.query(InterviewSession).filter(InterviewSession.recommendation == "PASS").count()
    fail_count = db.query(InterviewSession).filter(InterviewSession.recommendation == "FAIL").count()
    conditional = db.query(InterviewSession).filter(InterviewSession.recommendation == "CONDITIONAL_PASS").count()

    avg_q = (
        db.query(func.avg(InterviewSession.question_count))
        .filter(InterviewSession.question_count.isnot(None))
        .scalar()
    ) or 0.0

    # Templates count
    try:
        tmpl_count = db.execute(
            text("SELECT COUNT(*) FROM interview.interview_templates")
        ).scalar() or 0
    except Exception:
        tmpl_count = 0

    # JD count
    try:
        jd_count = db.execute(
            text("SELECT COUNT(*) FROM interview.job_descriptions")
        ).scalar() or 0
    except Exception:
        jd_count = 0

    # Audio cache
    try:
        cache_count = db.execute(
            text("SELECT COUNT(*) FROM interview.audio_cache")
        ).scalar() or 0
        cache_size = db.execute(
            text("SELECT COALESCE(SUM(file_size_bytes), 0) FROM interview.audio_cache")
        ).scalar() or 0
        cache_size_mb = float(cache_size) / (1024 * 1024)
    except Exception:
        cache_count = 0
        cache_size_mb = 0.0

    return {
        "total_sessions": total,
        "completed_sessions": completed,
        "active_sessions": active,
        "abandoned_sessions": abandoned,
        "avg_score": round(float(avg_score), 2),
        "voice_sessions": voice,
        "text_sessions": text_mode,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "conditional_count": conditional,
        "avg_question_count": round(float(avg_q), 1),
        "total_templates": tmpl_count,
        "total_jd": jd_count,
        "audio_cache_count": cache_count,
        "audio_cache_size_mb": round(cache_size_mb, 2),
    }


# ─── Sessions ─────────────────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    mode: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Danh sách phiên phỏng vấn với filter và phân trang."""
    q = db.query(InterviewSession)

    if search:
        q = q.filter(
            InterviewSession.job_title.ilike(f"%{search}%")
        )
    if status_filter:
        q = q.filter(InterviewSession.status == status_filter)
    if mode:
        q = q.filter(InterviewSession.interview_mode == mode)
    if from_date:
        try:
            q = q.filter(InterviewSession.started_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            q = q.filter(InterviewSession.started_at <= datetime.fromisoformat(to_date + "T23:59:59"))
        except ValueError:
            pass

    total = q.count()
    sessions = (
        q.order_by(InterviewSession.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for s in sessions:
        items.append({
            "id": s.id,
            "user_id": s.user_id,
            "job_id": s.job_id,
            "job_title": s.job_title,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "overall_score": s.overall_score,
            "technical_score": s.technical_score,
            "communication_score": s.communication_score,
            "logic_score": s.logic_score,
            "experience_score": s.experience_score,
            "attitude_score": s.attitude_score,
            "recommendation": s.recommendation,
            "summary": s.summary,
            "question_count": s.question_count,
            "interview_mode": s.interview_mode,
            "voice_type": s.voice_type,
            "tab_switch_count": s.tab_switch_count,
            "evaluation_status": getattr(s, "evaluation_status", "pending"),
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/sessions/{session_id}")
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Chi tiết phiên phỏng vấn + danh sách messages."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phỏng vấn")

    messages = (
        db.query(InterviewMessage)
        .filter(InterviewMessage.session_id == session_id)
        .order_by(InterviewMessage.timestamp.asc())
        .all()
    )

    msgs = []
    for m in messages:
        msgs.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "question_type": getattr(m, "question_type", None),
            "question_number": getattr(m, "question_number", None),
            "score": getattr(m, "score", None),
            "feedback": getattr(m, "feedback", None),
            "has_audio": getattr(m, "has_audio", False),
            "audio_duration": getattr(m, "audio_duration", None),
        })

    return {
        "session": {
            "id": session.id,
            "user_id": session.user_id,
            "job_id": session.job_id,
            "job_title": session.job_title,
            "status": session.status,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "overall_score": session.overall_score,
            "technical_score": session.technical_score,
            "communication_score": session.communication_score,
            "logic_score": session.logic_score,
            "experience_score": session.experience_score,
            "attitude_score": session.attitude_score,
            "recommendation": session.recommendation,
            "summary": session.summary,
            "question_count": session.question_count,
            "interview_mode": session.interview_mode,
            "voice_type": session.voice_type,
            "tab_switch_count": session.tab_switch_count,
            "evaluation_status": getattr(session, "evaluation_status", "pending"),
        },
        "messages": msgs,
    }


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Xóa phiên phỏng vấn và toàn bộ messages liên quan."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên phỏng vấn")

    # Xóa messages trước (cascade không được đảm bảo qua ORM)
    db.query(InterviewMessage).filter(InterviewMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()


# ─── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Danh sách interview templates."""
    try:
        where = ""
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size}

        if search:
            where = "WHERE job_title ILIKE :search OR question_type ILIKE :search OR skill_category ILIKE :search"
            params["search"] = f"%{search}%"

        count_sql = f"SELECT COUNT(*) FROM interview.interview_templates {where}"
        total = db.execute(text(count_sql), params).scalar() or 0

        data_sql = f"""
            SELECT id, job_id, job_title, question_type, skill_category,
                   difficulty_level, question_template, usage_count, avg_score, created_at
            FROM interview.interview_templates
            {where}
            ORDER BY usage_count DESC, created_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = db.execute(text(data_sql), params).fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0],
                "job_id": r[1],
                "job_title": r[2],
                "question_type": r[3],
                "skill_category": r[4],
                "difficulty_level": r[5],
                "question_template": r[6],
                "usage_count": r[7] or 0,
                "avg_score": float(r[8]) if r[8] is not None else None,
                "created_at": r[9].isoformat() if r[9] else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải templates: {str(e)}")


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Xóa interview template."""
    try:
        result = db.execute(
            text("DELETE FROM interview.interview_templates WHERE id = :id"),
            {"id": template_id},
        )
        db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy template")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa template: {str(e)}")


# ─── JD Library ───────────────────────────────────────────────────────────────

@router.get("/jd-library")
def list_jd_library(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Danh sách Job Descriptions đã upload."""
    try:
        where = ""
        params: dict = {"limit": page_size, "offset": (page - 1) * page_size}

        if search:
            where = "WHERE career_id ILIKE :search OR CAST(user_id AS TEXT) = :exact_id"
            params["search"] = f"%{search}%"
            params["exact_id"] = search.lstrip("#")

        count_sql = f"SELECT COUNT(*) FROM interview.job_descriptions {where}"
        total = db.execute(text(count_sql), params).scalar() or 0

        data_sql = f"""
            SELECT id, user_id, career_id, raw_text, extracted_data, source, created_at
            FROM interview.job_descriptions
            {where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = db.execute(text(data_sql), params).fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0],
                "user_id": r[1],
                "career_id": r[2],
                "raw_text": r[3],
                "extracted_data": r[4],
                "source": r[5] or "manual",
                "created_at": r[6].isoformat() if r[6] else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải JD library: {str(e)}")


@router.delete("/jd/{jd_id}", status_code=204)
def delete_jd(
    jd_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Xóa JD entry."""
    try:
        result = db.execute(
            text("DELETE FROM interview.job_descriptions WHERE id = :id"),
            {"id": jd_id},
        )
        db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy JD")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa JD: {str(e)}")


# ─── Voice Metrics ────────────────────────────────────────────────────────────

@router.get("/voice-metrics")
def get_voice_metrics(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Thống kê hiệu suất voice processing theo stage."""
    try:
        where_parts = []
        params: dict = {}

        if from_date:
            where_parts.append("created_at >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_parts.append("created_at <= :to_date")
            params["to_date"] = to_date + "T23:59:59"

        where = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        sql = f"""
            SELECT
                stage,
                AVG(processing_time * 1000)  AS avg_ms,
                MIN(processing_time * 1000)  AS min_ms,
                MAX(processing_time * 1000)  AS max_ms,
                AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100 AS success_rate,
                COUNT(*) AS total_count
            FROM interview.voice_performance_metrics
            {where}
            GROUP BY stage
            ORDER BY stage
        """
        rows = db.execute(text(sql), params).fetchall()

        metrics = []
        for r in rows:
            metrics.append({
                "stage": r[0],
                "avg_time": round(float(r[1] or 0), 1),
                "min_time": round(float(r[2] or 0), 1),
                "max_time": round(float(r[3] or 0), 1),
                "success_rate": round(float(r[4] or 0), 1),
                "total_count": int(r[5] or 0),
            })

        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải voice metrics: {str(e)}")


# ─── Audio Cache ──────────────────────────────────────────────────────────────

@router.get("/audio-cache")
def list_audio_cache(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Danh sách audio cache entries."""
    try:
        total = db.execute(text("SELECT COUNT(*) FROM interview.audio_cache")).scalar() or 0

        sql = """
            SELECT id, voice_type, audio_url, file_size_bytes, duration_seconds,
                   access_count, created_at, last_accessed
            FROM interview.audio_cache
            ORDER BY last_accessed DESC
            LIMIT :limit OFFSET :offset
        """
        rows = db.execute(text(sql), {"limit": page_size, "offset": (page - 1) * page_size}).fetchall()

        items = []
        for r in rows:
            items.append({
                "id": str(r[0]),
                "voice_type": r[1],
                "audio_url": r[2],
                "file_size_bytes": r[3],
                "duration_seconds": float(r[4]) if r[4] is not None else None,
                "access_count": r[5] or 0,
                "created_at": r[6].isoformat() if r[6] else None,
                "last_accessed": r[7].isoformat() if r[7] else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải audio cache: {str(e)}")


@router.delete("/audio-cache", status_code=204)
def clear_audio_cache(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Xóa toàn bộ audio cache."""
    try:
        db.execute(text("DELETE FROM interview.audio_cache"))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa cache: {str(e)}")


# ─── Feedback ─────────────────────────────────────────────────────────────────

@router.get("/feedback")
def list_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Danh sách feedback từ người dùng."""
    try:
        total = db.execute(
            text("SELECT COUNT(*) FROM interview.interview_feedback")
        ).scalar() or 0

        sql = """
            SELECT id, session_id, user_id, question_quality, ai_accuracy,
                   overall_experience, comments, suggestions, created_at
            FROM interview.interview_feedback
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = db.execute(text(sql), {"limit": page_size, "offset": (page - 1) * page_size}).fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0],
                "session_id": r[1],
                "user_id": r[2],
                "question_quality": r[3],
                "ai_accuracy": r[4],
                "overall_experience": r[5],
                "comments": r[6],
                "suggestions": r[7],
                "created_at": r[8].isoformat() if r[8] else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải feedback: {str(e)}")


# ─── Export CSV ───────────────────────────────────────────────────────────────

@router.get("/export/sessions")
def export_sessions_csv(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    mode: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Export danh sách sessions ra file CSV."""
    q = db.query(InterviewSession)

    if search:
        q = q.filter(InterviewSession.job_title.ilike(f"%{search}%"))
    if status_filter:
        q = q.filter(InterviewSession.status == status_filter)
    if mode:
        q = q.filter(InterviewSession.interview_mode == mode)
    if from_date:
        try:
            q = q.filter(InterviewSession.started_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            q = q.filter(InterviewSession.started_at <= datetime.fromisoformat(to_date + "T23:59:59"))
        except ValueError:
            pass

    sessions = q.order_by(InterviewSession.started_at.desc()).limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "User ID", "Job ID", "Job Title", "Mode", "Status",
        "Overall Score", "Technical", "Communication", "Logic", "Experience", "Attitude",
        "Recommendation", "Question Count", "Voice Type", "Tab Switches",
        "Started At", "Completed At", "Duration (min)",
    ])

    for s in sessions:
        duration = ""
        if s.started_at and s.completed_at:
            delta = s.completed_at - s.started_at
            duration = str(round(delta.total_seconds() / 60, 1))

        writer.writerow([
            s.id, s.user_id, s.job_id, s.job_title,
            s.interview_mode, s.status,
            round(s.overall_score, 2) if s.overall_score is not None else "",
            round(s.technical_score, 2) if s.technical_score is not None else "",
            round(s.communication_score, 2) if s.communication_score is not None else "",
            round(s.logic_score, 2) if s.logic_score is not None else "",
            round(s.experience_score, 2) if s.experience_score is not None else "",
            round(s.attitude_score, 2) if s.attitude_score is not None else "",
            s.recommendation or "",
            s.question_count or "",
            s.voice_type or "",
            s.tab_switch_count or 0,
            s.started_at.strftime("%Y-%m-%d %H:%M:%S") if s.started_at else "",
            s.completed_at.strftime("%Y-%m-%d %H:%M:%S") if s.completed_at else "",
            duration,
        ])

    output.seek(0)
    filename = f"interview_sessions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
