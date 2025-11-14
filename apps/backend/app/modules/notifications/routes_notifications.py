from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ...core.jwt import require_user
from .models import Notification
from ..realtime.ws_notifications import manager

router = APIRouter()


def _db(req: Request) -> Session:
    return req.state.db


@router.get("/{user_id}")
def list_notifications(request: Request, user_id: int):
    auth_user = require_user(request)
    if auth_user != user_id:
        # chỉ cho phép đọc thông báo của chính mình (đơn giản)
        raise HTTPException(status_code=403, detail="Forbidden")
    session = _db(request)
    rows = session.execute(
        select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    ).scalars().all()
    return [n.to_dict() for n in rows]


@router.put("/{notification_id}/read")
def mark_read(request: Request, notification_id: int):
    _ = require_user(request)
    session = _db(request)
    n = session.get(Notification, notification_id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    session.commit()
    session.refresh(n)
    return n.to_dict()


@router.put("/{user_id}/read-all")
def mark_all_read(request: Request, user_id: int):
    auth_user = require_user(request)
    if auth_user != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    session = _db(request)
    session.execute(
        update(Notification).where(Notification.user_id == user_id).values(is_read=True)
    )
    session.commit()
    return {"status": "ok", "user_id": str(user_id)}


@router.post("")
def create_notification(request: Request, payload: dict):
    # helper for testing: create a notification for current user
    uid = require_user(request)
    session = _db(request)
    n = Notification(
        user_id=uid,
        type=payload.get("type") or "SYSTEM_UPDATE",
        title=payload.get("title") or "Message",
        message=payload.get("message") or "...",
        link=payload.get("link"),
    )
    session.add(n)
    session.commit()
    try:
        import anyio
        anyio.from_thread.run(manager.send, uid, n.to_dict())
    except Exception:
        pass
    return n.to_dict()
