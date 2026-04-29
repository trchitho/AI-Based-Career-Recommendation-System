"""
Mentor Session Scheduling API — /api/schedule/...
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import Base, engine, get_db
from app.core.auth_deps import get_current_user_from_token
from app.modules.auth.models import User

from .schedule_models import MentorSession

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

try:
    Base.metadata.create_all(bind=engine, tables=[MentorSession.__table__])
    print("✅ MentorSession table ready")
except Exception as e:
    print(f"⚠️  MentorSession table init: {e}")


async def _send_session_reminders():
    """Gửi WS reminder cho sessions sắp diễn ra trong 30 phút."""
    from datetime import timedelta
    from sqlalchemy.orm import Session as DBSession
    from app.modules.auth.models import User as UserModel

    now = datetime.now(timezone(timedelta(hours=7)))
    window_start = now + timedelta(minutes=25)
    window_end   = now + timedelta(minutes=35)

    with DBSession(engine) as db:
        sessions = (
            db.query(MentorSession)
            .filter(
                MentorSession.status == "confirmed",
                MentorSession.scheduled_at >= window_start,
                MentorSession.scheduled_at <= window_end,
            )
            .all()
        )
        if not sessions:
            return

        from app.modules.realtime.ws_notifications import manager as nm
        for s in sessions:
            mentor = db.query(UserModel).filter(UserModel.id == s.mentor_id).first()
            mentee = db.query(UserModel).filter(UserModel.id == s.mentee_id).first()
            mins = int((s.scheduled_at - now).total_seconds() // 60)
            payload = {
                "type": "session_reminder",
                "session_id": s.id,
                "minutes_until": mins,
                "topic": s.topic or "",
                "scheduled_at": s.scheduled_at.isoformat(),
            }
            # Notify both parties
            for uid, other_name in [
                (s.mentee_id, mentor.full_name if mentor else "Mentor"),
                (s.mentor_id, mentee.full_name if mentee else "Mentee"),
            ]:
                try:
                    await nm.send(uid, {**payload, "other_name": other_name})
                except Exception:
                    pass


# ── Schemas ────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    mentor_user_id: int
    scheduled_at: str          # ISO 8601: "2026-05-01T14:00:00"
    duration_minutes: int = 60
    topic: Optional[str] = ""
    notes: Optional[str] = ""


class BookingRespond(BaseModel):
    session_id: int
    action: str                # "confirmed" | "cancelled"
    mentor_note: Optional[str] = ""


def _session_to_dict(s: MentorSession, db: Session, my_id: int) -> dict:
    other_id = s.mentor_id if s.mentee_id == my_id else s.mentee_id
    other = db.query(User).filter(User.id == other_id).first()
    mentor = db.query(User).filter(User.id == s.mentor_id).first()
    mentee = db.query(User).filter(User.id == s.mentee_id).first()
    return {
        "id": s.id,
        "mentor_id": s.mentor_id,
        "mentee_id": s.mentee_id,
        "mentor_name": (mentor.full_name or mentor.email) if mentor else str(s.mentor_id),
        "mentee_name": (mentee.full_name or mentee.email) if mentee else str(s.mentee_id),
        "other_name": (other.full_name or other.email) if other else str(other_id),
        "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
        "duration_minutes": s.duration_minutes,
        "topic": s.topic or "",
        "notes": s.notes or "",
        "status": s.status,
        "mentor_note": s.mentor_note or "",
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "role": "mentee" if s.mentee_id == my_id else "mentor",
    }


# ── Mentee: book a session ─────────────────────────────────────
@router.post("/book")
async def book_session(
    body: BookingCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    try:
        dt = datetime.fromisoformat(body.scheduled_at)
        # Make timezone-aware (treat naive as UTC+7 Vietnam time)
        if dt.tzinfo is None:
            from datetime import timedelta
            dt = dt.replace(tzinfo=timezone(timedelta(hours=7)))
    except ValueError:
        raise HTTPException(400, "scheduled_at must be ISO 8601 format")

    now_vn = datetime.now(timezone(timedelta(hours=7)))
    if dt <= now_vn:
        raise HTTPException(400, "Thời gian hẹn phải trong tương lai")

    session = MentorSession(
        mentor_id=body.mentor_user_id,
        mentee_id=current_user.id,
        scheduled_at=dt,
        duration_minutes=body.duration_minutes,
        topic=body.topic or "",
        notes=body.notes or "",
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Notify mentor via WS
    try:
        from app.modules.realtime.ws_notifications import manager as nm
        mentee_name = current_user.full_name or current_user.email
        await nm.send(body.mentor_user_id, {
            "type": "new_session_request",
            "session_id": session.id,
            "from_name": mentee_name,
            "topic": body.topic or "Không có chủ đề",
            "scheduled_at": dt.isoformat(),
        })
    except Exception:
        pass

    return _session_to_dict(session, db, current_user.id)


# ── List my sessions ───────────────────────────────────────────
@router.get("/my")
def my_sessions(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    uid = current_user.id
    rows = (
        db.query(MentorSession)
        .filter(or_(MentorSession.mentor_id == uid, MentorSession.mentee_id == uid))
        .order_by(MentorSession.scheduled_at)
        .all()
    )
    return [_session_to_dict(r, db, uid) for r in rows]


# ── Mentor: confirm or cancel ──────────────────────────────────
@router.post("/respond")
async def respond_session(
    body: BookingRespond,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    if body.action not in ("confirmed", "cancelled"):
        raise HTTPException(400, "action must be 'confirmed' or 'cancelled'")

    session = db.query(MentorSession).filter(MentorSession.id == body.session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.mentor_id != current_user.id and session.mentee_id != current_user.id:
        raise HTTPException(403, "Not your session")

    session.status = body.action
    session.mentor_note = body.mentor_note or ""
    db.commit()
    db.refresh(session)

    # Notify the other party
    try:
        from app.modules.realtime.ws_notifications import manager as nm
        other_id = session.mentee_id if session.mentor_id == current_user.id else session.mentor_id
        actor_name = current_user.full_name or current_user.email
        await nm.send(other_id, {
            "type": "session_responded",
            "session_id": session.id,
            "action": body.action,
            "from_name": actor_name,
            "mentor_note": body.mentor_note or "",
        })
    except Exception:
        pass

    return _session_to_dict(session, db, current_user.id)


# ── Cancel (either side) ───────────────────────────────────────
@router.delete("/{session_id}")
async def cancel_session(
    session_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    session = db.query(MentorSession).filter(MentorSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.mentor_id != current_user.id and session.mentee_id != current_user.id:
        raise HTTPException(403, "Not your session")

    session.status = "cancelled"
    db.commit()

    try:
        from app.modules.realtime.ws_notifications import manager as nm
        other_id = session.mentee_id if session.mentor_id == current_user.id else session.mentor_id
        await nm.send(other_id, {
            "type": "session_cancelled",
            "session_id": session.id,
            "from_name": current_user.full_name or current_user.email,
        })
    except Exception:
        pass

    return {"message": "Đã huỷ lịch hẹn"}
